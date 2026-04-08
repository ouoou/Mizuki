---
title: Redis字符串数据结构实现详解
published: 2025-01-23
updated: 2025-01-23
description: 深入解析Redis字符串数据结构的实现：从SDS设计到三种编码方式，详细图解字符串的CRUD操作过程，全面理解Redis字符串的底层机制和优化策略
tags:
  - Redis
  - 字符串
  - SDS
  - 数据结构
  - 编码
  - CRUD
category: 八股文
draft: false
---

# Redis字符串数据结构实现详解

Redis的字符串（String）是最基础的数据类型，但其底层实现却非常精妙。Redis使用SDS（Simple Dynamic String）作为字符串的底层实现，并根据字符串的长度和内容自动选择最优的编码方式。本文将从SDS的设计原理出发，深入解析Redis字符串的三种编码方式，并通过详细的图解展示字符串的CRUD操作过程。

## 一、Redis字符串概述

### 1.1 字符串的基本概念

**定义：**
Redis的字符串是二进制安全的，可以存储任何数据，包括文本、图片、序列化对象等。字符串的最大长度为512MB。

**基本操作：**
```
SET key value        # 设置字符串
GET key              # 获取字符串
APPEND key value     # 追加字符串
STRLEN key           # 获取字符串长度
INCR key             # 递增（如果值是数字）
DECR key             # 递减
```

### 1.2 为什么需要SDS？

**传统C字符串的问题：**
```
1. 获取长度需要O(n)时间复杂度
   - 需要遍历整个字符串找到'\0'
   
2. 缓冲区溢出风险
   - strcat可能覆盖相邻内存
   
3. 只能存储文本数据
   - 遇到'\0'会截断
   
4. 频繁内存重分配
   - 每次修改都可能需要重新分配内存
```

**SDS的优势：**
```
1. O(1)时间复杂度获取长度
   - 直接读取len字段
   
2. 自动扩容，防止溢出
   - 检查空间是否足够
   
3. 二进制安全
   - 可以存储任意数据，包括'\0'
   
4. 空间预分配
   - 减少内存重分配次数
```

---

## 二、SDS数据结构详解

### 2.1 SDS的结构定义

**Redis 3.2之前的SDS结构：**
```c
struct sdshdr {
    unsigned int len;     // 字符串长度
    unsigned int free;    // 剩余空间
    char buf[];           // 字符数组（柔性数组）
};
```

**Redis 3.2+的SDS结构（优化后）：**
```c
// 根据字符串长度选择不同的结构
struct __attribute__ ((__packed__)) sdshdr5 {
    unsigned char flags;  // 低3位存储类型，高5位存储长度
    char buf[];
};

struct __attribute__ ((__packed__)) sdshdr8 {
    uint8_t len;          // 字符串长度
    uint8_t alloc;        // 分配的空间（不包括header和'\0'）
    unsigned char flags;  // 类型标志
    char buf[];           // 字符数组
};

struct __attribute__ ((__packed__)) sdshdr16 {
    uint16_t len;
    uint16_t alloc;
    unsigned char flags;
    char buf[];
};

struct __attribute__ ((__packed__)) sdshdr32 {
    uint32_t len;
    uint32_t alloc;
    unsigned char flags;
    char buf[];
};

struct __attribute__ ((__packed__)) sdshdr64 {
    uint64_t len;
    uint64_t alloc;
    unsigned char flags;
    char buf[];
};
```

**类型选择：**
```
SDS_TYPE_5:  len < 32
SDS_TYPE_8:  len < 256
SDS_TYPE_16: len < 65536
SDS_TYPE_32: len < 2^32
SDS_TYPE_64: len >= 2^32
```

### 2.2 SDS的内存布局

**内存布局图解：**
```
SDS内存布局（sdshdr8示例）：

┌─────────────────────────────────────────┐
│  len (1字节)  │  字符串实际长度          │
├─────────────────────────────────────────┤
│  alloc (1字节) │  分配的空间大小        │
├─────────────────────────────────────────┤
│  flags (1字节) │  类型标志 (SDS_TYPE_8) │
├─────────────────────────────────────────┤
│  buf[] (N字节) │  实际字符串数据        │
│  "hello"      │                         │
│  '\0'         │  结尾的'\0'（兼容C函数）│
└─────────────────────────────────────────┘

总大小 = sizeof(sdshdr8) + len + 1
       = 3 + len + 1
       = 4 + len
```

**内存对齐优化：**
```
使用__attribute__ ((__packed__))：
- 取消结构体对齐
- 减少内存占用
- 提高内存利用率

示例：
不使用packed：
struct sdshdr8 {
    uint8_t len;      // 1字节，但可能对齐到4字节
    uint8_t alloc;    // 1字节
    unsigned char flags; // 1字节
    char buf[];       // 柔性数组
};
实际占用：可能12字节（对齐后）

使用packed：
实际占用：3字节（header）+ len + 1
```

### 2.3 SDS的关键特性

**1. 二进制安全**
```c
// 传统C字符串
char *str = "hello\0world";
printf("%s", str);  // 输出：hello（遇到'\0'截断）

// SDS
sds s = sdsnew("hello\0world");
sdslen(s);  // 返回：11（包含'\0'）
// 可以完整存储二进制数据
```

**2. 空间预分配**
```c
// 空间预分配策略
if (newlen < SDS_MAX_PREALLOC)
    newlen *= 2;  // 小于1MB时，分配2倍空间
else
    newlen += SDS_MAX_PREALLOC;  // 大于1MB时，每次增加1MB
```

**3. 惰性空间释放**
```c
// 缩短字符串时，不立即释放空间
// 保留空间供后续使用，减少内存重分配
```

---

## 三、Redis字符串的编码方式

### 3.1 三种编码方式

**编码类型：**
```
1. OBJ_ENCODING_INT
   - 存储整数
   - 直接存储在robj->ptr中（指针复用）
   
2. OBJ_ENCODING_EMBSTR
   - 存储短字符串（<= 44字节）
   - redisObject和SDS连续存储
   
3. OBJ_ENCODING_RAW
   - 存储长字符串（> 44字节）
   - redisObject和SDS分开存储
```

### 3.2 INT编码

**适用条件：**
```
1. 值可以表示为long long类型的整数
2. 范围：-2^63 到 2^63-1
```

**内存布局：**
```
INT编码的内存布局：

┌─────────────────┐
│  redisObject    │
│  type: OBJ_STRING│
│  encoding: INT   │
│  ptr: 直接存储值 │  ← 指针复用，存储整数
└─────────────────┘

示例：SET key 100
ptr = (void*)100  // 直接存储，不需要额外内存
```

**代码实现：**
```c
// 判断是否可以使用INT编码
int isSdsRepresentableAsLongLong(sds s, long long *llval) {
    return string2ll(s, sdslen(s), llval);
}

// 创建INT编码的对象
robj *createStringObjectFromLongLong(long long value) {
    robj *o;
    if (value >= 0 && value < OBJ_SHARED_INTEGERS) {
        // 使用共享整数对象（0-9999）
        o = shared.integers[value];
        incrRefCount(o);
    } else {
        // 创建新的整数对象
        o = createObject(OBJ_STRING, NULL);
        o->encoding = OBJ_ENCODING_INT;
        o->ptr = (void*)((long)value);
    }
    return o;
}
```

### 3.3 EMBSTR编码

**适用条件：**
```
1. 字符串长度 <= 44字节（Redis 3.2+）
2. 不能使用INT编码
```

**内存布局：**
```
EMBSTR编码的内存布局：

┌─────────────────────────────────────────┐
│  redisObject (16字节)                    │
│  type: OBJ_STRING                        │
│  encoding: EMBSTR                        │
│  ptr: 指向SDS                            │
├─────────────────────────────────────────┤
│  sdshdr8 (3字节)                         │
│  len, alloc, flags                      │
├─────────────────────────────────────────┤
│  buf[] (N字节)                           │
│  实际字符串数据                           │
│  '\0'                                    │
└─────────────────────────────────────────┘

总大小 = 16 + 3 + len + 1 = 20 + len
最大len = 64 - 20 = 44字节（考虑内存对齐）
```

**为什么是44字节？**
```
计算过程：
- redisObject: 16字节
- sdshdr8: 3字节
- '\0': 1字节
- 内存对齐: 考虑8字节对齐
- 总分配: 64字节（一个缓存行大小）

最大字符串长度 = 64 - 16 - 3 - 1 - 对齐 = 44字节
```

**代码实现：**
```c
// 创建EMBSTR编码的对象
robj *createEmbeddedStringObject(const char *ptr, size_t len) {
    robj *o = zmalloc(sizeof(robj) + sizeof(struct sdshdr8) + len + 1);
    struct sdshdr8 *sh = (void*)(o+1);
    
    o->type = OBJ_STRING;
    o->encoding = OBJ_ENCODING_EMBSTR;
    o->ptr = sh+1;  // 指向buf
    o->refcount = 1;
    
    sh->len = len;
    sh->alloc = len;
    sh->flags = SDS_TYPE_8;
    if (ptr) {
        memcpy(sh->buf, ptr, len);
        sh->buf[len] = '\0';
    } else {
        memset(sh->buf, 0, len+1);
    }
    return o;
}
```

### 3.4 RAW编码

**适用条件：**
```
1. 字符串长度 > 44字节
2. 不能使用INT编码
```

**内存布局：**
```
RAW编码的内存布局：

┌─────────────────┐
│  redisObject    │
│  type: OBJ_STRING│
│  encoding: RAW   │
│  ptr: ──────────┼──┐
└─────────────────┘  │
                     │ 指针
                     ▼
         ┌─────────────────────────┐
         │  sdshdr (动态大小)       │
         │  len, alloc, flags      │
         │  buf[]                 │
         │  实际字符串数据          │
         └─────────────────────────┘

特点：
- redisObject和SDS分开存储
- 可以存储任意长度的字符串
- 内存可以独立分配和释放
```

**代码实现：**
```c
// 创建RAW编码的对象
robj *createRawStringObject(const char *ptr, size_t len) {
    return createObject(OBJ_STRING, sdsnewlen(ptr, len));
}

// 创建对象
robj *createObject(unsigned type, void *ptr) {
    robj *o = zmalloc(sizeof(*o));
    o->type = type;
    o->encoding = OBJ_ENCODING_RAW;
    o->ptr = ptr;
    o->refcount = 1;
    return o;
}
```

### 3.5 编码选择流程

**编码选择决策树：**
```
开始
  │
  ├─ 是整数？
  │   ├─ 是 → INT编码
  │   └─ 否 ↓
  │
  ├─ 长度 <= 44字节？
  │   ├─ 是 → EMBSTR编码
  │   └─ 否 ↓
  │
  └─ RAW编码
```

**代码实现：**
```c
// 创建字符串对象
robj *createStringObject(const char *ptr, size_t len) {
    if (len <= OBJ_ENCODING_EMBSTR_SIZE_LIMIT) {
        return createEmbeddedStringObject(ptr, len);
    } else {
        return createRawStringObject(ptr, len);
    }
}

// 尝试优化编码
void tryObjectEncoding(robj *o) {
    long value;
    sds s = o->ptr;
    size_t len;
    
    // 已经是INT编码，不需要优化
    if (o->encoding != OBJ_ENCODING_RAW) return;
    
    // 尝试转换为整数
    len = sdslen(s);
    if (len <= 20 && string2l(s, len, &value)) {
        // 可以转换为整数
        if ((value >= 0 && value < OBJ_SHARED_INTEGERS) ||
            (value >= LONG_MIN && value <= LONG_MAX)) {
            decrRefCount(o);
            o = createStringObjectFromLongLong(value);
            return;
        }
    }
    
    // 尝试转换为EMBSTR
    if (len <= OBJ_ENCODING_EMBSTR_SIZE_LIMIT) {
        robj *emb = createEmbeddedStringObject(s, len);
        decrRefCount(o);
        return emb;
    }
}
```

---

## 四、字符串的CRUD操作详解

### 4.1 CREATE操作（SET命令）

**操作流程：**
```
SET key "hello"

步骤1：解析命令
  └─> key = "key", value = "hello"

步骤2：查找或创建key
  └─> 在数据库中查找key
  └─> 如果不存在，创建新的entry

步骤3：创建字符串对象
  └─> 判断编码方式
      ├─> 长度5 <= 44 → EMBSTR编码
      └─> 创建EMBSTR对象

步骤4：存储到数据库
  └─> 将对象存储到dict中
```

**内存布局变化：**
```
执行前：
┌─────────────┐
│  数据库dict  │
│  (空)       │
└─────────────┘

执行后：
┌─────────────┐
│  数据库dict  │
│  key ──────┼──┐
└─────────────┘  │
                 │
                 ▼
    ┌─────────────────────────────┐
    │  redisObject (16字节)        │
    │  type: OBJ_STRING            │
    │  encoding: EMBSTR            │
    │  ptr: ──────────────────────┼─┐
    ├─────────────────────────────┤ │
    │  sdshdr8 (3字节)             │ │
    │  len: 5                      │ │
    │  alloc: 5                    │ │
    │  flags: SDS_TYPE_8           │ │
    ├─────────────────────────────┤ │
    │  buf: "hello"                │◄┘
    │  '\0'                        │
    └─────────────────────────────┘
```

**代码实现：**
```c
// SET命令处理
void setCommand(client *c) {
    robj *o;
    
    // 解析value
    c->argv[2] = tryObjectEncoding(c->argv[2]);
    
    // 查找或创建key
    o = lookupKeyWrite(c->db, c->argv[1]);
    
    if (o == NULL) {
        // 创建新的key
        dbAdd(c->db, c->argv[1], c->argv[2]);
    } else {
        // 更新已存在的key
        dbOverwrite(c->db, c->argv[1], c->argv[2]);
    }
    
    incrRefCount(c->argv[2]);
    removeExpire(c->db, c->argv[1]);
    notifyKeyspaceEvent(NOTIFY_STRING, "set", c->argv[1], c->db->id);
    server.dirty++;
}
```

### 4.2 READ操作（GET命令）

**操作流程：**
```
GET key

步骤1：解析命令
  └─> key = "key"

步骤2：查找key
  └─> 在数据库中查找key
  └─> 如果不存在，返回nil

步骤3：检查类型
  └─> 检查是否为字符串类型
  └─> 如果不是，返回错误

步骤4：返回value
  └─> 根据编码方式获取值
      ├─> INT编码：转换整数为字符串
      ├─> EMBSTR/RAW：直接返回SDS
```

**内存访问路径：**
```
GET key的内存访问：

┌─────────────┐
│  客户端请求  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  数据库dict  │
│  key ──────┼──┐
└─────────────┘  │
                 │ 查找
                 ▼
    ┌─────────────────────────────┐
    │  redisObject                │
    │  type: OBJ_STRING            │
    │  encoding: EMBSTR            │
    │  ptr: ──────────────────────┼──┐
    ├─────────────────────────────┤  │
    │  sdshdr8                    │  │
    │  len: 5                      │  │
    │  alloc: 5                    │  │
    │  flags: SDS_TYPE_8           │  │
    ├─────────────────────────────┤  │
    │  buf: "hello"                │◄─┘
    │  '\0'                        │
    └─────────────────────────────┘
       │
       │ 读取
       ▼
┌─────────────┐
│  返回给客户端 │
│  "hello"    │
└─────────────┘
```

**代码实现：**
```c
// GET命令处理
void getCommand(client *c) {
    robj *o;
    
    // 查找key
    if ((o = lookupKeyReadOrReply(c, c->argv[1], shared.nullbulk)) == NULL)
        return;
    
    // 检查类型
    if (o->type != OBJ_STRING) {
        addReply(c, shared.wrongtypeerr);
        return;
    }
    
    // 返回value
    addReplyBulk(c, o);
}

// 根据编码方式获取字符串
void addReplyBulk(client *c, robj *obj) {
    size_t len;
    
    if (obj->encoding == OBJ_ENCODING_INT) {
        // INT编码：转换为字符串
        char buf[32];
        len = ll2string(buf, sizeof(buf), (long)obj->ptr);
        addReplyBulkCBuffer(c, buf, len);
    } else {
        // EMBSTR/RAW编码：直接使用SDS
        len = sdslen(obj->ptr);
        addReplyBulkCBuffer(c, obj->ptr, len);
    }
}
```

### 4.3 UPDATE操作（APPEND命令）

**操作流程：**
```
APPEND key " world"

步骤1：解析命令
  └─> key = "key", append_value = " world"

步骤2：查找key
  └─> 在数据库中查找key
  └─> 如果不存在，创建新的字符串对象

步骤3：检查编码
  └─> 如果是INT编码，需要先转换为字符串
  └─> 如果是EMBSTR编码，需要转换为RAW编码

步骤4：追加字符串
  └─> 检查空间是否足够
  └─> 如果不够，扩容
  └─> 追加新字符串

步骤5：更新对象
  └─> 更新SDS的len
  └─> 更新数据库中的对象
```

**内存布局变化：**
```
执行前：
┌─────────────────────────────┐
│  redisObject (EMBSTR)        │
│  encoding: EMBSTR            │
│  ptr: ──────────────────────┼──┐
├─────────────────────────────┤  │
│  sdshdr8                    │  │
│  len: 5                      │  │
│  alloc: 5                    │  │
│  buf: "hello"                │◄─┘
└─────────────────────────────┘

执行后（需要转换为RAW）：
┌─────────────────┐
│  redisObject    │
│  encoding: RAW   │
│  ptr: ──────────┼──┐
└─────────────────┘  │
                     │
                     ▼
    ┌─────────────────────────────┐
    │  sdshdr8                    │
    │  len: 11                     │
    │  alloc: 11                   │
    │  flags: SDS_TYPE_8           │
    │  buf: "hello world"          │
    │  '\0'                        │
    └─────────────────────────────┘
```

**代码实现：**
```c
// APPEND命令处理
void appendCommand(client *c) {
    size_t totlen;
    robj *o, *append;
    
    // 查找key
    o = lookupKeyWrite(c->db, c->argv[1]);
    if (o == NULL) {
        // 不存在，创建新对象
        o = createObject(OBJ_STRING, sdsempty());
        dbAdd(c->db, c->argv[1], o);
    } else {
        // 检查类型
        if (o->type != OBJ_STRING) {
            addReply(c, shared.wrongtypeerr);
            return;
        }
        
        // 如果是INT编码，转换为字符串
        o = dbUnshareStringValue(c->db, c->argv[1], o);
    }
    
    // 获取追加的字符串
    append = c->argv[2];
    
    // 计算新长度
    totlen = stringObjectLen(o) + sdslen(append->ptr);
    
    // 检查是否需要转换编码
    if (o->encoding == OBJ_ENCODING_EMBSTR) {
        // EMBSTR需要转换为RAW（因为可能超过44字节）
        o = createRawStringObject(sdsdup(o->ptr), sdslen(o->ptr));
        dbReplaceValue(c->db, c->argv[1], o);
    }
    
    // 追加字符串
    o->ptr = sdscatlen(o->ptr, append->ptr, sdslen(append->ptr));
    totlen = sdslen(o->ptr);
    
    // 返回新长度
    addReplyLongLong(c, totlen);
    signalModifiedKey(c->db, c->argv[1]);
    notifyKeyspaceEvent(NOTIFY_STRING, "append", c->argv[1], c->db->id);
    server.dirty++;
}
```

### 4.4 DELETE操作（DEL命令）

**操作流程：**
```
DEL key

步骤1：解析命令
  └─> key = "key"

步骤2：查找key
  └─> 在数据库中查找key
  └─> 如果不存在，返回0

步骤3：删除key
  └─> 从dict中删除entry
  └─> 减少对象的引用计数
  └─> 如果引用计数为0，释放内存

步骤4：返回结果
  └─> 返回删除的key数量
```

**内存释放过程：**
```
执行前：
┌─────────────┐
│  数据库dict  │
│  key ──────┼──┐
└─────────────┘  │
                 │
                 ▼
    ┌─────────────────────────────┐
    │  redisObject                │
    │  refcount: 1                 │
    │  encoding: EMBSTR            │
    │  ptr: ...                    │
    └─────────────────────────────┘

执行后：
┌─────────────┐
│  数据库dict  │
│  (key已删除) │
└─────────────┘

内存释放：
1. 从dict中删除entry
2. 减少refcount: 1 -> 0
3. 释放redisObject和SDS内存
```

**代码实现：**
```c
// DEL命令处理
void delCommand(client *c) {
    int deleted = 0, j;
    
    // 遍历所有key
    for (j = 1; j < c->argc; j++) {
        // 删除key
        if (dbDelete(c->db, c->argv[j])) {
            signalModifiedKey(c->db, c->argv[j]);
            notifyKeyspaceEvent(NOTIFY_GENERIC, "del", c->argv[j], c->db->id);
            server.dirty++;
            deleted++;
        }
    }
    
    addReplyLongLong(c, deleted);
}

// 删除key
int dbDelete(redisDb *db, robj *key) {
    // 从dict中删除
    if (dictDelete(db->dict, key->ptr) == DICT_OK) {
        // 删除过期时间
        if (dictSize(db->expires) > 0)
            dictDelete(db->expires, key->ptr);
        
        // 通知
        signalModifiedKey(db, key);
        return 1;
    } else {
        return 0;
    }
}

// 对象引用计数减少
void decrRefCount(robj *o) {
    if (o->refcount == 1) {
        // 引用计数为1，释放对象
        switch(o->type) {
        case OBJ_STRING:
            // 释放SDS
            if (o->encoding == OBJ_ENCODING_RAW || 
                o->encoding == OBJ_ENCODING_EMBSTR) {
                sdsfree(o->ptr);
            }
            break;
        // ... 其他类型
        }
        zfree(o);
    } else {
        // 引用计数减1
        o->refcount--;
    }
}
```

### 4.5 特殊操作（INCR命令）

**操作流程：**
```
INCR key

步骤1：查找key
  └─> 如果不存在，创建新对象，值为0

步骤2：检查类型和编码
  └─> 如果是INT编码，直接操作
  └─> 如果是字符串，尝试转换为整数

步骤3：执行递增
  └─> value = value + 1

步骤4：更新对象
  └─> 如果可以使用INT编码，使用INT编码
  └─> 否则转换为字符串
```

**编码转换过程：**
```
执行前（字符串"100"）：
┌─────────────────────────────┐
│  redisObject (EMBSTR)        │
│  encoding: EMBSTR            │
│  ptr: "100"                  │
└─────────────────────────────┘

执行后（整数101）：
┌─────────────────┐
│  redisObject    │
│  encoding: INT   │
│  ptr: (void*)101│  ← 直接存储整数
└─────────────────┘
```

**代码实现：**
```c
// INCR命令处理
void incrCommand(client *c) {
    long long value, oldvalue;
    robj *o, *new;
    
    // 查找key
    o = lookupKeyWrite(c->db, c->argv[1]);
    if (o != NULL) {
        // 检查类型
        if (checkType(c, o, OBJ_STRING)) return;
        
        // 尝试转换为整数
        if (getLongLongFromObjectOrReply(c, o, &value, NULL) != C_OK)
            return;
    } else {
        // 不存在，初始化为0
        value = 0;
    }
    
    // 检查溢出
    oldvalue = value;
    if ((value < 0 && oldvalue < 0 && value > oldvalue) ||
        (value > 0 && oldvalue > 0 && value < oldvalue)) {
        addReplyError(c, "increment or decrement would overflow");
        return;
    }
    
    // 递增
    value++;
    
    // 创建新对象
    new = createStringObjectFromLongLong(value);
    
    // 更新数据库
    setKey(c->db, c->argv[1], new);
    signalModifiedKey(c->db, c->argv[1]);
    notifyKeyspaceEvent(NOTIFY_STRING, "incr", c->argv[1], c->db->id);
    server.dirty++;
    
    // 返回新值
    addReply(c, shared.colon);
    addReply(c, new);
    addReply(c, shared.crlf);
}
```

---

## 五、内存优化策略

### 5.1 共享整数对象

**优化机制：**
```
共享整数范围：0-9999

目的：
- 减少内存占用
- 提高缓存命中率

实现：
shared.integers[10000]  // 预创建0-9999的整数对象
```

**内存对比：**
```
不使用共享：
10000个key，每个值为100
内存：10000 × 16字节 = 160KB

使用共享：
10000个key，每个值为100
内存：10000 × 8字节（指针） + 16字节（共享对象） = 80KB
节省：50%
```

### 5.2 编码优化

**自动编码转换：**
```
场景1：字符串转整数
SET key "100"
INCR key
  └─> 转换为INT编码

场景2：整数转字符串
SET key 100
APPEND key "0"
  └─> 转换为RAW编码

场景3：EMBSTR转RAW
SET key "short"  // EMBSTR
APPEND key "very long string..."  // 转换为RAW
```

### 5.3 空间预分配

**预分配策略：**
```c
// SDS空间预分配
sds sdsMakeRoomFor(sds s, size_t addlen) {
    void *sh, *newsh;
    size_t avail = sdsavail(s);
    size_t len, newlen;
    
    // 空间足够，直接返回
    if (avail >= addlen) return s;
    
    len = sdslen(s);
    sh = (char*)s - sdsHdrSize(s->flags);
    newlen = (len + addlen);
    
    // 预分配策略
    if (newlen < SDS_MAX_PREALLOC)
        newlen *= 2;  // 小于1MB，分配2倍
    else
        newlen += SDS_MAX_PREALLOC;  // 大于1MB，增加1MB
    
    // 重新分配内存
    newsh = zrealloc(sh, sdsHdrSize(s->flags) + newlen + 1);
    if (newsh == NULL) return NULL;
    
    // 更新SDS结构
    s = (char*)newsh + sdsHdrSize(s->flags);
    sdsSetAlloc(s, newlen);
    
    return s;
}
```

**预分配效果：**
```
场景：连续追加字符串

不使用预分配：
"a" -> "ab" -> "abc" -> "abcd"
每次都需要重新分配内存：4次分配

使用预分配：
"a" (分配2字节) -> "ab" (使用已有空间)
-> "abc" (分配4字节) -> "abcd" (使用已有空间)
只需要2次分配
```

---

## 六、实际应用示例

### 6.1 计数器场景

**场景：**
```
使用INCR实现计数器

SET counter 0
INCR counter  // 1
INCR counter  // 2
INCR counter  // 3
```

**内存布局：**
```
counter的内存布局：

┌─────────────────┐
│  redisObject    │
│  encoding: INT   │
│  ptr: (void*)3  │  ← 直接存储整数
└─────────────────┘

优势：
- 内存占用最小（只有redisObject）
- 操作最快（直接整数运算）
```

### 6.2 缓存场景

**场景：**
```
缓存用户信息（JSON字符串）

SET user:1001 '{"name":"Alice","age":30}'
```

**内存布局：**
```
user:1001的内存布局（长度>44，使用RAW编码）：

┌─────────────────┐
│  redisObject    │
│  encoding: RAW   │
│  ptr: ──────────┼──┐
└─────────────────┘  │
                     │
                     ▼
    ┌─────────────────────────────┐
    │  sdshdr32                    │
    │  len: 35                      │
    │  alloc: 35                    │
    │  flags: SDS_TYPE_32           │
    │  buf: '{"name":"Alice",...}'  │
    └─────────────────────────────┘
```

### 6.3 二进制数据场景

**场景：**
```
存储图片的base64编码

SET image:1001 "iVBORw0KGgoAAAANSUhEUgAA..."
```

**内存布局：**
```
image:1001的内存布局（二进制安全）：

┌─────────────────┐
│  redisObject    │
│  encoding: RAW   │
│  ptr: ──────────┼──┐
└─────────────────┘  │
                     │
                     ▼
    ┌─────────────────────────────┐
    │  sdshdr64                    │
    │  len: 1024                    │
    │  alloc: 1024                  │
    │  flags: SDS_TYPE_64           │
    │  buf: [二进制数据]             │
    └─────────────────────────────┘

特点：
- 可以存储任意二进制数据
- 不会因为'\0'而截断
```

---

## 七、常见问题解答

### 7.1 为什么EMBSTR的最大长度是44字节？

**答案：内存对齐和缓存行优化**

**计算过程：**
```
redisObject: 16字节
sdshdr8: 3字节
'\0': 1字节
内存对齐: 考虑8字节对齐
总分配: 64字节（一个缓存行）

最大字符串长度 = 64 - 16 - 3 - 1 - 对齐 = 44字节
```

**优势：**
- 内存连续，缓存友好
- 减少内存分配次数
- 提高访问速度

### 7.2 INT编码的整数范围是多少？

**答案：**
```
范围：-2^63 到 2^63-1

原因：
- 使用long long类型
- 64位系统：-9223372036854775808 到 9223372036854775807
```

### 7.3 EMBSTR和RAW的区别是什么？

**答案：**

| 特性 | EMBSTR | RAW |
|------|--------|-----|
| **长度限制** | <= 44字节 | > 44字节 |
| **内存布局** | 连续存储 | 分开存储 |
| **内存分配** | 一次分配 | 两次分配 |
| **缓存友好** | 是 | 否 |
| **适用场景** | 短字符串 | 长字符串 |

### 7.4 SDS如何保证二进制安全？

**答案：**

**机制：**
1. **使用len字段**：不依赖'\0'判断长度
2. **可以包含'\0'**：字符串中可以包含任意字节
3. **完整存储**：不会截断数据

**示例：**
```c
// 传统C字符串
char *str = "hello\0world";
strlen(str);  // 返回5（遇到'\0'截断）

// SDS
sds s = sdsnewlen("hello\0world", 11);
sdslen(s);  // 返回11（完整长度）
```

### 7.5 字符串操作的时间复杂度是多少？

**答案：**

| 操作 | 时间复杂度 | 说明 |
|------|-----------|------|
| **SET** | O(1) | 直接存储 |
| **GET** | O(1) | 直接读取 |
| **STRLEN** | O(1) | 读取len字段 |
| **APPEND** | O(M) | M为追加字符串长度 |
| **INCR** | O(1) | 整数运算 |

---

## 八、总结

### 8.1 核心要点

**1. SDS设计**
- O(1)获取长度
- 二进制安全
- 自动扩容
- 空间预分配

**2. 三种编码方式**
- **INT**：存储整数，内存占用最小
- **EMBSTR**：存储短字符串（<=44字节），内存连续
- **RAW**：存储长字符串（>44字节），灵活存储

**3. CRUD操作**
- **CREATE**：根据长度和类型选择编码
- **READ**：根据编码方式读取值
- **UPDATE**：可能需要转换编码
- **DELETE**：释放内存，减少引用计数

### 8.2 优化策略

**1. 内存优化**
- 共享整数对象（0-9999）
- 编码自动优化
- 空间预分配

**2. 性能优化**
- EMBSTR连续存储，缓存友好
- INT编码直接存储，操作最快
- 空间预分配减少内存重分配

### 8.3 最佳实践

**1. 使用建议**
- 小整数使用INCR，自动INT编码
- 短字符串使用EMBSTR，性能更好
- 长字符串使用RAW，灵活存储

**2. 注意事项**
- 字符串最大长度512MB
- EMBSTR修改后会转换为RAW
- INT编码的字符串不能使用字符串操作

---

通过本文的学习，你应该对Redis字符串数据结构的实现有了深入的理解，包括SDS的设计原理、三种编码方式的选择、CRUD操作的详细过程，以及各种优化策略。在实际应用中，理解这些底层机制有助于更好地使用Redis，并针对具体场景进行优化。

