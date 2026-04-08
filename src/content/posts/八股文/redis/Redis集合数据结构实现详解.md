---
title: Redis集合数据结构实现详解
published: 2025-01-23
updated: 2025-01-23
description: 深入解析Redis集合数据结构的实现：从intset到hashtable，详细图解集合的数据结构存储和CRUD操作过程，全面理解intset的升级机制和hashtable的实现原理
tags:
  - Redis
  - 集合
  - Set
  - intset
  - hashtable
  - dict
  - CRUD
category: 八股文
draft: false
---

# Redis集合数据结构实现详解

Redis的集合（Set）是一个无序的、不重复的字符串集合。Redis使用两种编码方式来实现集合：intset（整数集合）和hashtable（哈希表）。当集合中的所有元素都是整数且数量较少时，使用intset；否则使用hashtable。本文将从集合的基本概念出发，深入解析两种编码方式的实现原理，并通过详细的图解展示集合的存储结构和CRUD操作过程。

## 一、Redis集合概述

### 1.1 集合的基本概念

**定义：**
Redis的集合是一个无序的、不重复的字符串集合。集合可以包含最多2^32-1个元素（约40亿个元素）。

**基本操作：**
```
SADD key member [member ...]    # 添加元素
SREM key member [member ...]    # 删除元素
SMEMBERS key                    # 获取所有元素
SISMEMBER key member            # 判断元素是否存在
SCARD key                       # 获取元素数量
SINTER key1 [key2 ...]          # 求交集
SUNION key1 [key2 ...]           # 求并集
SDIFF key1 [key2 ...]           # 求差集
SPOP key [count]                # 随机弹出元素
SRANDMEMBER key [count]         # 随机获取元素
```

### 1.2 集合的应用场景

**典型场景：**
```
1. 标签系统
   SADD article:1001:tags "redis" "database"
   SADD article:1002:tags "redis" "cache"

2. 好友关系
   SADD user:1001:friends "user:1002"
   SADD user:1001:friends "user:1003"

3. 黑名单
   SADD blacklist:ip "192.168.1.100"
   SISMEMBER blacklist:ip "192.168.1.100"

4. 去重
   SADD unique:ids "id1" "id2" "id3"
```

---

## 二、集合的编码方式

### 2.1 两种编码方式

**编码类型：**
```
1. OBJ_ENCODING_INTSET（整数集合）
   - 所有元素都是整数
   - 元素数量较少
   - 内存占用小，查找效率高
   
2. OBJ_ENCODING_HT（哈希表）
   - 有非整数元素
   - 或元素数量较多
   - 查找效率高，但内存占用大
```

### 2.2 编码切换条件

**配置参数：**
```bash
# set-max-intset-entries: 使用intset的最大元素数量
# 默认值：512
set-max-intset-entries 512
```

**切换规则：**
```
使用intset的条件（同时满足）：
1. 所有元素都是整数
2. 元素数量 < set-max-intset-entries（默认512）

否则使用hashtable
```

**编码转换触发：**
```
intset -> hashtable：
1. 添加非整数元素
2. 元素数量 >= set-max-intset-entries

hashtable -> intset：
- Redis不会自动转换回intset
- 因为转换成本高，且可能很快又需要转换回来
```

---

## 三、Intset编码详解

### 3.1 Intset的结构

**核心数据结构：**
```c
// 整数集合
typedef struct intset {
    uint32_t encoding;  // 编码方式（INTSET_ENC_INT16/INT32/INT64）
    uint32_t length;    // 元素数量
    int8_t contents[];  // 元素数组（实际类型由encoding决定）
} intset;
```

**编码方式：**
```
INTSET_ENC_INT16: 16位整数（-32768 到 32767）
INTSET_ENC_INT32: 32位整数（-2147483648 到 2147483647）
INTSET_ENC_INT64: 64位整数（-2^63 到 2^63-1）
```

### 3.2 Intset的内存布局

**内存布局图解：**
```
集合 "myset" 使用intset编码（INT16）：

┌─────────────────────────────────────────┐
│  intset结构                              │
│  encoding: INTSET_ENC_INT16 (2字节)     │
│  length: 3 (4字节)                      │
│  contents: ────────────────────────────┼──┐
└─────────────────────────────────────────┘  │
                                              │
                                              ▼
                    ┌──────────────────────────────────────┐
                    │  contents[] 数组                    │
                    │  [0] = 10 (2字节)                   │
                    │  [1] = 20 (2字节)                   │
                    │  [2] = 30 (2字节)                   │
                    └──────────────────────────────────────┘

存储内容：
SADD myset 10 20 30

特点：
- 元素按升序排列
- 连续内存存储
- 无重复元素
```

### 3.3 Intset的升级机制

**升级触发条件：**
```
当添加的元素无法用当前编码表示时，需要升级：

INT16 -> INT32：
- 添加的元素 > 32767 或 < -32768

INT32 -> INT64：
- 添加的元素 > 2147483647 或 < -2147483648
```

**升级过程：**
```
步骤1：计算新编码
  └─> 根据新元素的值确定新编码

步骤2：重新分配内存
  └─> 根据新编码和元素数量分配内存

步骤3：转换现有元素
  └─> 将现有元素从旧编码转换为新编码
  └─> 从后往前转换（避免覆盖）

步骤4：插入新元素
  └─> 在合适位置插入新元素（保持有序）

步骤5：更新encoding
  └─> 更新intset的encoding字段
```

**升级过程图解：**

**场景：INT16升级到INT32**
```
升级前（INT16）：
┌─────────────────────────────────────────┐
│  encoding: INT16                         │
│  length: 3                               │
│  contents: [10, 20, 30] (每个2字节)     │
└─────────────────────────────────────────┘

添加元素 40000（超出INT16范围）：

步骤1：计算新编码
  └─> 40000 > 32767，需要INT32

步骤2：重新分配内存
  └─> 新大小 = 4（encoding） + 4（length） + 4×4（4个INT32元素） = 24字节

步骤3：转换现有元素（从后往前）
  └─> 转换30: INT16(30) -> INT32(30)
  └─> 转换20: INT16(20) -> INT32(20)
  └─> 转换10: INT16(10) -> INT32(10)

步骤4：插入新元素（保持有序）
  └─> 10, 20, 30, 40000

步骤5：更新encoding
  └─> encoding: INT16 -> INT32

升级后（INT32）：
┌─────────────────────────────────────────┐
│  encoding: INT32                         │
│  length: 4                               │
│  contents: [10, 20, 30, 40000] (每个4字节)│
└─────────────────────────────────────────┘
```

**升级的优缺点：**
```
优点：
- 节省内存：小整数使用小编码
- 灵活性：自动适应元素范围

缺点：
- 升级成本高：需要重新分配内存和转换所有元素
- 只能升级，不能降级
```

### 3.4 Intset的查找操作

**查找流程：**
```
查找元素20：

步骤1：检查编码
  └─> encoding = INT16

步骤2：二分查找
  └─> contents数组是有序的
  └─> 使用二分查找算法

步骤3：比较元素
  └─> 根据encoding读取元素值
  └─> 与目标值比较

步骤4：返回结果
  └─> 找到返回1，未找到返回0
```

**二分查找过程：**
```
数组：[10, 20, 30, 40, 50]
查找：20

步骤1：left=0, right=4, mid=2
  └─> contents[2] = 30
  └─> 30 > 20，在左半部分

步骤2：left=0, right=2, mid=1
  └─> contents[1] = 20
  └─> 20 == 20，找到！

时间复杂度：O(log n)
```

**代码实现（简化）：**
```c
// 查找元素
uint8_t intsetFind(intset *is, int64_t value) {
    uint8_t valenc = _intsetValueEncoding(value);
    return valenc <= intrev32ifbe(is->encoding) && 
           intsetSearch(is, value, NULL);
}

// 二分查找
static uint8_t intsetSearch(intset *is, int64_t value, uint32_t *pos) {
    int32_t min = 0, max = intrev32ifbe(is->length) - 1, mid = -1;
    int64_t cur = -1;
    
    // 空集合
    if (intrev32ifbe(is->length) == 0) {
        if (pos) *pos = 0;
        return 0;
    } else {
        // 检查是否超出范围
        if (value > _intsetGet(is, intrev32ifbe(is->length) - 1)) {
            if (pos) *pos = intrev32ifbe(is->length);
            return 0;
        } else if (value < _intsetGet(is, 0)) {
            if (pos) *pos = 0;
            return 0;
        }
    }
    
    // 二分查找
    while (max >= min) {
        mid = ((unsigned int)min + (unsigned int)max) >> 1;
        cur = _intsetGet(is, mid);
        if (value > cur) {
            min = mid + 1;
        } else if (value < cur) {
            max = mid - 1;
        } else {
            break;
        }
    }
    
    if (value == cur) {
        if (pos) *pos = mid;
        return 1;
    } else {
        if (pos) *pos = min;
        return 0;
    }
}
```

### 3.5 Intset的优缺点

**优点：**
- ✅ 内存占用小：紧凑存储，无指针开销
- ✅ 查找效率高：O(log n)时间复杂度（二分查找）
- ✅ 缓存友好：连续内存，提高缓存命中率
- ✅ 自动升级：根据元素范围自动选择编码

**缺点：**
- ❌ 只能存储整数：不能存储字符串
- ❌ 升级成本高：需要重新分配内存和转换所有元素
- ❌ 插入/删除慢：需要移动元素保持有序
- ❌ 不能降级：升级后无法降级

---

## 四、Hashtable编码详解

### 4.1 Hashtable的结构

**核心数据结构：**
```c
// 哈希表节点（与Hash相同）
typedef struct dictEntry {
    void *key;              // 键（集合中的元素）
    union {
        void *val;          // 值（集合中为NULL）
        uint64_t u64;
        int64_t s64;
        double d;
    } v;
    struct dictEntry *next; // 指向下一个节点（解决哈希冲突）
} dictEntry;

// 哈希表
typedef struct dictht {
    dictEntry **table;      // 哈希表数组
    unsigned long size;     // 哈希表大小（2的幂）
    unsigned long sizemask; // 大小掩码（size-1）
    unsigned long used;     // 已使用的节点数量
} dictht;

// 字典
typedef struct dict {
    dictType *type;         // 类型特定函数
    void *privdata;         // 私有数据
    dictht ht[2];           // 两个哈希表（用于rehash）
    long rehashidx;         // rehash索引（-1表示不在rehash）
    int iterators;          // 迭代器数量
} dict;
```

**Set在Hashtable中的存储：**
```
Set使用Hashtable存储：
- key: 集合元素（字符串）
- value: NULL（集合只需要key，不需要value）

特点：
- 使用哈希表实现
- 支持O(1)的查找、插入、删除
- 支持渐进式rehash
```

### 4.2 Hashtable的内存布局

**内存布局图解：**
```
集合 "myset" 使用hashtable编码：

┌─────────────────────────────────────────┐
│  dict结构                                │
│  ht[0]: 当前哈希表                       │
│  ht[1]: rehash哈希表（未使用时为NULL）   │
│  rehashidx: -1（不在rehash）            │
└──────────────┬──────────────────────────┘
               │
               ▼
    ┌─────────────────────────────────────┐
    │  dictht (ht[0])                     │
    │  size: 4                            │
    │  sizemask: 3 (0b11)                │
    │  used: 3                            │
    │  table: ────────────────────────────┼──┐
    └─────────────────────────────────────┘  │
                                             │
                                             ▼
                    ┌──────────────────────────────┐
                    │  dictEntry* table[4]          │
                    │  [0] ──> NULL                │
                    │  [1] ──> entry1 ──> NULL    │
                    │  [2] ──> entry2 ──> NULL    │
                    │  [3] ──> entry3 ──> NULL    │
                    └──────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────────────────┐
                    │  dictEntry                   │
                    │  key: "hello"                 │
                    │  v.val: NULL                 │
                    │  next: NULL                  │
                    └──────────────────────────────┘
```

### 4.3 Hashtable的查找操作

**查找流程：**
```
查找元素 "hello"：

步骤1：计算哈希值
  hash("hello") = 5
  index = 5 & 3 = 1

步骤2：查找bucket
  table[1] -> entry("hello") -> NULL
            └─ 比较key，匹配！

步骤3：返回结果
  找到，返回1

时间复杂度：O(1)平均，O(n)最坏（所有元素冲突）
```

### 4.4 Hashtable的优缺点

**优点：**
- ✅ 查找效率高：O(1)时间复杂度
- ✅ 插入/删除快：O(1)时间复杂度
- ✅ 支持任意类型：可以存储字符串、整数等
- ✅ 支持渐进式rehash：不会阻塞服务

**缺点：**
- ❌ 内存占用大：每个元素需要指针开销
- ❌ 缓存不友好：节点分散在内存中
- ❌ 哈希冲突：最坏情况O(n)时间复杂度

---

## 五、集合的CRUD操作详解

### 5.1 CREATE操作（SADD命令）

**操作流程：**
```
SADD myset "hello" "world"

步骤1：解析命令
  └─> key = "myset", members = ["hello", "world"]

步骤2：查找或创建集合对象
  └─> 在数据库中查找key
  └─> 如果不存在，创建新的集合对象

步骤3：检查编码方式
  └─> 如果是intset，检查是否需要转换为hashtable
  └─> 如果添加非整数元素，转换为hashtable
  └─> 如果元素数量超限，转换为hashtable

步骤4：添加元素
  └─> 根据编码方式执行不同的操作
      ├─> intset: 二分查找插入位置，插入元素（可能需要升级）
      └─> hashtable: 在哈希表中添加entry
```

**Intset编码的SADD操作：**

**场景1：添加整数元素（无需升级）**
```
执行前：
┌─────────────────────────────────────────┐
│  intset                                 │
│  encoding: INT16                        │
│  length: 2                              │
│  contents: [10, 20]                     │
└─────────────────────────────────────────┘

执行 SADD myset 15：

步骤1：二分查找插入位置
  └─> 找到位置：在10和20之间

步骤2：移动元素
  └─> 将20向后移动

步骤3：插入新元素
  └─> contents: [10, 15, 20]

步骤4：更新length
  └─> length: 2 -> 3

执行后：
┌─────────────────────────────────────────┐
│  intset                                 │
│  encoding: INT16                        │
│  length: 3                              │
│  contents: [10, 15, 20]                │
└─────────────────────────────────────────┘
```

**场景2：添加整数元素（需要升级）**
```
执行前：
┌─────────────────────────────────────────┐
│  intset                                 │
│  encoding: INT16                        │
│  length: 2                              │
│  contents: [10, 20]                     │
└─────────────────────────────────────────┘

执行 SADD myset 40000：

步骤1：检查是否需要升级
  └─> 40000 > 32767，需要升级到INT32

步骤2：升级intset
  └─> 重新分配内存
  └─> 转换现有元素：10, 20
  └─> 更新encoding: INT16 -> INT32

步骤3：插入新元素
  └─> contents: [10, 20, 40000]

执行后：
┌─────────────────────────────────────────┐
│  intset                                 │
│  encoding: INT32                        │
│  length: 3                              │
│  contents: [10, 20, 40000]             │
└─────────────────────────────────────────┘
```

**场景3：添加非整数元素（触发编码转换）**
```
执行前：
┌─────────────────────────────────────────┐
│  intset                                 │
│  encoding: INT16                        │
│  length: 2                              │
│  contents: [10, 20]                     │
└─────────────────────────────────────────┘

执行 SADD myset "hello"：

步骤1：检查元素类型
  └─> "hello"不是整数，需要转换为hashtable

步骤2：创建新的dict
  └─> 创建hashtable

步骤3：迁移现有元素
  └─> 将10和20添加到hashtable

步骤4：添加新元素
  └─> 将"hello"添加到hashtable

步骤5：更新对象
  └─> 释放intset
  └─> 设置encoding为OBJ_ENCODING_HT
  └─> 设置ptr为dict

执行后：
┌─────────────────────────────────────────┐
│  dict                                   │
│  ht[0]:                                 │
│    table[4]                             │
│    [0] -> entry(10, NULL)               │
│    [1] -> entry(20, NULL)               │
│    [2] -> entry("hello", NULL)          │
│    [3] -> NULL                          │
└─────────────────────────────────────────┘
```

**Hashtable编码的SADD操作：**
```
执行 SADD myset "hello"：

步骤1：计算哈希值
  hash("hello") = 5
  index = 5 & 3 = 1

步骤2：查找bucket
  table[1] -> NULL（不存在）

步骤3：创建新节点
  ┌─────────────────────┐
  │  dictEntry          │
  │  key: "hello"        │
  │  v.val: NULL        │
  │  next: NULL         │
  └─────────────────────┘

步骤4：插入bucket
  table[1] -> entry("hello") -> NULL
```

**代码实现（简化）：**
```c
// SADD命令处理
void saddCommand(client *c) {
    robj *set;
    int j, added = 0;
    
    // 查找或创建集合对象
    set = lookupKeyWrite(c->db, c->argv[1]);
    if (set == NULL) {
        set = setTypeCreate(c->argv[2]->ptr);
        dbAdd(c->db, c->argv[1], set);
    } else {
        if (set->type != OBJ_SET) {
            addReply(c, shared.wrongtypeerr);
            return;
        }
    }
    
    // 添加所有元素
    for (j = 2; j < c->argc; j++) {
        if (setTypeAdd(set, c->argv[j]->ptr)) {
            added++;
        }
    }
    
    if (added) {
        signalModifiedKey(c->db, c->argv[1]);
        notifyKeyspaceEvent(NOTIFY_SET, "sadd", c->argv[1], c->db->id);
    }
    server.dirty += added;
    addReplyLongLong(c, added);
}

// 添加元素
int setTypeAdd(robj *subject, sds value) {
    long long llval;
    
    if (subject->encoding == OBJ_ENCODING_HT) {
        // hashtable编码
        dict *ht = subject->ptr;
        dictEntry *de = dictAddRaw(ht, value, NULL);
        if (de) {
            dictSetKey(ht, de, sdsdup(value));
            dictSetVal(ht, de, NULL);
            return 1;
        }
    } else if (subject->encoding == OBJ_ENCODING_INTSET) {
        // intset编码
        if (isSdsRepresentableAsLongLong(value, &llval) == C_OK) {
            // 是整数
            uint8_t success = 0;
            subject->ptr = intsetAdd(subject->ptr, llval, &success);
            if (success) {
                // 检查是否需要转换编码
                if (intsetLen(subject->ptr) > server.set_max_intset_entries)
                    setTypeConvert(subject, OBJ_ENCODING_HT);
                return 1;
            }
        } else {
            // 不是整数，转换为hashtable
            setTypeConvert(subject, OBJ_ENCODING_HT);
            return setTypeAdd(subject, value);
        }
    } else {
        serverPanic("Unknown set encoding");
    }
    return 0;
}

// Intset添加元素
intset *intsetAdd(intset *is, int64_t value, uint8_t *success) {
    uint8_t valenc = _intsetValueEncoding(value);
    uint32_t pos;
    
    if (success) *success = 1;
    
    // 检查是否需要升级
    if (valenc > intrev32ifbe(is->encoding)) {
        // 需要升级
        return intsetUpgradeAndAdd(is, value);
    } else {
        // 不需要升级
        if (intsetSearch(is, value, &pos)) {
            // 元素已存在
            if (success) *success = 0;
            return is;
        }
        
        // 插入新元素
        is = intsetResize(is, intrev32ifbe(is->length) + 1);
        if (pos < intrev32ifbe(is->length)) {
            // 移动元素
            intsetMoveTail(is, pos, pos + 1);
        }
    }
    
    // 设置新元素
    _intsetSet(is, pos, value);
    is->length = intrev32ifbe(intrev32ifbe(is->length) + 1);
    return is;
}
```

### 5.2 READ操作（SISMEMBER/SMEMBERS命令）

**操作流程：**
```
SISMEMBER myset "hello"

步骤1：解析命令
  └─> key = "myset", member = "hello"

步骤2：查找集合对象
  └─> 在数据库中查找key
  └─> 如果不存在，返回0

步骤3：检查类型
  └─> 检查是否为集合类型
  └─> 如果不是，返回错误

步骤4：查找元素
  └─> 根据编码方式执行不同的查找
      ├─> intset: 二分查找
      └─> hashtable: 哈希查找

步骤5：返回结果
  └─> 如果找到，返回1
  └─> 如果未找到，返回0
```

**Intset编码的SISMEMBER操作：**
```
查找元素20：

步骤1：二分查找
  contents: [10, 20, 30]
  left=0, right=2, mid=1
  contents[1] = 20

步骤2：比较
  20 == 20，找到！

步骤3：返回结果
  返回1

时间复杂度：O(log n)
```

**Hashtable编码的SISMEMBER操作：**
```
查找元素 "hello"：

步骤1：计算哈希值
  hash("hello") = 5
  index = 5 & 3 = 1

步骤2：查找bucket
  table[1] -> entry("hello") -> NULL
            └─ 比较key，匹配！

步骤3：返回结果
  找到，返回1

时间复杂度：O(1)平均
```

**SMEMBERS命令（获取所有元素）：**
```
操作流程：
1. 遍历集合中的所有元素
2. 根据编码方式执行不同的遍历
   - intset: 顺序遍历contents数组
   - hashtable: 遍历所有bucket和链表
3. 返回结果数组
```

**代码实现（简化）：**
```c
// SISMEMBER命令处理
void sismemberCommand(client *c) {
    robj *set;
    
    // 查找集合对象
    if ((set = lookupKeyReadOrReply(c, c->argv[1], shared.czero)) == NULL ||
        checkType(c, set, OBJ_SET)) return;
    
    // 查找元素
    if (setTypeIsMember(set, c->argv[2]->ptr)) {
        addReply(c, shared.cone);
    } else {
        addReply(c, shared.czero);
    }
}

// 判断元素是否存在
int setTypeIsMember(robj *subject, sds value) {
    long long llval;
    
    if (subject->encoding == OBJ_ENCODING_HT) {
        // hashtable编码
        return dictFind((dict*)subject->ptr, value) != NULL;
    } else if (subject->encoding == OBJ_ENCODING_INTSET) {
        // intset编码
        if (isSdsRepresentableAsLongLong(value, &llval) == C_OK) {
            return intsetFind((intset*)subject->ptr, llval);
        }
    } else {
        serverPanic("Unknown set encoding");
    }
    return 0;
}
```

### 5.3 UPDATE操作（集合不支持直接更新）

**说明：**
```
集合不支持直接更新操作，因为：
1. 集合是无序的、不重复的
2. 如果要"更新"元素，实际上是：
   - 删除旧元素（SREM）
   - 添加新元素（SADD）
```

### 5.4 DELETE操作（SREM命令）

**操作流程：**
```
SREM myset "hello"

步骤1：解析命令
  └─> key = "myset", member = "hello"

步骤2：查找集合对象
  └─> 在数据库中查找key

步骤3：删除元素
  └─> 根据编码方式执行不同的删除
      ├─> intset: 二分查找，删除元素，移动后续元素
      └─> hashtable: 从哈希表中删除entry

步骤4：检查是否需要转换编码
  └─> 如果hashtable元素很少且都是整数，可能转换为intset（Redis不自动转换）

步骤5：返回结果
  └─> 返回删除的元素数量
```

**Intset编码的SREM操作：**
```
删除元素20：

执行前：
┌─────────────────────────────────────────┐
│  intset                                 │
│  encoding: INT16                        │
│  length: 3                              │
│  contents: [10, 20, 30]                │
└─────────────────────────────────────────┘

执行 SREM myset 20：

步骤1：二分查找元素
  └─> 找到位置：index = 1

步骤2：删除元素
  └─> 将30向前移动

步骤3：更新length
  └─> length: 3 -> 2

执行后：
┌─────────────────────────────────────────┐
│  intset                                 │
│  encoding: INT16                        │
│  length: 2                              │
│  contents: [10, 30]                     │
└─────────────────────────────────────────┘
```

**Hashtable编码的SREM操作：**
```
删除元素 "hello"：

步骤1：计算哈希值
  hash("hello") = 5
  index = 5 & 3 = 1

步骤2：查找bucket
  table[1] -> entry("hello") -> NULL
            └─ 找到！

步骤3：从链表中删除
  table[1] -> NULL

步骤4：释放内存
  └─> 释放entry的内存
```

**代码实现（简化）：**
```c
// SREM命令处理
void sremCommand(client *c) {
    robj *set;
    int j, deleted = 0, keyremoved = 0;
    
    // 查找集合对象
    if ((set = lookupKeyWriteOrReply(c, c->argv[1], shared.czero)) == NULL ||
        checkType(c, set, OBJ_SET)) return;
    
    // 删除所有元素
    for (j = 2; j < c->argc; j++) {
        if (setTypeRemove(set, c->argv[j]->ptr)) {
            deleted++;
            if (setTypeSize(set) == 0) {
                // 集合为空，删除key
                dbDelete(c->db, c->argv[1]);
                keyremoved = 1;
                break;
            }
        }
    }
    
    if (deleted) {
        signalModifiedKey(c->db, c->argv[1]);
        notifyKeyspaceEvent(NOTIFY_SET, "srem", c->argv[1], c->db->id);
        if (keyremoved)
            notifyKeyspaceEvent(NOTIFY_GENERIC, "del", c->argv[1], c->db->id);
        server.dirty++;
    }
    addReplyLongLong(c, deleted);
}

// 删除元素
int setTypeRemove(robj *subject, sds value) {
    long long llval;
    
    if (subject->encoding == OBJ_ENCODING_HT) {
        // hashtable编码
        if (dictDelete((dict*)subject->ptr, value) == DICT_OK) {
            return 1;
        }
    } else if (subject->encoding == OBJ_ENCODING_INTSET) {
        // intset编码
        if (isSdsRepresentableAsLongLong(value, &llval) == C_OK) {
            int success;
            subject->ptr = intsetRemove(subject->ptr, llval, &success);
            if (success) return 1;
        }
    } else {
        serverPanic("Unknown set encoding");
    }
    return 0;
}

// Intset删除元素
intset *intsetRemove(intset *is, int64_t value, int *success) {
    uint8_t valenc = _intsetValueEncoding(value);
    uint32_t pos;
    
    if (success) *success = 0;
    
    // 查找元素
    if (valenc <= intrev32ifbe(is->encoding) && intsetSearch(is, value, &pos)) {
        uint32_t len = intrev32ifbe(is->length);
        
        // 移动元素
        if (pos < (len - 1)) {
            intsetMoveTail(is, pos + 1, pos);
        }
        
        // 调整大小
        is = intsetResize(is, len - 1);
        is->length = intrev32ifbe(len - 1);
        if (success) *success = 1;
    }
    return is;
}
```

### 5.5 集合运算操作

**SINTER（交集）：**
```
SINTER set1 set2

操作流程：
1. 遍历较小的集合
2. 检查每个元素是否在另一个集合中
3. 如果都在，添加到结果集合
4. 返回结果集合

时间复杂度：O(N*M)，N和M为两个集合的大小
```

**SUNION（并集）：**
```
SUNION set1 set2

操作流程：
1. 将第一个集合的所有元素添加到结果集合
2. 将第二个集合的所有元素添加到结果集合（自动去重）
3. 返回结果集合

时间复杂度：O(N+M)
```

**SDIFF（差集）：**
```
SDIFF set1 set2

操作流程：
1. 将第一个集合的所有元素添加到结果集合
2. 遍历第二个集合，从结果集合中删除存在的元素
3. 返回结果集合

时间复杂度：O(N+M)
```

---

## 六、编码转换机制

### 6.1 Intset转Hashtable

**触发条件：**
```
1. 添加非整数元素
2. 元素数量 >= set-max-intset-entries
3. 执行SADD时检查
```

**转换过程：**
```
步骤1：创建新的dict
  └─> dictCreate()

步骤2：遍历intset
  └─> 读取每个元素
  └─> 转换为字符串
  └─> 插入到dict中

步骤3：更新对象
  └─> 释放intset
  └─> 设置encoding为OBJ_ENCODING_HT
  └─> 设置ptr为dict
```

**转换图解：**
```
转换前（intset）：
┌─────────────────────────────────────────┐
│  intset                                 │
│  encoding: INT16                        │
│  length: 3                              │
│  contents: [10, 20, 30]                 │
└─────────────────────────────────────────┘

转换后（hashtable）：
┌─────────────────────────────────────────┐
│  dict                                   │
│  ht[0]:                                 │
│    table[4]                             │
│    [0] -> entry("10", NULL)             │
│    [1] -> entry("20", NULL)             │
│    [2] -> entry("30", NULL)             │
│    [3] -> NULL                          │
└─────────────────────────────────────────┘
```

### 6.2 Hashtable转Intset

**说明：**
```
Redis不会自动将hashtable转换为intset，因为：
1. 转换成本高（需要遍历所有元素）
2. 可能很快又需要转换回来
3. 保持hashtable编码更稳定
```

---

## 七、实际应用示例

### 7.1 标签系统

**场景：**
```
为文章添加标签

SADD article:1001:tags "redis" "database"
SADD article:1002:tags "redis" "cache"
```

**内存布局（hashtable编码）：**
```
article:1001:tags的hashtable结构：
┌─────────────────────────────────────────┐
│  dict                                   │
│  ht[0]:                                 │
│    table[4]                             │
│    [0] -> entry("redis", NULL)          │
│    [1] -> entry("database", NULL)       │
│    [2] -> NULL                          │
│    [3] -> NULL                          │
└─────────────────────────────────────────┘

特点：
- 使用hashtable编码（有字符串元素）
- 查找效率高（O(1)）
- 支持集合运算（SINTER求交集）
```

### 7.2 用户ID集合

**场景：**
```
存储用户ID集合（都是整数）

SADD users:active 1001 1002 1003
```

**内存布局（intset编码）：**
```
users:active的intset结构：
┌─────────────────────────────────────────┐
│  intset                                 │
│  encoding: INT16                        │
│  length: 3                              │
│  contents: [1001, 1002, 1003]          │
└─────────────────────────────────────────┘

特点：
- 使用intset编码（都是整数）
- 内存占用小
- 查找效率高（O(log n)）
```

### 7.3 黑名单系统

**场景：**
```
IP黑名单

SADD blacklist:ip "192.168.1.100"
SISMEMBER blacklist:ip "192.168.1.100"
```

**内存布局：**
```
根据IP地址类型选择编码：
- 如果是整数IP：可能使用intset
- 如果是字符串IP：使用hashtable
```

---

## 八、性能优化建议

### 8.1 配置优化

**根据场景调整：**
```bash
# 场景1：大量整数集合
# 提高intset阈值，更多使用intset节省内存
set-max-intset-entries 1024

# 场景2：混合类型集合
# 降低intset阈值，更多使用hashtable提高性能
set-max-intset-entries 256

# 场景3：平衡性能和内存
# 使用默认值
set-max-intset-entries 512
```

### 8.2 使用建议

**1. 批量操作**
```
使用SADD/SREM批量操作：
- 减少网络往返
- 提高性能
```

**2. 集合运算**
```
合理使用集合运算：
- SINTER：求交集
- SUNION：求并集
- SDIFF：求差集
- 注意时间复杂度
```

**3. 监控指标**
```
关键指标：
- 集合数量
- 平均元素数量
- 编码分布（intset vs hashtable）
- 内存使用
```

---

## 九、常见问题解答

### 9.1 什么时候使用intset，什么时候使用hashtable？

**答案：**

**使用intset：**
- ✅ 所有元素都是整数
- ✅ 元素数量 < set-max-intset-entries（默认512）
- ✅ 内存敏感的场景
- ✅ 查找操作较多

**使用hashtable：**
- ✅ 有非整数元素
- ✅ 元素数量 >= set-max-intset-entries
- ✅ 需要频繁插入/删除
- ✅ 性能优先的场景

### 9.2 Intset的升级机制是什么？

**答案：**

**升级触发：**
```
当添加的元素无法用当前编码表示时：
- INT16 -> INT32：元素 > 32767 或 < -32768
- INT32 -> INT64：元素 > 2147483647 或 < -2147483648
```

**升级过程：**
```
1. 计算新编码
2. 重新分配内存
3. 转换现有元素（从后往前）
4. 插入新元素（保持有序）
5. 更新encoding
```

**特点：**
- 只能升级，不能降级
- 升级成本高（需要重新分配内存和转换所有元素）
- 但节省内存（小整数使用小编码）

### 9.3 集合操作的时间复杂度是多少？

**答案：**

| 操作 | Intset | Hashtable |
|------|--------|-----------|
| **SADD** | O(log n) | O(1) |
| **SREM** | O(log n) | O(1) |
| **SISMEMBER** | O(log n) | O(1) |
| **SMEMBERS** | O(n) | O(n) |
| **SCARD** | O(1) | O(1) |
| **SINTER** | O(N*M) | O(N*M) |
| **SUNION** | O(N+M) | O(N+M) |
| **SDIFF** | O(N+M) | O(N+M) |

### 9.4 为什么Intset需要保持有序？

**答案：**

**原因：**
```
1. 支持二分查找
   - 有序数组可以使用二分查找
   - 时间复杂度O(log n)

2. 去重
   - 插入时通过二分查找检查元素是否已存在
   - 避免重复元素

3. 升级时的便利
   - 有序数组便于升级时的元素转换
```

### 9.5 Hashtable转Intset会触发吗？

**答案：不会自动转换**

**原因：**
```
1. 转换成本高
   - 需要遍历所有元素
   - 检查是否都是整数
   - 创建新的intset

2. 可能很快又需要转换回来
   - 如果添加非整数元素，又需要转换回hashtable
   - 频繁转换影响性能

3. 保持hashtable编码更稳定
   - 避免频繁的编码转换
   - 性能更可预测
```

---

## 十、总结

### 10.1 核心要点

**1. 两种编码方式**
- **Intset**：整数集合，内存占用小，查找效率高（O(log n)）
- **Hashtable**：哈希表，查找效率高（O(1)），支持任意类型

**2. 编码选择**
- 根据元素类型和数量自动选择
- 可以配置阈值调整选择策略

**3. Intset升级机制**
- 根据元素范围自动升级编码
- 只能升级，不能降级
- 升级成本高，但节省内存

**4. CRUD操作**
- **CREATE**：SADD，根据编码方式插入数据
- **READ**：SISMEMBER/SMEMBERS，根据编码方式查找数据
- **UPDATE**：不支持直接更新
- **DELETE**：SREM，根据编码方式删除数据

### 10.2 优化策略

**1. 配置优化**
- 根据场景调整intset阈值
- 平衡内存和性能

**2. 使用优化**
- 使用批量操作（SADD/SREM）
- 合理使用集合运算
- 监控编码分布

### 10.3 最佳实践

**1. 元素设计**
- 如果可能，尽量使用整数
- 避免频繁的编码转换
- 合理设置元素数量

**2. 操作建议**
- 优先使用批量操作
- 注意集合运算的时间复杂度
- 合理使用集合运算

---

通过本文的学习，你应该对Redis集合数据结构的实现有了深入的理解，包括intset和hashtable两种编码方式、intset的升级机制、CRUD操作的详细过程，以及各种优化策略。在实际应用中，理解这些底层机制有助于更好地使用Redis集合，并针对具体场景进行优化。

