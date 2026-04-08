---
title: AQS与CAS实现原理详解
published: 2025-01-23
updated: 2025-01-23
description: 深入理解AQS（AbstractQueuedSynchronizer）和CAS（Compare-And-Swap）：从CAS的硬件实现到AQS的线程等待唤醒机制，完整解析Java并发框架的核心
tags:
  - Java并发
  - 多线程
  - AQS
  - CAS
  - 无锁编程
  - 原子操作
  - ReentrantLock
category: 八股文
draft: false
---

# AQS与CAS实现原理详解

## 引言

**AQS（AbstractQueuedSynchronizer）** 是 Java 并发包中最重要的基础框架，`ReentrantLock`、`CountDownLatch`、`Semaphore` 等都基于 AQS 实现。而 **CAS（Compare-And-Swap）** 是 AQS 实现无锁同步的核心机制。

理解 AQS 和 CAS，需要深入理解：
- 什么是 CAS？CAS 如何保证原子性？
- CAS 在操作系统层面是如何实现的？
- CAS 存在什么问题？为什么需要 volatile？
- CAS 一定有自旋吗？
- AQS 如何实现线程的等待和唤醒？

本文将深入探讨这些核心问题，从硬件实现到 Java 框架的完整路径。

---

## 一、什么是CAS？

### 1.1 CAS的基本概念

**CAS（Compare-And-Swap）** 是一种**原子操作**，用于实现无锁编程。CAS 操作包含三个参数：
- **内存地址（Address）**：要修改的变量的内存地址
- **期望值（Expected Value）**：变量的当前值
- **新值（New Value）**：要设置的新值

**CAS操作的语义**：
```cpp
bool CAS(T* addr, T expected, T new_value) {
    if (*addr == expected) {
        *addr = new_value;
        return true;   // 成功
    }
    return false;      // 失败
}
```

**关键特性**：
- **原子性**：整个操作在硬件层面是原子的，不会被其他线程打断
- **无锁**：不需要获取锁，通过硬件保证原子性
- **乐观锁**：假设没有竞争，如果失败则重试

### 1.2 CAS的使用示例

#### Java中的CAS

```java
import java.util.concurrent.atomic.AtomicInteger;

public class CASExample {
    private AtomicInteger count = new AtomicInteger(0);
    
    public void increment() {
        int oldValue;
        int newValue;
        do {
            oldValue = count.get();           // 读取当前值
            newValue = oldValue + 1;           // 计算新值
        } while (!count.compareAndSet(oldValue, newValue));  // CAS操作
    }
}
```

#### CAS操作的流程

```
步骤1：读取当前值
┌─────────────────────────────────────────┐
│  oldValue = count.get()                 │
│  假设读取到：oldValue = 5                │
└─────────────────────────────────────────┘

步骤2：计算新值
┌─────────────────────────────────────────┐
│  newValue = oldValue + 1                 │
│  newValue = 6                            │
└─────────────────────────────────────────┘

步骤3：CAS操作
┌─────────────────────────────────────────┐
│  if (count.get() == 5) {                │
│      count.set(6);                       │
│      return true;                        │
│  } else {                               │
│      return false;  // 值已被其他线程修改 │
│  }                                      │
└─────────────────────────────────────────┘

步骤4：如果失败，重试
┌─────────────────────────────────────────┐
│  if (CAS失败) {                          │
│      回到步骤1，重新读取当前值            │
│  }                                      │
└─────────────────────────────────────────┘
```

### 1.3 CAS的原子性保证

**CAS 操作的原子性**：
- CAS 操作在**硬件层面**是原子的
- CPU 提供专门的指令来保证原子性
- 不会被其他线程打断

**为什么需要原子性？**

考虑以下非原子操作：
```java
// 非原子操作（有问题）
if (count == 5) {      // 步骤1：读取
    count = 6;         // 步骤2：写入
}
```

**问题**：两个步骤之间可能被其他线程打断，导致数据竞争。

**CAS 的解决方案**：将读取、比较、写入合并为一个原子操作。

---

## 二、CAS在操作系统层面是如何保证原子性的？

### 2.1 CPU指令层面的实现

#### x86架构的CAS实现

**x86 架构使用 `LOCK` 前缀 + `CMPXCHG` 指令实现 CAS**：

```assembly
; x86的CAS实现
mov eax, expected_value    ; 将期望值加载到EAX寄存器
lock cmpxchg [address], new_value  ; 原子比较并交换
; LOCK前缀：锁定总线，确保原子性
; CMPXCHG：比较EAX和[address]，如果相等则交换
```

**`LOCK` 前缀的作用**：
- **锁定总线（Bus Locking）**：在操作期间锁定内存总线
- **缓存锁定（Cache Locking）**：如果数据在缓存中，锁定缓存行
- **确保原子性**：防止其他 CPU 核心同时访问同一内存地址

#### ARM架构的CAS实现

**ARM 架构使用 `LL/SC（Load-Link/Store-Conditional）` 指令对实现 CAS**：

```assembly
; ARM的CAS实现（LL/SC模式）
loop:
    ldxr w0, [x1]        ; Load-Link：加载并标记
    cmp w0, expected     ; 比较
    b.ne fail            ; 如果不相等，跳转到fail
    stxr w2, new_value, [x1]  ; Store-Conditional：条件存储
    cbnz w2, loop        ; 如果失败，重试
    ; 成功
fail:
    ; 失败
```

**LL/SC 的工作原理**：
1. **Load-Link（ldxr）**：加载值并标记内存地址
2. **Store-Conditional（stxr）**：只有在标记未被破坏时才写入
3. **如果标记被破坏**（其他线程修改了值），Store-Conditional 失败，需要重试

### 2.2 硬件层面的原子性保证

#### 总线锁定（Bus Locking）

**x86 架构的 `LOCK` 前缀使用总线锁定**：

```
CPU核心1执行CAS：
┌─────────────────────────────────────────┐
│  1. 发送LOCK信号到总线                    │
│  2. 锁定内存总线，阻止其他核心访问         │
│  3. 执行CMPXCHG指令                      │
│  4. 释放总线锁定                          │
└─────────────────────────────────────────┘

其他CPU核心：
┌─────────────────────────────────────────┐
│  1. 检测到总线被锁定                     │
│  2. 等待总线释放                         │
│  3. 总线释放后继续执行                   │
└─────────────────────────────────────────┘
```

**性能影响**：
- 总线锁定会阻塞所有核心的内存访问
- 性能开销较大，但保证了原子性

#### 缓存锁定（Cache Locking）

**现代 CPU 使用缓存锁定优化性能**：

```
CPU核心1执行CAS：
┌─────────────────────────────────────────┐
│  1. 检查数据是否在缓存中                  │
│  2. 如果在缓存中：                        │
│     - 锁定缓存行（Cache Line Locking）    │
│     - 执行CAS操作                        │
│     - 通过MESI协议使其他核心的缓存失效    │
│  3. 如果不在缓存中：                      │
│     - 回退到总线锁定                      │
└─────────────────────────────────────────┘
```

**缓存锁定的优势**：
- 只锁定特定的缓存行，不影响其他内存访问
- 性能比总线锁定好很多
- 通过 MESI 协议保证一致性

### 2.3 MESI协议与CAS

**MESI 协议在 CAS 中的作用**：

```
CPU核心1执行CAS：
┌─────────────────────────────────────────┐
│  1. 读取值到寄存器（缓存行状态：Shared）  │
│  2. 比较值是否匹配                       │
│  3. 如果匹配：                           │
│     - 将缓存行状态改为Exclusive          │
│     - 执行写入操作                       │
│     - 缓存行状态变为Modified             │
│     - 通过总线发送Invalidate消息          │
│     - 使其他核心的缓存失效                │
└─────────────────────────────────────────┘
```

### 2.4 Java中的CAS实现

#### Unsafe类的CAS方法

```java
// Unsafe.java
public final native boolean compareAndSwapInt(
    Object o, long offset, 
    int expected, int x);

public final native boolean compareAndSwapLong(
    Object o, long offset, 
    long expected, long x);

public final native boolean compareAndSwapObject(
    Object o, long offset, 
    Object expected, Object x);
```

#### JNI层的实现

```cpp
// unsafe.cpp (HotSpot JVM)
UNSAFE_ENTRY(jboolean, Unsafe_CompareAndSwapInt(
    JNIEnv *env, jobject unsafe, jobject obj, jlong offset, 
    jint e, jint x))
  UnsafeWrapper("Unsafe_CompareAndSwapInt");
  oop p = JNIHandles::resolve(obj);
  jint* addr = (jint *) index_oop_from_field_offset_long(p, offset);
  return (jint)(Atomic::cmpxchg(x, addr, e)) == e;
UNSAFE_END
```

#### 底层CPU指令调用

```cpp
// atomic_linux_x86.inline.hpp
inline jint Atomic::cmpxchg(jint exchange_value,
                             volatile jint* dest,
                             jint compare_value) {
  int mp = os::is_MP();  // 检查是否为多核
  __asm__ __volatile__ (
    "lock cmpxchg %1,(%3)"  // LOCK前缀 + CMPXCHG指令
    : "=a" (exchange_value)
    : "r" (exchange_value), "a" (compare_value), "r" (dest)
    : "cc", "memory");
  return exchange_value;
}
```

---

## 三、CAS存在的问题

### 3.1 ABA问题

#### 什么是ABA问题？

**ABA 问题**：值从 A 变为 B，再变回 A，CAS 操作无法检测到中间的变化。

#### ABA问题示例

```java
// 初始状态
AtomicInteger value = new AtomicInteger(10);

// 线程1
int oldValue = value.get();  // 读取：oldValue = 10
// ... 线程1被挂起 ...

// 线程2
value.set(20);  // 修改为20
value.set(10);  // 又改回10

// 线程1继续执行
boolean success = value.compareAndSet(oldValue, 30);  // CAS(10, 30)
// 结果：success = true，但实际上值已经被修改过了
```

**问题分析**：
- 线程1读取到值 10
- 线程2将值改为 20，然后又改回 10
- 线程1的 CAS 操作仍然成功（因为当前值还是 10）
- 但线程1不知道值已经被修改过了

#### ABA问题的危害

**在栈操作中的危害**：

```java
// 栈结构
class Stack {
    private AtomicReference<Node> top = new AtomicReference<>();
    
    public void push(Node node) {
        Node oldTop;
        do {
            oldTop = top.get();           // 读取栈顶
            node.next = oldTop;           // 设置新节点的next
        } while (!top.compareAndSet(oldTop, node));  // CAS更新栈顶
    }
    
    public Node pop() {
        Node oldTop;
        Node newTop;
        do {
            oldTop = top.get();           // 读取栈顶
            if (oldTop == null) return null;
            newTop = oldTop.next;         // 获取下一个节点
        } while (!top.compareAndSet(oldTop, newTop));  // CAS更新栈顶
        return oldTop;
    }
}
```

**ABA问题的场景**：
```
初始状态：top -> A -> B -> C

线程1执行pop()：
1. 读取top = A
2. 准备CAS(A, B)
3. 被挂起

线程2执行：
1. pop()：top -> B -> C（A被弹出）
2. pop()：top -> C（B被弹出）
3. push(A)：top -> A -> C（A又被推入）

线程1继续执行：
1. CAS(A, B) 成功（因为top又指向A了）
2. 但实际上A已经不是原来的A了（A.next可能已经改变）
3. 导致栈结构被破坏
```

#### ABA问题的解决方案

**方案1：版本号（Version Number）**

```java
// 使用AtomicStampedReference
import java.util.concurrent.atomic.AtomicStampedReference;

AtomicStampedReference<Integer> value = 
    new AtomicStampedReference<>(10, 0);  // 初始值10，版本号0

// 线程1
int[] stampHolder = new int[1];
int oldValue = value.get(stampHolder);     // 读取值和版本号
int oldStamp = stampHolder[0];

// 线程2修改值
value.set(20, 1);  // 值改为20，版本号+1
value.set(10, 2);  // 值改回10，版本号+1

// 线程1的CAS操作
boolean success = value.compareAndSet(
    oldValue, 30, 
    oldStamp, oldStamp + 1);  // 检查值和版本号
// 结果：success = false（版本号不匹配）
```

**方案2：引用计数**

```java
// 使用AtomicMarkableReference
import java.util.concurrent.atomic.AtomicMarkableReference;

AtomicMarkableReference<Node> top = 
    new AtomicMarkableReference<>(null, false);

// CAS时检查标记位
boolean[] markHolder = new boolean[1];
Node oldTop = top.get(markHolder);
boolean oldMark = markHolder[0];

// CAS操作
top.compareAndSet(oldTop, newTop, oldMark, !oldMark);
```

### 3.2 自旋开销问题

#### 高竞争场景下的性能问题

**CAS 在高竞争场景下会导致大量自旋**：

```java
// 100个线程同时执行CAS
for (int i = 0; i < 100; i++) {
    new Thread(() -> {
        for (int j = 0; j < 1000000; j++) {
            // CAS操作，如果失败则自旋重试
            while (!atomicInt.compareAndSet(
                atomicInt.get(), 
                atomicInt.get() + 1)) {
                // 自旋等待，消耗CPU
            }
        }
    }).start();
}
```

**问题**：
- 大量线程同时自旋，消耗 CPU 资源
- 总线带宽被耗尽（总线风暴）
- 性能急剧下降

**性能对比**：
```
低竞争场景（1-2个线程）：
- CAS性能：优秀
- 自旋次数：0-1次

中等竞争场景（5-10个线程）：
- CAS性能：良好
- 自旋次数：1-10次

高竞争场景（50+线程）：
- CAS性能：差
- 自旋次数：100+次
- 建议使用锁机制
```

### 3.3 只能保证一个变量的原子性

**CAS 只能保证单个变量的原子性，不能保证多个变量的原子性**：

```java
// 问题：两个变量需要原子更新
AtomicInteger x = new AtomicInteger(0);
AtomicInteger y = new AtomicInteger(0);

// 无法原子地同时更新x和y
x.incrementAndGet();  // 操作1
y.incrementAndGet();  // 操作2
// 两个操作之间可能被其他线程打断
```

**解决方案**：
- 使用锁机制（synchronized、ReentrantLock）
- 将多个变量封装到一个对象中，使用 `AtomicReference`

---

## 四、CAS一定有自旋吗？

### 4.1 自旋的定义

**自旋（Spinning）**：线程不进入阻塞状态，而是循环检查条件是否满足。

### 4.2 CAS不一定有自旋

#### 情况1：CAS成功（无自旋）

```java
AtomicInteger count = new AtomicInteger(0);

// 第一次CAS操作
boolean success = count.compareAndSet(0, 1);
// 如果成功，没有自旋，直接返回
```

**特点**：
- CAS 操作一次成功
- 没有自旋
- 性能最优

#### 情况2：CAS失败但立即放弃（无自旋）

```java
// 尝试一次CAS，如果失败就放弃
boolean success = count.compareAndSet(0, 1);
if (!success) {
    // 不重试，直接返回失败
    return false;
}
```

**特点**：
- CAS 失败后不重试
- 没有自旋
- 适用于"尝试获取，失败就放弃"的场景

#### 情况3：CAS失败后自旋重试（有自旋）

```java
// 典型的自旋CAS实现
int oldValue;
int newValue;
do {
    oldValue = count.get();
    newValue = oldValue + 1;
} while (!count.compareAndSet(oldValue, newValue));
// 如果CAS失败，循环重试（自旋）
```

**特点**：
- CAS 失败后循环重试
- 有自旋
- 适用于"必须成功"的场景

### 4.3 自旋的条件

**自旋通常发生在以下情况**：

1. **CAS 失败后需要重试**
2. **竞争不激烈**（自旋几次就能成功）
3. **临界区很短**（持有锁的时间很短）

**不适合自旋的情况**：

1. **竞争激烈**（自旋很多次都失败）
2. **临界区很长**（持有锁的时间很长）
3. **单核 CPU**（自旋无意义，浪费 CPU）

### 4.4 自适应自旋

**JVM 使用自适应自旋优化性能**：

```java
// 伪代码：自适应自旋
int spinCount = 0;
int maxSpins = calculateAdaptiveSpins();  // 根据历史数据计算

while (spinCount < maxSpins) {
    if (tryCAS()) {
        return true;  // 成功
    }
    spinCount++;
    Thread.onSpinWait();  // CPU暂停指令，减少功耗
}

// 自旋失败，进入阻塞
return blockAndWait();
```

**自适应策略**：
- 如果上次自旋成功，增加自旋次数
- 如果上次自旋失败，减少自旋次数
- 根据实际情况动态调整

---

## 五、有了CAS为啥还需要volatile？

### 5.1 CAS和volatile解决不同的问题

#### CAS解决的问题

**CAS 解决的是原子性问题**：
- 保证"读取-比较-写入"这三个步骤的原子性
- 防止数据竞争（Data Race）

#### volatile解决的问题

**volatile 解决的是可见性和有序性问题**：
- **可见性**：一个线程的修改对其他线程立即可见
- **有序性**：禁止指令重排序

### 5.2 CAS中的可见性问题

#### 问题场景

```java
// 问题代码：CAS操作中的可见性问题
class Counter {
    private int count = 0;  // 没有volatile
    
    public void increment() {
        int oldValue;
        int newValue;
        do {
            oldValue = count;           // 读取（可能读到旧值）
            newValue = oldValue + 1;
        } while (!compareAndSwapInt(
            this, offset, oldValue, newValue));  // CAS操作
    }
}
```

**问题**：
- `count` 没有 `volatile` 修饰
- 线程可能从缓存中读取到旧值
- 导致 CAS 操作基于错误的值进行

#### 解决方案：使用volatile

```java
// 正确代码：使用volatile保证可见性
class Counter {
    private volatile int count = 0;  // 使用volatile
    
    public void increment() {
        int oldValue;
        int newValue;
        do {
            oldValue = count;           // volatile读，保证读到最新值
            newValue = oldValue + 1;
        } while (!compareAndSwapInt(
            this, offset, oldValue, newValue));  // CAS操作
    }
}
```

**volatile 的作用**：
- 保证 `count` 的读取总是从主内存获取最新值
- 保证 CAS 操作基于正确的值进行

### 5.3 AQS中的volatile使用

#### AQS的状态字段

```java
// AbstractQueuedSynchronizer.java
public abstract class AbstractQueuedSynchronizer {
    // 使用volatile保证可见性
    private volatile int state;  // 同步状态
    
    protected final int getState() {
        return state;  // volatile读
    }
    
    protected final void setState(int newState) {
        state = newState;  // volatile写
    }
    
    protected final boolean compareAndSetState(
            int expect, int update) {
        // CAS操作，但state本身是volatile的
        return unsafe.compareAndSwapInt(
            this, stateOffset, expect, update);
    }
}
```

**为什么需要volatile？**

1. **保证可见性**：
   - 一个线程修改 `state` 后，其他线程能立即看到
   - 避免基于旧值进行 CAS 操作

2. **保证有序性**：
   - 禁止指令重排序
   - 保证状态更新的顺序

3. **配合CAS使用**：
   - CAS 保证原子性
   - volatile 保证可见性和有序性
   - 两者结合才能实现正确的同步

### 5.4 完整的同步机制

**CAS + volatile 的完整同步机制**：

```
┌─────────────────────────────────────────┐
│  CAS（原子性）                            │
│  - 保证"读取-比较-写入"的原子性            │
│  - 防止数据竞争                           │
└─────────────────────────────────────────┘
           +
┌─────────────────────────────────────────┐
│  volatile（可见性 + 有序性）              │
│  - 保证一个线程的修改对其他线程可见        │
│  - 禁止指令重排序                         │
└─────────────────────────────────────────┘
           =
┌─────────────────────────────────────────┐
│  完整的同步机制                           │
│  - 原子性 + 可见性 + 有序性               │
│  - 实现线程安全的无锁编程                 │
└─────────────────────────────────────────┘
```

---

## 六、什么是AQS？

### 6.1 AQS的基本概念

**AQS（AbstractQueuedSynchronizer）** 是 Java 并发包中的基础框架，用于构建锁和其他同步器。

**AQS的核心思想**：
- 使用一个 **volatile int state** 表示同步状态
- 使用一个 **FIFO队列** 管理等待的线程
- 提供 **模板方法**，子类实现具体的同步逻辑

### 6.2 AQS的设计目的

**AQS 的设计目的**：
1. **统一同步框架**：为各种同步器提供统一的基础实现
2. **减少重复代码**：避免每个同步器都实现队列管理
3. **提高性能**：优化等待队列的管理和线程唤醒

### 6.3 基于AQS实现的同步器

**Java 并发包中基于 AQS 实现的同步器**：

| 同步器                        | 用途    | 说明             |
| -------------------------- | ----- | -------------- |
| **ReentrantLock**          | 可重入锁  | 独占锁，支持公平和非公平模式 |
| **ReentrantReadWriteLock** | 读写锁   | 读锁共享，写锁独占      |
| **Semaphore**              | 信号量   | 控制同时访问的线程数     |
| **CountDownLatch**         | 倒计时门闩 | 等待多个线程完成       |
| **CyclicBarrier**          | 循环屏障  | 多个线程相互等待       |

---

## 七、AQS的核心数据结构

### 7.1 同步状态（state）

```java
// AbstractQueuedSynchronizer.java
public abstract class AbstractQueuedSynchronizer {
    // 同步状态，使用volatile保证可见性
    private volatile int state;
    
    protected final int getState() {
        return state;
    }
    
    protected final void setState(int newState) {
        state = newState;
    }
    
    protected final boolean compareAndSetState(
            int expect, int update) {
        // 使用CAS更新state
        return unsafe.compareAndSwapInt(
            this, stateOffset, expect, update);
    }
}
```

**state 的含义**：
- 对于 `ReentrantLock`：0 表示未锁定，>0 表示锁定次数
- 对于 `Semaphore`：表示可用许可数
- 对于 `CountDownLatch`：表示剩余计数

### 7.2 等待队列（CLH队列）

**AQS 使用 CLH（Craig, Landin, and Hagersten）队列管理等待的线程**：

```java
// 队列节点
static final class Node {
    // 节点模式
    static final Node SHARED = new Node();  // 共享模式
    static final Node EXCLUSIVE = null;     // 独占模式
    
    // 节点状态
    static final int CANCELLED = 1;   // 已取消
    static final int SIGNAL = -1;    // 需要唤醒后继节点
    static final int CONDITION = -2;  // 在条件队列中等待
    static final int PROPAGATE = -3;  // 传播模式（共享锁使用）
    
    volatile int waitStatus;  // 等待状态
    volatile Node prev;       // 前驱节点
    volatile Node next;       // 后继节点
    volatile Thread thread;   // 等待的线程
    Node nextWaiter;         // 下一个等待者（条件队列使用）
}
```

**队列结构**：

```
┌─────────────────────────────────────────┐
│         head (虚拟头节点)                  │
│         waitStatus = 0                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Node1                            │
│         thread = Thread-1                │
│         waitStatus = SIGNAL              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Node2                            │
│         thread = Thread-2                │
│         waitStatus = SIGNAL              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         tail (尾节点)                     │
│         thread = Thread-3                │
│         waitStatus = SIGNAL              │
└─────────────────────────────────────────┘
```

### 7.3 AQS的核心字段

```java
public abstract class AbstractQueuedSynchronizer {
    // 队列头节点
    private transient volatile Node head;
    
    // 队列尾节点
    private transient volatile Node tail;
    
    // 同步状态
    private volatile int state;
}
```

**为什么使用volatile？**
- `head`、`tail`、`state` 都使用 `volatile` 修饰
- 保证多线程环境下的可见性
- 配合 CAS 操作实现无锁的队列管理

---

## 八、AQS如何实现线程的等待和唤醒？

### 8.1 线程等待的实现

#### acquire方法（独占模式）

```java
// AbstractQueuedSynchronizer.java
public final void acquire(int arg) {
    // 尝试获取锁
    if (!tryAcquire(arg) &&
        // 获取失败，加入等待队列
        acquireQueued(addWaiter(Node.EXCLUSIVE), arg))
        // 如果被中断，恢复中断状态
        selfInterrupt();
}
```

#### addWaiter方法（加入队列）

```java
private Node addWaiter(Node mode) {
    Node node = new Node(Thread.currentThread(), mode);
    Node pred = tail;
    
    // 快速路径：如果队列不为空，直接CAS添加到队尾
    if (pred != null) {
        node.prev = pred;
        if (compareAndSetTail(pred, node)) {
            pred.next = node;
            return node;
        }
    }
    
    // 慢速路径：队列为空或CAS失败，使用enq方法
    enq(node);
    return node;
}

private Node enq(final Node node) {
    for (;;) {  // 自旋
        Node t = tail;
        if (t == null) {  // 队列为空，初始化
            if (compareAndSetHead(new Node()))
                tail = head;
        } else {  // 队列不为空，添加到队尾
            node.prev = t;
            if (compareAndSetTail(t, node)) {
                t.next = node;
                return t;
            }
        }
    }
}
```

#### acquireQueued方法（在队列中等待）

```java
final boolean acquireQueued(final Node node, int arg) {
    boolean failed = true;
    try {
        boolean interrupted = false;
        for (;;) {  // 自旋
            final Node p = node.predecessor();
            
            // 如果前驱是头节点，尝试获取锁
            if (p == head && tryAcquire(arg)) {
                setHead(node);  // 设置为头节点
                p.next = null; // 帮助GC
                failed = false;
                return interrupted;
            }
            
            // 获取锁失败，检查是否需要阻塞
            if (shouldParkAfterFailedAcquire(p, node) &&
                parkAndCheckInterrupt())  // 阻塞线程
                interrupted = true;
        }
    } finally {
        if (failed)
            cancelAcquire(node);  // 取消获取
    }
}
```

#### parkAndCheckInterrupt方法（阻塞线程）

```java
private final boolean parkAndCheckInterrupt() {
    // 使用LockSupport.park()阻塞当前线程
    LockSupport.park(this);
    // 被唤醒后，检查是否被中断
    return Thread.interrupted();
}
```

**LockSupport.park() 的底层实现**：

```cpp
// LockSupport.park() 最终调用
// pthread_cond_wait() (Linux)
// 或 WaitForSingleObject() (Windows)
// 线程进入内核态，等待被唤醒
```

### 8.2 线程唤醒的实现

#### release方法（释放锁）

```java
public final boolean release(int arg) {
    // 尝试释放锁
    if (tryRelease(arg)) {
        Node h = head;
        // 如果头节点存在且需要唤醒后继节点
        if (h != null && h.waitStatus != 0)
            unparkSuccessor(h);  // 唤醒后继节点
        return true;
    }
    return false;
}
```

#### unparkSuccessor方法（唤醒后继节点）

```java
private void unparkSuccessor(Node node) {
    int ws = node.waitStatus;
    if (ws < 0)
        compareAndSetWaitStatus(node, ws, 0);  // 清除信号状态
    
    Node s = node.next;
    // 如果后继节点为空或已取消，从队尾向前查找
    if (s == null || s.waitStatus > 0) {
        s = null;
        for (Node t = tail; t != null && t != node; t = t.prev)
            if (t.waitStatus <= 0)
                s = t;
    }
    
    // 唤醒后继节点
    if (s != null)
        LockSupport.unpark(s.thread);
}
```

**LockSupport.unpark() 的底层实现**：

```cpp
// LockSupport.unpark() 最终调用
// pthread_cond_signal() (Linux)
// 或 SetEvent() (Windows)
// 唤醒等待的线程
```

### 8.3 完整的等待和唤醒流程

#### 获取锁的完整流程

```
线程尝试获取锁：
┌─────────────────────────────────────────┐
│  1. 调用acquire(arg)                     │
│  2. 调用tryAcquire(arg)尝试获取锁         │
│     - 子类实现（如ReentrantLock）         │
│  3. 如果成功，直接返回                    │
│  4. 如果失败：                            │
│     a. 调用addWaiter()加入等待队列        │
│     b. 调用acquireQueued()在队列中等待    │
│     c. 自旋检查前驱节点是否为头节点        │
│     d. 如果是头节点，再次尝试获取锁        │
│     e. 如果失败，调用parkAndCheckInterrupt│
│     f. 使用LockSupport.park()阻塞线程     │
└─────────────────────────────────────────┘
```

#### 释放锁的完整流程

```
线程释放锁：
┌─────────────────────────────────────────┐
│  1. 调用release(arg)                     │
│  2. 调用tryRelease(arg)释放锁            │
│     - 子类实现（如ReentrantLock）         │
│  3. 如果成功：                            │
│     a. 获取头节点                        │
│     b. 如果头节点需要唤醒后继节点          │
│     c. 调用unparkSuccessor()             │
│     d. 从队列中找到第一个有效的后继节点    │
│     e. 调用LockSupport.unpark()唤醒线程   │
│  4. 被唤醒的线程继续执行acquireQueued()   │
│  5. 再次尝试获取锁                        │
└─────────────────────────────────────────┘
```

### 8.4 共享模式的等待和唤醒

#### acquireShared方法（共享模式）

```java
public final void acquireShared(int arg) {
    // 尝试获取共享锁
    if (tryAcquireShared(arg) < 0)
        // 获取失败，加入队列并等待
        doAcquireShared(arg);
}

private void doAcquireShared(int arg) {
    final Node node = addWaiter(Node.SHARED);
    boolean failed = true;
    try {
        boolean interrupted = false;
        for (;;) {
            final Node p = node.predecessor();
            if (p == head) {
                int r = tryAcquireShared(arg);
                if (r >= 0) {
                    // 获取成功，设置头节点并传播
                    setHeadAndPropagate(node, r);
                    p.next = null;
                    failed = false;
                    return;
                }
            }
            if (shouldParkAfterFailedAcquire(p, node) &&
                parkAndCheckInterrupt())
                interrupted = true;
        }
    } finally {
        if (failed)
            cancelAcquire(node);
    }
}
```

#### releaseShared方法（释放共享锁）

```java
public final boolean releaseShared(int arg) {
    if (tryReleaseShared(arg)) {
        doReleaseShared();  // 唤醒所有等待的共享节点
        return true;
    }
    return false;
}

private void doReleaseShared() {
    for (;;) {
        Node h = head;
        if (h != null && h != tail) {
            int ws = h.waitStatus;
            if (ws == Node.SIGNAL) {
                if (!compareAndSetWaitStatus(h, Node.SIGNAL, 0))
                    continue;
                unparkSuccessor(h);  // 唤醒后继节点
            }
            else if (ws == 0 &&
                     !compareAndSetWaitStatus(h, 0, Node.PROPAGATE))
                continue;
        }
        if (h == head)
            break;
    }
}
```

---

## 九、AQS的实现原理详解

### 9.1 ReentrantLock基于AQS的实现

#### 非公平锁的tryAcquire实现

```java
// ReentrantLock.NonfairSync
static final class NonfairSync extends Sync {
    protected final boolean tryAcquire(int acquires) {
        final Thread current = Thread.currentThread();
        int c = getState();
        
        // 如果state为0，尝试直接获取锁
        if (c == 0) {
            if (compareAndSetState(0, acquires)) {
                setExclusiveOwnerThread(current);
                return true;
            }
        }
        // 如果当前线程已经持有锁，重入
        else if (current == getExclusiveOwnerThread()) {
            int nextc = c + acquires;
            if (nextc < 0)
                throw new Error("Maximum lock count exceeded");
            setState(nextc);
            return true;
        }
        return false;
    }
}
```

#### 公平锁的tryAcquire实现

```java
// ReentrantLock.FairSync
static final class FairSync extends Sync {
    protected final boolean tryAcquire(int acquires) {
        final Thread current = Thread.currentThread();
        int c = getState();
        
        if (c == 0) {
            // 公平锁：检查是否有等待的线程
            if (!hasQueuedPredecessors() &&
                compareAndSetState(0, acquires)) {
                setExclusiveOwnerThread(current);
                return true;
            }
        }
        else if (current == getExclusiveOwnerThread()) {
            int nextc = c + acquires;
            if (nextc < 0)
                throw new Error("Maximum lock count exceeded");
            setState(nextc);
            return true;
        }
        return false;
    }
}
```

### 9.2 CountDownLatch基于AQS的实现

#### tryAcquireShared实现

```java
// CountDownLatch.Sync
private static final class Sync extends AbstractQueuedSynchronizer {
    protected int tryAcquireShared(int acquires) {
        // 如果state为0，允许通过（返回1）
        // 否则，需要等待（返回-1）
        return (getState() == 0) ? 1 : -1;
    }
    
    protected boolean tryReleaseShared(int releases) {
        for (;;) {
            int c = getState();
            if (c == 0)
                return false;
            int nextc = c - 1;
            if (compareAndSetState(c, nextc))
                return nextc == 0;  // 如果减到0，返回true
        }
    }
}
```

### 9.3 Semaphore基于AQS的实现

#### tryAcquireShared实现

```java
// Semaphore.NonfairSync
static final class NonfairSync extends Sync {
    protected int tryAcquireShared(int acquires) {
        for (;;) {
            int available = getState();
            int remaining = available - acquires;
            
            // 如果剩余许可数小于0，返回-1（需要等待）
            if (remaining < 0 ||
                compareAndSetState(available, remaining))
                return remaining;
        }
    }
}
```

---

## 十、实际案例分析

### 10.1 案例1：使用ReentrantLock实现线程安全计数器

```java
import java.util.concurrent.locks.ReentrantLock;

public class SafeCounter {
    private int count = 0;
    private final ReentrantLock lock = new ReentrantLock();
    
    public void increment() {
        lock.lock();  // 获取锁（可能阻塞）
        try {
            count++;  // 临界区代码
        } finally {
            lock.unlock();  // 释放锁
        }
    }
    
    public int get() {
        lock.lock();
        try {
            return count;
        } finally {
            lock.unlock();
        }
    }
}
```

**AQS的作用**：
- `lock()` 调用 `acquire(1)`，尝试获取锁
- 如果失败，线程加入等待队列并阻塞
- `unlock()` 调用 `release(1)`，释放锁并唤醒等待的线程

### 10.2 案例2：使用CountDownLatch等待多个线程完成

```java
import java.util.concurrent.CountDownLatch;

public class ParallelTask {
    public static void main(String[] args) throws InterruptedException {
        int threadCount = 10;
        CountDownLatch latch = new CountDownLatch(threadCount);
        
        for (int i = 0; i < threadCount; i++) {
            new Thread(() -> {
                try {
                    // 执行任务
                    doWork();
                } finally {
                    latch.countDown();  // 计数减1
                }
            }).start();
        }
        
        latch.await();  // 等待所有线程完成
        System.out.println("All tasks completed");
    }
}
```

**AQS的作用**：
- `await()` 调用 `acquireSharedInterruptibly(1)`
- 如果 `state != 0`，线程加入等待队列并阻塞
- `countDown()` 调用 `releaseShared(1)`，`state` 减1
- 当 `state == 0` 时，唤醒所有等待的线程

### 10.3 案例3：使用Semaphore控制并发数

```java
import java.util.concurrent.Semaphore;

public class ConnectionPool {
    private final Semaphore semaphore;
    
    public ConnectionPool(int maxConnections) {
        semaphore = new Semaphore(maxConnections);
    }
    
    public Connection acquire() throws InterruptedException {
        semaphore.acquire();  // 获取许可
        return createConnection();
    }
    
    public void release(Connection conn) {
        closeConnection(conn);
        semaphore.release();  // 释放许可
    }
}
```

**AQS的作用**：
- `acquire()` 调用 `acquireSharedInterruptibly(1)`
- 如果可用许可数不足，线程加入等待队列并阻塞
- `release()` 调用 `releaseShared(1)`，增加许可数并唤醒等待的线程

---

## 十一、总结

### 11.1 核心要点

1. **CAS（Compare-And-Swap）**：
   - 硬件层面的原子操作
   - 通过 `LOCK` 前缀（x86）或 `LL/SC`（ARM）实现
   - 保证"读取-比较-写入"的原子性

2. **CAS的问题**：
   - ABA问题（使用版本号解决）
   - 自旋开销（高竞争场景性能差）
   - 只能保证单个变量的原子性

3. **CAS不一定有自旋**：
   - 成功时无自旋
   - 失败后可以选择放弃或重试

4. **CAS + volatile**：
   - CAS 保证原子性
   - volatile 保证可见性和有序性
   - 两者结合实现完整的同步机制

5. **AQS（AbstractQueuedSynchronizer）**：
   - 使用 `volatile int state` 表示同步状态
   - 使用 CLH 队列管理等待的线程
   - 通过 `LockSupport.park/unpark` 实现线程的阻塞和唤醒

### 11.2 实现层次

```
Java应用层（ReentrantLock、CountDownLatch等）
    ↓
AQS框架层（acquire、release、队列管理）
    ↓
CAS操作（compareAndSetState）
    ↓
Unsafe类（JNI调用）
    ↓
JVM实现（C++代码）
    ↓
CPU指令（LOCK CMPXCHG、LL/SC）
    ↓
硬件层面（总线锁定、缓存锁定）
```

### 11.3 关键理解

1. **CAS是硬件支持**：不是软件实现的，而是CPU提供的原子指令
2. **volatile是必需的**：CAS操作需要volatile保证可见性
3. **AQS是框架**：提供了统一的同步器实现框架
4. **等待和唤醒**：通过 `LockSupport.park/unpark` 实现，底层是操作系统调用

### 11.4 实践建议

1. **理解CAS的适用场景**：低竞争场景性能好，高竞争场景考虑使用锁
2. **注意ABA问题**：必要时使用 `AtomicStampedReference`
3. **合理使用AQS**：理解AQS的设计，可以更好地使用基于AQS的同步器
4. **性能优化**：根据实际场景选择合适的同步机制

---

## 参考资料

- 《Java并发编程实战》- Brian Goetz
- 《Java并发编程的艺术》- 方腾飞等
- [OpenJDK AQS源码](https://hg.openjdk.org/jdk8/jdk8/jdk/file/tip/src/share/classes/java/util/concurrent/locks/AbstractQueuedSynchronizer.java)
- [Intel x86指令集手册](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
- [ARM内存模型文档](https://developer.arm.com/documentation/102142/0100/)

---

## 更新日志

- 2025-01-23: 初始版本，完成AQS与CAS实现原理的全面总结
