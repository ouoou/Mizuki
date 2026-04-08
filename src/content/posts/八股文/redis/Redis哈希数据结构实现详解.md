---
title: Redis哈希数据结构实现详解
published: 2025-01-23
updated: 2025-01-23
description: 深入解析Redis哈希数据结构的实现：从ziplist到listpack再到hashtable，详细图解哈希的数据结构存储和CRUD操作过程，全面理解ziplist级联更新问题和listpack的解决方案，以及渐进式rehash策略
tags:
  - Redis
  - 哈希
  - Hash
  - ziplist
  - hashtable
  - dict
  - rehash
  - CRUD
category: 八股文
draft: false
---

# Redis哈希数据结构实现详解

Redis的哈希（Hash）是一个键值对集合，类似于编程语言中的Map或Dictionary。Redis使用两种编码方式来实现哈希：ziplist（压缩列表）和hashtable（哈希表）。本文将从哈希的基本概念出发，深入解析两种编码方式的实现原理，并通过详细的图解展示哈希的存储结构和CRUD操作过程。

## 一、Redis哈希概述

### 1.1 哈希的基本概念

**定义：**
Redis的哈希是一个string类型的field和value的映射表，适合存储对象。一个哈希可以存储2^32-1个键值对。

**基本操作：**
```
HSET key field value     # 设置字段值
HGET key field           # 获取字段值
HDEL key field           # 删除字段
HGETALL key              # 获取所有字段和值
HMSET key f1 v1 f2 v2    # 批量设置字段
HMGET key f1 f2          # 批量获取字段
HLEN key                 # 获取字段数量
```

### 1.2 哈希的应用场景

**典型场景：**
```
1. 存储用户信息
   HSET user:1001 name "Alice"
   HSET user:1001 age "30"
   HSET user:1001 email "alice@example.com"

2. 存储商品信息
   HSET product:1001 name "iPhone"
   HSET product:1001 price "5999"
   HSET product:1001 stock "100"

3. 存储配置信息
   HSET config:app timeout "30"
   HSET config:app max_conn "1000"
```

---

## 二、哈希的编码方式

### 2.1 编码方式演进

**Redis版本演进：**
```
Redis 3.2 - 6.x:
- OBJ_ENCODING_ZIPLIST（压缩列表）
- OBJ_ENCODING_HT（哈希表）

Redis 7.0+:
- OBJ_ENCODING_LISTPACK（列表包，替代ziplist）
- OBJ_ENCODING_HT（哈希表）
```

**编码类型：**
```
1. OBJ_ENCODING_LISTPACK（列表包，Redis 7.0+）
   - 小哈希，字段和值都较小
   - 内存占用小，查找效率低
   - 解决了ziplist的级联更新问题
   
2. OBJ_ENCODING_ZIPLIST（压缩列表，Redis 6.x及之前）
   - 小哈希，字段和值都较小
   - 内存占用小，但查找效率低
   - 存在级联更新问题
   
3. OBJ_ENCODING_HT（哈希表）
   - 大哈希，或字段/值较大
   - 查找效率高，但内存占用大
```

### 2.2 编码切换条件

**配置参数：**
```bash
# hash-max-ziplist-entries: 使用ziplist的最大字段数量
# 默认值：512
hash-max-ziplist-entries 512

# hash-max-ziplist-value: 使用ziplist的最大字段/值大小（字节）
# 默认值：64
hash-max-ziplist-value 64
```

**切换规则：**
```
Redis 7.0+（使用listpack）：
使用listpack的条件（同时满足）：
1. 字段数量 < hash-max-listpack-entries（默认512）
2. 每个字段名和值的大小 < hash-max-listpack-value（默认64字节）

否则使用hashtable

Redis 6.x及之前（使用ziplist）：
使用ziplist的条件（同时满足）：
1. 字段数量 < hash-max-ziplist-entries（默认512）
2. 每个字段名和值的大小 < hash-max-ziplist-value（默认64字节）

否则使用hashtable
```

---

## 三、Ziplist编码详解

### 3.1 Ziplist的结构

**整体结构：**
```
<zlbytes> <zltail> <zllen> <entry1> <entry2> ... <entryN> <zlend>

zlbytes: 4字节，整个ziplist占用的字节数
zltail: 4字节，到达尾节点的偏移量
zllen: 2字节，节点数量（如果<65535）
entry: 节点，存储field和value
zlend: 1字节，结束标记（0xFF）
```

**哈希在ziplist中的存储：**
```
ziplist中的哈希存储格式：
[field1, value1, field2, value2, field3, value3, ...]

特点：
- field和value交替存储
- 按插入顺序存储
- 查找需要遍历
```

### 3.2 Ziplist的内存布局

**内存布局图解：**
```
哈希 "user:1001" 使用ziplist编码：

┌─────────────────────────────────────────────┐
│  zlbytes (4字节)  │  总字节数                │
├─────────────────────────────────────────────┤
│  zltail (4字节)   │  尾节点偏移量            │
├─────────────────────────────────────────────┤
│  zllen (2字节)    │  节点数量 (6)            │
├─────────────────────────────────────────────┤
│  entry1: "name"   │  field1                  │
├─────────────────────────────────────────────┤
│  entry2: "Alice" │  value1                  │
├─────────────────────────────────────────────┤
│  entry3: "age"    │  field2                  │
├─────────────────────────────────────────────┤
│  entry4: "30"     │  value2                  │
├─────────────────────────────────────────────┤
│  entry5: "email"  │  field3                  │
├─────────────────────────────────────────────┤
│  entry6: "alice@" │  value3                  │
├─────────────────────────────────────────────┤
│  zlend (1字节)    │  结束标记 (0xFF)         │
└─────────────────────────────────────────────┘

存储内容：
HSET user:1001 name "Alice"
HSET user:1001 age "30"
HSET user:1001 email "alice@example.com"
```

### 3.3 Ziplist的查找操作

**查找流程：**
```
查找 "user:1001" 的 "age" 字段：

步骤1：从ziplist头部开始遍历
步骤2：检查每个entry是否是field
步骤3：如果是field且匹配，读取下一个entry作为value
步骤4：如果找到，返回value；否则继续遍历

时间复杂度：O(n)，n为字段数量
```

**代码实现（简化）：**
```c
// 在ziplist中查找field
unsigned char *ziplistFind(unsigned char *zl, unsigned char *field, 
                          unsigned int fieldlen) {
    unsigned char *p = ziplistIndex(zl, ZIPLIST_HEAD);
    unsigned char *vstr;
    unsigned int vlen;
    long long vll;
    
    // 遍历ziplist
    while (p[0] != ZIP_END) {
        // 读取field
        ziplistGet(p, &vstr, &vlen, &vll);
        
        // 比较field
        if (vstr && vlen == fieldlen && memcmp(vstr, field, fieldlen) == 0) {
            // 找到field，返回下一个entry（value）
            return ziplistNext(zl, p);
        }
        
        // 跳过value，移动到下一个field
        p = ziplistNext(zl, p);  // 跳过field
        p = ziplistNext(zl, p);  // 跳过value
    }
    
    return NULL;
}
```

### 3.4 Ziplist的prevlen字段的必要性

**为什么需要prevlen字段？**

**核心原因：支持反向遍历**

**问题场景：**
```
ziplist是顺序存储的，没有指针：
┌─────┬─────┬─────┐
│ e1  │ e2  │ e3  │
└─────┴─────┴─────┘
  ↑     ↑     ↑
  只能从前往后遍历

但如果需要从后往前遍历呢？
比如：删除最后一个节点、从尾部插入节点
```

**prevlen字段的作用：**
```
prevlen字段存储前一个节点的长度，支持反向遍历：

┌─────────────────────────────────────────┐
│  entry1: prevlen=0, len=10, data="a"   │  ← prevlen=0（头节点）
├─────────────────────────────────────────┤
│  entry2: prevlen=1, len=10, data="b"   │  ← prevlen=1（前节点10字节）
│          ↑                               │
│          知道前一个节点长度，可以向前移动│
├─────────────────────────────────────────┤
│  entry3: prevlen=1, len=10, data="c"   │  ← prevlen=1（前节点10字节）
│          ↑                               │
│          可以向前移动到entry2            │
└─────────────────────────────────────────┘

反向遍历过程：
1. 从entry3开始
2. 读取entry3的prevlen=1，知道前一个节点长度10字节
3. 向前移动10字节，到达entry2
4. 读取entry2的prevlen=1，知道前一个节点长度10字节
5. 向前移动10字节，到达entry1
```

**如果没有prevlen字段会怎样？**

**问题1：无法反向遍历**
```
没有prevlen字段：
┌─────┬─────┬─────┐
│ e1  │ e2  │ e3  │
└─────┴─────┴─────┘

从e3开始，如何找到e2？
- 不知道e2的长度
- 无法向前移动
- 只能从头部重新遍历（O(n)）
```

**问题2：某些操作无法实现**
```
需要反向遍历的操作：
1. 从尾部删除节点
   - 需要找到最后一个节点
   - 没有prevlen，只能从头遍历

2. 从尾部插入节点
   - 需要找到最后一个节点
   - 没有prevlen，只能从头遍历

3. 反向迭代
   - 需要从后往前遍历
   - 没有prevlen，无法实现
```

**为什么不能简单地删除prevlen字段？**

**答案：不能，因为需要支持反向遍历**

**如果删除prevlen字段：**
```
优点：
- ✅ 解决了级联更新问题
- ✅ 插入/删除不会影响其他节点

缺点：
- ❌ 无法反向遍历
- ❌ 某些操作性能下降（从O(1)变为O(n)）
- ❌ 功能受限
```

**Listpack的解决方案：**

**核心思路：用tot-len替代prevlen，但设计更巧妙**

**关键区别：**
```
Ziplist的prevlen：
- 存储前一个节点的长度（依赖关系）
- 前一个节点变化，当前节点需要更新
- 可能触发级联更新

Listpack的tot-len：
- 存储当前节点的总长度（独立）
- 反向存储（从后往前读取）
- 每个节点独立，不依赖其他节点
```

### 3.4.1 tot-len字段详解

**什么是tot-len？**

**定义：**
tot-len（total length）是listpack中每个节点末尾存储的一个字段，表示**当前节点的总长度**（包括encoding、data和tot-len本身）。

**tot-len存储的是什么？**

**答案：存储当前节点的总长度，不是前一个节点的长度，也不是指针**

```
tot-len存储内容：
- 存储的是：当前节点的总长度（字节数）
- 不是：前一个节点的长度
- 不是：前一个节点的指针
- 不是：前一个节点的地址

节点结构：
┌─────────────────────────────────────────┐
│  encoding (1-9字节)                     │  ← 编码类型和长度
├─────────────────────────────────────────┤
│  data (实际数据)                         │  ← 实际存储的数据
├─────────────────────────────────────────┤
│  tot-len (1-5字节，反向存储)            │  ← 当前节点的总长度
└─────────────────────────────────────────┘
         ↑
         存储的是：encoding + data + tot-len 的总字节数
```

**tot-len的具体含义：**

```
示例节点：
encoding: 1字节（7位字符串长度编码）
data: "hello"（5字节）
tot-len: 1字节（存储总长度）

节点总长度 = 1（encoding） + 5（data） + 1（tot-len） = 7字节
tot-len存储的值 = 7

内存布局：
┌─────────┬──────────┬─────────┐
│ encoding│  data    │ tot-len │
│  1字节  │  5字节   │  1字节  │
│  [0x05] │ "hello"  │  [0x07] │
└─────────┴──────────┴─────────┘
                    ↑
                    tot-len = 7（当前节点总长度）
```

**tot-len为什么能支持反向遍历？**

**核心机制：反向存储 + 从后往前读取**

```
关键设计：
1. tot-len存储在节点末尾
2. tot-len的值是当前节点的总长度
3. 从后往前读取tot-len，知道当前节点有多长
4. 向前移动tot-len字节，就到达前一个节点的末尾
5. 重复步骤3-4，实现反向遍历
```

**反向遍历过程详解：**

```
Listpack结构：
┌─────────────────────────────────────────┐
│  total_bytes, size                      │
├─────────────────────────────────────────┤
│  entry1: [enc] [data="a"] [tot-len=15] │
├─────────────────────────────────────────┤
│  entry2: [enc] [data="b"] [tot-len=15] │
├─────────────────────────────────────────┤
│  entry3: [enc] [data="c"] [tot-len=15] │
├─────────────────────────────────────────┤
│  LP_EOF                                 │
└─────────────────────────────────────────┘

反向遍历过程（从entry3到entry1）：

步骤1：从entry3末尾开始
  └─> 读取tot-len = 15
  └─> 知道entry3总长度是15字节

步骤2：向前移动15字节
  └─> 到达entry2的末尾
  └─> 读取entry2的tot-len = 15
  └─> 知道entry2总长度是15字节

步骤3：向前移动15字节
  └─> 到达entry1的末尾
  └─> 读取entry1的tot-len = 15
  └─> 知道entry1总长度是15字节

步骤4：向前移动15字节
  └─> 到达listpack头部
  └─> 完成反向遍历
```

**tot-len的编码方式（反向存储）：**

```
tot-len字段的编码（从后往前读取）：

编码格式：
- 0xxxxxxx: 7位长度（1字节），范围0-127
- 10xxxxxx xxxxxxxx: 14位长度（2字节），范围0-16383
- 11000000 xxxxxxxx xxxxxxxx xxxxxxxx xxxxxxxx: 32位长度（5字节）
- 11100000 xxxxxxxx xxxxxxxx: 16位长度（3字节）
- 11110000 xxxxxxxx xxxxxxxx xxxxxxxx: 24位长度（4字节）

读取方式：
1. 从节点末尾读取第一个字节
2. 根据编码格式判断tot-len的长度
3. 从后往前读取完整的tot-len值
4. 得到当前节点的总长度
```

**tot-len vs prevlen对比：**

| 特性 | prevlen（Ziplist） | tot-len（Listpack） |
|------|-------------------|---------------------|
| **存储内容** | 前一个节点的长度 | 当前节点的总长度 |
| **依赖关系** | 依赖前一个节点 | 独立，不依赖其他节点 |
| **存储位置** | 节点开头 | 节点末尾 |
| **读取方向** | 从前往后 | 从后往前（反向） |
| **级联更新** | 可能触发 | 不会触发 |
| **支持反向遍历** | ✅ 是 | ✅ 是 |

**图解说明：**

**Ziplist（prevlen）：**
```
节点结构：<prevlen> <encoding> <data>

entry1: [prevlen=0] [enc] [data="a"]
        ↑
        存储前一个节点的长度（头节点，所以是0）

entry2: [prevlen=1] [enc] [data="b"]
        ↑
        存储前一个节点（entry1）的长度
        如果entry1长度变化，entry2的prevlen需要更新

entry3: [prevlen=1] [enc] [data="c"]
        ↑
        存储前一个节点（entry2）的长度
        如果entry2长度变化，entry3的prevlen需要更新
```

**Listpack（tot-len）：**
```
节点结构：<encoding> <data> <tot-len>

entry1: [enc] [data="a"] [tot-len=15]
                          ↑
                          存储当前节点（entry1）的总长度
                          独立，不依赖其他节点

entry2: [enc] [data="b"] [tot-len=15]
                          ↑
                          存储当前节点（entry2）的总长度
                          独立，不依赖其他节点

entry3: [enc] [data="c"] [tot-len=15]
                          ↑
                          存储当前节点（entry3）的总长度
                          独立，不依赖其他节点

反向遍历：
1. 从entry3末尾读取tot-len=15
2. 向前移动15字节，到达entry2末尾
3. 从entry2末尾读取tot-len=15
4. 向前移动15字节，到达entry1末尾
5. 完成反向遍历
```

**为什么tot-len不是指针？**

**答案：listpack是顺序存储，没有指针**

```
Listpack的设计：
- 所有节点连续存储在内存中
- 没有指针，只有偏移量
- 通过计算偏移量访问节点

tot-len的作用：
- 不是指针（没有存储地址）
- 是长度信息（存储字节数）
- 通过长度计算偏移量，找到前一个节点

对比：
指针方式（链表）：
entry1 -> entry2 -> entry3
  ↑        ↑        ↑
  指针     指针     指针
  存储地址  存储地址  存储地址

tot-len方式（listpack）：
entry1 [15] entry2 [15] entry3 [15]
         ↑              ↑              ↑
         长度           长度           长度
         通过长度计算偏移量，找到前一个节点
```

**为什么tot-len能避免级联更新？**

```
核心原理：

Ziplist（prevlen）：
entry1: [prevlen=0] [data="a"]  ← 长度10
entry2: [prevlen=1] [data="b"]  ← prevlen依赖entry1的长度
entry3: [prevlen=1] [data="c"]  ← prevlen依赖entry2的长度

插入大节点后：
entry0: [prevlen=0] [data="..."]  ← 新节点，长度300
entry1: [prevlen=5] [data="a"]   ← 需要更新（entry0长度>=254）
entry2: [prevlen=5] [data="b"]   ← 需要更新（entry1长度变化）
entry3: [prevlen=5] [data="c"]   ← 需要更新（entry2长度变化）
         ↑
         级联更新链：entry1 → entry2 → entry3

Listpack（tot-len）：
entry1: [encoding] [data="a"] [tot-len=15]  ← 独立，tot-len=15
entry2: [encoding] [data="b"] [tot-len=15]  ← 独立，tot-len=15
entry3: [encoding] [data="c"] [tot-len=15]  ← 独立，tot-len=15

插入大节点后：
entry0: [encoding] [data="..."] [tot-len=305]  ← 新节点，tot-len=305
entry1: [encoding] [data="a"] [tot-len=15]    ← 不需要更新！
entry2: [encoding] [data="b"] [tot-len=15]    ← 不需要更新！
entry3: [encoding] [data="c"] [tot-len=15]    ← 不需要更新！
         ↑
         每个节点独立，没有依赖关系

反向遍历过程（listpack）：
1. 从entry3末尾读取tot-len=15
2. 向前移动15字节，到达entry2的末尾
3. 从entry2末尾读取tot-len=15
4. 向前移动15字节，到达entry1的末尾
5. 完成反向遍历

关键：tot-len是当前节点的长度，不是前一个节点的长度
- 插入新节点，只影响新节点本身
- 其他节点的tot-len不变
- 不会触发级联更新
```

**图解对比：**

**Ziplist（使用prevlen）：**
```
节点结构：
<prevlen> <encoding> <data>

entry1: [0] [encoding] [data="a"]
entry2: [1] [encoding] [data="b"]  ← prevlen=1，依赖entry1的长度
entry3: [1] [encoding] [data="c"]  ← prevlen=1，依赖entry2的长度

插入大节点后：
entry0: [0] [encoding] [data="..."]  ← 新节点，长度300
entry1: [5] [encoding] [data="a"]   ← prevlen需要更新为5
entry2: [5] [encoding] [data="b"]   ← prevlen需要更新为5（级联）
entry3: [5] [encoding] [data="c"]   ← prevlen需要更新为5（级联）
```

**Listpack（使用tot-len）：**
```
节点结构：
<encoding> <data> <tot-len>

entry1: [encoding] [data="a"] [15]  ← tot-len=15，独立
entry2: [encoding] [data="b"] [15]  ← tot-len=15，独立
entry3: [encoding] [data="c"] [15]  ← tot-len=15，独立

插入大节点后：
entry0: [encoding] [data="..."] [305]  ← 新节点，tot-len=305
entry1: [encoding] [data="a"] [15]    ← 不需要更新！
entry2: [encoding] [data="b"] [15]    ← 不需要更新！
entry3: [encoding] [data="c"] [15]    ← 不需要更新！
```

### 3.5 Ziplist的级联更新问题

**问题描述：**
ziplist的级联更新（Cascade Update）是ziplist最严重的问题之一。当在ziplist头部或中间插入一个较大的节点时，可能导致后续所有节点的prevlen字段需要更新，从而引发连锁反应。

**级联更新的根本原因：**
```
级联更新的根本原因是prevlen字段的设计：
1. prevlen存储前一个节点的长度
2. 前一个节点长度变化，当前节点的prevlen需要更新
3. 当前节点长度变化，下一个节点的prevlen需要更新
4. 形成连锁反应

这不是设计缺陷，而是设计权衡：
- 需要prevlen支持反向遍历
- 但prevlen的设计导致了级联更新的可能性
```

**级联更新的触发条件：**
```
1. 在ziplist头部或中间插入节点
2. 插入的节点长度 >= 254字节（prevlen需要5字节表示）
3. 后续节点的prevlen原本是1字节（表示前一个节点 < 254字节）
4. 需要将prevlen从1字节扩展为5字节
5. 节点长度变化，导致更后续节点的prevlen也需要更新
6. 可能引发连锁反应
```

**级联更新过程图解：**

**场景1：在头部插入大节点**
```
初始状态（所有节点长度 < 254字节）：

┌─────────────────────────────────────────┐
│  zlbytes, zltail, zllen=3               │
├─────────────────────────────────────────┤
│  entry1: prevlen=0, len=10, data="a"   │  ← prevlen=0（头节点）
├─────────────────────────────────────────┤
│  entry2: prevlen=1, len=10, data="b"   │  ← prevlen=1（前节点10字节）
├─────────────────────────────────────────┤
│  entry3: prevlen=1, len=10, data="c"   │  ← prevlen=1（前节点10字节）
└─────────────────────────────────────────┘

在头部插入大节点（len=300字节）：

步骤1：插入新节点
┌─────────────────────────────────────────┐
│  entry0: prevlen=0, len=300, data="..." │  ← 新插入的大节点
├─────────────────────────────────────────┤
│  entry1: prevlen=1, len=10, data="a"   │  ← 需要更新！
│          ↑                               │
│          原本是1字节，现在需要5字节      │
│          因为前一个节点300字节 >= 254   │
├─────────────────────────────────────────┤
│  entry2: prevlen=1, len=10, data="b"   │  ← 需要更新！
│          ↑                               │
│          entry1的长度变化了              │
│          从10字节变为14字节（10+4）      │
│          14 < 254，但entry1的prevlen变了│
├─────────────────────────────────────────┤
│  entry3: prevlen=1, len=10, data="c"   │  ← 需要更新！
│          ↑                               │
│          entry2的长度也变化了            │
└─────────────────────────────────────────┘

步骤2：更新entry1的prevlen
┌─────────────────────────────────────────┐
│  entry0: prevlen=0, len=300, data="..." │
├─────────────────────────────────────────┤
│  entry1: prevlen=5, len=14, data="a"    │  ← 已更新（prevlen: 1→5字节）
│          ↑     ↑                         │
│          5字节  长度变为14字节            │
├─────────────────────────────────────────┤
│  entry2: prevlen=1, len=10, data="b"   │  ← 需要更新！
│          ↑                               │
│          前一个节点现在是14字节          │
│          但entry1的prevlen是5字节        │
│          entry1总长度 = 14 + 5 = 19字节 │
│          19 < 254，但需要检查entry2      │
├─────────────────────────────────────────┤
│  entry3: prevlen=1, len=10, data="c"   │  ← 需要更新！
└─────────────────────────────────────────┘

步骤3：更新entry2的prevlen
┌─────────────────────────────────────────┐
│  entry0: prevlen=0, len=300, data="..." │
├─────────────────────────────────────────┤
│  entry1: prevlen=5, len=14, data="a"    │
├─────────────────────────────────────────┤
│  entry2: prevlen=1, len=10, data="b"    │  ← 检查：前节点19字节 < 254
│          ↑                               │  prevlen保持1字节
│          但entry1的prevlen变化了         │
│          需要重新计算entry1的总长度      │
├─────────────────────────────────────────┤
│  entry3: prevlen=1, len=10, data="c"   │
└─────────────────────────────────────────┘

实际上，由于entry1的prevlen从1字节变为5字节，entry1的总长度增加了4字节。
如果entry1的新长度 >= 254字节，entry2的prevlen也需要从1字节变为5字节。
这会导致entry2的长度也增加，可能影响entry3...形成连锁反应。
```

**场景2：级联更新的最坏情况**
```
最坏情况：连续多个节点长度在250-253字节之间

初始状态：
┌─────────────────────────────────────────┐
│  entry1: prevlen=1, len=250            │  ← 总长度251字节
├─────────────────────────────────────────┤
│  entry2: prevlen=1, len=250            │  ← 总长度251字节
├─────────────────────────────────────────┤
│  entry3: prevlen=1, len=250            │  ← 总长度251字节
├─────────────────────────────────────────┤
│  entry4: prevlen=1, len=250            │  ← 总长度251字节
└─────────────────────────────────────────┘

在头部插入大节点（len=300）：

步骤1：插入新节点
┌─────────────────────────────────────────┐
│  entry0: prevlen=0, len=300             │  ← 新节点
├─────────────────────────────────────────┤
│  entry1: prevlen=1, len=250            │  ← 需要更新为5字节
│          300 >= 254，prevlen需要5字节    │
│          新长度 = 250 + 4 = 254字节     │  ← 关键！
│          254 >= 254，触发下一级更新     │
├─────────────────────────────────────────┤
│  entry2: prevlen=1, len=250            │  ← 需要更新
│          entry1现在是254字节            │
│          prevlen需要5字节                │
│          新长度 = 250 + 4 = 254字节     │  ← 继续触发
├─────────────────────────────────────────┤
│  entry3: prevlen=1, len=250            │  ← 需要更新
│          entry2现在是254字节            │
│          prevlen需要5字节                │
│          新长度 = 250 + 4 = 254字节     │  ← 继续触发
├─────────────────────────────────────────┤
│  entry4: prevlen=1, len=250            │  ← 需要更新
│          entry3现在是254字节            │
│          prevlen需要5字节                │
│          新长度 = 250 + 4 = 254字节     │
└─────────────────────────────────────────┘

结果：所有节点都需要更新，时间复杂度O(n²)
```

**级联更新的时间复杂度：**
```
最好情况：O(1)
- 插入节点后，后续节点的prevlen不需要变化
- 或只有1-2个节点需要更新

平均情况：O(n)
- 部分节点需要更新
- 更新范围有限

最坏情况：O(n²)
- 所有节点都需要更新
- 每个节点更新需要移动后续所有节点
- 总操作数 = n + (n-1) + ... + 1 = n(n+1)/2
```

**级联更新的影响：**
```
性能影响：
- 最坏情况下，插入一个节点需要O(n²)时间
- 对于大ziplist，可能造成明显的延迟峰值
- 影响Redis的响应时间

实际场景：
- 虽然最坏情况概率较低，但确实存在
- 在某些特定场景下可能触发
- 是ziplist被listpack替代的主要原因之一
```

### 3.5 Ziplist的优缺点

**优点：**
- ✅ 内存占用小：紧凑存储，无指针开销
- ✅ 缓存友好：连续内存，提高缓存命中率
- ✅ 适合小哈希：字段少时性能足够

**缺点：**
- ❌ 查找效率低：O(n)时间复杂度
- ❌ 插入/删除慢：需要移动后续节点
- ❌ **级联更新问题**：最坏情况O(n²)时间复杂度
- ❌ 内存重分配频繁：插入/删除需要重新分配内存

---

## 四、Listpack编码详解（Redis 7.0+）

### 4.1 Listpack的出现背景

**为什么需要Listpack？**

**Ziplist的问题：**
```
1. 级联更新问题
   - 最坏情况O(n²)时间复杂度
   - 可能造成延迟峰值
   
2. 实现复杂
   - prevlen字段导致逻辑复杂
   - 需要处理多种边界情况
   
3. 性能不稳定
   - 某些操作可能突然变慢
   - 难以预测性能表现
```

**Listpack的设计目标：**
```
1. 解决级联更新问题
   - 消除prevlen字段
   - 使用更简单的结构
   
2. 简化实现
   - 更简单的编码方式
   - 更容易维护
   
3. 提高性能稳定性
   - 避免最坏情况
   - 性能更可预测
```

### 4.2 Listpack的结构

**整体结构：**
```
<total_bytes> <size> <entry1> <entry2> ... <entryN> <LP_EOF>

total_bytes: 4字节，整个listpack占用的字节数
size: 2字节，节点数量（如果<65535）
entry: 节点，包含encoding和data
LP_EOF: 1字节，结束标记（0xFF）
```

**节点结构（关键改进）：**
```
<encoding-type> <element-data> <element-tot-len>

encoding-type: 编码类型和长度（1-9字节）
element-data: 实际数据
element-tot-len: 节点总长度（1-5字节，反向存储）

关键改进：
- 没有prevlen字段！
- element-tot-len反向存储（从后往前读取）
- 每个节点独立，不依赖前一个节点
```

### 4.3 Listpack的内存布局

**内存布局图解：**
```
哈希 "user:1001" 使用listpack编码：

┌─────────────────────────────────────────────┐
│  total_bytes (4字节)  │  总字节数            │
├─────────────────────────────────────────────┤
│  size (2字节)        │  节点数量 (6)        │
├─────────────────────────────────────────────┤
│  entry1: encoding, "name", tot-len          │  ← field1
├─────────────────────────────────────────────┤
│  entry2: encoding, "Alice", tot-len         │  ← value1
├─────────────────────────────────────────────┤
│  entry3: encoding, "age", tot-len          │  ← field2
├─────────────────────────────────────────────┤
│  entry4: encoding, "30", tot-len           │  ← value2
├─────────────────────────────────────────────┤
│  entry5: encoding, "email", tot-len        │  ← field3
├─────────────────────────────────────────────┤
│  entry6: encoding, "alice@", tot-len       │  ← value3
├─────────────────────────────────────────────┤
│  LP_EOF (1字节)      │  结束标记 (0xFF)    │
└─────────────────────────────────────────────┘

特点：
- 每个节点独立存储
- tot-len反向存储，从后往前读取
- 没有prevlen字段，不会触发级联更新
```

### 4.4 Listpack如何解决级联更新问题

**核心机制：反向存储tot-len**

**传统ziplist的问题：**
```
ziplist的prevlen字段：
- 存储前一个节点的长度
- 如果前一个节点长度变化，当前节点的prevlen需要更新
- 可能导致连锁反应

entry1: prevlen=0, len=10, data="a"
entry2: prevlen=1, len=10, data="b"  ← 依赖entry1的长度
entry3: prevlen=1, len=10, data="c"  ← 依赖entry2的长度
```

**Listpack的解决方案：**
```
listpack的tot-len字段：
- 存储当前节点的总长度
- 反向存储（从后往前读取）
- 每个节点独立，不依赖其他节点

entry1: encoding, data="a", tot-len=15  ← 独立
entry2: encoding, data="b", tot-len=15  ← 独立，不依赖entry1
entry3: encoding, data="c", tot-len=15  ← 独立，不依赖entry2

插入新节点时：
- 只需要更新新节点本身
- 不需要更新后续节点
- 不会触发连锁反应
```

**插入操作对比：**

**Ziplist插入（可能触发级联更新）：**
```
在头部插入大节点：

步骤1：插入新节点
entry0: prevlen=0, len=300  ← 新节点
entry1: prevlen=1, len=10   ← 需要更新为prevlen=5
entry2: prevlen=1, len=10   ← 可能需要更新
entry3: prevlen=1, len=10   ← 可能需要更新
...

步骤2：更新entry1
entry0: prevlen=0, len=300
entry1: prevlen=5, len=14   ← 已更新，长度变化
entry2: prevlen=1, len=10   ← 需要检查并可能更新
...

步骤3：如果entry1新长度>=254，更新entry2
entry0: prevlen=0, len=300
entry1: prevlen=5, len=14
entry2: prevlen=5, len=14   ← 已更新，长度变化
entry3: prevlen=1, len=10   ← 需要检查并可能更新
...

可能继续级联...
```

**Listpack插入（不会触发级联更新）：**
```
在头部插入大节点：

步骤1：插入新节点
entry0: encoding, data="...", tot-len=305  ← 新节点
entry1: encoding, data="a", tot-len=15     ← 不需要更新！
entry2: encoding, data="b", tot-len=15    ← 不需要更新！
entry3: encoding, data="c", tot-len=15    ← 不需要更新！
...

完成！只需要插入新节点，时间复杂度O(1)
```

**图解对比：**

**Ziplist级联更新过程：**
```
插入前：
┌─────┬─────┬─────┐
│ e1  │ e2  │ e3  │
└─────┴─────┴─────┘
  ↑     ↑     ↑
  │     │     │
  └─────┴─────┘
    prevlen依赖关系

插入大节点后：
┌─────┬─────┬─────┬─────┐
│ e0  │ e1  │ e2  │ e3  │
└─────┴─────┴─────┴─────┘
  ↑     ↑     ↑     ↑
  │     │     │     │
  └─────┴─────┴─────┘
    级联更新链
    e1更新 → e2更新 → e3更新
```

**Listpack无级联更新：**
```
插入前：
┌─────┬─────┬─────┐
│ e1  │ e2  │ e3  │
└─────┴─────┴─────┘
  独立  独立  独立

插入大节点后：
┌─────┬─────┬─────┬─────┐
│ e0  │ e1  │ e2  │ e3  │
└─────┴─────┴─────┴─────┘
  独立  独立  独立  独立
  只需插入e0，其他节点不受影响
```

### 4.5 Listpack的编码方式

**编码类型：**
```
1. 字符串编码
   - 0xxxxxxx: 7位字符串长度（0-127）
   - 10xxxxxx + len: 14位字符串长度
   - 11000000 + len(32位): 32位字符串长度
   - 11110000 + len(64位): 64位字符串长度

2. 整数编码
   - 11110001: 16位有符号整数
   - 11110010: 32位有符号整数
   - 11110011: 64位有符号整数
   - 11111111: 24位有符号整数
   - 1111xxxx: 4位整数（0-12，直接编码在type中）
```

**tot-len编码（反向存储）：**
```
tot-len字段：
- 存储当前节点的总长度
- 从节点末尾向前读取
- 1-5字节可变长度编码

编码方式：
- 0xxxxxxx: 7位长度（1字节）
- 10xxxxxx + len: 14位长度（2字节）
- 11000000 + len(32位): 32位长度（5字节）
- 11100000 + len(16位): 16位长度（3字节）
- 11110000 + len(24位): 24位长度（4字节）
```

### 4.6 Listpack的查找操作

**查找流程：**
```
查找 "user:1001" 的 "age" 字段：

步骤1：从listpack头部开始遍历
步骤2：读取每个节点的encoding和data
步骤3：如果是field且匹配，读取下一个节点作为value
步骤4：如果找到，返回value；否则继续遍历

时间复杂度：O(n)，n为节点数量
```

**代码实现（简化）：**
```c
// 在listpack中查找field
unsigned char *lpFind(unsigned char *lp, unsigned char *field, 
                     uint32_t fieldlen, int skip) {
    unsigned char *p = lpFirst(lp);
    unsigned char *vstr = NULL;
    uint32_t vlen = UINT32_MAX;
    int64_t vll = INT64_MIN;
    
    // 遍历listpack
    while (p) {
        // 读取当前节点
        unsigned char *fptr = p;
        p = lpGet(fptr, &vstr, &vlen, &vll);
        
        // 比较field
        if (vstr && vlen == fieldlen && 
            memcmp(vstr, field, fieldlen) == 0) {
            // 找到field，返回下一个节点（value）
            return lpNext(lp, p);
        }
        
        // 跳过value，移动到下一个field
        if (p) {
            p = lpNext(lp, p);
        }
    }
    
    return NULL;
}
```

### 4.7 Listpack的优缺点

**优点：**
- ✅ 解决级联更新问题：每个节点独立，插入/删除不会影响其他节点
- ✅ 时间复杂度稳定：插入/删除O(1)，不会出现O(n²)的最坏情况
- ✅ 实现更简单：没有prevlen字段，逻辑更清晰
- ✅ 内存占用小：与ziplist相当，紧凑存储

**缺点：**
- ❌ 查找效率低：O(n)时间复杂度（与ziplist相同）
- ❌ 插入/删除需要移动：与ziplist相同
- ❌ 需要反向读取：tot-len从后往前读取，实现稍复杂

### 4.8 Listpack vs Ziplist对比

| 特性 | Ziplist | Listpack |
|------|---------|----------|
| **prevlen字段** | ✅ 有 | ❌ 无 |
| **tot-len字段** | ❌ 无 | ✅ 有（反向存储） |
| **级联更新** | ❌ 可能发生 | ✅ 不会发生 |
| **插入时间复杂度** | O(1)平均，O(n²)最坏 | O(1) |
| **删除时间复杂度** | O(1)平均，O(n²)最坏 | O(1) |
| **查找时间复杂度** | O(n) | O(n) |
| **内存占用** | 小 | 小（相当） |
| **实现复杂度** | 较高 | 较低 |

---

## 四、Listpack编码详解（Redis 7.0+）

### 4.1 Listpack的出现背景

**为什么需要Listpack？**

**Ziplist的问题：**
```
1. 级联更新问题
   - 最坏情况O(n²)时间复杂度
   - 可能造成延迟峰值
   
2. 实现复杂
   - prevlen字段导致逻辑复杂
   - 需要处理多种边界情况
   
3. 性能不稳定
   - 某些操作可能突然变慢
   - 难以预测性能表现
```

**Listpack的设计目标：**
```
1. 解决级联更新问题
   - 消除prevlen字段
   - 使用更简单的结构
   
2. 简化实现
   - 更简单的编码方式
   - 更容易维护
   
3. 提高性能稳定性
   - 避免最坏情况
   - 性能更可预测
```

### 4.2 Listpack的结构

**整体结构：**
```
<total_bytes> <size> <entry1> <entry2> ... <entryN> <LP_EOF>

total_bytes: 4字节，整个listpack占用的字节数
size: 2字节，节点数量（如果<65535）
entry: 节点，包含encoding和data
LP_EOF: 1字节，结束标记（0xFF）
```

**节点结构（关键改进）：**
```
<encoding-type> <element-data> <element-tot-len>

encoding-type: 编码类型和长度（1-9字节）
element-data: 实际数据
element-tot-len: 节点总长度（1-5字节，反向存储）

关键改进：
- 没有prevlen字段！
- element-tot-len反向存储（从后往前读取）
- 每个节点独立，不依赖前一个节点
```

### 4.3 Listpack的内存布局

**内存布局图解：**
```
哈希 "user:1001" 使用listpack编码：

┌─────────────────────────────────────────────┐
│  total_bytes (4字节)  │  总字节数            │
├─────────────────────────────────────────────┤
│  size (2字节)        │  节点数量 (6)        │
├─────────────────────────────────────────────┤
│  entry1: encoding, "name", tot-len          │  ← field1
├─────────────────────────────────────────────┤
│  entry2: encoding, "Alice", tot-len         │  ← value1
├─────────────────────────────────────────────┤
│  entry3: encoding, "age", tot-len          │  ← field2
├─────────────────────────────────────────────┤
│  entry4: encoding, "30", tot-len           │  ← value2
├─────────────────────────────────────────────┤
│  entry5: encoding, "email", tot-len        │  ← field3
├─────────────────────────────────────────────┤
│  entry6: encoding, "alice@", tot-len       │  ← value3
├─────────────────────────────────────────────┤
│  LP_EOF (1字节)      │  结束标记 (0xFF)    │
└─────────────────────────────────────────────┘

特点：
- 每个节点独立存储
- tot-len反向存储，从后往前读取
- 没有prevlen字段，不会触发级联更新
```

### 4.4 Listpack如何解决级联更新问题

**核心机制：反向存储tot-len**

**传统ziplist的问题：**
```
ziplist的prevlen字段：
- 存储前一个节点的长度
- 如果前一个节点长度变化，当前节点的prevlen需要更新
- 可能导致连锁反应

entry1: prevlen=0, len=10, data="a"
entry2: prevlen=1, len=10, data="b"  ← 依赖entry1的长度
entry3: prevlen=1, len=10, data="c"  ← 依赖entry2的长度
```

**Listpack的解决方案：**
```
listpack的tot-len字段：
- 存储当前节点的总长度
- 反向存储（从后往前读取）
- 每个节点独立，不依赖其他节点

entry1: encoding, data="a", tot-len=15  ← 独立
entry2: encoding, data="b", tot-len=15  ← 独立，不依赖entry1
entry3: encoding, data="c", tot-len=15  ← 独立，不依赖entry2

插入新节点时：
- 只需要更新新节点本身
- 不需要更新后续节点
- 不会触发连锁反应
```

**插入操作对比：**

**Ziplist插入（可能触发级联更新）：**
```
在头部插入大节点：

步骤1：插入新节点
entry0: prevlen=0, len=300  ← 新节点
entry1: prevlen=1, len=10   ← 需要更新为prevlen=5
entry2: prevlen=1, len=10   ← 可能需要更新
entry3: prevlen=1, len=10   ← 可能需要更新
...

步骤2：更新entry1
entry0: prevlen=0, len=300
entry1: prevlen=5, len=14   ← 已更新，长度变化
entry2: prevlen=1, len=10   ← 需要检查并可能更新
...

步骤3：如果entry1新长度>=254，更新entry2
entry0: prevlen=0, len=300
entry1: prevlen=5, len=14
entry2: prevlen=5, len=14   ← 已更新，长度变化
entry3: prevlen=1, len=10   ← 需要检查并可能更新
...

可能继续级联...
```

**Listpack插入（不会触发级联更新）：**
```
在头部插入大节点：

步骤1：插入新节点
entry0: encoding, data="...", tot-len=305  ← 新节点
entry1: encoding, data="a", tot-len=15     ← 不需要更新！
entry2: encoding, data="b", tot-len=15    ← 不需要更新！
entry3: encoding, data="c", tot-len=15    ← 不需要更新！
...

完成！只需要插入新节点，时间复杂度O(1)
```

**图解对比：**

**Ziplist级联更新过程：**
```
插入前：
┌─────┬─────┬─────┐
│ e1  │ e2  │ e3  │
└─────┴─────┴─────┘
  ↑     ↑     ↑
  │     │     │
  └─────┴─────┘
    prevlen依赖关系

插入大节点后：
┌─────┬─────┬─────┬─────┐
│ e0  │ e1  │ e2  │ e3  │
└─────┴─────┴─────┴─────┘
  ↑     ↑     ↑     ↑
  │     │     │     │
  └─────┴─────┴─────┘
    级联更新链
    e1更新 → e2更新 → e3更新
```

**Listpack无级联更新：**
```
插入前：
┌─────┬─────┬─────┐
│ e1  │ e2  │ e3  │
└─────┴─────┴─────┘
  独立  独立  独立

插入大节点后：
┌─────┬─────┬─────┬─────┐
│ e0  │ e1  │ e2  │ e3  │
└─────┴─────┴─────┴─────┘
  独立  独立  独立  独立
  只需插入e0，其他节点不受影响
```

### 4.5 Listpack的编码方式

**编码类型：**
```
1. 字符串编码
   - 0xxxxxxx: 7位字符串长度（0-127）
   - 10xxxxxx + len: 14位字符串长度
   - 11000000 + len(32位): 32位字符串长度
   - 11110000 + len(64位): 64位字符串长度

2. 整数编码
   - 11110001: 16位有符号整数
   - 11110010: 32位有符号整数
   - 11110011: 64位有符号整数
   - 11111111: 24位有符号整数
   - 1111xxxx: 4位整数（0-12，直接编码在type中）
```

**tot-len编码（反向存储）：**
```
tot-len字段：
- 存储当前节点的总长度
- 从节点末尾向前读取
- 1-5字节可变长度编码

编码方式：
- 0xxxxxxx: 7位长度（1字节）
- 10xxxxxx + len: 14位长度（2字节）
- 11000000 + len(32位): 32位长度（5字节）
- 11100000 + len(16位): 16位长度（3字节）
- 11110000 + len(24位): 24位长度（4字节）
```

### 4.6 Listpack的查找操作

**查找流程：**
```
查找 "user:1001" 的 "age" 字段：

步骤1：从listpack头部开始遍历
步骤2：读取每个节点的encoding和data
步骤3：如果是field且匹配，读取下一个节点作为value
步骤4：如果找到，返回value；否则继续遍历

时间复杂度：O(n)，n为节点数量
```

**代码实现（简化）：**
```c
// 在listpack中查找field
unsigned char *lpFind(unsigned char *lp, unsigned char *field, 
                     uint32_t fieldlen, int skip) {
    unsigned char *p = lpFirst(lp);
    unsigned char *vstr = NULL;
    uint32_t vlen = UINT32_MAX;
    int64_t vll = INT64_MIN;
    
    // 遍历listpack
    while (p) {
        // 读取当前节点
        unsigned char *fptr = p;
        p = lpGet(fptr, &vstr, &vlen, &vll);
        
        // 比较field
        if (vstr && vlen == fieldlen && 
            memcmp(vstr, field, fieldlen) == 0) {
            // 找到field，返回下一个节点（value）
            return lpNext(lp, p);
        }
        
        // 跳过value，移动到下一个field
        if (p) {
            p = lpNext(lp, p);
        }
    }
    
    return NULL;
}
```

### 4.7 Listpack的优缺点

**优点：**
- ✅ 解决级联更新问题：每个节点独立，插入/删除不会影响其他节点
- ✅ 时间复杂度稳定：插入/删除O(1)，不会出现O(n²)的最坏情况
- ✅ 实现更简单：没有prevlen字段，逻辑更清晰
- ✅ 内存占用小：与ziplist相当，紧凑存储

**缺点：**
- ❌ 查找效率低：O(n)时间复杂度（与ziplist相同）
- ❌ 插入/删除需要移动：与ziplist相同
- ❌ 需要反向读取：tot-len从后往前读取，实现稍复杂

### 4.8 Listpack vs Ziplist对比

| 特性 | Ziplist | Listpack |
|------|---------|----------|
| **prevlen字段** | ✅ 有 | ❌ 无 |
| **tot-len字段** | ❌ 无 | ✅ 有（反向存储） |
| **级联更新** | ❌ 可能发生 | ✅ 不会发生 |
| **插入时间复杂度** | O(1)平均，O(n²)最坏 | O(1) |
| **删除时间复杂度** | O(1)平均，O(n²)最坏 | O(1) |
| **查找时间复杂度** | O(n) | O(n) |
| **内存占用** | 小 | 小（相当） |
| **实现复杂度** | 较高 | 较低 |

---

## 五、Hashtable编码详解

### 4.1 哈希表（dict）的结构

**核心数据结构：**
```c
// 哈希表节点
typedef struct dictEntry {
    void *key;              // 键（field）
    union {
        void *val;          // 值（value）
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

### 4.2 哈希表的内存布局

**内存布局图解：**
```
哈希 "user:1001" 使用hashtable编码：

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
    │  table: ───────────────────────────┼──┐
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
                    │  key: "name"                 │
                    │  v.val: "Alice"              │
                    │  next: NULL                  │
                    └──────────────────────────────┘
```

### 4.3 哈希函数和冲突解决

**哈希函数：**
```c
// Redis使用的哈希函数（SipHash）
uint64_t siphash(const uint8_t *in, const size_t inlen, 
                 const uint8_t *k);

// 计算哈希值
unsigned int hash = siphash(field, fieldlen, dict->hash_seed);
// 计算索引
unsigned int index = hash & dict->ht[0].sizemask;
```

**冲突解决：链地址法：**
```
哈希冲突处理：

假设：
- field "name" 的哈希值 = 5，index = 5 & 3 = 1
- field "age" 的哈希值 = 9，index = 9 & 3 = 1（冲突）

解决方式：
table[1] -> entry("name") -> entry("age") -> NULL
          └─ 头节点        └─ 冲突节点（链式存储）
```

### 4.4 渐进式Rehash

**为什么需要Rehash？**

**问题：**
```
哈希表负载因子过高时：
- 冲突增多，查找效率下降
- 需要扩容

传统一次性rehash的问题：
- 大数据量时，rehash会阻塞服务
- 延迟不可接受
```

**Redis的解决方案：渐进式Rehash**

**Rehash过程：**
```
阶段1：准备阶段
  └─> 创建ht[1]，大小为ht[0]的2倍
  └─> 设置rehashidx = 0

阶段2：迁移阶段（渐进式）
  └─> 每次操作时，迁移ht[0]的rehashidx位置的bucket
  └─> rehashidx++
  └─> 直到rehashidx >= ht[0].size

阶段3：完成阶段
  └─> 释放ht[0]
  └─> 将ht[1]设置为ht[0]
  └─> 创建新的ht[1]（NULL）
  └─> 设置rehashidx = -1
```

**Rehash图解：**
```
Rehash过程（简化示例）：

初始状态：
┌─────────────┐
│  ht[0]      │  size=4, used=3
│  table[4]   │
└─────────────┘
┌─────────────┐
│  ht[1]      │  NULL
└─────────────┘
rehashidx = -1

开始Rehash：
┌─────────────┐
│  ht[0]      │  size=4, used=3
│  table[4]   │
└─────────────┘
┌─────────────┐
│  ht[1]      │  size=8, used=0
│  table[8]   │  ← 新创建，大小为2倍
└─────────────┘
rehashidx = 0  ← 开始迁移

迁移过程中（rehashidx=2）：
┌─────────────┐
│  ht[0]      │  size=4, used=1
│  table[0]   │  ← 已迁移
│  table[1]   │  ← 已迁移
│  table[2]   │  ← 正在迁移
│  table[3]   │  ← 待迁移
└─────────────┘
┌─────────────┐
│  ht[1]      │  size=8, used=2
│  table[8]   │  ← 已迁移的数据
└─────────────┘
rehashidx = 2

完成Rehash：
┌─────────────┐
│  ht[0]      │  size=8, used=3
│  table[8]   │  ← 原ht[1]
└─────────────┘
┌─────────────┐
│  ht[1]      │  NULL
└─────────────┘
rehashidx = -1
```

**代码实现：**
```c
// 执行渐进式rehash
int dictRehash(dict *d, int n) {
    int empty_visits = n * 10;  // 最多访问n*10个空bucket
    
    if (!dictIsRehashing(d)) return 0;
    
    while (n-- && d->ht[0].used != 0) {
        dictEntry *de, *nextde;
        
        // 跳过空bucket
        while (d->ht[0].table[d->rehashidx] == NULL) {
            d->rehashidx++;
            if (--empty_visits == 0) return 1;
        }
        
        // 迁移bucket中的所有节点
        de = d->ht[0].table[d->rehashidx];
        while (de) {
            uint64_t h;
            nextde = de->next;
            
            // 计算在新表中的索引
            h = dictHashKey(d, de->key) & d->ht[1].sizemask;
            de->next = d->ht[1].table[h];
            d->ht[1].table[h] = de;
            d->ht[0].used--;
            d->ht[1].used++;
            de = nextde;
        }
        d->ht[0].table[d->rehashidx] = NULL;
        d->rehashidx++;
    }
    
    // 检查是否完成rehash
    if (d->ht[0].used == 0) {
        zfree(d->ht[0].table);
        d->ht[0] = d->ht[1];
        _dictReset(&d->ht[1]);
        d->rehashidx = -1;
        return 0;
    }
    
    return 1;
}
```

---

## 六、哈希的CRUD操作详解

### 5.1 CREATE操作（HSET命令）

**操作流程：**
```
HSET user:1001 name "Alice"

步骤1：解析命令
  └─> key = "user:1001", field = "name", value = "Alice"

步骤2：查找或创建哈希对象
  └─> 在数据库中查找key
  └─> 如果不存在，创建新的哈希对象

步骤3：检查编码方式
  └─> 如果是ziplist，检查是否需要转换为hashtable
  └─> 如果字段数量或大小超限，转换为hashtable

步骤4：设置字段值
  └─> 根据编码方式执行不同的操作
      ├─> ziplist: 在ziplist末尾添加field和value
      └─> hashtable: 在哈希表中设置或更新entry
```

**Ziplist编码的SET操作：**
```
执行前：
┌─────────────────────────────────────────┐
│  ziplist (空)                            │
│  zlbytes, zltail, zllen=0, zlend        │
└─────────────────────────────────────────┘

执行 HSET user:1001 name "Alice"：
┌─────────────────────────────────────────┐
│  zlbytes, zltail, zllen=2               │
│  entry1: "name"                          │
│  entry2: "Alice"                         │
│  zlend                                   │
└─────────────────────────────────────────┘

执行 HSET user:1001 age "30"：
┌─────────────────────────────────────────┐
│  zlbytes, zltail, zllen=4               │
│  entry1: "name"                          │
│  entry2: "Alice"                         │
│  entry3: "age"                           │
│  entry4: "30"                            │
│  zlend                                   │
└─────────────────────────────────────────┘
```

**Hashtable编码的SET操作：**
```
执行 HSET user:1001 name "Alice"：

步骤1：计算哈希值
  hash("name") = 5
  index = 5 & 3 = 1

步骤2：查找bucket
  table[1] -> NULL（不存在）

步骤3：创建新节点
  ┌─────────────────────┐
  │  dictEntry          │
  │  key: "name"        │
  │  v.val: "Alice"     │
  │  next: NULL         │
  └─────────────────────┘

步骤4：插入bucket
  table[1] -> entry("name") -> NULL
```

**编码转换过程：**
```
场景：ziplist转换为hashtable

触发条件：
1. 字段数量 >= hash-max-ziplist-entries
2. 字段名或值大小 >= hash-max-ziplist-value

转换过程：
1. 创建新的dict
2. 遍历ziplist，将所有field-value插入dict
3. 释放ziplist
4. 更新对象的encoding为OBJ_ENCODING_HT
```

**代码实现：**
```c
// HSET命令处理
void hsetCommand(client *c) {
    int i, updated = 0;
    robj *o;
    
    // 查找或创建哈希对象
    if ((o = hashTypeLookupWriteOrCreate(c, c->argv[1])) == NULL) return;
    
    // 检查是否需要转换编码
    hashTypeTryConversion(o, c->argv, 2, c->argc - 1);
    
    // 设置字段值
    for (i = 2; i < c->argc; i += 2) {
        if (hashTypeSet(o, c->argv[i]->ptr, sdslen(c->argv[i]->ptr),
                        c->argv[i+1]->ptr, sdslen(c->argv[i+1]->ptr),
                        HASH_SET_COPY)) {
            updated++;
        }
    }
    
    // 返回结果
    addReplyLongLong(c, updated);
    signalModifiedKey(c->db, c->argv[1]);
    notifyKeyspaceEvent(NOTIFY_HASH, "hset", c->argv[1], c->db->id);
    server.dirty++;
}

// 设置字段值
int hashTypeSet(robj *o, sds field, size_t fieldlen, 
                sds value, size_t valuelen, int flags) {
    int update = 0;
    
    if (o->encoding == OBJ_ENCODING_ZIPLIST) {
        // ziplist编码
        unsigned char *zl, *fptr, *vptr;
        
        zl = o->ptr;
        fptr = ziplistIndex(zl, ZIPLIST_HEAD);
        if (fptr != NULL) {
            // 查找field
            fptr = ziplistFind(zl, fptr, (unsigned char*)field, 
                              fieldlen, 1);
            if (fptr != NULL) {
                // 找到，更新value
                vptr = ziplistNext(zl, fptr);
                update = 1;
                zl = ziplistDelete(zl, &vptr);
                zl = ziplistInsert(zl, vptr, (unsigned char*)value, 
                                  valuelen);
            }
        }
        
        if (!update) {
            // 未找到，添加field和value
            zl = ziplistPush(zl, (unsigned char*)field, fieldlen, 
                            ZIPLIST_TAIL);
            zl = ziplistPush(zl, (unsigned char*)value, valuelen, 
                            ZIPLIST_TAIL);
        }
        o->ptr = zl;
        
    } else if (o->encoding == OBJ_ENCODING_HT) {
        // hashtable编码
        dictEntry *de = dictFind(o->ptr, field);
        if (de) {
            // 找到，更新value
            sdsfree(dictGetVal(de));
            dictSetVal(o->ptr, de, sdsdup(value));
            update = 1;
        } else {
            // 未找到，添加新entry
            sds f = sdsdup(field);
            sds v = sdsdup(value);
            dictAdd(o->ptr, f, v);
        }
    }
    
    return update;
}
```

### 5.2 READ操作（HGET命令）

**操作流程：**
```
HGET user:1001 name

步骤1：解析命令
  └─> key = "user:1001", field = "name"

步骤2：查找哈希对象
  └─> 在数据库中查找key
  └─> 如果不存在，返回nil

步骤3：检查类型
  └─> 检查是否为哈希类型
  └─> 如果不是，返回错误

步骤4：查找字段值
  └─> 根据编码方式执行不同的查找
      ├─> ziplist: 遍历查找field
      └─> hashtable: 哈希查找field

步骤5：返回value
  └─> 如果找到，返回value
  └─> 如果未找到，返回nil
```

**Ziplist编码的GET操作：**
```
查找流程：

┌─────────────────────────────────────────┐
│  ziplist                                 │
│  entry1: "name"  ← 比较，不匹配         │
│  entry2: "Alice" ← 跳过（value）        │
│  entry3: "age"   ← 比较，不匹配         │
│  entry4: "30"    ← 跳过（value）        │
│  entry5: "email" ← 比较，不匹配         │
│  entry6: "alice@" ← 跳过（value）       │
│  ...                                     │
└─────────────────────────────────────────┘

时间复杂度：O(n)
```

**Hashtable编码的GET操作：**
```
查找流程：

步骤1：计算哈希值
  hash("name") = 5
  index = 5 & 3 = 1

步骤2：查找bucket
  table[1] -> entry("name") -> entry("age") -> NULL
            └─ 比较key，匹配！

步骤3：返回value
  entry("name")->v.val = "Alice"

时间复杂度：O(1)平均，O(n)最坏（所有key冲突）
```

**代码实现：**
```c
// HGET命令处理
void hgetCommand(client *c) {
    robj *o;
    
    // 查找哈希对象
    if ((o = lookupKeyReadOrReply(c, c->argv[1], shared.nullbulk)) == NULL ||
        checkType(c, o, OBJ_HASH)) return;
    
    // 查找字段值
    robj *value = hashTypeGetObject(o, c->argv[2]);
    if (value == NULL) {
        addReply(c, shared.nullbulk);
    } else {
        addReplyBulk(c, value);
        decrRefCount(value);
    }
}

// 获取字段值
robj *hashTypeGetObject(robj *o, robj *field) {
    if (o->encoding == OBJ_ENCODING_ZIPLIST) {
        // ziplist编码
        unsigned char *vstr = NULL;
        unsigned int vlen = UINT_MAX;
        long long vll = LLONG_MIN;
        
        if (hashTypeGetFromZiplist(o, field, &vstr, &vlen, &vll) == 0)
            return NULL;
        
        if (vstr) {
            return createStringObject((char*)vstr, vlen);
        } else {
            return createStringObjectFromLongLong(vll);
        }
        
    } else if (o->encoding == OBJ_ENCODING_HT) {
        // hashtable编码
        dictEntry *de = dictFind(o->ptr, field);
        if (de == NULL) return NULL;
        return dictGetVal(de);
    } else {
        serverPanic("Unknown hash encoding");
    }
    return NULL;
}
```

### 5.3 UPDATE操作（HSET更新已存在字段）

**操作流程：**
```
HSET user:1001 name "Bob"  // 更新已存在的字段

步骤1：查找字段
  └─> 在哈希中查找field "name"

步骤2：更新值
  └─> 根据编码方式执行不同的更新
      ├─> ziplist: 删除旧value，插入新value
      └─> hashtable: 更新entry的value

步骤3：返回结果
  └─> 返回0（更新）或1（新建）
```

**Ziplist编码的UPDATE操作：**
```
更新前：
┌─────────────────────────────────────────┐
│  entry1: "name"                          │
│  entry2: "Alice"  ← 需要更新             │
│  entry3: "age"                           │
│  entry4: "30"                            │
└─────────────────────────────────────────┘

更新后：
┌─────────────────────────────────────────┐
│  entry1: "name"                          │
│  entry2: "Bob"    ← 已更新               │
│  entry3: "age"                           │
│  entry4: "30"                            │
└─────────────────────────────────────────┘

操作：
1. 找到field "name"的位置
2. 找到下一个entry（value "Alice"）
3. 删除value entry
4. 在相同位置插入新value "Bob"
```

**Hashtable编码的UPDATE操作：**
```
更新前：
table[1] -> entry("name", "Alice") -> NULL
                    │
                    └─ v.val = "Alice"

更新后：
table[1] -> entry("name", "Bob") -> NULL
                    │
                    └─ v.val = "Bob"  ← 已更新

操作：
1. 查找entry（哈希查找，O(1)）
2. 释放旧value的内存
3. 设置新value
```

### 5.4 DELETE操作（HDEL命令）

**操作流程：**
```
HDEL user:1001 name

步骤1：解析命令
  └─> key = "user:1001", field = "name"

步骤2：查找哈希对象
  └─> 在数据库中查找key

步骤3：删除字段
  └─> 根据编码方式执行不同的删除
      ├─> ziplist: 删除field和value两个entry
      └─> hashtable: 从哈希表中删除entry

步骤4：检查是否需要转换编码
  └─> 如果hashtable字段很少，可能转换为ziplist

步骤5：返回结果
  └─> 返回删除的字段数量
```

**Ziplist编码的DELETE操作：**
```
删除前：
┌─────────────────────────────────────────┐
│  entry1: "name"   ← 需要删除            │
│  entry2: "Alice"  ← 需要删除            │
│  entry3: "age"                           │
│  entry4: "30"                            │
└─────────────────────────────────────────┘

删除后：
┌─────────────────────────────────────────┐
│  entry1: "age"    ← 前移                 │
│  entry2: "30"     ← 前移                 │
└─────────────────────────────────────────┘

操作：
1. 找到field "name"的位置
2. 删除field entry
3. 删除value entry
4. 后续entry前移（内存移动）
```

**Hashtable编码的DELETE操作：**
```
删除前：
table[1] -> entry("name", "Alice") -> entry("age", "30") -> NULL
            └─ 需要删除

删除后：
table[1] -> entry("age", "30") -> NULL

操作：
1. 计算哈希值，找到bucket
2. 遍历链表，找到entry
3. 从链表中删除entry
4. 释放entry和value的内存
```

**代码实现：**
```c
// HDEL命令处理
void hdelCommand(client *c) {
    robj *o;
    int j, deleted = 0, keyremoved = 0;
    
    // 查找哈希对象
    if ((o = lookupKeyWriteOrReply(c, c->argv[1], shared.czero)) == NULL ||
        checkType(c, o, OBJ_HASH)) return;
    
    // 删除字段
    for (j = 2; j < c->argc; j++) {
        if (hashTypeDelete(o, c->argv[j]->ptr, sdslen(c->argv[j]->ptr))) {
            deleted++;
            if (hashTypeLength(o) == 0) {
                // 哈希为空，删除key
                dbDelete(c->db, c->argv[1]);
                keyremoved = 1;
                break;
            }
        }
    }
    
    // 返回结果
    if (deleted) {
        signalModifiedKey(c->db, c->argv[1]);
        notifyKeyspaceEvent(NOTIFY_HASH, "hdel", c->argv[1], c->db->id);
        if (keyremoved)
            notifyKeyspaceEvent(NOTIFY_GENERIC, "del", c->argv[1], c->db->id);
        server.dirty++;
    }
    addReplyLongLong(c, deleted);
}

// 删除字段
int hashTypeDelete(robj *o, sds field, size_t fieldlen) {
    int deleted = 0;
    
    if (o->encoding == OBJ_ENCODING_ZIPLIST) {
        // ziplist编码
        unsigned char *zl, *fptr, *vptr;
        
        zl = o->ptr;
        fptr = ziplistIndex(zl, ZIPLIST_HEAD);
        if (fptr != NULL) {
            // 查找field
            fptr = ziplistFind(zl, fptr, (unsigned char*)field, 
                              fieldlen, 1);
            if (fptr != NULL) {
                // 找到，删除field和value
                zl = ziplistDelete(zl, &fptr);
                zl = ziplistDelete(zl, &fptr);
                o->ptr = zl;
                deleted = 1;
            }
        }
        
    } else if (o->encoding == OBJ_ENCODING_HT) {
        // hashtable编码
        if (dictDelete((dict*)o->ptr, field) == DICT_OK) {
            deleted = 1;
            
            // 检查是否需要转换为ziplist
            if (hashTypeLength(o) == 0) {
                // 哈希为空，可以转换为ziplist
                // 但通常保持hashtable编码
            }
        }
    }
    
    return deleted;
}
```

### 5.5 批量操作（HMSET/HMGET）

**HMSET操作：**
```
HMSET user:1001 name "Alice" age "30" email "alice@example.com"

操作流程：
1. 解析所有field-value对
2. 检查是否需要转换编码
3. 批量设置所有字段
4. 返回结果

优势：
- 减少网络往返
- 原子性操作
- 性能更好
```

**HMGET操作：**
```
HMGET user:1001 name age email

操作流程：
1. 解析所有field
2. 批量查找所有字段值
3. 返回结果数组

优势：
- 减少网络往返
- 一次获取多个字段
```

---

## 七、编码转换机制

### 6.1 Ziplist转Hashtable

**触发条件：**
```
1. 字段数量 >= hash-max-ziplist-entries
2. 字段名或值大小 >= hash-max-ziplist-value
3. 执行HSET时检查
```

**转换过程：**
```
步骤1：创建新的dict
  └─> dictCreate()

步骤2：遍历ziplist
  └─> 读取每个field-value对
  └─> 插入到dict中

步骤3：更新对象
  └─> 释放ziplist
  └─> 设置encoding为OBJ_ENCODING_HT
  └─> 设置ptr为dict
```

**转换图解：**
```
转换前（ziplist）：
┌─────────────────────────────────────────┐
│  ziplist                                 │
│  entry1: "name"                          │
│  entry2: "Alice"                         │
│  entry3: "age"                           │
│  entry4: "30"                            │
│  ...                                     │
└─────────────────────────────────────────┘

转换后（hashtable）：
┌─────────────────────────────────────────┐
│  dict                                    │
│  ht[0]:                                  │
│    table[4]                              │
│    [0] -> NULL                           │
│    [1] -> entry("name", "Alice")         │
│    [2] -> entry("age", "30")            │
│    [3] -> NULL                           │
└─────────────────────────────────────────┘
```

### 6.2 Hashtable转Ziplist

**触发条件：**
```
Redis通常不会自动将hashtable转换为ziplist，因为：
1. 转换成本高（需要遍历所有entry）
2. 可能很快又需要转换回来
3. 保持hashtable编码更稳定
```

**特殊情况：**
```
只有在以下情况可能转换：
1. 哈希为空（删除所有字段后）
2. 手动触发（内部操作）
```

---

## 八、实际应用示例

### 7.1 用户信息存储

**场景：**
```
存储用户信息

HSET user:1001 name "Alice"
HSET user:1001 age "30"
HSET user:1001 email "alice@example.com"
HSET user:1001 phone "13800138000"
```

**内存布局（ziplist编码）：**
```
┌─────────────────────────────────────────┐
│  ziplist                                 │
│  entry1: "name"                          │
│  entry2: "Alice"                         │
│  entry3: "age"                           │
│  entry4: "30"                            │
│  entry5: "email"                         │
│  entry6: "alice@example.com"            │
│  entry7: "phone"                         │
│  entry8: "13800138000"                   │
└─────────────────────────────────────────┘

特点：
- 字段少，使用ziplist编码
- 内存占用小
- 查找需要遍历
```

### 7.2 商品信息存储

**场景：**
```
存储商品信息（字段较多）

HMSET product:1001 name "iPhone 14" price "5999" 
     stock "100" category "手机" brand "Apple" 
     description "最新款iPhone" ...
```

**内存布局（hashtable编码）：**
```
┌─────────────────────────────────────────┐
│  dict                                    │
│  ht[0]:                                  │
│    size: 8                               │
│    table[8]                              │
│    [0] -> entry("name", "iPhone 14")    │
│    [1] -> entry("price", "5999")        │
│    [2] -> entry("stock", "100")         │
│    [3] -> entry("category", "手机")     │
│    ...                                   │
└─────────────────────────────────────────┘

特点：
- 字段多，使用hashtable编码
- 查找效率高（O(1)）
- 内存占用较大
```

### 7.3 配置信息存储

**场景：**
```
存储应用配置

HSET config:app timeout "30"
HSET config:app max_conn "1000"
HSET config:app cache_size "100MB"
```

**内存布局：**
```
根据字段数量和大小选择编码：
- 字段少且小：ziplist
- 字段多或大：hashtable
```

---

## 九、性能优化建议

### 8.1 配置优化

**根据场景调整：**
```bash
# 场景1：大量小哈希（如用户信息）
# 提高ziplist阈值，更多使用ziplist节省内存
hash-max-ziplist-entries 1024
hash-max-ziplist-value 128

# 场景2：少量大哈希（如商品详情）
# 降低ziplist阈值，更多使用hashtable提高性能
hash-max-ziplist-entries 256
hash-max-ziplist-value 32

# 场景3：平衡性能和内存
# 使用默认值
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
```

### 8.2 使用建议

**1. 批量操作**
```
使用HMSET/HMGET代替多次HSET/HGET：
- 减少网络往返
- 提高性能
```

**2. 字段设计**
```
合理设计字段名和值：
- 字段名尽量短
- 值大小适中
- 避免频繁转换编码
```

**3. 监控指标**
```
关键指标：
- 哈希数量
- 平均字段数量
- 编码分布（ziplist vs hashtable）
- 内存使用
```

---

## 十、常见问题解答

### 10.1 什么时候使用listpack/ziplist，什么时候使用hashtable？

**答案：**

**使用listpack/ziplist：**
- ✅ 字段数量 < hash-max-listpack-entries（Redis 7.0+）或 hash-max-ziplist-entries（Redis 6.x及之前）
- ✅ 字段名和值大小 < hash-max-listpack-value（Redis 7.0+）或 hash-max-ziplist-value（Redis 6.x及之前）
- ✅ 内存敏感的场景
- ✅ 字段访问不频繁

**使用hashtable：**
- ✅ 字段数量 >= 阈值
- ✅ 字段名或值大小 >= 阈值
- ✅ 需要频繁查找
- ✅ 性能优先的场景

### 10.2 Listpack和Ziplist有什么区别？

**答案：主要区别在于是否解决级联更新问题**

**核心区别：**
```
Ziplist：
- 使用prevlen字段存储前一个节点的长度
- 插入/删除可能触发级联更新
- 最坏情况O(n²)时间复杂度

Listpack：
- 使用tot-len字段存储当前节点的长度（反向存储）
- 每个节点独立，不会触发级联更新
- 插入/删除O(1)时间复杂度
```

**性能对比：**
```
插入操作：
- Ziplist: O(1)平均，O(n²)最坏
- Listpack: O(1)稳定

删除操作：
- Ziplist: O(1)平均，O(n²)最坏
- Listpack: O(1)稳定

查找操作：
- 两者都是O(n)
```

### 10.5 渐进式Rehash会影响性能吗？

**答案：会有一定影响，但影响很小**

**影响分析：**
```
Rehash的影响：
1. 每次操作迁移少量数据（1个bucket）
2. 将rehash成本平摊到每次操作
3. 不会产生明显的延迟峰值

性能影响：
- 单次操作：增加少量开销（< 1%）
- 总体性能：影响很小
- 相比一次性rehash：性能影响可忽略
```

### 10.6 哈希冲突如何处理？

**答案：使用链地址法**

**处理方式：**
```
哈希冲突：
- 多个key映射到同一个bucket
- 使用链表存储冲突的entry

示例：
hash("name") = 5, index = 1
hash("age") = 9, index = 1  (冲突)

table[1] -> entry("name") -> entry("age") -> NULL
          └─ 头节点        └─ 冲突节点

查找：
- 计算index
- 遍历链表查找
- 时间复杂度：O(1)平均，O(n)最坏
```

### 10.7 哈希表什么时候会扩容？

**答案：负载因子过高时**

**扩容条件：**
```
触发条件：
- used / size >= 1（负载因子 >= 1）
- 且没有在执行BGSAVE或BGREWRITEAOF
- 或负载因子 >= 5（强制扩容）

扩容大小：
- 新大小 = 当前大小 × 2
- 必须是2的幂
```

### 10.6 哈希操作的时间复杂度是多少？

**答案：**

| 操作 | Listpack/Ziplist | Hashtable |
|------|-----------------|-----------|
| **HSET** | O(n) | O(1) |
| **HGET** | O(n) | O(1) |
| **HDEL** | O(n) | O(1) |
| **HGETALL** | O(n) | O(n) |
| **HLEN** | O(1) | O(1) |

**注意：**
- Listpack的插入/删除是O(1)，但需要移动数据，实际可能较慢
- Ziplist的插入/删除最坏情况是O(n²)（级联更新）
- Listpack避免了级联更新，性能更稳定

**答案：**

| 操作 | Ziplist | Hashtable |
|------|---------|-----------|
| **HSET** | O(n) | O(1) |
| **HGET** | O(n) | O(1) |
| **HDEL** | O(n) | O(1) |
| **HGETALL** | O(n) | O(n) |
| **HLEN** | O(1) | O(1) |

---

## 十一、总结

### 11.1 核心要点

**1. 三种编码方式（按版本）**
- **Listpack**（Redis 7.0+）：小哈希，内存占用小，查找效率低，解决了级联更新问题
- **Ziplist**（Redis 6.x及之前）：小哈希，内存占用小，查找效率低，存在级联更新问题
- **Hashtable**：大哈希，查找效率高，内存占用大

**2. 编码选择**
- 根据字段数量和大小自动选择
- 可以配置阈值调整选择策略

**3. 渐进式Rehash**
- 避免一次性rehash阻塞服务
- 将rehash成本平摊到每次操作
- 性能影响很小

**4. CRUD操作**
- **CREATE**：根据编码方式插入数据
- **READ**：根据编码方式查找数据
- **UPDATE**：更新已存在的字段值
- **DELETE**：删除字段，可能触发编码转换

### 10.2 优化策略

**1. 配置优化**
- 根据场景调整ziplist阈值
- 平衡内存和性能

**2. 使用优化**
- 使用批量操作（HMSET/HMGET）
- 合理设计字段名和值
- 监控编码分布

### 10.3 最佳实践

**1. 字段设计**
- 字段名尽量短
- 值大小适中
- 避免频繁转换编码

**2. 操作建议**
- 优先使用批量操作
- 避免频繁的编码转换
- 合理设置过期时间

---

通过本文的学习，你应该对Redis哈希数据结构的实现有了深入的理解，包括ziplist和hashtable两种编码方式、渐进式rehash机制、CRUD操作的详细过程，以及各种优化策略。在实际应用中，理解这些底层机制有助于更好地使用Redis哈希，并针对具体场景进行优化。

