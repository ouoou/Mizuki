---
title: MySQL DDL锁机制与Online DDL深度解析
published: 2025-01-23
updated: 2025-01-23
description: 深入理解MySQL DDL操作的锁机制：从传统DDL的锁表问题到Online DDL的实现原理，全面解析Copy算法、Inplace算法、字典锁以及各种DDL操作的锁行为
tags:
  - MySQL
  - InnoDB
  - DDL
  - 锁机制
  - 索引优化
category: 八股文
draft: false
---

# MySQL DDL锁机制与Online DDL深度解析

在MySQL中执行DDL操作（如添加索引、修改表结构）时，是否会锁表？这是生产环境中经常遇到的问题。理解DDL操作的锁机制、Online DDL的实现原理以及各种算法（Copy、Inplace）对于优化数据库维护、减少业务影响至关重要。本文将从实际问题出发，深入讲解MySQL DDL的锁机制和Online DDL的实现原理。

## 一、DDL操作会锁表吗？

### 1.1 问题的由来

**常见场景**：
```sql
-- 生产环境需要添加索引
ALTER TABLE users ADD INDEX idx_email (email);

-- 问题：
-- 1. 这个操作会锁表吗？
-- 2. 执行期间其他查询会被阻塞吗？
-- 3. 需要多长时间？
-- 4. 如何减少对业务的影响？
```

### 1.2 传统DDL的问题

在MySQL 5.5及之前版本，大多数DDL操作都会**锁表**：

```sql
-- MySQL 5.5及之前
ALTER TABLE users ADD INDEX idx_email (email);

-- 执行过程：
-- 1. 获取表级排他锁（X Lock）
-- 2. 阻塞所有对该表的读写操作
-- 3. 创建临时表，复制数据
-- 4. 重建索引
-- 5. 重命名表
-- 6. 释放锁

-- 影响：
-- - 表被完全锁定，无法读写
-- - 大表操作可能需要数小时
-- - 严重影响业务可用性
```

**时间线示例**：
```
T0: ALTER TABLE开始
    → 获取表级X锁
    → 所有读写操作被阻塞

T1-T100: 复制数据、重建索引
    → 表仍然被锁定
    → 业务完全不可用

T101: 操作完成
    → 释放锁
    → 业务恢复
```

### 1.3 Online DDL的引入

**MySQL 5.6+引入了Online DDL**，允许在DDL执行期间不阻塞读写操作：

```sql
-- MySQL 5.6+
ALTER TABLE users ADD INDEX idx_email (email), ALGORITHM=INPLACE, LOCK=NONE;

-- 执行过程：
-- 1. 准备阶段：获取元数据锁（短暂）
-- 2. 执行阶段：不阻塞读写操作
-- 3. 提交阶段：应用更改（短暂）

-- 影响：
-- - 表可以正常读写
-- - 业务基本不受影响
-- - 操作时间可能稍长，但不阻塞
```

## 二、Online DDL概述

### 2.1 什么是Online DDL？

**Online DDL**是MySQL 5.6+引入的特性，允许在执行DDL操作时不阻塞表的读写操作。

**核心特点**：
1. **不阻塞读写**：DDL执行期间，表可以正常读写
2. **元数据锁**：只在准备和提交阶段短暂加锁
3. **算法选择**：支持Copy和Inplace两种算法
4. **锁级别控制**：可以指定锁的级别（NONE、SHARED、EXCLUSIVE）

### 2.2 Online DDL的执行阶段

Online DDL操作分为三个阶段：

```
阶段1：准备阶段（Prepare Phase）
  ├─ 创建临时文件（如需要）
  ├─ 获取元数据锁（MDL，短暂）
  └─ 验证操作是否支持Online DDL

阶段2：执行阶段（Execute Phase）
  ├─ 执行实际的DDL操作
  ├─ 不阻塞读写操作（Online DDL）
  └─ 应用层可以正常访问表

阶段3：提交阶段（Commit Phase）
  ├─ 获取元数据锁（MDL，短暂）
  ├─ 应用更改到表定义
  └─ 释放锁
```

### 2.3 Online DDL的语法

```sql
ALTER TABLE table_name
[操作]
ALGORITHM = [DEFAULT | COPY | INPLACE]
LOCK = [DEFAULT | NONE | SHARED | EXCLUSIVE];
```

**参数说明**：
- **ALGORITHM**：指定使用的算法
  - `DEFAULT`：MySQL自动选择
  - `COPY`：使用Copy算法
  - `INPLACE`：使用Inplace算法
- **LOCK**：指定锁级别
  - `DEFAULT`：MySQL自动选择最小锁级别
  - `NONE`：不锁表（允许读写）
  - `SHARED`：共享锁（允许读，不允许写）
  - `EXCLUSIVE`：排他锁（不允许读写）

## 三、Copy算法详解

### 3.1 什么是Copy算法？

**Copy算法**是传统的DDL执行方式，通过创建临时表、复制数据、重建索引来完成DDL操作。

**工作流程**：
```
1. 创建临时表（新结构）
2. 复制原表数据到临时表
3. 在临时表上执行DDL操作
4. 重命名临时表为原表名
5. 删除原表
```

### 3.2 Copy算法的特点

#### 优点：
1. **通用性强**：适用于所有DDL操作
2. **实现简单**：逻辑清晰，易于理解
3. **数据安全**：原表数据保留，失败可恢复

#### 缺点：
1. **需要额外空间**：需要与原表相同的磁盘空间
2. **锁表时间长**：整个操作期间表被锁定
3. **性能差**：需要复制所有数据，大表操作慢
4. **阻塞业务**：严重影响业务可用性

### 3.3 Copy算法的执行过程

```sql
-- 示例：添加索引
ALTER TABLE users ADD INDEX idx_email (email), ALGORITHM=COPY;

-- 执行步骤详解：

-- 步骤1：获取表级排他锁（X Lock）
LOCK TABLE users WRITE;
-- 阻塞所有读写操作

-- 步骤2：创建临时表
CREATE TABLE users_tmp LIKE users;
-- 新表结构包含新索引

-- 步骤3：复制数据
INSERT INTO users_tmp SELECT * FROM users;
-- 逐行复制，大表耗时很长

-- 步骤4：重建索引（在临时表上）
-- 临时表已有新索引结构

-- 步骤5：原子替换
RENAME TABLE users TO users_old, users_tmp TO users;

-- 步骤6：删除旧表
DROP TABLE users_old;

-- 步骤7：释放锁
UNLOCK TABLES;
```

### 3.4 Copy算法的空间需求

**空间计算**：
```
所需空间 = 原表数据大小 + 原表索引大小 + 临时表数据大小 + 临时表索引大小
        ≈ 2 × 原表总大小
```

**示例**：
```sql
-- 假设users表大小为10GB
ALTER TABLE users ADD INDEX idx_email (email), ALGORITHM=COPY;

-- 所需空间：
-- - 原表：10GB
-- - 临时表：10GB
-- - 总计：至少20GB可用空间
```

### 3.5 Copy算法的适用场景

**Copy算法适用于**：
1. **不支持Online DDL的操作**：某些DDL操作必须使用Copy算法
2. **小表操作**：表很小，复制数据很快
3. **需要完全重建**：修改表结构需要完全重建

**示例**：
```sql
-- 修改列类型（某些情况必须用COPY）
ALTER TABLE users MODIFY COLUMN id BIGINT, ALGORITHM=COPY;

-- 删除主键
ALTER TABLE users DROP PRIMARY KEY, ALGORITHM=COPY;
```

## 四、Inplace算法详解

### 4.1 什么是Inplace算法？

**Inplace算法**是Online DDL的核心，直接在原表上执行DDL操作，不需要创建临时表。

**工作流程**：
```
1. 准备阶段：获取元数据锁（短暂）
2. 执行阶段：在原表上直接操作
   - 不阻塞读写操作（Online DDL）
   - 后台构建索引/修改结构
3. 提交阶段：应用更改（短暂）
```

### 4.2 Inplace算法的特点

#### 优点：
1. **不阻塞读写**：执行期间表可以正常访问
2. **空间效率高**：不需要额外表空间
3. **性能好**：不需要复制数据
4. **业务影响小**：对业务基本无影响

#### 缺点：
1. **限制较多**：不是所有操作都支持
2. **实现复杂**：需要处理并发访问
3. **可能稍慢**：由于不阻塞，操作时间可能稍长

### 4.3 Inplace算法的执行过程

```sql
-- 示例：添加索引（Online DDL）
ALTER TABLE users ADD INDEX idx_email (email), ALGORITHM=INPLACE, LOCK=NONE;

-- 执行步骤详解：

-- 步骤1：准备阶段（短暂，约几毫秒）
-- 获取元数据锁（MDL），验证操作
-- 创建临时日志文件（记录DDL期间的变更）

-- 步骤2：执行阶段（长时间，但不阻塞）
-- 2.1 扫描表数据，构建索引
-- 2.2 应用层可以正常读写
-- 2.3 将DDL期间的变更应用到新索引

-- 步骤3：提交阶段（短暂，约几毫秒）
-- 获取元数据锁（MDL）
-- 将新索引应用到表定义
-- 删除临时日志文件
-- 释放锁
```

### 4.4 Inplace算法的并发处理

**关键机制**：**在线日志（Online Log）**

```
执行阶段：
  ├─ 应用层读写操作正常执行
  ├─ DDL操作在后台构建索引
  └─ 在线日志记录DDL期间的变更

提交阶段：
  ├─ 应用在线日志中的变更
  ├─ 确保数据一致性
  └─ 完成DDL操作
```

**示例**：
```
时间线：

T0: ALTER TABLE开始（准备阶段）
    → 获取MDL锁（短暂）
    → 创建在线日志

T1: 开始构建索引（执行阶段）
    → 释放MDL锁
    → 表可以正常读写

T2: 应用层执行INSERT
    → 正常插入数据
    → 同时记录到在线日志

T3: 应用层执行UPDATE
    → 正常更新数据
    → 同时记录到在线日志

T4: 索引构建完成（提交阶段）
    → 获取MDL锁（短暂）
    → 应用在线日志中的变更
    → 完成DDL操作
```

### 4.5 Inplace算法的空间需求

**空间计算**：
```
所需空间 = 新索引大小 + 在线日志大小
        ≈ 新索引大小 + 少量临时空间
```

**示例**：
```sql
-- 假设users表大小为10GB，添加索引需要1GB
ALTER TABLE users ADD INDEX idx_email (email), ALGORITHM=INPLACE, LOCK=NONE;

-- 所需空间：
-- - 新索引：1GB
-- - 在线日志：约几MB到几GB（取决于DDL期间的变更量）
-- - 总计：约1-2GB额外空间
```

### 4.6 Inplace算法的适用场景

**Inplace算法适用于**：
1. **添加索引**：大多数情况下支持
2. **删除索引**：快速，不阻塞
3. **修改索引**：某些情况下支持
4. **修改列**：某些情况下支持

**示例**：
```sql
-- 添加索引（推荐使用INPLACE）
ALTER TABLE users ADD INDEX idx_email (email), ALGORITHM=INPLACE, LOCK=NONE;

-- 删除索引（快速）
ALTER TABLE users DROP INDEX idx_email, ALGORITHM=INPLACE, LOCK=NONE;

-- 修改索引名称
ALTER TABLE users RENAME INDEX idx_old TO idx_new, ALGORITHM=INPLACE, LOCK=NONE;
```

## 五、字典锁（Metadata Lock，MDL）

### 5.1 什么是字典锁？

**字典锁（Metadata Lock，MDL）**是MySQL用来保护表结构定义的锁，防止在表结构变更期间有其他操作访问表。

**作用**：
1. **保护表结构**：防止表结构被并发修改
2. **保证一致性**：确保查询看到一致的表结构
3. **协调DDL和DML**：协调DDL操作和普通查询

### 5.2 字典锁的类型

MySQL的MDL锁有多种类型：

#### 5.2.1 共享锁（Shared Lock）

**用途**：保护表结构不被修改，但允许读取

**获取时机**：
- 普通SELECT查询
- SHOW CREATE TABLE
- 其他只读操作

**特点**：
- 多个事务可以同时持有
- 与排他锁冲突

#### 5.2.2 排他锁（Exclusive Lock）

**用途**：保护表结构，不允许任何其他操作

**获取时机**：
- ALTER TABLE
- DROP TABLE
- CREATE TABLE
- 其他DDL操作

**特点**：
- 独占锁，排斥所有其他锁
- 阻塞所有其他操作

#### 5.2.3 意向锁（Intention Lock）

**用途**：表示事务想要获取某种类型的锁

**类型**：
- **IS（Intention Shared）**：意向共享锁
- **IX（Intention Exclusive）**：意向排他锁

### 5.3 字典锁的兼容性

| 当前锁 | 请求共享锁 | 请求排他锁 | 请求意向共享 | 请求意向排他 |
|--------|-----------|-----------|-------------|-------------|
| **共享锁** | ✓ 兼容 | ✗ 冲突 | ✓ 兼容 | ✗ 冲突 |
| **排他锁** | ✗ 冲突 | ✗ 冲突 | ✗ 冲突 | ✗ 冲突 |
| **意向共享** | ✓ 兼容 | ✗ 冲突 | ✓ 兼容 | ✓ 兼容 |
| **意向排他** | ✗ 冲突 | ✗ 冲突 | ✓ 兼容 | ✓ 兼容 |

### 5.4 字典锁的工作流程

#### 场景1：普通查询

```sql
-- 事务T1
SELECT * FROM users WHERE id = 1;
-- 获取MDL共享锁（短暂）
-- 执行查询
-- 释放MDL锁
```

#### 场景2：DDL操作（传统方式）

```sql
-- 事务T1：普通查询
SELECT * FROM users WHERE id = 1;
-- 持有MDL共享锁

-- 事务T2：DDL操作
ALTER TABLE users ADD INDEX idx_email (email);
-- 请求MDL排他锁
-- 等待T1释放共享锁（阻塞）

-- T1提交后，T2获得排他锁
-- 执行DDL操作
-- 释放锁
```

#### 场景3：Online DDL

```sql
-- 事务T1：普通查询
SELECT * FROM users WHERE id = 1;
-- 持有MDL共享锁（短暂）

-- 事务T2：Online DDL
ALTER TABLE users ADD INDEX idx_email (email), ALGORITHM=INPLACE, LOCK=NONE;
-- 准备阶段：获取MDL排他锁（短暂，等待T1释放）
-- 执行阶段：释放MDL锁，不阻塞
-- 提交阶段：获取MDL排他锁（短暂）

-- 事务T3：在DDL执行期间查询
SELECT * FROM users WHERE id = 2;
-- 可以执行！因为执行阶段MDL锁已释放
```

### 5.5 字典锁的等待问题

**问题场景**：长事务阻塞DDL操作

```sql
-- 事务T1（长事务）
BEGIN;
SELECT * FROM users WHERE id = 1;
-- 持有MDL共享锁
-- ... 长时间不提交 ...

-- 事务T2：DDL操作
ALTER TABLE users ADD INDEX idx_email (email);
-- 等待T1释放MDL共享锁
-- 被阻塞...

-- 事务T3：后续查询
SELECT * FROM users WHERE id = 2;
-- 也被阻塞！因为T2在等待MDL排他锁
```

**解决方案**：
1. **避免长事务**：尽快提交事务
2. **监控长事务**：定期检查并kill长事务
3. **使用Online DDL**：减少MDL锁持有时间

### 5.6 查看字典锁等待

```sql
-- 查看MDL锁等待
SELECT 
    r.trx_id waiting_trx_id,
    r.trx_mysql_thread_id waiting_thread,
    r.trx_query waiting_query,
    b.trx_id blocking_trx_id,
    b.trx_mysql_thread_id blocking_thread,
    b.trx_query blocking_query
FROM information_schema.INNODB_LOCK_WAITS w
INNER JOIN information_schema.INNODB_TRX b ON b.trx_id = w.blocking_trx_id
INNER JOIN information_schema.INNODB_TRX r ON r.trx_id = w.requesting_trx_id;

-- 查看当前MDL锁
SELECT * FROM performance_schema.metadata_locks;
```

## 六、各种DDL操作的锁行为

### 6.1 添加索引

#### 6.1.1 使用Inplace算法（推荐）

```sql
ALTER TABLE users ADD INDEX idx_email (email), ALGORITHM=INPLACE, LOCK=NONE;
```

**锁行为**：
- **准备阶段**：MDL排他锁（短暂，约几毫秒）
- **执行阶段**：无锁，不阻塞读写
- **提交阶段**：MDL排他锁（短暂，约几毫秒）

**特点**：
- ✅ 不阻塞读写操作
- ✅ 业务基本不受影响
- ✅ 适合生产环境

#### 6.1.2 使用Copy算法

```sql
ALTER TABLE users ADD INDEX idx_email (email), ALGORITHM=COPY;
```

**锁行为**：
- **整个操作期间**：表级排他锁（X Lock）
- **阻塞所有读写操作**

**特点**：
- ❌ 完全阻塞业务
- ❌ 大表操作时间长
- ⚠️ 仅在不支持Inplace时使用

### 6.2 删除索引

```sql
ALTER TABLE users DROP INDEX idx_email, ALGORITHM=INPLACE, LOCK=NONE;
```

**锁行为**：
- **准备阶段**：MDL排他锁（短暂）
- **执行阶段**：无锁，快速删除
- **提交阶段**：MDL排他锁（短暂）

**特点**：
- ✅ 操作非常快（通常几秒内完成）
- ✅ 不阻塞读写
- ✅ 几乎无业务影响

### 6.3 修改索引

```sql
-- 修改索引名称
ALTER TABLE users RENAME INDEX idx_old TO idx_new, ALGORITHM=INPLACE, LOCK=NONE;
```

**锁行为**：
- **准备阶段**：MDL排他锁（短暂）
- **执行阶段**：无锁
- **提交阶段**：MDL排他锁（短暂）

**特点**：
- ✅ 操作快速
- ✅ 不阻塞读写

### 6.4 添加列

#### 6.4.1 添加列（末尾，可NULL，有默认值）

```sql
ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
ALGORITHM=INPLACE, LOCK=NONE;
```

**锁行为**：
- **准备阶段**：MDL排他锁（短暂）
- **执行阶段**：无锁，不阻塞读写
- **提交阶段**：MDL排他锁（短暂）

**特点**：
- ✅ 支持Online DDL
- ✅ 不阻塞读写

#### 6.4.2 添加列（中间位置或NOT NULL无默认值）

```sql
ALTER TABLE users ADD COLUMN status INT NOT NULL AFTER name, 
ALGORITHM=COPY;
```

**锁行为**：
- **整个操作期间**：表级排他锁
- **阻塞所有读写操作**

**特点**：
- ❌ 必须使用Copy算法
- ❌ 会锁表

### 6.5 修改列

#### 6.5.1 修改列类型（某些情况）

```sql
-- 扩大VARCHAR长度（支持Online DDL）
ALTER TABLE users MODIFY COLUMN name VARCHAR(100), 
ALGORITHM=INPLACE, LOCK=NONE;
```

**锁行为**：
- **准备阶段**：MDL排他锁（短暂）
- **执行阶段**：无锁
- **提交阶段**：MDL排他锁（短暂）

#### 6.5.2 修改列类型（其他情况）

```sql
-- 修改数据类型（必须使用Copy）
ALTER TABLE users MODIFY COLUMN id BIGINT, 
ALGORITHM=COPY;
```

**锁行为**：
- **整个操作期间**：表级排他锁
- **阻塞所有读写操作**

### 6.6 删除列

```sql
ALTER TABLE users DROP COLUMN status, ALGORITHM=INPLACE, LOCK=NONE;
```

**锁行为**：
- **准备阶段**：MDL排他锁（短暂）
- **执行阶段**：无锁，不阻塞读写
- **提交阶段**：MDL排他锁（短暂）

**特点**：
- ✅ MySQL 5.7+支持Online DDL
- ✅ 不阻塞读写

### 6.7 修改表选项

```sql
-- 修改表字符集
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4, 
ALGORITHM=INPLACE, LOCK=NONE;
```

**锁行为**：
- **准备阶段**：MDL排他锁（短暂）
- **执行阶段**：无锁
- **提交阶段**：MDL排他锁（短暂）

**特点**：
- ✅ 支持Online DDL
- ✅ 不阻塞读写

## 七、Online DDL的支持情况

### 7.1 支持Online DDL的操作

| 操作类型 | ALGORITHM | LOCK | 说明 |
|---------|-----------|------|------|
| **添加索引** | INPLACE | NONE | ✅ 完全支持 |
| **删除索引** | INPLACE | NONE | ✅ 完全支持 |
| **修改索引名称** | INPLACE | NONE | ✅ 完全支持 |
| **添加列（末尾，可NULL）** | INPLACE | NONE | ✅ 完全支持 |
| **添加列（末尾，有默认值）** | INPLACE | NONE | ✅ 完全支持 |
| **删除列** | INPLACE | NONE | ✅ MySQL 5.7+ |
| **修改列（扩大长度）** | INPLACE | NONE | ✅ 部分支持 |
| **修改表选项** | INPLACE | NONE | ✅ 部分支持 |

### 7.2 不支持Online DDL的操作

| 操作类型 | 原因 | 建议 |
|---------|------|------|
| **修改主键** | 需要重建表 | 使用Copy算法，在低峰期执行 |
| **修改列类型** | 需要重建表 | 使用Copy算法，在低峰期执行 |
| **添加列（中间位置）** | 需要重建表 | 使用Copy算法，在低峰期执行 |
| **添加列（NOT NULL无默认值）** | 需要重建表 | 使用Copy算法，在低峰期执行 |
| **修改表字符集** | 某些情况需要重建 | 根据具体情况选择 |

### 7.3 检查操作是否支持Online DDL

```sql
-- 方法1：使用EXPLAIN查看
ALTER TABLE users ADD INDEX idx_email (email), ALGORITHM=INPLACE, LOCK=NONE;
-- 如果支持，会正常执行
-- 如果不支持，会报错或自动降级为COPY

-- 方法2：查看官方文档
-- 参考MySQL官方文档的Online DDL支持矩阵

-- 方法3：测试环境验证
-- 在测试环境执行，观察锁行为
```

## 八、实际应用场景

### 8.1 场景1：生产环境添加索引

#### 需求
- 表大小：100GB
- 数据量：1亿行
- 需要添加索引：idx_email
- 业务要求：不能影响业务

#### 方案

**方案A：使用Online DDL（推荐）**

```sql
-- 执行Online DDL
ALTER TABLE users ADD INDEX idx_email (email), 
ALGORITHM=INPLACE, LOCK=NONE;

-- 监控进度
SELECT 
    EVENT_NAME,
    WORK_COMPLETED,
    WORK_ESTIMATED,
    ROUND(100 * WORK_COMPLETED / WORK_ESTIMATED, 2) AS progress_pct
FROM performance_schema.events_stages_current
WHERE EVENT_NAME LIKE 'stage/innodb/alter%';
```

**优点**：
- ✅ 不阻塞业务
- ✅ 可以随时监控进度
- ✅ 可以随时取消（MySQL 8.0+）

**方案B：使用pt-online-schema-change（第三方工具）**

```bash
pt-online-schema-change \
  --alter "ADD INDEX idx_email (email)" \
  --execute \
  D=test,t=users
```

**优点**：
- ✅ 更灵活的控制
- ✅ 可以暂停和恢复
- ✅ 更好的进度显示

### 8.2 场景2：修改大表结构

#### 需求
- 表大小：500GB
- 需要修改列类型：VARCHAR(50) → VARCHAR(100)
- 业务要求：尽量减少影响

#### 方案

**步骤1：检查是否支持Online DDL**

```sql
-- 测试
ALTER TABLE users MODIFY COLUMN name VARCHAR(100), 
ALGORITHM=INPLACE, LOCK=NONE;
```

**如果支持**：
- 使用Online DDL，不阻塞业务

**如果不支持**：
- 使用Copy算法，在业务低峰期执行
- 或者使用pt-online-schema-change

### 8.3 场景3：删除无用索引

#### 需求
- 删除不再使用的索引
- 释放存储空间
- 不影响业务

#### 方案

```sql
-- 删除索引（快速，不阻塞）
ALTER TABLE users DROP INDEX idx_unused, 
ALGORITHM=INPLACE, LOCK=NONE;

-- 特点：
-- - 操作非常快（通常几秒）
-- - 不阻塞读写
-- - 几乎无业务影响
```

## 九、性能优化建议

### 9.1 选择合适的算法

```sql
-- 1. 优先使用INPLACE算法
ALTER TABLE users ADD INDEX idx_email (email), 
ALGORITHM=INPLACE, LOCK=NONE;

-- 2. 只在必要时使用COPY算法
ALTER TABLE users MODIFY COLUMN id BIGINT, 
ALGORITHM=COPY;
```

### 9.2 设置合适的锁级别

```sql
-- 1. 优先使用LOCK=NONE
ALTER TABLE users ADD INDEX idx_email (email), 
ALGORITHM=INPLACE, LOCK=NONE;

-- 2. 如果必须锁表，使用LOCK=SHARED（允许读）
ALTER TABLE users ADD INDEX idx_email (email), 
ALGORITHM=INPLACE, LOCK=SHARED;

-- 3. 避免使用LOCK=EXCLUSIVE（除非必要）
```

### 9.3 监控DDL进度

```sql
-- MySQL 5.7+
SELECT 
    EVENT_NAME,
    WORK_COMPLETED,
    WORK_ESTIMATED,
    ROUND(100 * WORK_COMPLETED / WORK_ESTIMATED, 2) AS progress_pct
FROM performance_schema.events_stages_current
WHERE EVENT_NAME LIKE 'stage/innodb/alter%';
```

### 9.4 避免长事务阻塞DDL

```sql
-- 1. 监控长事务
SELECT 
    trx_id,
    trx_started,
    TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS duration_seconds,
    trx_query
FROM information_schema.INNODB_TRX
ORDER BY trx_started;

-- 2. 必要时kill长事务
KILL <thread_id>;
```

### 9.5 使用第三方工具

**pt-online-schema-change**：
- 更灵活的控制
- 可以暂停和恢复
- 更好的进度显示
- 自动处理外键等复杂情况

```bash
# 安装
yum install percona-toolkit

# 使用
pt-online-schema-change \
  --alter "ADD INDEX idx_email (email)" \
  --execute \
  D=test,t=users
```

## 十、常见问题与解决方案

### 10.1 问题1：DDL操作被阻塞

**现象**：
```sql
ALTER TABLE users ADD INDEX idx_email (email);
-- 一直等待，不执行
```

**原因**：
- 有长事务持有MDL共享锁
- 有其他DDL操作在等待

**解决方案**：
```sql
-- 1. 查找阻塞的事务
SELECT * FROM information_schema.INNODB_TRX;

-- 2. Kill阻塞的事务
KILL <thread_id>;

-- 3. 使用Online DDL减少锁持有时间
ALTER TABLE users ADD INDEX idx_email (email), 
ALGORITHM=INPLACE, LOCK=NONE;
```

### 10.2 问题2：磁盘空间不足

**现象**：
```sql
ALTER TABLE users ADD INDEX idx_email (email);
-- 报错：磁盘空间不足
```

**原因**：
- Copy算法需要2倍表空间
- Inplace算法也需要额外空间

**解决方案**：
```sql
-- 1. 使用Inplace算法（需要空间更少）
ALTER TABLE users ADD INDEX idx_email (email), 
ALGORITHM=INPLACE, LOCK=NONE;

-- 2. 清理磁盘空间
-- 删除无用数据、归档历史数据

-- 3. 扩展磁盘空间
```

### 10.3 问题3：DDL操作太慢

**现象**：
```sql
ALTER TABLE users ADD INDEX idx_email (email);
-- 执行时间很长（数小时）
```

**原因**：
- 表太大
- 使用Copy算法
- 磁盘IO性能差

**解决方案**：
```sql
-- 1. 使用Inplace算法
ALTER TABLE users ADD INDEX idx_email (email), 
ALGORITHM=INPLACE, LOCK=NONE;

-- 2. 优化磁盘IO
-- 使用SSD、增加IOPS

-- 3. 分批处理
-- 对于超大表，考虑分表或使用pt-online-schema-change
```

### 10.4 问题4：Online DDL不支持的操作

**现象**：
```sql
ALTER TABLE users MODIFY COLUMN id BIGINT, ALGORITHM=INPLACE, LOCK=NONE;
-- 报错：不支持Online DDL
```

**解决方案**：
```sql
-- 1. 使用Copy算法（在低峰期执行）
ALTER TABLE users MODIFY COLUMN id BIGINT, ALGORITHM=COPY;

-- 2. 使用pt-online-schema-change
pt-online-schema-change \
  --alter "MODIFY COLUMN id BIGINT" \
  --execute \
  D=test,t=users

-- 3. 考虑业务影响，选择合适的时间窗口
```

## 十一、总结

### 11.1 核心概念回顾

1. **Copy算法**：
   - 创建临时表，复制数据
   - 需要2倍表空间
   - 会锁表，阻塞业务

2. **Inplace算法**：
   - 在原表上直接操作
   - 空间效率高
   - 支持Online DDL，不阻塞业务

3. **Online DDL**：
   - 执行期间不阻塞读写
   - 只在准备和提交阶段短暂加锁
   - 大幅减少业务影响

4. **字典锁（MDL）**：
   - 保护表结构定义
   - 协调DDL和DML操作
   - 长事务可能阻塞DDL

### 11.2 关键要点

1. **添加索引**：优先使用`ALGORITHM=INPLACE, LOCK=NONE`
2. **删除索引**：快速，几乎无影响
3. **修改表结构**：根据操作类型选择算法
4. **避免长事务**：防止阻塞DDL操作
5. **监控进度**：使用performance_schema监控DDL进度

### 11.3 最佳实践

1. **优先使用Online DDL**：
   ```sql
   ALTER TABLE table_name [操作], 
   ALGORITHM=INPLACE, LOCK=NONE;
   ```

2. **监控DDL进度**：
   ```sql
   SELECT * FROM performance_schema.events_stages_current;
   ```

3. **避免长事务**：
   - 尽快提交事务
   - 监控并kill长事务

4. **选择合适的时机**：
   - 对于必须锁表的操作，选择业务低峰期
   - 对于Online DDL，可以随时执行

5. **使用第三方工具**：
   - 对于复杂场景，使用pt-online-schema-change

通过深入理解MySQL DDL的锁机制和Online DDL的实现原理，我们可以选择合适的DDL策略，在保证数据安全的同时，最小化对业务的影响。

