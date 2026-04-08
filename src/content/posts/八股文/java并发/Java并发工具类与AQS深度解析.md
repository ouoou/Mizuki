---
title: Java并发工具类与AQS深度解析
published: 2025-01-23
updated: 2025-01-23
description: 深入理解CountDownLatch、CyclicBarrier、Semaphore、ReentrantLock、Synchronized的区别，以及它们与AQS的关联关系，包括同步队列、条件队列、独占模式、共享模式、公平锁和非公平锁的实现原理
tags:
  - Java并发
  - 多线程
  - AQS
  - CountDownLatch
  - CyclicBarrier
  - Semaphore
  - ReentrantLock
  - Synchronized
  - 锁机制
category: 八股文
draft: false
---

# Java并发工具类与AQS深度解析

## 引言

Java并发包提供了丰富的同步工具类，如 `CountDownLatch`、`CyclicBarrier`、`Semaphore`、`ReentrantLock` 等。这些工具类看似功能各异，但实际上它们都基于同一个核心框架——**AQS（AbstractQueuedSynchronizer）**。

理解这些工具类与AQS的关系，需要深入理解：
- 各个工具类的使用场景和区别
- 它们如何基于AQS实现
- AQS的同步队列和条件队列
- AQS的独占模式和共享模式
- 公平锁和非公平锁的实现原理

本文将系统性地讲解这些知识点，从使用场景到实现原理，构建完整的知识体系。

---

## 一、五大并发工具类概览

### 1.1 工具类对比表

| 工具类 | 类型 | 基于AQS | 使用场景 | 可重用性 |
|--------|------|---------|----------|----------|
| **CountDownLatch** | 同步工具 | ✅ 共享模式 | 一个或多个线程等待其他线程完成 | ❌ 一次性 |
| **CyclicBarrier** | 同步工具 | ❌ 自实现 | 多个线程相互等待，到达屏障点后继续 | ✅ 可重用 |
| **Semaphore** | 信号量 | ✅ 共享模式 | 控制同时访问资源的线程数量 | ✅ 可重用 |
| **ReentrantLock** | 锁 | ✅ 独占模式 | 可重入的互斥锁，替代synchronized | ✅ 可重用 |
| **Synchronized** | 关键字 | ❌ JVM实现 | 最基础的同步机制 | ✅ 可重用 |

### 1.2 核心区别总结

#### 功能定位区别

```
┌─────────────────────────────────────────────────────────┐
│                   并发控制工具分类                          │
└─────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
    ┌────────┐          ┌──────────┐          ┌─────────┐
    │  锁机制  │          │ 同步工具  │          │ 信号量   │
    └────────┘          └──────────┘          └─────────┘
        │                     │                     │
        │                     │                     │
    ┌────────┐          ┌──────────┐          ┌─────────┐
    │Reentrant│          │CountDown │          │Semaphore│
    │  Lock  │          │  Latch   │          │         │
    └────────┘          └──────────┘          └─────────┘
        │                     │                     │
        │              ┌──────────┐                 │
        │              │ Cyclic   │                 │
        │              │ Barrier  │                 │
        │              └──────────┘                 │
        │                                           │
    ┌────────┐                                     │
    │Synchronized                                  │
    └────────┘                                     │
```

#### 实现方式区别

- **基于AQS**：`CountDownLatch`、`Semaphore`、`ReentrantLock`
- **不基于AQS**：`CyclicBarrier`（使用ReentrantLock + Condition实现）、`Synchronized`（JVM层面实现）

---

## 二、CountDownLatch：倒计时门闩

### 2.1 使用场景

**CountDownLatch** 用于一个或多个线程等待其他线程完成操作。

```java
public class CountDownLatchExample {
    public static void main(String[] args) throws InterruptedException {
        int threadCount = 5;
        CountDownLatch latch = new CountDownLatch(threadCount);
        
        // 启动5个工作线程
        for (int i = 0; i < threadCount; i++) {
            new Thread(() -> {
                try {
                    // 模拟工作
                    Thread.sleep(1000);
                    System.out.println(Thread.currentThread().getName() + " 完成工作");
                } finally {
                    latch.countDown();  // 计数减1
                }
            }).start();
        }
        
        // 主线程等待所有工作线程完成
        latch.await();  // 阻塞直到计数为0
        System.out.println("所有线程完成，主线程继续执行");
    }
}
```

### 2.2 与AQS的关联关系

#### 内部实现结构

```java
public class CountDownLatch {
    // 内部同步器，基于AQS
    private static final class Sync extends AbstractQueuedSynchronizer {
        Sync(int count) {
            setState(count);  // 初始化state为count
        }
        
        int getCount() {
            return getState();
        }
        
        // 共享模式：尝试获取锁
        protected int tryAcquireShared(int acquires) {
            // state == 0 表示所有线程已完成，返回1（成功）
            // state != 0 表示还有线程未完成，返回-1（失败）
            return (getState() == 0) ? 1 : -1;
        }
        
        // 共享模式：尝试释放锁
        protected boolean tryReleaseShared(int releases) {
            // 循环CAS，将state减1
            for (;;) {
                int c = getState();
                if (c == 0)
                    return false;  // 已经为0，不能再减
                int nextc = c - 1;
                if (compareAndSetState(c, nextc))
                    return nextc == 0;  // 减到0时返回true，唤醒等待线程
            }
        }
    }
    
    private final Sync sync;
    
    public CountDownLatch(int count) {
        if (count < 0) throw new IllegalArgumentException("count < 0");
        this.sync = new Sync(count);
    }
    
    // countDown() 调用 releaseShared(1)
    public void countDown() {
        sync.releaseShared(1);
    }
    
    // await() 调用 acquireSharedInterruptibly(1)
    public void await() throws InterruptedException {
        sync.acquireSharedInterruptibly(1);
    }
}
```

#### AQS共享模式的工作流程

```
初始化：CountDownLatch(5)
┌─────────────────────────────────────────┐
│  state = 5                              │
└─────────────────────────────────────────┘

线程1调用 countDown()
┌─────────────────────────────────────────┐
│  CAS: state 5 -> 4                      │
│  返回: false (state != 0)               │
└─────────────────────────────────────────┘

线程2调用 countDown()
┌─────────────────────────────────────────┐
│  CAS: state 4 -> 3                      │
│  返回: false (state != 0)               │
└─────────────────────────────────────────┘

... 继续减到 0 ...

线程5调用 countDown()
┌─────────────────────────────────────────┐
│  CAS: state 1 -> 0                      │
│  返回: true (state == 0)                │
│  唤醒同步队列中所有等待的线程              │
└─────────────────────────────────────────┘

主线程 await() 被唤醒
┌─────────────────────────────────────────┐
│  tryAcquireShared(1) 返回 1             │
│  主线程继续执行                          │
└─────────────────────────────────────────┘
```

### 2.3 关键特性

1. **一次性**：计数减到0后无法重置，需要创建新的CountDownLatch
2. **共享模式**：使用AQS的共享模式，多个线程可以同时等待
3. **不可重用**：一旦计数为0，await()会立即返回，无法再次使用

---

## 三、CyclicBarrier：循环屏障

### 3.1 使用场景

**CyclicBarrier** 用于多个线程相互等待，到达屏障点后一起继续执行。

```java
public class CyclicBarrierExample {
    public static void main(String[] args) {
        int threadCount = 3;
        CyclicBarrier barrier = new CyclicBarrier(threadCount, () -> {
            System.out.println("所有线程到达屏障，执行屏障动作");
        });
        
        for (int i = 0; i < threadCount; i++) {
            final int threadId = i;
            new Thread(() -> {
                try {
                    System.out.println("线程" + threadId + " 到达屏障前");
                    barrier.await();  // 等待其他线程
                    System.out.println("线程" + threadId + " 通过屏障，继续执行");
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }).start();
        }
    }
}
```

### 3.2 与AQS的关联关系

**重要**：`CyclicBarrier` **不直接基于AQS**，而是使用 `ReentrantLock` + `Condition` 实现。

#### 内部实现结构

```java
public class CyclicBarrier {
    // 使用ReentrantLock（基于AQS）作为锁
    private final ReentrantLock lock = new ReentrantLock();
    
    // 使用Condition（基于AQS的条件队列）实现等待
    private final Condition trip = lock.newCondition();
    
    // 参与屏障的线程数
    private final int parties;
    
    // 当前等待的线程数
    private int count;
    
    // 屏障动作（可选）
    private final Runnable barrierCommand;
    
    // 当前代（Generation）
    private Generation generation = new Generation();
    
    public CyclicBarrier(int parties, Runnable barrierAction) {
        if (parties <= 0) throw new IllegalArgumentException();
        this.parties = parties;
        this.count = parties;
        this.barrierCommand = barrierAction;
    }
    
    public int await() throws InterruptedException, BrokenBarrierException {
        try {
            return dowait(false, 0L);
        } catch (TimeoutException toe) {
            throw new Error(toe);
        }
    }
    
    private int dowait(boolean timed, long nanos)
            throws InterruptedException, BrokenBarrierException, TimeoutException {
        final ReentrantLock lock = this.lock;
        lock.lock();  // 获取锁（基于AQS独占模式）
        try {
            final Generation g = generation;
            
            if (g.broken)
                throw new BrokenBarrierException();
            
            int index = --count;  // 减少等待计数
            
            // 最后一个线程到达
            if (index == 0) {
                boolean ranAction = false;
                try {
                    final Runnable command = barrierCommand;
                    if (command != null)
                        command.run();  // 执行屏障动作
                    ranAction = true;
                    nextGeneration();  // 重置屏障，唤醒所有等待线程
                    return 0;
                } finally {
                    if (!ranAction)
                        breakBarrier();
                }
            }
            
            // 不是最后一个线程，进入等待
            for (;;) {
                try {
                    if (!timed)
                        trip.await();  // 在条件队列中等待（基于AQS条件队列）
                    else if (nanos > 0L)
                        nanos = trip.awaitNanos(nanos);
                } catch (InterruptedException ie) {
                    if (g == generation && !g.broken) {
                        breakBarrier();
                        throw ie;
                    } else {
                        Thread.currentThread().interrupt();
                    }
                }
                
                if (g.broken)
                    throw new BrokenBarrierException();
                
                if (g != generation)
                    return index;
                
                if (timed && nanos <= 0L) {
                    breakBarrier();
                    throw new TimeoutException();
                }
            }
        } finally {
            lock.unlock();  // 释放锁
        }
    }
    
    private void nextGeneration() {
        trip.signalAll();  // 唤醒条件队列中的所有线程
        count = parties;   // 重置计数
        generation = new Generation();
    }
}
```

#### 与AQS的间接关系

```
CyclicBarrier
    │
    ├── ReentrantLock (基于AQS独占模式)
    │       │
    │       └── 用于保护共享变量 count、generation
    │
    └── Condition (基于AQS条件队列)
            │
            └── 用于线程等待和唤醒
```

### 3.3 关键特性

1. **可重用**：可以多次使用，每次所有线程到达屏障后会自动重置
2. **间接基于AQS**：通过ReentrantLock和Condition间接使用AQS
3. **支持屏障动作**：所有线程到达后可以执行一个Runnable

---

## 四、Semaphore：信号量

### 4.1 使用场景

**Semaphore** 用于控制同时访问资源的线程数量，实现限流。

```java
public class SemaphoreExample {
    public static void main(String[] args) {
        // 允许3个线程同时访问
        Semaphore semaphore = new Semaphore(3);
        
        for (int i = 0; i < 10; i++) {
            new Thread(() -> {
                try {
                    semaphore.acquire();  // 获取许可
                    System.out.println(Thread.currentThread().getName() + " 获得许可，开始执行");
                    Thread.sleep(2000);
                    System.out.println(Thread.currentThread().getName() + " 释放许可");
                } catch (InterruptedException e) {
                    e.printStackTrace();
                } finally {
                    semaphore.release();  // 释放许可
                }
            }).start();
        }
    }
}
```

### 4.2 与AQS的关联关系

#### 内部实现结构

```java
public class Semaphore {
    // 内部同步器，基于AQS
    private static final class Sync extends AbstractQueuedSynchronizer {
        Sync(int permits) {
            setState(permits);  // 初始化state为许可数
        }
        
        final int getPermits() {
            return getState();
        }
        
        // 非公平模式：尝试获取共享锁
        final int nonfairTryAcquireShared(int acquires) {
            for (;;) {
                int available = getState();
                int remaining = available - acquires;
                // 如果剩余许可不足，返回负数（失败）
                // 如果剩余许可足够，CAS更新state
                if (remaining < 0 ||
                    compareAndSetState(available, remaining))
                    return remaining;
            }
        }
        
        // 共享模式：尝试释放锁
        protected final boolean tryReleaseShared(int releases) {
            for (;;) {
                int current = getState();
                int next = current + releases;
                if (next < current)  // 溢出检查
                    throw new Error("Maximum permit count exceeded");
                if (compareAndSetState(current, next))
                    return true;
            }
        }
    }
    
    // 非公平同步器
    static final class NonfairSync extends Sync {
        protected int tryAcquireShared(int acquires) {
            return nonfairTryAcquireShared(acquires);
        }
    }
    
    // 公平同步器
    static final class FairSync extends Sync {
        protected int tryAcquireShared(int acquires) {
            for (;;) {
                // 公平模式：检查是否有前驱节点在等待
                if (hasQueuedPredecessors())
                    return -1;  // 有前驱节点，不能获取
                
                int available = getState();
                int remaining = available - acquires;
                if (remaining < 0 ||
                    compareAndSetState(available, remaining))
                    return remaining;
            }
        }
    }
    
    private final Sync sync;
    
    public Semaphore(int permits) {
        sync = new NonfairSync(permits);  // 默认非公平
    }
    
    public Semaphore(int permits, boolean fair) {
        sync = fair ? new FairSync(permits) : new NonfairSync(permits);
    }
    
    public void acquire() throws InterruptedException {
        sync.acquireSharedInterruptibly(1);  // 共享模式获取
    }
    
    public void release() {
        sync.releaseShared(1);  // 共享模式释放
    }
}
```

#### AQS共享模式的工作流程

```
初始化：Semaphore(3)
┌─────────────────────────────────────────┐
│  state = 3 (3个许可)                     │
└─────────────────────────────────────────┘

线程1调用 acquire()
┌─────────────────────────────────────────┐
│  tryAcquireShared(1):                   │
│    available = 3                        │
│    remaining = 2                        │
│    CAS: state 3 -> 2                    │
│    返回: 2 (成功，剩余2个许可)            │
└─────────────────────────────────────────┘

线程2、3同样获取许可
┌─────────────────────────────────────────┐
│  state = 0 (所有许可被占用)              │
└─────────────────────────────────────────┘

线程4调用 acquire()
┌─────────────────────────────────────────┐
│  tryAcquireShared(1):                   │
│    available = 0                        │
│    remaining = -1                       │
│    返回: -1 (失败，进入同步队列等待)      │
└─────────────────────────────────────────┘

线程1调用 release()
┌─────────────────────────────────────────┐
│  tryReleaseShared(1):                   │
│    CAS: state 0 -> 1                    │
│    返回: true                           │
│    唤醒同步队列中的等待线程               │
└─────────────────────────────────────────┘
```

### 4.3 关键特性

1. **共享模式**：使用AQS的共享模式，允许多个线程同时获取许可
2. **支持公平/非公平**：可以选择公平或非公平模式
3. **可重用**：可以多次获取和释放许可

---

## 五、ReentrantLock：可重入锁

### 5.1 使用场景

**ReentrantLock** 是一个可重入的互斥锁，可以替代 `synchronized`。

```java
public class ReentrantLockExample {
    private final ReentrantLock lock = new ReentrantLock();
    
    public void method1() {
        lock.lock();  // 获取锁
        try {
            // 临界区代码
            method2();  // 可重入：同一个线程可以再次获取锁
        } finally {
            lock.unlock();  // 释放锁
        }
    }
    
    public void method2() {
        lock.lock();  // 再次获取锁（可重入）
        try {
            // 临界区代码
        } finally {
            lock.unlock();
        }
    }
}
```

### 5.2 与AQS的关联关系

#### 内部实现结构

```java
public class ReentrantLock implements Lock {
    // 内部同步器，基于AQS
    abstract static class Sync extends AbstractQueuedSynchronizer {
        // 尝试获取锁（独占模式）
        protected final boolean tryAcquire(int acquires) {
            final Thread current = Thread.currentThread();
            int c = getState();
            
            // state == 0 表示锁未被占用
            if (c == 0) {
                // 尝试获取锁（由子类实现公平/非公平逻辑）
                if (!hasQueuedPredecessors() &&  // 公平锁检查前驱节点
                    compareAndSetState(0, acquires)) {
                    setExclusiveOwnerThread(current);  // 设置独占线程
                    return true;
                }
            }
            // 可重入：当前线程已持有锁
            else if (current == getExclusiveOwnerThread()) {
                int nextc = c + acquires;  // 重入次数+1
                if (nextc < 0)  // 溢出检查
                    throw new Error("Maximum lock count exceeded");
                setState(nextc);  // 更新重入次数
                return true;
            }
            return false;  // 获取失败
        }
        
        // 尝试释放锁
        protected final boolean tryRelease(int releases) {
            int c = getState() - releases;
            if (Thread.currentThread() != getExclusiveOwnerThread())
                throw new IllegalMonitorStateException();
            
            boolean free = false;
            if (c == 0) {  // 重入次数减到0
                free = true;
                setExclusiveOwnerThread(null);
            }
            setState(c);
            return free;
        }
    }
    
    // 非公平同步器
    static final class NonfairSync extends Sync {
        protected final boolean tryAcquire(int acquires) {
            return nonfairTryAcquire(acquires);
        }
    }
    
    // 公平同步器
    static final class FairSync extends Sync {
        protected final boolean tryAcquire(int acquires) {
            final Thread current = Thread.currentThread();
            int c = getState();
            if (c == 0) {
                // 公平锁：必须先检查是否有前驱节点在等待
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
    
    private final Sync sync;
    
    public ReentrantLock() {
        sync = new NonfairSync();  // 默认非公平
    }
    
    public ReentrantLock(boolean fair) {
        sync = fair ? new FairSync() : new NonfairSync();
    }
    
    public void lock() {
        sync.acquire(1);  // 独占模式获取锁
    }
    
    public void unlock() {
        sync.release(1);  // 独占模式释放锁
    }
}
```

#### AQS独占模式的工作流程

```
线程1调用 lock()
┌─────────────────────────────────────────┐
│  acquire(1):                            │
│    tryAcquire(1):                       │
│      state = 0                          │
│      CAS: state 0 -> 1                  │
│      设置独占线程 = Thread-1             │
│      返回: true                         │
│  获取成功，直接返回                       │
└─────────────────────────────────────────┘

线程2调用 lock()（线程1持有锁）
┌─────────────────────────────────────────┐
│  acquire(1):                            │
│    tryAcquire(1):                       │
│      state = 1                          │
│      独占线程 != Thread-2               │
│      返回: false                        │
│    addWaiter(Node.EXCLUSIVE):          │
│      创建节点，加入同步队列              │
│    acquireQueued():                     │
│      阻塞等待                            │
└─────────────────────────────────────────┘

线程1调用 unlock()
┌─────────────────────────────────────────┐
│  release(1):                            │
│    tryRelease(1):                       │
│      state 1 -> 0                       │
│      清除独占线程                        │
│      返回: true                         │
│    unparkSuccessor():                   │
│      唤醒同步队列中的线程2               │
└─────────────────────────────────────────┘
```

### 5.3 关键特性

1. **独占模式**：使用AQS的独占模式，同一时刻只有一个线程可以持有锁
2. **可重入**：同一个线程可以多次获取锁，通过state记录重入次数
3. **支持公平/非公平**：可以选择公平或非公平模式

---

## 六、Synchronized：JVM层面的同步

### 6.1 使用场景

**Synchronized** 是Java关键字，JVM层面的同步机制。

```java
public class SynchronizedExample {
    // 同步实例方法
    public synchronized void method1() {
        // 临界区代码
    }
    
    // 同步代码块
    public void method2() {
        synchronized (this) {
            // 临界区代码
        }
    }
    
    // 同步静态方法
    public static synchronized void method3() {
        // 临界区代码
    }
}
```

### 6.2 与AQS的关系

**重要**：`Synchronized` **不基于AQS**，它是JVM层面的实现。

#### 实现方式对比

```
┌─────────────────────────────────────────────────────────┐
│              Synchronized vs ReentrantLock                │
└─────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Synchronized │      │ReentrantLock │      │   AQS         │
└──────────────┘      └──────────────┘      └──────────────┘
        │                     │                     │
        │                     │                     │
    JVM层面实现            基于AQS实现           底层框架
        │                     │                     │
        │                     │                     │
    ┌───────┐            ┌──────────┐         ┌──────────┐
    │对象头  │            │独占模式   │         │同步队列   │
    │Mark   │            │          │         │          │
    │Word   │            │可重入     │         │条件队列   │
    └───────┘            └──────────┘         └──────────┘
        │                     │
        │                     │
    锁升级机制            公平/非公平
```

#### 实现原理

1. **JVM层面**：通过对象头的Mark Word实现
2. **锁升级**：无锁 → 偏向锁 → 轻量级锁 → 重量级锁
3. **不依赖AQS**：完全由JVM实现，不涉及AQS框架

---

## 七、AQS的核心机制：同步队列和条件队列

### 7.1 同步队列（CLH队列）

#### 什么是同步队列？

**同步队列**是AQS中用于管理等待获取锁的线程的队列，采用**CLH（Craig, Landin, and Hagersten）**锁队列的变体。

#### 队列结构

```java
public abstract class AbstractQueuedSynchronizer {
    // 队列头节点（虚拟节点）
    private transient volatile Node head;
    
    // 队列尾节点
    private transient volatile Node tail;
    
    // 同步状态
    private volatile int state;
    
    // 节点结构
    static final class Node {
        static final Node SHARED = new Node();  // 共享模式标记
        static final Node EXCLUSIVE = null;     // 独占模式标记
        
        // 等待状态
        static final int CANCELLED = 1;   // 已取消
        static final int SIGNAL = -1;      // 需要唤醒后继节点
        static final int CONDITION = -2;   // 在条件队列中等待
        static final int PROPAGATE = -3;   // 传播模式（共享锁）
        
        volatile int waitStatus;  // 等待状态
        volatile Node prev;       // 前驱节点
        volatile Node next;       // 后继节点
        volatile Thread thread;   // 等待的线程
        Node nextWaiter;         // 下一个等待者（条件队列使用）
    }
}
```

#### 同步队列图示

```
同步队列（CLH队列变体）
┌─────────────────────────────────────────────────────────┐
│                                                           │
│  head (虚拟头节点)                                         │
│  ┌──────────────┐                                        │
│  │ waitStatus=0 │                                        │
│  │ thread=null  │                                        │
│  │ prev=null    │                                        │
│  └──────┬───────┘                                        │
│         │                                                │
│         │ next                                           │
│         ▼                                                │
│  ┌──────────────┐                                        │
│  │ Node1        │                                        │
│  │ thread=T1    │                                        │
│  │ waitStatus=  │                                        │
│  │   SIGNAL(-1) │                                        │
│  └──────┬───────┘                                        │
│         │                                                │
│         │ next                                           │
│         ▼                                                │
│  ┌──────────────┐                                        │
│  │ Node2        │                                        │
│  │ thread=T2    │                                        │
│  │ waitStatus=  │                                        │
│  │   SIGNAL(-1) │                                        │
│  └──────┬───────┘                                        │
│         │                                                │
│         │ next                                           │
│         ▼                                                │
│  ┌──────────────┐                                        │
│  │ tail (尾节点) │                                        │
│  │ thread=T3    │                                        │
│  │ waitStatus=  │                                        │
│  │   SIGNAL(-1) │                                        │
│  └──────────────┘                                        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

#### 同步队列的工作流程

**场景：ReentrantLock独占模式**

```
初始状态：锁未被占用
┌─────────────────────────────────────────┐
│  head = null                            │
│  tail = null                            │
│  state = 0                              │
└─────────────────────────────────────────┘

线程1调用 lock()
┌─────────────────────────────────────────┐
│  tryAcquire(1): state 0 -> 1           │
│  获取成功，不需要入队                     │
└─────────────────────────────────────────┘

线程2调用 lock()（线程1持有锁）
┌─────────────────────────────────────────┐
│  tryAcquire(1): 失败                     │
│  addWaiter(Node.EXCLUSIVE):             │
│    创建节点Node2(thread=T2)              │
│    CAS添加到队尾                         │
│  acquireQueued():                       │
│    检查前驱是否为head                    │
│    不是，park()阻塞                      │
└─────────────────────────────────────────┘

同步队列状态：
head -> [虚拟节点] -> [Node2(thread=T2)] <- tail

线程3调用 lock()
┌─────────────────────────────────────────┐
│  tryAcquire(1): 失败                     │
│  addWaiter(Node.EXCLUSIVE):             │
│    创建节点Node3(thread=T3)              │
│    CAS添加到队尾                         │
│  acquireQueued():                       │
│    检查前驱是否为head                    │
│    不是，park()阻塞                      │
└─────────────────────────────────────────┘

同步队列状态：
head -> [虚拟节点] -> [Node2(T2)] -> [Node3(T3)] <- tail

线程1调用 unlock()
┌─────────────────────────────────────────┐
│  tryRelease(1): state 1 -> 0            │
│  unparkSuccessor(head):                 │
│    唤醒Node2的线程T2                     │
└─────────────────────────────────────────┘

线程2被唤醒
┌─────────────────────────────────────────┐
│  acquireQueued()继续执行:                │
│    前驱是head，tryAcquire(1): 成功        │
│    设置Node2为新的head                   │
│    继续执行                              │
└─────────────────────────────────────────┘
```

### 7.2 条件队列

#### 什么是条件队列？

**条件队列**是AQS中用于实现条件等待的队列，与 `Condition` 接口配合使用。每个 `Condition` 对象维护一个独立的条件队列。

#### 条件队列结构

```java
public class ConditionObject implements Condition {
    // 条件队列头节点
    private transient Node firstWaiter;
    
    // 条件队列尾节点
    private transient Node lastWaiter;
    
    // 节点使用nextWaiter连接（不是next）
    // waitStatus = CONDITION(-2) 表示在条件队列中
}
```

#### 条件队列图示

```
条件队列（单向链表）
┌─────────────────────────────────────────────────────────┐
│                                                           │
│  firstWaiter                                             │
│  ┌──────────────┐                                        │
│  │ Node1        │                                        │
│  │ thread=T1    │                                        │
│  │ waitStatus=  │                                        │
│  │ CONDITION(-2)│                                        │
│  └──────┬───────┘                                        │
│         │                                                │
│         │ nextWaiter                                     │
│         ▼                                                │
│  ┌──────────────┐                                        │
│  │ Node2        │                                        │
│  │ thread=T2    │                                        │
│  │ waitStatus=  │                                        │
│  │ CONDITION(-2)│                                        │
│  └──────┬───────┘                                        │
│         │                                                │
│         │ nextWaiter                                     │
│         ▼                                                │
│  ┌──────────────┐                                        │
│  │ lastWaiter   │                                        │
│  │ thread=T3    │                                        │
│  │ waitStatus=  │                                        │
│  │ CONDITION(-2)│                                        │
│  └──────────────┘                                        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

#### 条件队列的工作流程

**场景：生产者-消费者模式**

```java
public class ProducerConsumer {
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition();   // 条件队列1
    private final Condition notEmpty = lock.newCondition();  // 条件队列2
    
    private final Object[] items = new Object[10];
    private int putptr, takeptr, count;
    
    public void put(Object x) throws InterruptedException {
        lock.lock();
        try {
            while (count == items.length)
                notFull.await();  // 队列满，在notFull条件队列中等待
            items[putptr] = x;
            if (++putptr == items.length) putptr = 0;
            ++count;
            notEmpty.signal();  // 唤醒notEmpty条件队列中的线程
        } finally {
            lock.unlock();
        }
    }
    
    public Object take() throws InterruptedException {
        lock.lock();
        try {
            while (count == 0)
                notEmpty.await();  // 队列空，在notEmpty条件队列中等待
            Object x = items[takeptr];
            if (++takeptr == items.length) takeptr = 0;
            --count;
            notFull.signal();  // 唤醒notFull条件队列中的线程
            return x;
        } finally {
            lock.unlock();
        }
    }
}
```

**await() 流程**：

```
线程1调用 notFull.await()
┌─────────────────────────────────────────┐
│  1. 创建条件节点Node1(thread=T1)         │
│  2. 将Node1加入notFull条件队列            │
│  3. 释放锁（state减1）                    │
│  4. 如果释放后state==0，唤醒同步队列线程   │
│  5. park()阻塞当前线程T1                  │
└─────────────────────────────────────────┘

条件队列状态：
notFull.firstWaiter -> [Node1(T1)] <- notFull.lastWaiter
```

**signal() 流程**：

```
线程2调用 notFull.signal()
┌─────────────────────────────────────────┐
│  1. 从notFull条件队列取出第一个节点Node1   │
│  2. 将Node1从条件队列移除                 │
│  3. 将Node1的waitStatus改为0             │
│  4. 将Node1加入同步队列（不是立即唤醒）    │
│  5. 如果Node1的前驱节点需要唤醒，          │
│     则unpark(Node1.thread)               │
└─────────────────────────────────────────┘

节点转移：
条件队列 -> 同步队列
```

### 7.3 同步队列 vs 条件队列

| 特性       | 同步队列                  | 条件队列                 |
| -------- | --------------------- | -------------------- |
| **用途**   | 等待获取锁                 | 等待条件满足               |
| **节点连接** | `prev` + `next`（双向链表） | `nextWaiter`（单向链表）   |
| **等待状态** | `SIGNAL(-1)`          | `CONDITION(-2)`      |
| **队列数量** | 每个AQS实例1个             | 每个Condition对象1个      |
| **节点转移** | -                     | 条件满足后转移到同步队列         |
| **使用场景** | `lock()`、`acquire()`  | `await()`、`signal()` |

---

## 八、AQS的独占模式和共享模式

### 8.1 独占模式（Exclusive Mode）

#### 特点

- **互斥性**：同一时刻只有一个线程可以获取锁
- **使用场景**：`ReentrantLock`、`ReentrantReadWriteLock.WriteLock`
- **方法**：`acquire()`、`release()`

#### 实现原理

```java
// 独占模式获取锁
public final void acquire(int arg) {
    if (!tryAcquire(arg) &&           // 尝试获取锁
        acquireQueued(addWaiter(Node.EXCLUSIVE), arg))  // 获取失败，加入队列
        selfInterrupt();
}

// 独占模式释放锁
public final boolean release(int arg) {
    if (tryRelease(arg)) {            // 尝试释放锁
        Node h = head;
        if (h != null && h.waitStatus != 0)
            unparkSuccessor(h);       // 唤醒后继节点
        return true;
    }
    return false;
}
```

#### 独占模式流程图

```
获取锁流程（独占模式）
┌─────────────────────────────────────────┐
│  acquire(arg)                           │
└──────────────┬──────────────────────────┘
               │
               ▼
        ┌──────────────┐
        │tryAcquire()  │
        └──────┬───────┘
               │
        ┌──────┴───────┐
        │              │
        ▼              ▼
    成功(true)      失败(false)
        │              │
        │              ▼
        │      ┌──────────────┐
        │      │addWaiter()   │
        │      │加入同步队列   │
        │      └──────┬───────┘
        │             │
        │             ▼
        │      ┌──────────────┐
        │      │acquireQueued()│
        │      │阻塞等待       │
        │      └──────┬───────┘
        │             │
        │             ▼
        │      ┌──────────────┐
        │      │被唤醒后       │
        │      │tryAcquire()  │
        │      └──────┬───────┘
        │             │
        └─────────────┘
               │
               ▼
         继续执行
```

### 8.2 共享模式（Shared Mode）

#### 特点

- **共享性**：多个线程可以同时获取锁
- **使用场景**：`CountDownLatch`、`Semaphore`、`ReentrantReadWriteLock.ReadLock`
- **方法**：`acquireShared()`、`releaseShared()`

#### 实现原理

```java
// 共享模式获取锁
public final void acquireShared(int arg) {
    if (tryAcquireShared(arg) < 0)    // 返回值<0表示失败
        doAcquireShared(arg);         // 获取失败，加入队列
}

private void doAcquireShared(int arg) {
    final Node node = addWaiter(Node.SHARED);  // 共享模式节点
    boolean failed = true;
    try {
        boolean interrupted = false;
        for (;;) {
            final Node p = node.predecessor();
            if (p == head) {
                int r = tryAcquireShared(arg);
                if (r >= 0) {          // 获取成功
                    setHeadAndPropagate(node, r);  // 设置头节点并传播
                    p.next = null;
                    if (interrupted)
                        selfInterrupt();
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

// 共享模式释放锁
public final boolean releaseShared(int arg) {
    if (tryReleaseShared(arg)) {       // 尝试释放锁
        doReleaseShared();             // 唤醒并传播
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
                unparkSuccessor(h);    // 唤醒后继节点
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

#### 共享模式的关键：传播机制

**PROPAGATE状态**：用于共享模式下唤醒的传播，确保所有等待的线程都能被唤醒。

```
共享模式传播机制
┌─────────────────────────────────────────┐
│  初始状态：Semaphore(3)                  │
│  state = 3                               │
└─────────────────────────────────────────┘

线程1、2、3获取许可（成功）
┌─────────────────────────────────────────┐
│  state = 0 (所有许可被占用)              │
└─────────────────────────────────────────┘

线程4、5、6调用acquire()（失败，进入队列）
┌─────────────────────────────────────────┐
│  同步队列：                               │
│  head -> [虚拟节点] -> [Node4] -> [Node5] │
│            -> [Node6] <- tail            │
└─────────────────────────────────────────┘

线程1调用release()
┌─────────────────────────────────────────┐
│  tryReleaseShared(1): state 0 -> 1      │
│  doReleaseShared():                      │
│    唤醒Node4                             │
│    设置head.waitStatus = PROPAGATE       │
│    继续传播唤醒Node5、Node6              │
└─────────────────────────────────────────┘
```

### 8.3 独占模式 vs 共享模式

| 特性        | 独占模式             | 共享模式                      |
| --------- | ---------------- | ------------------------- |
| **节点标记**  | `Node.EXCLUSIVE` | `Node.SHARED`             |
| **获取方法**  | `acquire()`      | `acquireShared()`         |
| **释放方法**  | `release()`      | `releaseShared()`         |
| **try方法** | `tryAcquire()`   | `tryAcquireShared()`      |
| **返回值**   | `boolean`        | `int`（<0失败，>=0成功，>0表示可传播） |
| **唤醒机制**  | 唤醒一个后继节点         | 唤醒并传播（PROPAGATE）          |
| **使用场景**  | 互斥锁              | 信号量、倒计时门闩                 |

---

## 九、公平锁和非公平锁的实现

### 9.1 公平锁（Fair Lock）

#### 定义

**公平锁**：按照线程请求锁的顺序分配锁，先到先得。

#### 实现原理

```java
// ReentrantLock.FairSync
static final class FairSync extends Sync {
    protected final boolean tryAcquire(int acquires) {
        final Thread current = Thread.currentThread();
        int c = getState();
        if (c == 0) {
            // 关键：检查是否有前驱节点在等待
            if (!hasQueuedPredecessors() &&      // 公平锁的核心
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

// 检查是否有前驱节点
public final boolean hasQueuedPredecessors() {
    Node t = tail;
    Node h = head;
    Node s;
    // 队列不为空 且 (头节点的后继为空 或 后继节点的线程不是当前线程)
    return h != t &&
        ((s = h.next) == null || s.thread != Thread.currentThread());
}
```

#### 公平锁工作流程

```
时间线：线程请求锁的顺序
T1: lock()  ->  获取成功（队列为空）
T2: lock()  ->  获取失败，入队等待
T3: lock()  ->  获取失败，入队等待

队列状态：
head -> [虚拟节点] -> [Node2(T2)] -> [Node3(T3)] <- tail

T1: unlock() -> 唤醒T2
T2: 被唤醒，tryAcquire()
    hasQueuedPredecessors() = false（前驱是head）
    获取成功 ✅

T2: unlock() -> 唤醒T3
T3: 被唤醒，tryAcquire()
    hasQueuedPredecessors() = false
    获取成功 ✅

结果：严格按照T1 -> T2 -> T3的顺序获取锁
```

### 9.2 非公平锁（Nonfair Lock）

#### 定义

**非公平锁**：允许"插队"，新来的线程可能比等待队列中的线程先获取锁。

#### 实现原理

```java
// ReentrantLock.NonfairSync
static final class NonfairSync extends Sync {
    protected final boolean tryAcquire(int acquires) {
        return nonfairTryAcquire(acquires);
    }
}

// Sync.nonfairTryAcquire
final boolean nonfairTryAcquire(int acquires) {
    final Thread current = Thread.currentThread();
    int c = getState();
    if (c == 0) {
        // 关键：不检查前驱节点，直接尝试CAS
        if (compareAndSetState(0, acquires)) {  // 非公平锁的核心
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
```

#### 非公平锁工作流程

```
时间线：线程请求锁的顺序
T1: lock()  ->  获取成功（队列为空）
T2: lock()  ->  获取失败，入队等待
T3: lock()  ->  获取失败，入队等待

队列状态：
head -> [虚拟节点] -> [Node2(T2)] -> [Node3(T3)] <- tail

T1: unlock() -> 唤醒T2（但T2还未被调度）

此时新线程T4调用lock()
┌─────────────────────────────────────────┐
│  tryAcquire():                          │
│    不检查队列，直接CAS                    │
│    如果成功，T4获取锁（插队）             │
└─────────────────────────────────────────┘

T2: 被唤醒，tryAcquire()
    state != 0（T4已获取）
    获取失败，继续等待

结果：T4插队成功，T2继续等待
```

### 9.3 公平锁 vs 非公平锁对比

| 特性 | 公平锁 | 非公平锁 |
|------|--------|----------|
| **获取顺序** | 严格按照请求顺序 | 允许插队 |
| **实现方式** | 检查`hasQueuedPredecessors()` | 直接CAS |
| **性能** | 较低（需要检查队列） | 较高（减少上下文切换） |
| **饥饿问题** | 不会饥饿 | 可能饥饿 |
| **使用场景** | 对公平性要求高 | 追求性能（默认） |

### 9.4 为什么默认使用非公平锁？

#### 性能优势

1. **减少上下文切换**：新线程可能直接获取锁，避免入队和唤醒的开销
2. **更高的吞吐量**：减少线程阻塞和唤醒的次数
3. **CAS操作更快**：不需要检查队列状态

#### 性能测试示例

```java
// 公平锁：需要检查队列
if (!hasQueuedPredecessors() && compareAndSetState(0, acquires))
    // 获取成功

// 非公平锁：直接CAS
if (compareAndSetState(0, acquires))
    // 获取成功（可能插队）
```

**结论**：在大多数场景下，非公平锁的性能更好，因此ReentrantLock默认使用非公平锁。

---

## 十、工具类与AQS关联关系总结

### 10.1 关联关系图

```
┌─────────────────────────────────────────────────────────┐
│                      AQS框架                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  同步队列（CLH队列变体）                            │   │
│  │  head -> [Node1] -> [Node2] -> [Node3] <- tail   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  条件队列（每个Condition一个）                     │   │
│  │  firstWaiter -> [Node1] -> [Node2] <- lastWaiter │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  同步状态 state                                    │   │
│  │  - 独占模式：0/1（锁状态）                         │   │
│  │  - 共享模式：许可数/计数                           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 独占模式工具   │  │ 共享模式工具   │  │ 间接使用AQS  │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        │                 │                 │
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ReentrantLock │  │CountDownLatch│  │CyclicBarrier │
│              │  │              │  │              │
│- 独占模式     │  │- 共享模式     │  │- ReentrantLock│
│- state: 0/1  │  │- state: 计数  │  │- Condition   │
│- 可重入      │  │- 一次性       │  │- 可重用       │
└──────────────┘  └──────────────┘  └──────────────┘
                          │
                  ┌──────────────┐
                  │  Semaphore   │
                  │              │
                  │- 共享模式     │
                  │- state: 许可数│
                  │- 可重用       │
                  └──────────────┘
```

### 10.2 详细关联表

| 工具类 | AQS模式 | state含义 | 队列使用 | 可重用 | 公平/非公平 |
|--------|---------|----------|----------|--------|-------------|
| **CountDownLatch** | 共享 | 倒计时计数 | 同步队列 | ❌ | N/A |
| **CyclicBarrier** | 间接 | N/A | 条件队列（通过Condition） | ✅ | N/A |
| **Semaphore** | 共享 | 许可数量 | 同步队列 | ✅ | ✅ |
| **ReentrantLock** | 独占 | 锁状态（0/1）+ 重入次数 | 同步队列 + 条件队列 | ✅ | ✅ |
| **Synchronized** | ❌ | 对象头Mark Word | JVM实现 | ✅ | 非公平 |

### 10.3 核心方法映射

| 工具类方法 | AQS方法 | 模式 |
|-----------|---------|------|
| `CountDownLatch.await()` | `acquireSharedInterruptibly(1)` | 共享 |
| `CountDownLatch.countDown()` | `releaseShared(1)` | 共享 |
| `Semaphore.acquire()` | `acquireSharedInterruptibly(1)` | 共享 |
| `Semaphore.release()` | `releaseShared(1)` | 共享 |
| `ReentrantLock.lock()` | `acquire(1)` | 独占 |
| `ReentrantLock.unlock()` | `release(1)` | 独占 |
| `Condition.await()` | `await()`（条件队列） | 条件 |
| `Condition.signal()` | `signal()`（转移到同步队列） | 条件 |

---

## 十一、实战：理解AQS的完整流程

### 11.1 ReentrantLock完整流程示例

```java
public class ReentrantLockFlow {
    private final ReentrantLock lock = new ReentrantLock();
    
    public void demonstrateFlow() {
        // 线程1：获取锁
        new Thread(() -> {
            lock.lock();
            try {
                System.out.println("Thread-1 获取锁");
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            } finally {
                lock.unlock();
                System.out.println("Thread-1 释放锁");
            }
        }).start();
        
        // 线程2：等待锁
        new Thread(() -> {
            try {
                Thread.sleep(100);  // 确保线程1先获取锁
                lock.lock();
                try {
                    System.out.println("Thread-2 获取锁");
                } finally {
                    lock.unlock();
                }
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }).start();
    }
}
```

**执行流程**：

```
时间  T1                    T2                    AQS状态
────────────────────────────────────────────────────────────
T0    lock()               -                     state=0
T1    tryAcquire():成功     -                     state=1
      state: 0->1                                  owner=T1
      owner: T1                                   
T2    -                    lock()                state=1
T3    -                    tryAcquire():失败      owner=T1
      -                    addWaiter():入队       队列: [T2]
      -                    park():阻塞            
T4    unlock()             -                     state=1
T5    tryRelease():成功    -                     state=0
      state: 1->0                                  owner=null
      unparkSuccessor():唤醒T2                    队列: []
T6    -                    acquireQueued():继续    state=0
T7    -                    tryAcquire():成功       state=1
      -                    setHead():设置头节点     owner=T2
T8    -                    unlock()               state=0
      -                    tryRelease():成功       owner=null
```

### 11.2 CountDownLatch完整流程示例

```java
public class CountDownLatchFlow {
    public void demonstrateFlow() {
        CountDownLatch latch = new CountDownLatch(3);
        
        // 3个工作线程
        for (int i = 0; i < 3; i++) {
            final int id = i;
            new Thread(() -> {
                try {
                    Thread.sleep(1000 * (id + 1));
                    System.out.println("Worker-" + id + " 完成");
                } finally {
                    latch.countDown();
                }
            }).start();
        }
        
        // 主线程等待
        new Thread(() -> {
            try {
                System.out.println("主线程等待...");
                latch.await();
                System.out.println("所有工作完成，主线程继续");
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }).start();
    }
}
```

**执行流程**：

```
时间  工作线程               主线程                AQS状态
────────────────────────────────────────────────────────────
T0    -                     await()              state=3
T1    -                     tryAcquireShared():  队列: [主线程]
                            -1(失败)             
                            park():阻塞           
T2    Worker-0: countDown() -                    state=3
T3    releaseShared():成功  -                    state=2
      state: 3->2                                 
T4    Worker-1: countDown() -                    state=2
T5    releaseShared():成功  -                    state=1
      state: 2->1                                 
T6    Worker-2: countDown() -                    state=1
T7    releaseShared():成功  -                    state=0
      state: 1->0                                 
      unparkSuccessor():唤醒主线程                 队列: []
T8    -                     被唤醒                state=0
      -                     tryAcquireShared():1  
      -                     继续执行               
```

---

## 十二、总结

### 12.1 核心知识点回顾

1. **五大工具类区别**：
   - `CountDownLatch`：一次性倒计时门闩，共享模式
   - `CyclicBarrier`：可重用循环屏障，间接使用AQS
   - `Semaphore`：信号量，共享模式，可重用
   - `ReentrantLock`：可重入锁，独占模式，可重用
   - `Synchronized`：JVM实现，不基于AQS

2. **AQS核心机制**：
   - **同步队列**：双向链表，管理等待获取锁的线程
   - **条件队列**：单向链表，管理等待条件满足的线程
   - **独占模式**：互斥锁，同一时刻只有一个线程
   - **共享模式**：允许多个线程同时获取，支持传播

3. **公平锁 vs 非公平锁**：
   - **公平锁**：检查前驱节点，严格按照顺序
   - **非公平锁**：直接CAS，允许插队，性能更好

### 12.2 学习建议

1. **理解AQS的设计思想**：模板方法模式，子类实现tryAcquire/tryRelease
2. **掌握两种模式的区别**：独占和共享的使用场景
3. **理解队列机制**：同步队列和条件队列的作用和转换
4. **实践应用**：在实际项目中根据场景选择合适的工具类

### 12.3 进一步学习

- 深入理解AQS的源码实现
- 学习其他基于AQS的工具类（如ReentrantReadWriteLock）
- 理解JMM（Java内存模型）与AQS的关系
- 掌握性能调优和锁竞争优化

---

## 参考文献

- Java并发编程实战
- Java并发编程的艺术
- JDK源码：java.util.concurrent包
- AQS论文：The java.util.concurrent Synchronizer Framework
