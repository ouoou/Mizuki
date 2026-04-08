---
title: synchronized是怎么实现的
published: 2025-12-09
updated: 2025-12-09
description: "梳理synchronized的语义、锁优化与JVM底层实现"
tags:
  - Java
  - 并发
  - synchronized
category: 八股文/Java并发
draft: false
---

# synchronized是怎么实现的

> **📌 模板使用说明**：
> - **必填章节**：What、Why、When、How、重点疑问完整解析、面试高频考点、核心要点
> - **可选章节**：底层实现原理（需要深入理解时）、性能优化（有性能相关时）、实战案例（有实际应用时）
> - **重点疑问完整解析**：必须对每个核心疑问提供完整、清晰的解答，包含：核心答案、详细解释、示例、常见误解、记忆要点
> - **面试高频考点**：列出最常问的问题，提供标准答案模板，包含核心回答、详细展开、示例、延伸问题

## 📋 目录
- [What - 是什么](#what---是什么)
- [Why - 为什么](#why---为什么)
- [When - 什么时候用](#when---什么时候用)
- [How - 如何使用](#how---如何使用)
- [底层实现原理](#底层实现原理)
- [重点疑问完整解析](#重点疑问完整解析)
- [面试高频考点](#面试高频考点)
- [核心要点](#核心要点)
- [常见错误](#常见错误)
- [性能优化](#性能优化)
- [相关知识点](#相关知识点)
- [实战案例（可选）](#实战案例可选)
- [记忆技巧（可选）](#记忆技巧可选)

---

## What - 是什么

### 🎯 核心定义
**synchronized 是 Java 提供的内置监视器锁，保证临界区的可见性与互斥执行。**

### 🔍 本质特征
- **JVM 级关键字**: 由字节码指令 monitorenter/monitorexit 实现。
- **对象头元数据驱动**: 依赖 Mark Word 记录锁标志、线程信息。
- **可重入且可重写入栈**: 同一线程可多次获取同一把锁，持有次数存于锁记录。

### 📐 基本结构/组成（如适用）
```
对象头(klass pointer + Mark Word)
Mark Word 中的锁标志位 -> 偏向/轻量/重量
线程栈中的锁记录(Lock Record) -> CAS 升级/解锁
Monitor(重量级) -> EntryList、WaitSet
```

### 📝 关键术语
| 术语 | 说明 |
|------|------|
| Mark Word | 对象头存放哈希/GC 分代/锁状态/线程ID |
| Lock Record | 线程栈帧里的锁槽，保存锁状态备份 |
| ObjectMonitor | 重量级锁的数据结构，含 owner/EntryList/WaitSet |

---

## Why - 为什么

### 🧠 设计原理
**基于监视器模型的互斥同步，结合内存屏障与可见性规则确保线程安全。**

### 💡 解决的问题
- **竞态条件**: 防止多个线程同时修改共享状态 → **解决方案**: 互斥进入临界区。
- **可见性缺失**: CPU 缓存导致写入不可见 → **解决方案**: 进入/退出时插入内存屏障，刷新/失效缓存。

### ⚡ 优势与局限
**优势**:
- **语法内建**: 语言级支持，易读易维护。
- **可重入**: 递归或链式调用不死锁自身。
- **自动释放**: 异常退出也能释放锁，降低泄漏风险。

**局限性**:
- **锁范围固定**: 需要代码块/方法级，无法跨作用域。
- **唤醒无公平保证**: 依赖 JVM 调度，默认非公平。
- **阻塞成本**: 重量级锁涉及内核态阻塞/唤醒，开销高。

---

## When - 什么时候用

### ✅ 适用场景
1. **简单互斥**: 对象级或类级保护共享变量，如计数器累加。
2. **需要内置可见性保证**: 不想显式使用 volatile + 原子类组合。

### ❌ 不适用场景
- **高并发读多写少**: 使用读写锁或无锁结构更优。
- **需要可中断/超时的锁获取**: 用 ReentrantLock 的 lockInterruptibly/tryLock 更合适。

### 🎯 判断标准
> **什么时候选择这个方案？**
> - 代码块粒度的互斥即可满足
> - 不依赖超时、公平性、条件队列等高级特性

### 📊 方案对比（如适用）
| 方案 | 适用场景 | 优缺点 | 选择建议 |
|------|---------|--------|----------|
| ReentrantLock | 需要可中断、超时、公平、条件队列 | 灵活但需手动解锁 | 高级同步需求用 |
| synchronized | 语法简单、异常安全 | 功能固定，公平性弱 | 轻量场景首选 |

---

## How - 如何使用

### 🔧 基本步骤
1. **确定临界区**: 找出需要互斥的共享状态。
2. **选择锁对象**: 使用 final 对象/类对象/this，避免锁泄露。
3. **包裹代码块**: 使用 synchronized 关键字修饰代码块或方法。

### 💻 代码实现
```java
class Counter {
  private int value;
  private final Object lock = new Object();

  public void inc() {
    synchronized (lock) { // 生成 monitorenter/monitorexit
      value++;
    }
  }

  public synchronized int get() { // 对应方法级 monitorenter/monitorexit
    return value;
  }
}
```

### 📈 复杂度分析（如适用）
- **时间复杂度**: 与临界区逻辑相关；锁竞争时存在上下文切换/自旋成本。
- **空间复杂度**: 主要为对象头 Mark Word 与可选的 Monitor 结构。

---

## 底层实现原理

> **⚠️ 重要：对于需要深入理解的知识点，必须说明底层实现机制**

### 🔧 实现机制
- 编译为字节码后生成 `monitorenter/monitorexit`。
- 热点代码 C2 编译器会插入锁消除、锁粗化、自旋等优化。
- 锁状态存于对象头 Mark Word，按偏向→轻量→重量级逐步升级。

### 🏗️ 架构设计
```
线程栈帧
  └─ Lock Record (保存 Mark Word 备份/指向对象头)
对象头
  └─ Mark Word (锁标志位 + 线程ID/指针)
      ↳ 偏向锁: 线程ID 写入 Mark Word
      ↳ 轻量级锁: Mark Word 指向 Lock Record
      ↳ 重量级锁: Mark Word 指向 ObjectMonitor
ObjectMonitor
  ├─ owner: 当前持有线程
  ├─ EntryList: 竞争队列
  └─ WaitSet: wait() 阻塞队列
```

### 💾 数据结构（如适用）
- **Mark Word**: 存储锁标志、偏向线程 ID、epoch、哈希等。
- **Lock Record**: 线程栈中的锁槽，保存旧 Mark Word 做 CAS。
- **ObjectMonitor**: 重量级锁结构，包含互斥与条件等待队列。

### ⚙️ 关键机制
- **偏向锁**: 单线程反复进入，直接在 Mark Word 记录线程，避免 CAS。
- **轻量级锁**: 无竞争时 CAS 将 Mark Word 置为指向 Lock Record；失败则自旋。
- **重量级锁**: 自旋失败或膨胀后，Mark Word 指向 ObjectMonitor，阻塞/唤醒走 OS。
- **锁消除**: 逃逸分析发现局部对象锁无必要，直接去掉 monitor。
- **锁粗化**: 连续小范围锁合并为大范围，减少获取次数。
- **自旋 + 自适应自旋**: 在膨胀前短暂忙等，减少上下文切换。

### 📝 源码分析（如适用）
```cpp
// HotSpot 锁膨胀片段（简化示意）
ObjectMonitor* inflate(Thread* self, oop obj) {
  markWord mark = obj->mark();
  if (mark.has_monitor()) return mark.monitor();
  ObjectMonitor* m = new ObjectMonitor();
  // 将 Mark Word CAS 为指向 Monitor
  if (obj->cas_set_mark(markWord::encode(m), mark) != mark) { /* 竞争重试 */ }
  return m;
}
```

### 🔗 与底层系统的关系
- **CPU 内存模型**: 进入/退出锁伴随内存屏障，约束重排序。
- **操作系统调度**: 重量级锁阻塞/唤醒走内核态 Mutex/CondVar。
- **JIT 编译**: C2 负责锁优化（消除/粗化/自适应自旋）。

### 📊 性能考虑
- **性能瓶颈**: 竞争激烈时膨胀为重量级，产生阻塞与上下文切换。
- **优化策略**: 偏向锁减少无竞争成本，自旋避免频繁阻塞，锁消除降低无效开销。

---

## 重点疑问完整解析

### ❓ 疑问1: synchronized 如何保证可见性与有序性？
**疑问描述**: 仅有互斥不够，还需内存语义确保读写可见与指令不乱序。

**完整解答**:
1. **核心答案**: 进入/退出 monitor 时插入内存屏障，配合 JMM 发生前关系。
2. **详细解释**: 
   - 进入 monitor 前执行 StoreStore/StoreLoad，刷新工作内存。
   - 退出 monitor 后执行 LoadStore/LoadLoad，确保写入对后续线程可见。
   - monitorenter 与 monitorexit 定义了 happens-before 边界。
3. **示例说明**:
   ```java
   synchronized (lock) { // 进入：清空本地缓存，加载主内存
     shared = 1;
   }                     // 退出：刷新写入到主内存
   ```
4. **常见误解**: 
   - ❌ 只保证互斥不保证可见性 → ✅ monitor 语义包含屏障与 HB 关系。
5. **记忆要点**: 锁是互斥 + 屏障的组合。

---

### ❓ 疑问2: 偏向锁/轻量级锁/重量级锁如何转换？
**疑问描述**: 锁状态按竞争程度动态升级，影响性能。

**完整解答**:
1. **核心答案**: 偏向 → 轻量（撤销偏向）→ 重量；只升不降。
2. **详细解释**: 
   - 偏向锁：首个线程写入 Mark Word；遇到其他线程竞争或批量撤销时升级。
   - 轻量级锁：CAS 尝试占用 Mark Word 指向 Lock Record；自旋失败则膨胀。
   - 重量级锁：Mark Word 指向 ObjectMonitor，竞争线程阻塞排队。
3. **示例说明**:
   ```text
   单线程多次进入 -> 偏向锁
   第二个线程竞争 -> 撤销偏向 -> 轻量级自旋
   自旋失败/竞争激烈 -> 膨胀为重量级
   ```
4. **常见误解**: 
   - ❌ 偏向锁一定更快 → ✅ 竞争频繁时反而撤销成本高，可关闭偏向。
5. **记忆要点**: 先偏向，轻量自旋，最后阻塞。

---

### ❓ 疑问3: synchronized 与 ReentrantLock 的差异？
**疑问描述**: 两者都可重入，如何选择？

**完整解答**:
1. **核心答案**: synchronized 语法简洁自动释放；ReentrantLock 提供可中断/超时/公平/条件队列。
2. **详细解释**: 
   - 功能：ReentrantLock 支持 tryLock 超时、公平队列、多个 Condition。
   - 性能：JIT 对 synchronized 优化充分，轻度场景性能接近。
   - 易用性：synchronized 异常安全；ReentrantLock 需 finally 解锁。
3. **示例说明**:
   ```java
   lock.lock();
   try { /* 临界区 */ }
   finally { lock.unlock(); }
   ```
4. **常见误解**: 
   - ❌ synchronized 性能一定差 → ✅ 在低竞争下有偏向/轻量优化，差距小。
5. **记忆要点**: 简单用 synchronized，高级需求用 ReentrantLock。

---

## 面试高频考点

### 🎯 高频问题1: synchronized 底层怎么实现？
**问题**: 描述 monitorenter/monitorexit、对象头、锁升级流程。

**标准答案模板**:
1. **核心回答**（30秒内）: 字节码 monitorenter/monitorexit，Mark Word 存锁状态，偏向→轻量→重量级升级。
2. **详细展开**（2-3分钟）:
   - 对象头 Mark Word 存偏向线程/指向 Lock Record/Monitor。
   - 偏向锁无 CAS；轻量级锁 CAS + 自旋；重量级锁阻塞。
   - JMM 通过屏障保证可见性与有序性。
3. **示例说明**:
   ```java
   synchronized (obj) { /* 临界区 */ }
   // javap: monitorenter/monitorexit
   ```
4. **延伸问题**:
   - 偏向锁什么时候撤销？→ 竞争或批量撤销时。
   - 自旋的条件与时长？→ 自适应基于历史竞争。

---

### 🎯 高频问题2: synchronized 与 volatile 的区别？
**问题**: 两者都能保证可见性，但语义不同。

**标准答案模板**:
1. **核心回答**（30秒内）: volatile 只保证可见性与有序性不提供互斥；synchronized 兼具互斥与可见性。
2. **详细展开**（2-3分钟）:
   - volatile 无阻塞，适合状态标志；synchronized 适合复合操作。
   - volatile 不保证原子复合操作，synchronized 能保护临界区。
   - 指令层面：volatile 使用内存屏障；synchronized 用 monitor。
3. **示例说明**:
   ```java
   volatile boolean running;
   synchronized void inc() { count++; }
   ```
4. **延伸问题**:
   - 何时选 volatile？→ 状态开关、一次写多读。
   - 可以用 volatile 替代锁吗？→ 不能，复合操作仍需互斥。

---

### 🎯 高频问题3: 如何减少 synchronized 带来的性能损耗？
**问题**: 面对竞争与阻塞，怎么优化？

**标准答案模板**:
1. **核心回答**（30秒内）: 控制锁粒度、减少共享、利用锁消除/粗化与读写分离。
2. **详细展开**（2-3分钟）:
   - 设计层面减少共享状态，使用局部变量或不可变对象。
   - 拆分锁或使用分段锁/读写锁。
   - 利用 JIT 的锁消除（避免逃逸）与锁粗化（减少频繁获取）。
3. **示例说明**:
   ```java
   // 锁拆分
   synchronized (writeLock) { /* 写 */ }
   synchronized (readLock)  { /* 读计数 */ }
   ```
4. **延伸问题**:
   - 什么时候关闭偏向锁？→ 竞争多、偏向撤销成本高时。
   - 如何观察锁膨胀？→ 使用 -XX:+PrintFlagsFinal/-XX:+UnlockDiagnosticVMOptions 与日志。

---

## 核心要点

### 🔑 核心思想
> **内置监视器锁，以对象头元数据驱动的分层锁机制。**

### 🎯 关键技巧
1. **锁对象要稳定**: 使用 final 私有锁避免锁泄露。
2. **缩小临界区**: 只包共享写入，减少竞争窗口。

### ⚠️ 易错点
| 易错点 | 错误示例 | 正确做法 | 原因 |
|--------|----------|----------|------|
| 锁对象可变 | synchronized(new Object()) | 使用固定 final lock | 可变导致锁失效 |
| 双重检查未配合 volatile | DCL 未加 volatile | 配合 volatile 单例 | 避免重排序 |

---

## 常见错误

### ❌ 错误1: 在循环中频繁创建锁对象
**错误表现**: 每次循环 new Object() 作为锁，实际无互斥。
**错误原因**: 锁对象不一致，monitor 不共享。
**正确做法**: 将锁对象定义为成员常量。
**示例**:
```java
// ❌ 错误写法
for (...) {
  synchronized (new Object()) { /* 无法互斥 */ }
}

// ✅ 正确写法
private final Object lock = new Object();
for (...) {
  synchronized (lock) { /* 真实互斥 */ }
}
```

---

## 性能优化

> **⚠️ 重要：说明如何优化性能，以及性能相关的注意事项**

### ⚡ 性能特点
- **优势**: 偏向/轻量优化让低竞争场景成本低。
- **劣势**: 高竞争时膨胀为重量级，阻塞昂贵。
- **适用场景**: 低/中竞争、短临界区。

### 🚀 优化策略
1. **减少共享与锁粒度**: 
   - **方法**: 拆分锁、局部变量化。
   - **效果**: 降低竞争概率。
   - **注意事项**: 避免过度拆分导致死锁复杂度。

2. **利用 JVM 优化**: 
   - **方法**: 避免逃逸（触发锁消除），合并连续锁操作（锁粗化）。
   - **效果**: 减少 monitorenter/exit 次数。
   - **注意事项**: 关注 JIT 阶段与热点代码。

### 📊 性能对比
| 方案 | 性能指标 | 适用场景 | 说明 |
|------|---------|---------|------|
| ReentrantLock | 阻塞/可中断/公平 | 复杂同步 | 功能丰富，开销略高 |
| synchronized | 偏向/轻量优化 | 简单互斥 | 语法简单，低竞争快 |

### ⚠️ 性能陷阱
- **偏向锁撤销抖动**: 竞争频繁时可通过 `-XX:-UseBiasedLocking`（视 JVM 版本支持）关闭。
- **长时间持锁**: 长临界区阻塞其他线程，需缩短或拆分。

---

## 相关知识点

### 🔗 前置知识
- JMM 发生前关系: 理解内存语义。
- CPU 缓存与内存屏障: 理解可见性来源。

### 🔗 后续知识
- ReentrantLock/StampedLock: 更灵活的锁机制。
- AQS 框架: ReentrantLock、Semaphore、CountDownLatch 底层。

### 🔗 相似知识点对比（如适用）
| 知识点 | 相同点 | 不同点 | 使用场景 |
|--------|--------|--------|----------|
| ReentrantLock | 提供互斥与可见性 | 可中断/条件队列/公平 | 高级同步 |
| synchronized | 内置监视器 | 语法简单，特性固定 | 基础互斥 |

### 📚 版本演进（如适用）
- **JDK 1.6+**: 引入偏向锁、轻量级锁、自适应自旋。
- **JDK 15+**: 偏向锁默认移除（部分发行版），行为更接近轻量/重量。

---

## 实战案例（可选）

### 📚 案例1: 计数器并发安全封装
**问题描述**: 多线程统计接口调用次数，需要简单互斥。

**解决思路**: 
1. 使用私有 final 锁封装增量。
2. 缩小临界区仅包含写操作。

**代码实现**:
```java
class SafeCounter {
  private long cnt;
  private final Object lock = new Object();
  void inc() {
    synchronized (lock) { cnt++; }
  }
  long get() {
    synchronized (lock) { return cnt; }
  }
}
```

**关键点**: 
- 锁对象固定且私有。
- 读操作也受保护避免可见性问题。

---

## 记忆技巧（可选）

### 🧠 记忆口诀
> **“偏轻重三段，屏障保可见，锁稳区要短。”**

### 🔗 类比理解
**旋转门类比**: 偏向锁像私人门禁（贴身份），轻量级锁像自助闸机自检，自旋若失败请保安（重量级）来管控。

### 📝 思维导图
```
synchronized
├─ 语义: 互斥 + 可见性
├─ 指令: monitorenter/monitorexit
├─ 状态: 偏向 -> 轻量 -> 重量
├─ 优化: 消除/粗化/自旋
└─ 对比: ReentrantLock / volatile
```

---

## 总结

### ✨ 一句话总结
> **synchronized 以对象头元数据驱动的分层监视器锁，实现互斥与内存可见性。**

### 📌 核心记忆点
1. monitorenter/monitorexit + 内存屏障。
2. 偏向→轻量→重量级的升级路径。
3. 锁对象需稳定，临界区尽量短。

---

## 参考资料
- [OpenJDK HotSpot 源码](https://hg.openjdk.org/)
- [JLS §17](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
