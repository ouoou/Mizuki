---
title: Redis有序集合数据结构实现详解
published: 2025-01-23
updated: 2025-01-23
description: 深入解析Redis有序集合数据结构的实现：从ziplist到skiplist+dict，详细图解有序集合的数据结构存储和CRUD操作过程，全面理解跳表和哈希表的组合使用策略
tags:
  - Redis
  - 有序集合
  - Sorted Set
  - ZSet
  - ziplist
  - skiplist
  - dict
  - 跳表
  - CRUD
category: 八股文
draft: false
---

# Redis有序集合数据结构实现详解

Redis的有序集合（Sorted Set，简称ZSet）是一个有序的、不重复的字符串集合，每个元素都关联一个分数（score），用于排序。Redis使用两种编码方式来实现有序集合：ziplist（压缩列表）和skiplist+dict（跳表+哈希表）。当集合较小时使用ziplist，当集合较大时使用skiplist+dict的组合结构。本文将从有序集合的基本概念出发，深入解析两种编码方式的实现原理，并通过详细的图解展示有序集合的存储结构和CRUD操作过程。

## 一、Redis有序集合概述

### 1.1 有序集合的基本概念

**定义：**
Redis的有序集合是一个有序的、不重复的字符串集合，每个元素都关联一个分数（score）。元素按照分数从小到大排序，分数相同时按照元素值（member）的字典序排序。有序集合可以包含最多2^32-1个元素（约40亿个元素）。

**基本操作：**
```
ZADD key score member [score member ...]  # 添加元素
ZREM key member [member ...]             # 删除元素
ZSCORE key member                         # 获取元素分数
ZRANK key member                          # 获取元素排名（从小到大）
ZREVRANK key member                       # 获取元素排名（从大到小）
ZRANGE key start stop [WITHSCORES]        # 获取指定范围的元素
ZREVRANGE key start stop [WITHSCORES]    # 获取指定范围的元素（反向）
ZRANGEBYSCORE key min max [WITHSCORES]    # 按分数范围获取元素
ZCARD key                                 # 获取元素数量
ZINCRBY key increment member              # 增加元素分数
```

### 1.2 有序集合的应用场景

**典型场景：**
```
1. 排行榜
   ZADD leaderboard 100 "user:1001"
   ZADD leaderboard 200 "user:1002"
   ZREVRANGE leaderboard 0 9  // 获取前10名

2. 延时队列
   ZADD delay_queue 1234567890 "task:1001"
   ZRANGEBYSCORE delay_queue 0 1234567890  // 获取到期的任务

3. 范围查询
   ZADD geo:users 39.9 "user:beijing"
   ZADD geo:users 31.2 "user:shanghai"
   ZRANGEBYSCORE geo:users 30 40  // 获取分数在30-40之间的元素

4. 权重排序
   ZADD products 0.8 "product:1001"
   ZADD products 0.9 "product:1002"
   ZREVRANGE products 0 9  // 按权重排序
```

---

## 二、有序集合的编码方式

### 2.1 两种编码方式

**编码类型：**
```
1. OBJ_ENCODING_ZIPLIST（压缩列表）
   - 小集合，元素和分数都较小
   - 内存占用小，但查找效率低
   
2. OBJ_ENCODING_SKIPLIST（跳表+哈希表）
   - 大集合，或元素/分数较大
   - 查找效率高，但内存占用大
   - 同时使用跳表和哈希表
```

### 2.2 编码切换条件

**配置参数：**
```bash
# zset-max-ziplist-entries: 使用ziplist的最大元素数量
# 默认值：128
zset-max-ziplist-entries 128

# zset-max-ziplist-value: 使用ziplist的最大元素/分数大小（字节）
# 默认值：64
zset-max-ziplist-value 64
```

**切换规则：**
```
使用ziplist的条件（同时满足）：
1. 元素数量 < zset-max-ziplist-entries（默认128）
2. 每个元素和分数的大小 < zset-max-ziplist-value（默认64字节）

否则使用skiplist+dict
```

**编码转换触发：**
```
ziplist -> skiplist+dict：
1. 添加元素后，元素数量 >= zset-max-ziplist-entries
2. 添加元素后，元素或分数大小 >= zset-max-ziplist-value
3. 执行ZADD时检查

skiplist+dict -> ziplist：
- Redis不会自动转换回ziplist
- 因为转换成本高，且可能很快又需要转换回来
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
entry: 节点，存储元素和分数
zlend: 1字节，结束标记（0xFF）
```

**有序集合在ziplist中的存储：**
```
ziplist中的有序集合存储格式：
[member1, score1, member2, score2, member3, score3, ...]

特点：
- 元素和分数交替存储
- 按分数从小到大排序
- 分数相同时按元素值排序
- 查找需要遍历
```

### 3.2 Ziplist的内存布局

**内存布局图解：**
```
有序集合 "myzset" 使用ziplist编码：

┌─────────────────────────────────────────────┐
│  zlbytes (4字节)  │  总字节数                │
├─────────────────────────────────────────────┤
│  zltail (4字节)   │  尾节点偏移量            │
├─────────────────────────────────────────────┤
│  zllen (2字节)    │  节点数量 (6)            │
├─────────────────────────────────────────────┤
│  entry1: "alice" │  member1                 │
├─────────────────────────────────────────────┤
│  entry2: 10.5    │  score1                   │
├─────────────────────────────────────────────┤
│  entry3: "bob"   │  member2                 │
├─────────────────────────────────────────────┤
│  entry4: 20.0    │  score2                   │
├─────────────────────────────────────────────┤
│  entry5: "charlie"│  member3                 │
├─────────────────────────────────────────────┤
│  entry6: 30.0    │  score3                   │
├─────────────────────────────────────────────┤
│  zlend (1字节)    │  结束标记 (0xFF)         │
└─────────────────────────────────────────────┘

存储内容：
ZADD myzset 10.5 "alice" 20.0 "bob" 30.0 "charlie"

排序规则：
- 按分数排序：10.5 < 20.0 < 30.0
- 分数相同时按元素值字典序排序
```

### 3.3 Ziplist的查找操作

**查找流程：**
```
查找元素 "bob" 的分数：

步骤1：从ziplist头部开始遍历
步骤2：检查每个entry是否是member
步骤3：如果是member且匹配，读取下一个entry作为score
步骤4：如果找到，返回score；否则继续遍历

时间复杂度：O(n)，n为元素数量
```

### 3.4 Ziplist的优缺点

**优点：**
- ✅ 内存占用小：紧凑存储，无指针开销
- ✅ 缓存友好：连续内存，提高缓存命中率
- ✅ 适合小集合：元素少时性能足够

**缺点：**
- ❌ 查找效率低：O(n)时间复杂度
- ❌ 插入/删除慢：需要移动后续节点
- ❌ 级联更新：可能触发级联更新问题
- ❌ 不适合大集合：元素多时性能下降

---

## 四、Skiplist+Dict编码详解

### 4.1 为什么同时使用Skiplist和Dict？

**核心原因：不同操作需要不同的数据结构**

**Dict（哈希表）的优势：**
```
操作：根据元素值查找分数
时间复杂度：O(1)
使用场景：ZSCORE命令

如果只用skiplist：
- 需要O(log n)查找
- 性能较差
```

**Skiplist（跳表）的优势：**
```
操作：范围查询、排名查询
时间复杂度：O(log n + m)
使用场景：ZRANGE、ZRANK命令

如果只用dict：
- 需要排序，O(n log n)
- 性能较差
```

**组合使用的优势：**
```
空间换时间：
- dict：O(n)额外空间
- 但换来O(1)的查找性能

总体收益：
- 综合性能更好
- 支持更多操作
- 兼顾两种查询场景
```

### 4.2 数据结构定义

**核心数据结构：**
```c
// 有序集合结构
typedef struct zset {
    dict *dict;        // 哈希表：元素 -> 分数
    zskiplist *zsl;    // 跳表：按分数排序
} zset;

// 跳表节点
typedef struct zskiplistNode {
    sds ele;                    // 元素值（SDS字符串）
    double score;                // 分数
    struct zskiplistNode *backward;  // 后退指针
    struct zskiplistLevel {
        struct zskiplistNode *forward;  // 前进指针
        unsigned long span;            // 跨度（用于排名）
    } level[];                   // 层级数组
} zskiplistNode;

// 跳表结构
typedef struct zskiplist {
    struct zskiplistNode *header, *tail;  // 头尾节点
    unsigned long length;                  // 节点数量
    int level;                             // 最大层级
} zskiplist;

// 哈希表（与Hash相同）
typedef struct dict {
    dictType *type;
    void *privdata;
    dictht ht[2];
    long rehashidx;
    int iterators;
} dict;
```

### 4.3 内存布局

**内存布局图解：**
```
有序集合 "myzset" 使用skiplist+dict编码：

┌─────────────────────────────────────────┐
│  zset结构                                │
│  dict: ────────────────────────────────┼──┐
│  zsl: ─────────────────────────────────┼──┼──┐
└─────────────────────────────────────────┘  │  │
                                              │  │
                                              ▼  │
                    ┌──────────────────────────────────────┐
                    │  dict（哈希表）                      │
                    │  ht[0]:                              │
                    │    table[4]                          │
                    │    [0] -> entry("alice", 10.5)      │
                    │    [1] -> entry("bob", 20.0)         │
                    │    [2] -> entry("charlie", 30.0)    │
                    │    [3] -> NULL                       │
                    └──────────────────────────────────────┘
                              │
                              │ 指向同一个节点
                              │
                              ▼
                    ┌──────────────────────────────────────┐
                    │  zskiplist（跳表）                   │
                    │  header -> node1 -> node2 -> node3 │
                    │                                      │
                    │  第2层: Head ──────> node2(20.0)    │
                    │         │              │             │
                    │  第1层: Head -> node1(10.5)         │
                    │         │      -> node2(20.0)       │
                    │         │      -> node3(30.0)       │
                    │         │      │      │      │       │
                    │  第0层: Head -> node1(10.5)         │
                    │         │      -> node2(20.0)        │
                    │         │      -> node3(30.0)         │
                    │                                      │
                    │  node1: ele="alice", score=10.5      │
                    │  node2: ele="bob", score=20.0       │
                    │  node3: ele="charlie", score=30.0   │
                    └──────────────────────────────────────┘

关键：
- dict和zsl中的节点指向同一个元素值（共享）
- dict用于O(1)查找分数
- zsl用于O(log n)范围查询和排名查询
```

### 4.4 跳表的查找操作

**查找流程：**
```
查找分数为20.0的元素：

步骤1：从跳表最高层开始
步骤2：如果当前节点的下一个节点分数 <= 目标分数，向右移动
步骤3：如果当前节点的下一个节点分数 > 目标分数，向下移动一层
步骤4：重复步骤2-3，直到找到目标节点或到达数据层

时间复杂度：O(log n)
```

**查找过程图解：**
```
跳表结构：
第2层: Head ──────────────> 30.0
        │                    │
第1层: Head ──────> 20.0 ───> 30.0
        │            │         │
第0层: Head ─> 10.5 ─> 20.0 ─> 30.0

查找分数20.0：
1. 从Head（第2层）开始
2. Head->forward[2] = 30.0，30.0 > 20.0，向下到第1层
3. Head->forward[1] = 20.0，20.0 == 20.0，找到！
```

### 4.5 跳表的排名计算

**排名计算机制：**
```
使用span（跨度）字段快速计算排名：

span的含义：
- 记录每层两个节点之间的节点数
- 用于快速计算排名

计算排名：
1. 从Head开始，累加每层的span
2. 直到找到目标节点
3. 排名 = 累加的span值
```

**排名计算图解：**
```
跳表结构（带span）：
第2层: Head ──────[span=2]──────> 30.0
        │                          │
第1层: Head ─[span=1]> 20.0 ─[span=1]> 30.0
        │      │         │         │
第0层: Head ─> 10.5 ─> 20.0 ─> 30.0

查找20.0的排名：
1. 从Head（第2层）开始，span=0
2. Head->forward[2] = 30.0，30.0 > 20.0，向下到第1层
3. Head->forward[1] = 20.0，span += 1，找到！
4. 排名 = 1（从0开始）
```

### 4.6 Skiplist+Dict的优缺点

**优点：**
- ✅ 查找效率高：dict O(1)，skiplist O(log n)
- ✅ 范围查询快：O(log n + m)
- ✅ 排名查询快：O(log n)
- ✅ 支持复杂操作：范围查询、排名查询等

**缺点：**
- ❌ 内存占用大：需要同时维护dict和skiplist
- ❌ 实现复杂：需要维护两个数据结构的一致性
- ❌ 缓存不友好：节点分散在内存中

---

## 五、有序集合的CRUD操作详解

### 5.1 CREATE操作（ZADD命令）

**操作流程：**
```
ZADD myzset 10.5 "alice" 20.0 "bob"

步骤1：解析命令
  └─> key = "myzset", score-member对 = [(10.5, "alice"), (20.0, "bob")]

步骤2：查找或创建有序集合对象
  └─> 在数据库中查找key
  └─> 如果不存在，创建新的有序集合对象

步骤3：检查编码方式
  └─> 如果是ziplist，检查是否需要转换为skiplist+dict
  └─> 如果元素数量或大小超限，转换为skiplist+dict

步骤4：添加元素
  └─> 根据编码方式执行不同的操作
      ├─> ziplist: 在ziplist中插入元素和分数（保持有序）
      └─> skiplist+dict: 在dict和zsl中同时添加
```

**Ziplist编码的ZADD操作：**
```
执行前：
┌─────────────────────────────────────────┐
│  ziplist (空)                            │
│  zlbytes, zltail, zllen=0, zlend        │
└─────────────────────────────────────────┘

执行 ZADD myzset 20.0 "bob"：

步骤1：查找插入位置
  └─> ziplist为空，插入到头部

步骤2：插入元素和分数
  └─> 插入member="bob"，score=20.0

执行后：
┌─────────────────────────────────────────┐
│  zlbytes, zltail, zllen=2               │
│  entry1: "bob"                          │
│  entry2: 20.0                           │
│  zlend                                  │
└─────────────────────────────────────────┘

执行 ZADD myzset 10.5 "alice"：

步骤1：查找插入位置
  └─> 10.5 < 20.0，需要插入到"bob"之前

步骤2：移动元素
  └─> 将"bob"和20.0向后移动

步骤3：插入新元素
  └─> 插入member="alice"，score=10.5

执行后：
┌─────────────────────────────────────────┐
│  zlbytes, zltail, zllen=4               │
│  entry1: "alice"                        │
│  entry2: 10.5                           │
│  entry3: "bob"                          │
│  entry4: 20.0                           │
│  zlend                                  │
└─────────────────────────────────────────┘
```

**Skiplist+Dict编码的ZADD操作：**
```
执行 ZADD myzset 20.0 "bob"：

步骤1：检查元素是否已存在（在dict中查找）
  └─> dict中不存在"bob"

步骤2：创建跳表节点
  └─> 创建zskiplistNode，ele="bob", score=20.0
  └─> 随机生成层级

步骤3：在跳表中插入节点
  └─> 从最高层开始查找插入位置
  └─> 插入节点，更新各层的forward指针

步骤4：在dict中添加entry
  └─> dictAdd("bob", 20.0)

执行后：
┌─────────────────────────────────────────┐
│  zset                                   │
│  dict: {"bob" -> 20.0}                  │
│  zsl: Head -> node("bob", 20.0)         │
└─────────────────────────────────────────┘
```

**编码转换过程：**
```
场景：ziplist转换为skiplist+dict

触发条件：
1. 元素数量 >= zset-max-ziplist-entries
2. 元素或分数大小 >= zset-max-ziplist-value

转换过程：
1. 创建新的zset（包含dict和zsl）
2. 遍历ziplist，将所有元素添加到dict和zsl中
3. 释放ziplist
4. 更新对象的encoding为OBJ_ENCODING_SKIPLIST
5. 更新对象的ptr为zset
```

**代码实现（简化）：**
```c
// ZADD命令处理
void zaddCommand(client *c) {
    zaddGenericCommand(c, ZADD_NONE);
}

void zaddGenericCommand(client *c, int flags) {
    robj *key = c->argv[1];
    robj *zobj;
    int scoreidx = 2;
    int elements = (c->argc - 2) / 2;
    int added = 0;
    int updated = 0;
    
    // 查找或创建有序集合对象
    zobj = lookupKeyWrite(c->db, key);
    if (zobj == NULL) {
        if (xx) {
            addReply(c, shared.czero);
            return;
        }
        // 创建新的有序集合
        if (server.zset_max_ziplist_entries == 0 ||
            server.zset_max_ziplist_value < sdslen(c->argv[scoreidx+1]->ptr))
            zobj = createZsetObject();
        else
            zobj = createZsetZiplistObject();
        dbAdd(c->db, key, zobj);
    } else {
        if (zobj->type != OBJ_ZSET) {
            addReply(c, shared.wrongtypeerr);
            return;
        }
    }
    
    // 添加所有元素
    for (int j = 0; j < elements; j++) {
        double score;
        robj *ele = c->argv[scoreidx+1+j*2];
        robj *curobj;
        
        // 解析分数
        if (getDoubleFromObjectOrReply(c, c->argv[scoreidx+j*2], &score, NULL) != C_OK)
            return;
        
        // 检查是否需要转换编码
        if (zobj->encoding == OBJ_ENCODING_ZIPLIST) {
            unsigned char *eptr;
            unsigned char *sptr;
            unsigned char *vstr;
            unsigned int vlen;
            long long vlong;
            
            // 查找元素
            eptr = ziplistIndex(zobj->ptr, 0);
            while (eptr != NULL) {
                sptr = ziplistNext(zobj->ptr, eptr);
                serverAssert(sptr != NULL);
                vstr = ziplistGet(eptr, &vlen, &vlong);
                
                if (ziplistCompare(eptr, (unsigned char*)ele->ptr, sdslen(ele->ptr))) {
                    // 元素已存在，更新分数
                    zobj->ptr = zzlDelete(zobj->ptr, eptr);
                    zobj->ptr = zzlInsert(zobj->ptr, ele, score);
                    updated++;
                    break;
                }
                eptr = ziplistNext(zobj->ptr, sptr);
            }
            
            if (eptr == NULL) {
                // 元素不存在，添加
                zobj->ptr = zzlInsert(zobj->ptr, ele, score);
                added++;
                
                // 检查是否需要转换编码
                if (zzlLength(zobj->ptr) > server.zset_max_ziplist_entries)
                    zsetConvert(zobj, OBJ_ENCODING_SKIPLIST);
                else if (sdslen(ele->ptr) > server.zset_max_ziplist_value)
                    zsetConvert(zobj, OBJ_ENCODING_SKIPLIST);
            }
        } else if (zobj->encoding == OBJ_ENCODING_SKIPLIST) {
            zset *zs = zobj->ptr;
            zskiplistNode *znode;
            dictEntry *de;
            
            // 在dict中查找
            de = dictFind(zs->dict, ele->ptr);
            if (de != NULL) {
                // 元素已存在，更新分数
                double curscore = *(double*)dictGetVal(de);
                if (score != curscore) {
                    znode = zslUpdateScore(zs->zsl, curscore, ele, score);
                    dictGetVal(de) = &znode->score;
                    updated++;
                }
            } else {
                // 元素不存在，添加
                ele = sdsdup(ele->ptr);
                znode = zslInsert(zs->zsl, score, ele);
                serverAssert(dictAdd(zs->dict, ele, &znode->score) == DICT_OK);
                added++;
            }
        } else {
            serverPanic("Unknown sorted set encoding");
        }
    }
    
    // 返回结果
    if (added) signalModifiedKey(c->db, key);
    if (added || updated) {
        notifyKeyspaceEvent(NOTIFY_ZSET, incr ? "zincr" : "zadd", key, c->db->id);
        server.dirty += (added + updated);
    }
    addReplyLongLong(c, added);
}
```

### 5.2 READ操作（ZSCORE/ZRANK/ZRANGE命令）

**操作流程：**
```
ZSCORE myzset "alice"

步骤1：解析命令
  └─> key = "myzset", member = "alice"

步骤2：查找有序集合对象
  └─> 在数据库中查找key

步骤3：查找元素分数
  └─> 根据编码方式执行不同的查找
      ├─> ziplist: 遍历查找member，读取下一个entry作为score
      └─> skiplist+dict: 在dict中O(1)查找

步骤4：返回分数
```

**Ziplist编码的ZSCORE操作：**
```
查找元素 "alice" 的分数：

步骤1：从ziplist头部开始遍历
步骤2：检查每个entry是否是member
步骤3：如果是member且匹配"alice"，读取下一个entry作为score
步骤4：返回score=10.5

时间复杂度：O(n)
```

**Skiplist+Dict编码的ZSCORE操作：**
```
查找元素 "alice" 的分数：

步骤1：在dict中查找
  └─> hash("alice") = 5
  └─> index = 5 & 3 = 1
  └─> table[1] -> entry("alice", 10.5)

步骤2：返回分数
  └─> 返回10.5

时间复杂度：O(1)
```

**ZRANK命令（获取排名）：**
```
ZRANK myzset "bob"

操作流程（skiplist+dict）：
1. 在dict中查找元素，获取分数
2. 在跳表中查找该分数的节点
3. 从Head开始，累加每层的span
4. 直到找到目标节点
5. 返回排名

时间复杂度：O(log n)
```

**ZRANGE命令（范围查询）：**
```
ZRANGE myzset 0 2

操作流程（skiplist+dict）：
1. 在跳表中找到起始位置的节点
2. 从起始节点开始，沿第0层遍历
3. 直到到达结束位置
4. 返回所有元素

时间复杂度：O(log n + m)，m为返回的元素数量
```

**代码实现（简化）：**
```c
// ZSCORE命令处理
void zscoreCommand(client *c) {
    robj *key = c->argv[1];
    robj *zobj;
    double score;
    
    // 查找有序集合对象
    if ((zobj = lookupKeyReadOrReply(c, key, shared.nullbulk)) == NULL ||
        checkType(c, zobj, OBJ_ZSET)) return;
    
    // 查找分数
    if (zobj->encoding == OBJ_ENCODING_ZIPLIST) {
        // ziplist编码
        if (zzlFind(zobj->ptr, c->argv[2]->ptr, &score) == NULL) {
            addReply(c, shared.nullbulk);
        } else {
            addReplyDouble(c, score);
        }
    } else if (zobj->encoding == OBJ_ENCODING_SKIPLIST) {
        // skiplist+dict编码
        zset *zs = zobj->ptr;
        dictEntry *de = dictFind(zs->dict, c->argv[2]->ptr);
        if (de == NULL) {
            addReply(c, shared.nullbulk);
        } else {
            score = *(double*)dictGetVal(de);
            addReplyDouble(c, score);
        }
    } else {
        serverPanic("Unknown sorted set encoding");
    }
}

// ZRANK命令处理
void zrankCommand(client *c) {
    robj *key = c->argv[1];
    robj *zobj;
    long rank;
    
    // 查找有序集合对象
    if ((zobj = lookupKeyReadOrReply(c, key, shared.nullbulk)) == NULL ||
        checkType(c, zobj, OBJ_ZSET)) return;
    
    // 查找排名
    if (zobj->encoding == OBJ_ENCODING_ZIPLIST) {
        // ziplist编码：遍历查找
        unsigned char *zl = zobj->ptr;
        unsigned char *eptr, *sptr;
        unsigned char *vstr;
        unsigned int vlen;
        long long vlong;
        double score;
        long llen = zzlLength(zl);
        long elelen = sdslen(c->argv[2]->ptr);
        
        eptr = ziplistIndex(zl, 0);
        rank = 0;
        while (eptr != NULL) {
            sptr = ziplistNext(zl, eptr);
            serverAssert(sptr != NULL);
            vstr = ziplistGet(eptr, &vlen, &vlong);
            
            if (ziplistCompare(eptr, (unsigned char*)c->argv[2]->ptr, elelen)) {
                // 找到元素
                sptr = ziplistGet(sptr, &vlen, &vlong);
                score = zzlGetScore(sptr);
                addReplyLongLong(c, rank);
                return;
            }
            rank++;
            eptr = ziplistNext(zl, sptr);
        }
        addReply(c, shared.nullbulk);
    } else if (zobj->encoding == OBJ_ENCODING_SKIPLIST) {
        // skiplist+dict编码
        zset *zs = zobj->ptr;
        zskiplist *zsl = zs->zsl;
        dictEntry *de;
        zskiplistNode *znode;
        double score;
        
        // 在dict中查找分数
        de = dictFind(zs->dict, c->argv[2]->ptr);
        if (de == NULL) {
            addReply(c, shared.nullbulk);
            return;
        }
        score = *(double*)dictGetVal(de);
        
        // 在跳表中查找排名
        znode = zslGetElementByRank(zsl, score, c->argv[2]->ptr);
        if (znode != NULL && zsl->header != znode) {
            rank = zslGetRank(zsl, score, znode->ele);
            addReplyLongLong(c, rank - 1);
        } else {
            addReply(c, shared.nullbulk);
        }
    } else {
        serverPanic("Unknown sorted set encoding");
    }
}
```

### 5.3 UPDATE操作（ZINCRBY命令）

**操作流程：**
```
ZINCRBY myzset 5.0 "alice"

步骤1：解析命令
  └─> key = "myzset", increment = 5.0, member = "alice"

步骤2：查找有序集合对象
  └─> 在数据库中查找key

步骤3：查找元素
  └─> 根据编码方式查找元素

步骤4：更新分数
  └─> 如果元素存在，增加分数
  └─> 如果元素不存在，创建新元素，分数为increment
  └─> 需要重新排序（在跳表中删除旧节点，插入新节点）

步骤5：返回新分数
```

**Skiplist+Dict编码的ZINCRBY操作：**
```
执行 ZINCRBY myzset 5.0 "alice"：

步骤1：在dict中查找元素
  └─> 找到"alice"，当前分数=10.5

步骤2：计算新分数
  └─> 新分数 = 10.5 + 5.0 = 15.5

步骤3：在跳表中更新节点
  └─> 删除旧节点（score=10.5）
  └─> 插入新节点（score=15.5）

步骤4：更新dict中的分数
  └─> 更新dict中"alice"的分数为15.5

执行后：
┌─────────────────────────────────────────┐
│  zset                                   │
│  dict: {"alice" -> 15.5, "bob" -> 20.0} │
│  zsl: Head -> node("alice", 15.5)       │
│         -> node("bob", 20.0)            │
└─────────────────────────────────────────┘
```

### 5.4 DELETE操作（ZREM命令）

**操作流程：**
```
ZREM myzset "alice"

步骤1：解析命令
  └─> key = "myzset", member = "alice"

步骤2：查找有序集合对象
  └─> 在数据库中查找key

步骤3：删除元素
  └─> 根据编码方式执行不同的删除
      ├─> ziplist: 删除member和score两个entry
      └─> skiplist+dict: 从dict和zsl中同时删除

步骤4：检查是否需要转换编码
  └─> 如果skiplist+dict元素很少，可能转换为ziplist（Redis不自动转换）

步骤5：返回结果
  └─> 返回删除的元素数量
```

**Ziplist编码的ZREM操作：**
```
删除元素 "alice"：

执行前：
┌─────────────────────────────────────────┐
│  ziplist                                 │
│  entry1: "alice"                         │
│  entry2: 10.5                            │
│  entry3: "bob"                           │
│  entry4: 20.0                            │
└─────────────────────────────────────────┘

执行 ZREM myzset "alice"：

步骤1：查找元素
  └─> 找到entry1="alice"

步骤2：删除元素和分数
  └─> 删除entry1和entry2

步骤3：移动后续元素
  └─> 将"bob"和20.0向前移动

执行后：
┌─────────────────────────────────────────┐
│  ziplist                                 │
│  entry1: "bob"                           │
│  entry2: 20.0                            │
└─────────────────────────────────────────┘
```

**Skiplist+Dict编码的ZREM操作：**
```
删除元素 "alice"：

步骤1：在dict中查找元素
  └─> 找到"alice"，获取分数=10.5

步骤2：在跳表中删除节点
  └─> 从跳表中删除节点（ele="alice", score=10.5）
  └─> 更新各层的forward指针

步骤3：在dict中删除entry
  └─> dictDelete("alice")

执行后：
┌─────────────────────────────────────────┐
│  zset                                   │
│  dict: {"bob" -> 20.0}                  │
│  zsl: Head -> node("bob", 20.0)         │
└─────────────────────────────────────────┘
```

**代码实现（简化）：**
```c
// ZREM命令处理
void zremCommand(client *c) {
    robj *key = c->argv[1];
    robj *zobj;
    int deleted = 0, keyremoved = 0, j;
    
    // 查找有序集合对象
    zobj = lookupKeyWriteOrReply(c, key, shared.czero);
    if (zobj == NULL || checkType(c, zobj, OBJ_ZSET)) return;
    
    // 删除所有元素
    for (j = 2; j < c->argc; j++) {
        if (zobj->encoding == OBJ_ENCODING_ZIPLIST) {
            // ziplist编码
            unsigned char *eptr = zzlFind(zobj->ptr, c->argv[j]->ptr, NULL);
            if (eptr != NULL) {
                zobj->ptr = zzlDelete(zobj->ptr, eptr);
                deleted++;
                if (zzlLength(zobj->ptr) == 0) {
                    dbDelete(c->db, key);
                    keyremoved = 1;
                    break;
                }
            }
        } else if (zobj->encoding == OBJ_ENCODING_SKIPLIST) {
            // skiplist+dict编码
            zset *zs = zobj->ptr;
            dictEntry *de;
            double score;
            
            de = dictFind(zs->dict, c->argv[j]->ptr);
            if (de != NULL) {
                score = *(double*)dictGetVal(de);
                
                // 从跳表中删除
                int retval = zslDelete(zs->zsl, score, c->argv[j]->ptr);
                serverAssert(retval);
                
                // 从dict中删除
                dictDelete(zs->dict, c->argv[j]->ptr);
                
                deleted++;
                if (htNeedsResize(zs->dict)) dictResize(zs->dict);
                if (dictSize(zs->dict) == 0) {
                    dbDelete(c->db, key);
                    keyremoved = 1;
                    break;
                }
            }
        } else {
            serverPanic("Unknown sorted set encoding");
        }
    }
    
    if (deleted) {
        signalModifiedKey(c->db, key);
        notifyKeyspaceEvent(NOTIFY_ZSET, "zrem", key, c->db->id);
        if (keyremoved)
            notifyKeyspaceEvent(NOTIFY_GENERIC, "del", key, c->db->id);
        server.dirty += deleted;
    }
    addReplyLongLong(c, deleted);
}
```

---

## 六、编码转换机制

### 6.1 Ziplist转Skiplist+Dict

**触发条件：**
```
1. 元素数量 >= zset-max-ziplist-entries
2. 元素或分数大小 >= zset-max-ziplist-value
3. 执行ZADD时检查
```

**转换过程：**
```
步骤1：创建新的zset
  └─> 创建dict和zsl

步骤2：遍历ziplist
  └─> 读取每个member-score对
  └─> 添加到dict和zsl中

步骤3：更新对象
  └─> 释放ziplist
  └─> 设置encoding为OBJ_ENCODING_SKIPLIST
  └─> 设置ptr为zset
```

**转换图解：**
```
转换前（ziplist）：
┌─────────────────────────────────────────┐
│  ziplist                                 │
│  entry1: "alice"                         │
│  entry2: 10.5                            │
│  entry3: "bob"                           │
│  entry4: 20.0                            │
└─────────────────────────────────────────┘

转换后（skiplist+dict）：
┌─────────────────────────────────────────┐
│  zset                                   │
│  dict: {"alice" -> 10.5, "bob" -> 20.0} │
│  zsl: Head -> node("alice", 10.5)        │
│         -> node("bob", 20.0)            │
└─────────────────────────────────────────┘
```

### 6.2 Skiplist+Dict转Ziplist

**说明：**
```
Redis不会自动将skiplist+dict转换为ziplist，因为：
1. 转换成本高（需要遍历所有元素）
2. 可能很快又需要转换回来
3. 保持skiplist+dict编码更稳定
```

---

## 七、实际应用示例

### 7.1 排行榜场景

**场景：**
```
游戏排行榜

ZADD leaderboard 1000 "player:1001"
ZADD leaderboard 2000 "player:1002"
ZREVRANGE leaderboard 0 9  // 获取前10名
```

**内存布局（skiplist+dict编码）：**
```
leaderboard的zset结构：
┌─────────────────────────────────────────┐
│  zset                                   │
│  dict: {"player:1001" -> 1000,          │
│         "player:1002" -> 2000}          │
│  zsl: Head -> node("player:1001", 1000) │
│         -> node("player:1002", 2000)    │
└─────────────────────────────────────────┘

特点：
- 使用skiplist+dict编码（元素较多）
- 支持高效的范围查询
- 支持排名查询
```

### 7.2 延时队列场景

**场景：**
```
任务延时队列

ZADD delay_queue 1234567890 "task:1001"
ZRANGEBYSCORE delay_queue 0 1234567890  // 获取到期的任务
```

**内存布局：**
```
delay_queue的zset结构：
┌─────────────────────────────────────────┐
│  zset                                   │
│  dict: {"task:1001" -> 1234567890}      │
│  zsl: Head -> node("task:1001", 1234567890)│
└─────────────────────────────────────────┘

特点：
- 使用分数存储时间戳
- 支持按时间范围查询
- 适合延时任务场景
```

### 7.3 范围查询场景

**场景：**
```
地理位置范围查询

ZADD geo:users 39.9 "user:beijing"
ZADD geo:users 31.2 "user:shanghai"
ZRANGEBYSCORE geo:users 30 40  // 获取分数在30-40之间的元素
```

**内存布局：**
```
geo:users的zset结构：
┌─────────────────────────────────────────┐
│  zset                                   │
│  dict: {"user:beijing" -> 39.9,         │
│         "user:shanghai" -> 31.2}        │
│  zsl: Head -> node("user:shanghai", 31.2)│
│         -> node("user:beijing", 39.9)   │
└─────────────────────────────────────────┘

特点：
- 使用分数存储坐标
- 支持按坐标范围查询
- 适合地理位置场景
```

---

## 八、性能优化建议

### 8.1 配置优化

**根据场景调整：**
```bash
# 场景1：大量小集合（如用户标签）
# 提高ziplist阈值，更多使用ziplist节省内存
zset-max-ziplist-entries 256
zset-max-ziplist-value 128

# 场景2：少量大集合（如排行榜）
# 降低ziplist阈值，更多使用skiplist+dict提高性能
zset-max-ziplist-entries 64
zset-max-ziplist-value 32

# 场景3：平衡性能和内存
# 使用默认值
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
```

### 8.2 使用建议

**1. 批量操作**
```
使用ZADD批量添加元素：
- 减少网络往返
- 提高性能
```

**2. 范围查询**
```
合理使用范围查询：
- ZRANGE：按排名范围查询
- ZRANGEBYSCORE：按分数范围查询
- 注意时间复杂度
```

**3. 监控指标**
```
关键指标：
- 有序集合数量
- 平均元素数量
- 编码分布（ziplist vs skiplist+dict）
- 内存使用
```

---

## 九、常见问题解答

### 9.1 什么时候使用ziplist，什么时候使用skiplist+dict？

**答案：**

**使用ziplist：**
- ✅ 元素数量 < zset-max-ziplist-entries（默认128）
- ✅ 元素和分数大小 < zset-max-ziplist-value（默认64字节）
- ✅ 内存敏感的场景
- ✅ 元素访问不频繁

**使用skiplist+dict：**
- ✅ 元素数量 >= zset-max-ziplist-entries
- ✅ 元素或分数大小 >= zset-max-ziplist-value
- ✅ 需要频繁范围查询
- ✅ 性能优先的场景

### 9.2 为什么同时使用skiplist和dict？

**答案：**

**原因：不同操作需要不同的数据结构**

**1. dict（哈希表）的优势**
```
操作：根据元素值查找分数
时间复杂度：O(1)
使用场景：ZSCORE命令

如果只用skiplist：
- 需要O(log n)查找
- 性能较差
```

**2. skiplist的优势**
```
操作：范围查询、排名查询
时间复杂度：O(log n + m)
使用场景：ZRANGE、ZRANK命令

如果只用dict：
- 需要排序，O(n log n)
- 性能较差
```

**3. 空间换时间**
```
额外内存开销：
- dict：O(n)额外空间
- 但换来O(1)的查找性能

总体收益：
- 综合性能更好
- 支持更多操作
```

### 9.3 有序集合操作的时间复杂度是多少？

**答案：**

| 操作 | Ziplist | Skiplist+Dict |
|------|---------|---------------|
| **ZADD** | O(n) | O(log n) |
| **ZREM** | O(n) | O(log n) |
| **ZSCORE** | O(n) | O(1) |
| **ZRANK** | O(n) | O(log n) |
| **ZRANGE** | O(n) | O(log n + m) |
| **ZRANGEBYSCORE** | O(n) | O(log n + m) |
| **ZCARD** | O(1) | O(1) |

### 9.4 跳表的层级是如何确定的？

**答案：**

**随机生成层级：**
```
层级生成算法：
1. 从第1层开始
2. 每次有50%的概率继续向上
3. 直到不满足条件或达到最大层级

期望层级：
- 第1层：100%节点
- 第2层：50%节点
- 第3层：25%节点
- 第4层：12.5%节点
- ...

最大层级：32（Redis限制）
```

### 9.5 跳表的span字段是什么？

**答案：**

**span的含义：**
```
span：跨度，记录每层两个节点之间的节点数

作用：
- 用于快速计算排名
- 避免遍历底层链表

计算排名：
1. 从Head开始，累加每层的span
2. 直到找到目标节点
3. 排名 = 累加的span值
```

---

## 十、总结

### 10.1 核心要点

**1. 两种编码方式**
- **Ziplist**：小集合，内存占用小，查找效率低
- **Skiplist+Dict**：大集合，查找效率高，内存占用大

**2. 编码选择**
- 根据元素数量和大小自动选择
- 可以配置阈值调整选择策略

**3. 组合使用**
- **Dict**：O(1)查找分数
- **Skiplist**：O(log n)范围查询和排名查询
- 两种结构结合，兼顾两种查询场景

**4. CRUD操作**
- **CREATE**：ZADD，根据编码方式插入数据
- **READ**：ZSCORE/ZRANK/ZRANGE，根据编码方式查找数据
- **UPDATE**：ZINCRBY，更新分数并重新排序
- **DELETE**：ZREM，根据编码方式删除数据

### 10.2 优化策略

**1. 配置优化**
- 根据场景调整ziplist阈值
- 平衡内存和性能

**2. 使用优化**
- 使用批量操作（ZADD）
- 合理使用范围查询
- 监控编码分布

### 10.3 最佳实践

**1. 元素设计**
- 合理设置分数范围
- 避免频繁的编码转换
- 合理设置元素数量

**2. 操作建议**
- 优先使用批量操作
- 注意范围查询的时间复杂度
- 合理使用排名查询

---

通过本文的学习，你应该对Redis有序集合数据结构的实现有了深入的理解，包括ziplist和skiplist+dict两种编码方式、跳表和哈希表的组合使用、CRUD操作的详细过程，以及各种优化策略。在实际应用中，理解这些底层机制有助于更好地使用Redis有序集合，并针对具体场景进行优化。

