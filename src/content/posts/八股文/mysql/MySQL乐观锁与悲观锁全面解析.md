---
title: MySQL乐观锁与悲观锁全面解析
published: 2025-01-23
updated: 2025-01-23
description: "深入理解MySQL中的乐观锁和悲观锁：从基本概念到实现方式，全面解析两种并发控制策略的原理、应用场景、性能对比以及与InnoDB锁机制的关系"
tags:
  - MySQL
  - InnoDB
  - 乐观锁
  - 悲观锁
  - 并发控制
  - 版本控制
category: 八股文
draft: false
---

# MySQL乐观锁与悲观锁全面解析

乐观锁和悲观锁是两种不同的并发控制策略，它们在MySQL中有着不同的实现方式和应用场景。理解这两种锁机制对于选择合适的并发控制方案、优化数据库性能、解决并发冲突至关重要。本文将从基本概念出发，深入讲解乐观锁和悲观锁在MySQL中的实现、应用场景以及与InnoDB锁机制的关系。

## 一、什么是乐观锁和悲观锁？

### 1.1 基本概念

**悲观锁（Pessimistic Lock）**：
- **假设**：认为并发冲突很可能发生
- **策略**：在操作数据之前先加锁，确保操作期间数据不会被其他事务修改
- **实现**：使用数据库的锁机制（如SELECT FOR UPDATE）
- **特点**：先锁后操作，阻塞其他事务

**乐观锁（Optimistic Lock）**：
- **假设**：认为并发冲突不太可能发生
- **策略**：先操作数据，在提交时检查是否有冲突，如果有冲突则回滚重试
- **实现**：使用版本号、时间戳等字段在应用层实现
- **特点**：先操作后检查，不阻塞其他事务

### 1.2 形象比喻

**悲观锁**：像银行取款
```
你去银行取款，银行假设可能有人会同时操作你的账户
→ 先锁定你的账户（加锁）
→ 处理你的取款请求
→ 解锁账户
→ 其他人才能操作
```

**乐观锁**：像Git提交代码
```
你修改代码后提交
→ 先尝试提交（操作数据）
→ Git检查是否有冲突（版本检查）
→ 如果有冲突，提示你解决冲突后重试
→ 如果没有冲突，提交成功
```

### 1.3 核心区别对比

| 特性 | 悲观锁 | 乐观锁 |
|------|--------|--------|
| **加锁时机** | 操作前加锁 | 操作后检查 |
| **阻塞性** | 会阻塞其他事务 | 不阻塞，但可能回滚重试 |
| **实现方式** | 数据库锁机制 | 应用层版本控制 |
| **适用场景** | 冲突频繁 | 冲突较少 |
| **性能** | 高并发下性能较差 | 高并发下性能较好 |
| **数据一致性** | 强一致性 | 最终一致性（可能重试） |

## 二、悲观锁在MySQL中的实现

### 2.1 InnoDB行锁机制

MySQL的悲观锁主要通过InnoDB的行锁机制实现，包括：

1. **排他锁（X Lock）**：`SELECT ... FOR UPDATE`
2. **共享锁（S Lock）**：`SELECT ... LOCK IN SHARE MODE` 或 `SELECT ... FOR SHARE`

### 2.2 排他锁实现悲观锁

#### 2.2.1 基本用法

```sql
-- 事务T1：使用排他锁实现悲观锁
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- 此时id=1的记录被加排他锁，其他事务无法修改

-- 业务逻辑处理
-- ...

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
-- 释放锁
```

#### 2.2.2 实际案例：账户扣款

```sql
-- 场景：防止并发扣款导致余额错误

-- 初始数据
-- accounts表：id=1, balance=1000

-- 事务T1：用户A扣款100
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- 加排他锁，读取balance=1000
-- 计算：1000 - 100 = 900
UPDATE accounts SET balance = 900 WHERE id = 1;
COMMIT;
-- 结果：balance=900

-- 事务T2：用户B同时扣款200（被阻塞）
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- 等待T1释放锁...
-- T1提交后，读取balance=900
-- 计算：900 - 200 = 700
UPDATE accounts SET balance = 700 WHERE id = 1;
COMMIT;
-- 结果：balance=700（正确）
```

**关键点**：
- T2在T1提交前被阻塞，无法读取数据
- 保证了数据的一致性
- 但降低了并发性能

### 2.3 共享锁实现悲观锁

#### 2.3.1 基本用法

```sql
-- 事务T1：使用共享锁
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR SHARE;
-- 加共享锁，其他事务可以读取，但不能修改

-- 业务逻辑（只读操作）
-- ...

COMMIT;
```

#### 2.3.2 实际案例：读取并防止修改

```sql
-- 场景：生成报表时防止数据被修改

-- 事务T1：生成报表
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR SHARE;
SELECT * FROM accounts WHERE id = 2 FOR SHARE;
-- 加共享锁，读取数据
-- 生成报表...
COMMIT;

-- 事务T2：尝试修改（被阻塞）
BEGIN;
UPDATE accounts SET balance = balance + 100 WHERE id = 1;
-- 等待T1释放共享锁...
COMMIT;
```

### 2.4 悲观锁的特点

#### 优点：
1. **强一致性**：保证数据在操作期间不被修改
2. **简单直观**：使用数据库原生锁机制
3. **适合冲突频繁场景**：高竞争环境下表现稳定

#### 缺点：
1. **阻塞性能**：会阻塞其他事务，降低并发性能
2. **死锁风险**：多个事务加锁顺序不当可能导致死锁
3. **锁持有时间长**：如果业务逻辑复杂，锁持有时间长，影响性能

### 2.5 悲观锁的最佳实践

```sql
-- 1. 尽快释放锁：业务逻辑尽量在事务外处理
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- 只读取必要数据
COMMIT;  -- 立即提交，释放锁

-- 业务逻辑在事务外处理
-- ...

-- 2. 按相同顺序加锁，避免死锁
-- 事务T1和T2都按id顺序加锁
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
SELECT * FROM accounts WHERE id = 2 FOR UPDATE;

-- 3. 使用合适的索引，减少锁范围
-- 有索引：只锁定相关行
-- 无索引：可能锁定整个表
```

## 三、乐观锁在MySQL中的实现

### 3.1 版本号机制

乐观锁最常见的实现方式是**版本号（Version）字段**。

#### 3.1.1 表结构设计

```sql
CREATE TABLE accounts (
    id INT PRIMARY KEY,
    balance DECIMAL(10, 2),
    version INT DEFAULT 0,  -- 版本号字段
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 3.1.2 更新逻辑

**核心思想**：读取时记录版本号，更新时检查版本号是否变化

```sql
-- 步骤1：读取数据（记录版本号）
SELECT id, balance, version FROM accounts WHERE id = 1;
-- 结果：id=1, balance=1000, version=5

-- 步骤2：业务逻辑处理
-- 计算新余额：1000 - 100 = 900

-- 步骤3：更新数据（检查版本号）
UPDATE accounts 
SET balance = 900, version = version + 1 
WHERE id = 1 AND version = 5;  -- 关键：WHERE条件包含version检查

-- 步骤4：检查更新结果
-- 如果受影响行数为0，说明版本号已变化，需要重试
```

#### 3.1.3 完整示例

```sql
-- 初始数据
-- accounts: id=1, balance=1000, version=0

-- 事务T1：用户A扣款100
BEGIN;
SELECT id, balance, version FROM accounts WHERE id = 1;
-- 读取：balance=1000, version=0

-- 业务逻辑：计算新余额 = 1000 - 100 = 900

UPDATE accounts 
SET balance = 900, version = 1 
WHERE id = 1 AND version = 0;
-- 受影响行数：1，更新成功
COMMIT;

-- 事务T2：用户B同时扣款200
BEGIN;
SELECT id, balance, version FROM accounts WHERE id = 1;
-- 读取：balance=1000, version=0（在T1提交前读取）

-- 业务逻辑：计算新余额 = 1000 - 200 = 800

UPDATE accounts 
SET balance = 800, version = 1 
WHERE id = 1 AND version = 0;
-- 受影响行数：0（version已经是1，不匹配）
-- 更新失败，需要重试

-- 重试：重新读取
SELECT id, balance, version FROM accounts WHERE id = 1;
-- 读取：balance=900, version=1（T1已提交）

-- 重新计算：900 - 200 = 700
UPDATE accounts 
SET balance = 700, version = 2 
WHERE id = 1 AND version = 1;
-- 受影响行数：1，更新成功
COMMIT;
```

### 3.2 时间戳机制

除了版本号，也可以使用**时间戳（Timestamp）**实现乐观锁。

#### 3.2.1 表结构设计

```sql
CREATE TABLE accounts (
    id INT PRIMARY KEY,
    balance DECIMAL(10, 2),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 3.2.2 更新逻辑

```sql
-- 步骤1：读取数据（记录时间戳）
SELECT id, balance, updated_at FROM accounts WHERE id = 1;
-- 结果：id=1, balance=1000, updated_at='2025-01-23 10:00:00'

-- 步骤2：业务逻辑处理
-- 计算新余额：1000 - 100 = 900

-- 步骤3：更新数据（检查时间戳）
UPDATE accounts 
SET balance = 900 
WHERE id = 1 AND updated_at = '2025-01-23 10:00:00';

-- 步骤4：检查更新结果
-- 如果受影响行数为0，说明时间戳已变化，需要重试
```

**注意**：时间戳机制在高并发下可能不够精确，建议使用版本号。

### 3.3 应用层实现示例

#### 3.3.1 Java实现

```java
public class AccountService {
    
    // 使用乐观锁更新账户余额
    public boolean deductBalance(int accountId, BigDecimal amount) {
        int maxRetries = 3;  // 最大重试次数
        int retries = 0;
        
        while (retries < maxRetries) {
            try {
                // 1. 读取当前数据
                Account account = accountDao.selectById(accountId);
                if (account == null) {
                    return false;
                }
                
                // 2. 检查余额
                if (account.getBalance().compareTo(amount) < 0) {
                    return false;  // 余额不足
                }
                
                // 3. 计算新余额
                BigDecimal newBalance = account.getBalance().subtract(amount);
                
                // 4. 更新数据（乐观锁检查）
                int rows = accountDao.updateBalance(
                    accountId, 
                    newBalance, 
                    account.getVersion()
                );
                
                // 5. 检查更新结果
                if (rows > 0) {
                    return true;  // 更新成功
                } else {
                    // 版本冲突，重试
                    retries++;
                    Thread.sleep(10);  // 短暂等待后重试
                }
            } catch (Exception e) {
                retries++;
                if (retries >= maxRetries) {
                    throw new RuntimeException("更新失败", e);
                }
            }
        }
        
        return false;  // 重试次数用完，更新失败
    }
}
```

```java
// DAO层实现
public interface AccountDao {
    Account selectById(int id);
    
    // 乐观锁更新
    int updateBalance(int id, BigDecimal balance, int expectedVersion);
}
```

```xml
<!-- MyBatis映射 -->
<update id="updateBalance">
    UPDATE accounts 
    SET balance = #{balance}, 
        version = version + 1 
    WHERE id = #{id} 
      AND version = #{expectedVersion}
</update>
```

#### 3.3.2 Python实现

```python
import time
from typing import Optional

class AccountService:
    def deduct_balance(self, account_id: int, amount: float) -> bool:
        max_retries = 3
        retries = 0
        
        while retries < max_retries:
            try:
                # 1. 读取当前数据
                account = self.account_dao.select_by_id(account_id)
                if not account:
                    return False
                
                # 2. 检查余额
                if account['balance'] < amount:
                    return False
                
                # 3. 计算新余额
                new_balance = account['balance'] - amount
                
                # 4. 更新数据（乐观锁检查）
                rows = self.account_dao.update_balance(
                    account_id,
                    new_balance,
                    account['version']
                )
                
                # 5. 检查更新结果
                if rows > 0:
                    return True  # 更新成功
                else:
                    # 版本冲突，重试
                    retries += 1
                    time.sleep(0.01)  # 短暂等待
                    
            except Exception as e:
                retries += 1
                if retries >= max_retries:
                    raise
                    
        return False  # 重试失败
```

### 3.4 乐观锁的特点

#### 优点：
1. **高并发性能**：不会阻塞其他事务，并发性能好
2. **无死锁风险**：不需要加锁，不会产生死锁
3. **适合读多写少**：冲突少时性能优异

#### 缺点：
1. **可能重试**：冲突时需要重试，增加复杂度
2. **ABA问题**：版本号可能被重复使用（可通过增加版本号解决）
3. **不适合高冲突场景**：冲突频繁时重试开销大

### 3.5 乐观锁的最佳实践

```sql
-- 1. 版本号字段使用INT或BIGINT，自动递增
CREATE TABLE accounts (
    id INT PRIMARY KEY,
    balance DECIMAL(10, 2),
    version INT DEFAULT 0
);

-- 2. 更新时同时更新版本号
UPDATE accounts 
SET balance = #{balance}, version = version + 1 
WHERE id = #{id} AND version = #{expectedVersion};

-- 3. 设置合理的重试次数和重试间隔
-- 重试次数：3-5次
-- 重试间隔：10-50ms（指数退避）

-- 4. 监控版本冲突率
-- 如果冲突率过高，考虑使用悲观锁
```

## 四、乐观锁与悲观锁的选择策略

### 4.1 选择依据

选择乐观锁还是悲观锁，主要考虑以下因素：

#### 4.1.1 冲突频率

```
冲突频率高 → 悲观锁
冲突频率低 → 乐观锁
```

**判断标准**：
- **冲突频率 > 20%**：建议使用悲观锁
- **冲突频率 < 5%**：建议使用乐观锁
- **冲突频率 5%-20%**：根据具体场景选择

#### 4.1.2 读多写少 vs 写多读少

```
读多写少 → 乐观锁（读不阻塞）
写多读少 → 悲观锁（写操作需要强一致性）
```

#### 4.1.3 业务场景

```
强一致性要求 → 悲观锁
最终一致性可接受 → 乐观锁

实时性要求高 → 乐观锁（不阻塞）
数据准确性要求高 → 悲观锁
```

### 4.2 场景对比分析

#### 场景1：账户余额扣款

**特点**：
- 冲突频率：中等
- 一致性要求：强
- 实时性要求：高

**选择**：**悲观锁**

```sql
-- 使用悲观锁
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- 检查余额
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

**原因**：
- 余额扣款必须保证准确性
- 冲突时阻塞比重试更可靠
- 业务逻辑简单，锁持有时间短

#### 场景2：商品库存扣减

**特点**：
- 冲突频率：高（秒杀场景）
- 一致性要求：强
- 实时性要求：高

**选择**：**悲观锁 + 优化**

```sql
-- 使用悲观锁，但优化锁范围
BEGIN;
SELECT stock FROM products WHERE id = 1 FOR UPDATE;
-- 只锁定必要字段，减少锁持有时间
IF stock > 0 THEN
    UPDATE products SET stock = stock - 1 WHERE id = 1;
END IF;
COMMIT;
```

**或者使用乐观锁 + 重试**：

```sql
-- 使用乐观锁
UPDATE products 
SET stock = stock - 1, version = version + 1 
WHERE id = 1 AND stock > 0 AND version = #{expectedVersion};
-- 如果失败，应用层重试
```

#### 场景3：用户信息更新

**特点**：
- 冲突频率：低
- 一致性要求：中等
- 实时性要求：中等

**选择**：**乐观锁**

```sql
-- 使用乐观锁
UPDATE users 
SET name = #{name}, version = version + 1 
WHERE id = #{id} AND version = #{expectedVersion};
-- 冲突时重试，不影响其他用户
```

#### 场景4：统计计数

**特点**：
- 冲突频率：高
- 一致性要求：中等（允许少量误差）
- 实时性要求：高

**选择**：**乐观锁 + 批量更新**

```sql
-- 使用乐观锁，批量更新
UPDATE counters 
SET count = count + #{increment}, version = version + 1 
WHERE id = #{id} AND version = #{expectedVersion};
-- 或者使用Redis等缓存系统
```

### 4.3 混合策略

在实际应用中，可以**混合使用**乐观锁和悲观锁：

```java
public class AccountService {
    
    // 根据冲突频率动态选择
    public boolean deductBalance(int accountId, BigDecimal amount) {
        // 1. 先尝试乐观锁（快速路径）
        if (tryOptimisticLock(accountId, amount)) {
            return true;
        }
        
        // 2. 如果乐观锁失败，使用悲观锁（慢速路径）
        return tryPessimisticLock(accountId, amount);
    }
    
    private boolean tryOptimisticLock(int accountId, BigDecimal amount) {
        // 乐观锁实现
        // ...
    }
    
    private boolean tryPessimisticLock(int accountId, BigDecimal amount) {
        // 悲观锁实现
        // ...
    }
}
```

## 五、乐观锁与InnoDB锁机制的关系

### 5.1 理解误区澄清

**误区**：乐观锁不需要数据库锁

**正确理解**：
- 乐观锁在**应用层**实现，不依赖数据库的显式锁
- 但**UPDATE语句本身会加隐式锁**（InnoDB自动加排他锁）
- 乐观锁通过**版本检查**避免冲突，而不是通过加锁避免冲突

### 5.2 UPDATE语句的锁机制

```sql
-- 乐观锁的UPDATE语句
UPDATE accounts 
SET balance = 900, version = version + 1 
WHERE id = 1 AND version = 0;
```

**InnoDB的处理**：
1. **加锁阶段**：对匹配的行加排他锁（X Lock）
2. **检查阶段**：检查WHERE条件（包括version检查）
3. **更新阶段**：如果条件满足，更新数据
4. **释放锁**：事务提交时释放锁

**关键点**：
- UPDATE语句会加锁，但锁持有时间很短（只有更新操作本身）
- 乐观锁通过版本检查，使得冲突的UPDATE不会实际修改数据
- 锁的持有时间远小于悲观锁（不需要等待业务逻辑）

### 5.3 性能对比

#### 5.3.1 悲观锁的时间线

```
T1: BEGIN
    SELECT ... FOR UPDATE  (加锁)
    [业务逻辑处理 - 100ms]  (锁持有)
    UPDATE ...             (更新)
    COMMIT                 (释放锁)
总时间：~100ms（锁持有时间长）
```

#### 5.3.2 乐观锁的时间线

```
T1: BEGIN
    SELECT ...             (无锁，快照读)
    [业务逻辑处理 - 100ms]  (无锁)
    UPDATE ... WHERE version = X  (加锁，但很快释放)
    COMMIT                 (释放锁)
总时间：~100ms（但锁持有时间短，约1ms）

T2: 如果冲突
    SELECT ...             (无锁)
    [业务逻辑处理 - 100ms]  (无锁)
    UPDATE ... WHERE version = X  (加锁，但version不匹配，立即释放)
    重试...
```

**对比**：
- **悲观锁**：锁持有时间 = 业务逻辑时间（长）
- **乐观锁**：锁持有时间 = UPDATE操作时间（短）
- **乐观锁优势**：即使需要重试，锁持有时间也远小于悲观锁

### 5.4 MVCC与乐观锁

**关系**：
- **MVCC**：解决读-写冲突（快照读）
- **乐观锁**：解决写-写冲突（版本检查）
- **两者协同**：MVCC让读操作不阻塞，乐观锁让写操作冲突时快速失败

```sql
-- 场景：读-写并发

-- 事务T1（读）
SELECT * FROM accounts WHERE id = 1;
-- MVCC：快照读，无需锁，读取历史版本

-- 事务T2（写，乐观锁）
UPDATE accounts 
SET balance = 900, version = version + 1 
WHERE id = 1 AND version = 0;
-- 加排他锁，但锁持有时间短

-- 结果：T1不被阻塞，T2快速完成
```

## 六、实际应用案例

### 6.1 案例1：电商库存管理

#### 需求分析
- 高并发场景（秒杀）
- 库存准确性要求高
- 需要防止超卖

#### 方案选择

**方案A：悲观锁**
```sql
BEGIN;
SELECT stock FROM products WHERE id = 1 FOR UPDATE;
IF stock > 0 THEN
    UPDATE products SET stock = stock - 1 WHERE id = 1;
    INSERT INTO orders (product_id, user_id) VALUES (1, 100);
END IF;
COMMIT;
```

**优点**：简单可靠
**缺点**：高并发下性能差，可能成为瓶颈

**方案B：乐观锁**
```sql
-- 应用层实现
int retries = 0;
while (retries < 3) {
    Product product = selectProduct(id);
    if (product.stock <= 0) {
        return false;  // 库存不足
    }
    
    int rows = updateProductStock(id, product.stock - 1, product.version);
    if (rows > 0) {
        createOrder(id, userId);
        return true;
    }
    retries++;
    sleep(10ms);
}
return false;
```

**优点**：高并发性能好
**缺点**：需要重试逻辑，复杂度稍高

**推荐**：**乐观锁 + Redis缓存**（结合使用）

### 6.2 案例2：账户余额管理

#### 需求分析
- 余额准确性要求极高
- 冲突频率中等
- 实时性要求高

#### 方案选择：悲观锁

```sql
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- 检查余额
IF balance >= amount THEN
    UPDATE accounts SET balance = balance - amount WHERE id = 1;
    INSERT INTO transactions (account_id, amount, type) VALUES (1, -amount, 'DEBIT');
END IF;
COMMIT;
```

**原因**：
- 金融场景，准确性优先
- 业务逻辑简单，锁持有时间短
- 悲观锁更可靠

### 6.3 案例3：用户信息更新

#### 需求分析
- 冲突频率低
- 一致性要求中等
- 用户体验要求高（不阻塞）

#### 方案选择：乐观锁

```java
public boolean updateUserInfo(int userId, UserInfo newInfo) {
    int retries = 0;
    while (retries < 3) {
        UserInfo current = userDao.selectById(userId);
        
        // 业务逻辑验证
        if (!validate(newInfo, current)) {
            return false;
        }
        
        // 乐观锁更新
        int rows = userDao.updateUserInfo(
            userId, 
            newInfo, 
            current.getVersion()
        );
        
        if (rows > 0) {
            return true;
        }
        
        retries++;
        Thread.sleep(10);
    }
    return false;
}
```

**原因**：
- 冲突少，乐观锁性能好
- 用户体验好，不阻塞
- 重试逻辑简单

## 七、性能优化建议

### 7.1 悲观锁优化

```sql
-- 1. 减少锁持有时间
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- 只读取必要数据，立即提交
COMMIT;
-- 业务逻辑在事务外处理

-- 2. 使用合适的索引
-- 有索引：只锁定相关行
-- 无索引：可能锁定整个表

-- 3. 避免长事务
-- 尽快提交，释放锁

-- 4. 按相同顺序加锁，避免死锁
```

### 7.2 乐观锁优化

```sql
-- 1. 合理设置重试次数和间隔
-- 重试次数：3-5次
-- 重试间隔：10-50ms（指数退避）

-- 2. 监控版本冲突率
-- 如果冲突率 > 20%，考虑使用悲观锁

-- 3. 批量更新优化
-- 对于批量操作，考虑使用悲观锁

-- 4. 版本号字段优化
-- 使用INT或BIGINT，自动递增
-- 考虑使用时间戳作为辅助判断
```

### 7.3 混合优化策略

```java
public class OptimizedAccountService {
    
    // 根据冲突率动态选择
    public boolean deductBalance(int accountId, BigDecimal amount) {
        // 监控冲突率
        double conflictRate = getConflictRate(accountId);
        
        if (conflictRate > 0.2) {
            // 冲突率高，使用悲观锁
            return pessimisticDeduct(accountId, amount);
        } else {
            // 冲突率低，使用乐观锁
            return optimisticDeduct(accountId, amount);
        }
    }
}
```

## 八、常见问题与解决方案

### 8.1 乐观锁的ABA问题

**问题**：版本号可能被重复使用

```
初始：version = 1
T1: version 1 → 2 → 1  (先更新再回滚)
T2: 读取version = 1，认为数据未变化
```

**解决方案**：
1. **使用自增版本号**：版本号只增不减
2. **使用时间戳**：结合时间戳判断
3. **使用UUID**：每次更新生成新的UUID

```sql
-- 方案1：自增版本号（推荐）
UPDATE accounts 
SET balance = 900, version = version + 1 
WHERE id = 1 AND version = 5;
-- version只会增加，不会减少

-- 方案2：时间戳
UPDATE accounts 
SET balance = 900, updated_at = NOW() 
WHERE id = 1 AND updated_at = '2025-01-23 10:00:00';
```

### 8.2 乐观锁重试风暴

**问题**：高并发下大量重试，浪费资源

**解决方案**：
1. **指数退避**：重试间隔逐渐增加
2. **限制重试次数**：避免无限重试
3. **熔断机制**：冲突率过高时切换到悲观锁

```java
public boolean optimisticUpdate(int id, int expectedVersion) {
    int maxRetries = 3;
    long baseDelay = 10;  // 基础延迟10ms
    
    for (int i = 0; i < maxRetries; i++) {
        int rows = update(id, expectedVersion);
        if (rows > 0) {
            return true;
        }
        
        // 指数退避
        long delay = baseDelay * (1L << i);  // 10ms, 20ms, 40ms
        Thread.sleep(delay);
        
        // 重新读取版本号
        expectedVersion = getVersion(id);
    }
    
    return false;
}
```

### 8.3 悲观锁死锁问题

**问题**：多个事务加锁顺序不当导致死锁

**解决方案**：
1. **按相同顺序加锁**：所有事务按相同顺序加锁
2. **设置锁超时**：`innodb_lock_wait_timeout`
3. **死锁检测**：InnoDB自动检测并回滚

```sql
-- 设置锁等待超时
SET innodb_lock_wait_timeout = 5;  -- 5秒超时

-- 所有事务按id顺序加锁
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
SELECT * FROM accounts WHERE id = 2 FOR UPDATE;
-- 不要反过来
```

## 九、总结

### 9.1 核心概念回顾

1. **悲观锁**：
   - 假设冲突会发生，先加锁再操作
   - 使用数据库锁机制（SELECT FOR UPDATE）
   - 适合冲突频繁、强一致性场景

2. **乐观锁**：
   - 假设冲突不会发生，先操作后检查
   - 使用版本号/时间戳在应用层实现
   - 适合冲突少、高并发场景

### 9.2 选择策略

| 场景 | 推荐方案 | 原因 |
|------|----------|------|
| 冲突频率 > 20% | 悲观锁 | 重试开销大 |
| 冲突频率 < 5% | 乐观锁 | 性能好 |
| 强一致性要求 | 悲观锁 | 更可靠 |
| 高并发读多写少 | 乐观锁 | 不阻塞 |
| 金融场景 | 悲观锁 | 准确性优先 |
| 用户信息更新 | 乐观锁 | 冲突少 |

### 9.3 最佳实践

1. **悲观锁**：
   - 尽快释放锁
   - 使用合适的索引
   - 按相同顺序加锁
   - 避免长事务

2. **乐观锁**：
   - 合理设置重试次数
   - 使用指数退避
   - 监控冲突率
   - 版本号自增

3. **混合策略**：
   - 根据冲突率动态选择
   - 快速路径用乐观锁
   - 慢速路径用悲观锁

通过深入理解乐观锁和悲观锁的原理、实现方式和应用场景，我们可以根据实际业务需求选择合适的并发控制策略，在保证数据一致性的同时，优化数据库性能。

