---
title: synchronized底层实现原理详解
published: 2025-01-23
updated: 2025-01-23
description: "深入理解synchronized的底层实现：从Java代码到字节码，从对象头到锁升级，从CAS到操作系统调用"
tags:
  - Java并发
  - 多线程
  - synchronized
  - 锁机制
  - JVM
  - 对象头
  - Mark Word
  - 锁升级
category: 八股文
draft: false
---

# synchronized底层实现原理详解

## 引言

`synchronized` 是 Java 中最基础的同步机制，但它的实现远比表面看起来复杂。从 Java 代码到最终的机器指令，涉及多个层次的转换和优化。本文将深入探讨 synchronized 的完整实现路径，从语法层面到 JVM 实现，再到操作系统调用。

---

## 一、从Java代码到字节码

### 1.1 synchronized的三种使用方式

```java
// 方式1：同步代码块
public void method1() {
    synchronized (this) {
        // 临界区代码
    }
}

// 方式2：同步实例方法
public synchronized void method2() {
    // 临界区代码
}

// 方式3：同步静态方法
public static synchronized void method3() {
    // 临界区代码
}
```

### 1.2 字节码层面的转换

#### 同步代码块的字节码

```java
public void method1() {
    synchronized (this) {
        System.out.println("Hello");
    }
}
```

**编译后的字节码**（使用 `javap -c` 查看）：

```bytecode
public void method1();
  Code:
     0: aload_0          // 加载this引用到操作数栈
     1: dup              // 复制栈顶元素（this）
     2: astore_1         // 存储到局部变量表slot 1
     3: monitorenter     // 进入监视器（获取锁）
     4: getstatic        // 获取System.out
     7: ldc              // 加载字符串"Hello"
     9: invokevirtual    // 调用println
    12: aload_1          // 加载锁对象
    13: monitorexit      // 退出监视器（释放锁）
    14: goto             // 跳转到正常返回
    17: astore_2         // 异常处理：存储异常对象
    18: aload_1          // 加载锁对象
    19: monitorexit      // 异常时也要释放锁
    20: aload_2          // 重新抛出异常
    21: athrow
    22: return
```

**关键指令**：
- `monitorenter`：进入监视器，尝试获取锁
- `monitorexit`：退出监视器，释放锁
- **异常处理**：即使发生异常，也会执行 `monitorexit` 释放锁（这是为什么 synchronized 是异常安全的）

#### 同步方法的字节码

```java
public synchronized void method2() {
    System.out.println("Hello");
}
```

**编译后的字节码**：

```bytecode
public synchronized void method2();
  Code:
     0: getstatic        // 获取System.out
     3: ldc              // 加载字符串"Hello"
     5: invokevirtual    // 调用println
     8: return
```

**注意**：同步方法在字节码层面**没有显式的 monitorenter/monitorexit**，而是通过方法的 `ACC_SYNCHRONIZED` 标志位来标识。JVM 在调用方法时会检查这个标志，如果有，则在方法调用前后自动加锁/解锁。

**方法标志位**：
```
Method flags: 0x0021
  - ACC_PUBLIC (0x0001)
  - ACC_SYNCHRONIZED (0x0020)  // 同步方法标志
```

### 1.3 monitorenter和monitorexit的语义

#### monitorenter的语义

1. **获取对象引用**：从操作数栈获取锁对象
2. **检查对象**：如果对象为 null，抛出 `NullPointerException`
3. **尝试获取锁**：
   - 如果当前线程已经持有该锁（可重入），锁计数器 +1
   - 如果锁未被持有，尝试获取锁
   - 如果锁被其他线程持有，阻塞当前线程

#### monitorexit的语义

1. **检查锁的所有权**：确保当前线程持有该锁
2. **减少锁计数器**：如果是重入锁，计数器 -1
3. **释放锁**：如果计数器为 0，释放锁并唤醒等待的线程

---

## 二、对象头与Mark Word

### 2.1 Java对象的内存布局

在 HotSpot JVM 中，每个对象在内存中的布局如下：

```
┌─────────────────────────────────────┐
│        对象头（Object Header）        │  ← 12字节（64位JVM，压缩指针开启）
│  ┌───────────────────────────────┐ │
│  │  Mark Word (8字节)             │ │  ← 存储锁信息、GC信息、哈希码
│  └───────────────────────────────┘ │
│  ┌───────────────────────────────┐ │
│  │  Klass Pointer (4字节)        │ │  ← 指向类的元数据
│  └───────────────────────────────┘ │
├─────────────────────────────────────┤
│        实例数据（Instance Data）      │  ← 对象的字段
├─────────────────────────────────────┤
│        对齐填充（Padding）           │  ← 8字节对齐
└─────────────────────────────────────┘
```

### 2.2 Mark Word的结构

**Mark Word** 是对象头中最重要的部分，在不同状态下存储不同的信息。在 64 位 JVM 中，Mark Word 是 8 字节（64 位）。

#### Mark Word在不同状态下的布局

```
┌─────────────────────────────────────────────────────────┐
│                    Mark Word (64位)                      │
└─────────────────────────────────────────────────────────┘

无锁状态（Normal）：
┌─────────────────────────────────────────────────────────┐
│  25位未使用 │ 31位哈希码 │ 1位未使用 │ 4位分代年龄 │ 0 │ 01 │
└─────────────────────────────────────────────────────────┘
  unused      hashcode    unused    age       0   lock

偏向锁状态（Biased）：
┌─────────────────────────────────────────────────────────┐
│  54位线程ID │ 2位epoch │ 1位未使用 │ 4位分代年龄 │ 1 │ 01 │
└─────────────────────────────────────────────────────────┘
  thread_id   epoch      unused    age       1   lock

轻量级锁状态（Lightweight Locked）：
┌─────────────────────────────────────────────────────────┐
│  62位指向栈中Lock Record的指针 │ 00 │
└─────────────────────────────────────────────────────────┘
  ptr_to_lock_record              lock

重量级锁状态（Heavyweight Locked）：
┌─────────────────────────────────────────────────────────┐
│  62位指向Monitor对象的指针 │ 10 │
└─────────────────────────────────────────────────────────┘
  ptr_to_monitor                  lock

GC标记状态（Marked for GC）：
┌─────────────────────────────────────────────────────────┐
│  标记信息 │ 11 │
└─────────────────────────────────────────────────────────┘
```

**锁标志位（最后2位）**：
- `00`：轻量级锁
- `01`：无锁或偏向锁（通过倒数第3位区分：0=无锁，1=偏向锁）
- `10`：重量级锁
- `11`：GC标记

### 2.3 如何查看Mark Word

可以使用 JOL (Java Object Layout) 工具查看对象的内存布局：

```java
import org.openjdk.jol.info.ClassLayout;
import org.openjdk.jol.info.GraphLayout;

public class MarkWordExample {
    public static void main(String[] args) {
        Object obj = new Object();
        
        // 查看对象布局
        System.out.println(ClassLayout.parseInstance(obj).toPrintable());
        
        // 输出示例：
        // OFFSET  SIZE   TYPE DESCRIPTION
        //      0     4        (object header)  ← Mark Word (前4字节)
        //      4     4        (object header)  ← Mark Word (后4字节)
        //      8     4        (object header)  ← Klass Pointer
        //     12     4        (loss due to the next object alignment)
    }
}
```

---

## 三、锁的三种状态与升级过程

### 3.1 无锁状态（Normal）

**特点**：
- 对象刚创建时的状态
- 没有任何线程持有锁
- Mark Word 存储哈希码、分代年龄等信息

**获取锁的过程**：
1. 检查 Mark Word 的锁标志位
2. 如果是无锁状态，尝试升级为偏向锁或轻量级锁

### 3.2 偏向锁（Biased Locking）

#### 为什么需要偏向锁？

在大多数情况下，锁不仅不存在多线程竞争，而且总是由同一线程多次获得。偏向锁的目的是在只有一个线程执行同步块时，减少获取锁的代价。

**性能优势**：
- 避免 CAS 操作（Compare-And-Swap）
- 只需要检查线程ID是否匹配
- 适合单线程重复获取锁的场景

#### 偏向锁的获取流程

```
线程1首次获取锁：
┌─────────────────────────────────────────┐
│  1. 检查Mark Word的锁标志位              │
│     - 如果是01（无锁或偏向锁）            │
│  2. 检查是否已偏向                       │
│     - 检查倒数第3位是否为1               │
│  3. 如果未偏向，尝试CAS设置偏向锁         │
│     - CAS设置线程ID、epoch、锁标志位      │
│  4. 如果成功，线程1持有偏向锁              │
└─────────────────────────────────────────┘

线程1再次获取锁（可重入）：
┌─────────────────────────────────────────┐
│  1. 检查Mark Word                       │
│  2. 检查线程ID是否匹配                   │
│     - 如果匹配，直接进入临界区            │
│     - 无需CAS，性能最优                  │
└─────────────────────────────────────────┘
```

#### 偏向锁的撤销（Revoke）

当有其他线程尝试获取锁时，需要撤销偏向锁：

```
线程2尝试获取锁（线程1持有偏向锁）：
┌─────────────────────────────────────────┐
│  1. 检查Mark Word                       │
│  2. 发现线程ID不匹配（线程1持有）         │
│  3. 等待线程1到达安全点（Safepoint）      │
│  4. 撤销偏向锁：                         │
│     - 检查线程1是否还在执行同步块         │
│     - 如果不在，将Mark Word恢复为无锁    │
│     - 如果在，升级为轻量级锁              │
│  5. 线程2继续尝试获取锁                  │
└─────────────────────────────────────────┘
```

**安全点（Safepoint）**：JVM 中所有线程都暂停执行的位置，用于进行 GC、偏向锁撤销等操作。

#### 批量撤销和批量重偏向

**批量撤销（Bulk Revoke）**：
- 当某个类的偏向锁撤销次数达到阈值（默认 40）时
- JVM 认为该类的对象不适合使用偏向锁
- 将该类的所有对象的偏向锁标记为不可偏向

**批量重偏向（Bulk Rebias）**：
- 当某个类的偏向锁撤销次数达到另一个阈值（默认 20）时
- 但撤销是由于不同线程竞争导致的
- JVM 会批量重偏向，将偏向锁重新偏向到新的线程

### 3.3 轻量级锁（Lightweight Locking）

#### 为什么需要轻量级锁？

当偏向锁被撤销后，如果锁竞争不激烈（只有两个线程交替获取锁），使用重量级锁会带来不必要的性能开销（阻塞、唤醒、上下文切换）。轻量级锁使用 CAS 和自旋来避免阻塞。

#### 轻量级锁的获取流程

```
线程尝试获取轻量级锁：
┌─────────────────────────────────────────┐
│  1. 在当前线程的栈帧中创建Lock Record     │
│     - Lock Record是线程栈中的一块内存      │
│     - 保存当前Mark Word的副本             │
│  2. 使用CAS尝试将Mark Word更新为：        │
│     - 指向Lock Record的指针               │
│     - 锁标志位设置为00（轻量级锁）         │
│  3. 如果CAS成功：                        │
│     - 当前线程持有轻量级锁                │
│     - 进入临界区                         │
│  4. 如果CAS失败：                        │
│     - 检查Mark Word是否指向当前线程的     │
│       Lock Record（可重入）               │
│     - 如果是，可重入计数+1                │
│     - 如果不是，说明有其他线程持有锁       │
│     - 开始自旋等待                        │
└─────────────────────────────────────────┘
```

#### Lock Record的结构

```
┌─────────────────────────────────────┐
│         Lock Record                  │
│  ┌───────────────────────────────┐  │
│  │  Displaced Mark Word          │  │  ← 保存原Mark Word的副本
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  Object Reference (oop)      │  │  ← 指向锁对象
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

#### 自旋优化

**自旋**：线程不进入阻塞状态，而是循环检查锁是否被释放。

**自旋的条件**：
- 锁被其他线程持有
- 持有锁的线程很快会释放（临界区很短）
- CPU 核心数 > 1（单核CPU自旋无意义）

**自适应自旋（Adaptive Spinning）**：
- JVM 根据历史数据动态调整自旋次数
- 如果上次自旋成功获取锁，增加自旋次数
- 如果上次自旋失败，减少自旋次数
- 默认自旋次数：10次（可通过 `-XX:PreBlockSpin` 调整，但自适应自旋会覆盖此设置）

#### 轻量级锁的释放

```
线程释放轻量级锁：
┌─────────────────────────────────────────┐
│  1. 使用CAS将Mark Word恢复为Displaced     │
│     Mark Word（从Lock Record中获取）      │
│  2. 如果CAS成功：                        │
│     - 锁释放成功                         │
│     - 其他等待的线程可以继续竞争          │
│  3. 如果CAS失败：                        │
│     - 说明锁已经升级为重量级锁            │
│     - 需要唤醒等待的线程                  │
└─────────────────────────────────────────┘
```

### 3.4 重量级锁（Heavyweight Locking）

#### 什么时候升级为重量级锁？

1. **自旋失败**：轻量级锁自旋一定次数后仍未获取到锁
2. **竞争激烈**：等待获取锁的线程数超过阈值
3. **主动膨胀**：某些情况下 JVM 会主动将锁膨胀为重量级锁

#### ObjectMonitor结构

重量级锁使用 `ObjectMonitor` 对象来管理锁的竞争和等待：

```cpp
// HotSpot源码中的ObjectMonitor结构（简化）
class ObjectMonitor {
    void* volatile _owner;        // 持有锁的线程
    volatile jlong _count;        // 重入计数
    ObjectWaiter* volatile _EntryList;  // 竞争队列（阻塞的线程）
    ObjectWaiter* volatile _WaitSet;    // 等待队列（调用wait()的线程）
    volatile jint _waiters;      // 等待的线程数
    volatile jint _recursions;   // 重入次数
    // ...
};
```

#### 重量级锁的获取流程

```
线程尝试获取重量级锁：
┌─────────────────────────────────────────┐
│  1. 检查ObjectMonitor的_owner字段         │
│  2. 如果_owner为NULL：                   │
│     - 使用CAS设置_owner为当前线程         │
│     - 如果成功，获取锁                    │
│  3. 如果_owner是当前线程：               │
│     - 重入计数+1                         │
│     - 获取锁成功                         │
│  4. 如果_owner是其他线程：               │
│     - 将当前线程加入_EntryList           │
│     - 调用操作系统原语阻塞线程            │
│       （如pthread_mutex_lock）           │
│     - 等待被唤醒                         │
└─────────────────────────────────────────┘
```

#### 操作系统层面的实现

重量级锁最终会调用操作系统的同步原语：

**Linux系统**：
- 使用 `pthread_mutex_t`（互斥锁）
- 使用 `futex`（Fast Userspace Mutex）系统调用
- 线程阻塞时进入内核态，等待被唤醒

**Windows系统**：
- 使用 `CRITICAL_SECTION`（临界区）
- 使用 `WaitForSingleObject` 等API
- 线程阻塞时进入内核态

**性能开销**：
- 用户态 ↔ 内核态的切换（系统调用）
- 线程的阻塞和唤醒
- 上下文切换
- 比轻量级锁慢 10-100 倍

### 3.5 锁升级的完整流程图

```
┌─────────────┐
│  无锁状态    │
└──────┬──────┘
       │ 线程1首次获取锁
       ▼
┌─────────────┐
│  偏向锁      │ ← 线程1可重入（无需CAS）
└──────┬──────┘
       │ 线程2竞争
       ▼
┌─────────────┐
│  轻量级锁    │ ← CAS + 自旋
└──────┬──────┘
       │ 自旋失败/竞争激烈
       ▼
┌─────────────┐
│  重量级锁    │ ← 阻塞 + 操作系统调用
└─────────────┘

注意：锁只能升级，不能降级（降级成本高）
```

---

## 四、CAS操作与自旋

### 4.1 什么是CAS？

**CAS（Compare-And-Swap）** 是一种原子操作，用于实现无锁编程。

**CAS操作的语义**：
```cpp
bool CAS(T* addr, T expected, T new_value) {
    if (*addr == expected) {
        *addr = new_value;
        return true;
    }
    return false;
}
```

**原子性保证**：CAS 操作在硬件层面是原子的，不会被其他线程打断。

### 4.2 CAS在synchronized中的应用

#### 偏向锁中的CAS

```cpp
// 伪代码：尝试获取偏向锁
bool try_acquire_biased_lock(oop obj, Thread* thread) {
    markOop mark = obj->mark();
    
    // 检查是否已偏向
    if (mark->is_biased_anonymously() || 
        (mark->has_bias_pattern() && mark->biased_locker() == thread)) {
        // 已偏向当前线程，直接返回成功
        return true;
    }
    
    // 尝试CAS设置偏向锁
    markOop new_mark = markOopDesc::encode(thread, mark->age(), mark->biased_lock());
    return obj->cas_set_mark(new_mark, mark) == mark;
}
```

#### 轻量级锁中的CAS

```cpp
// 伪代码：尝试获取轻量级锁
bool try_acquire_lightweight_lock(oop obj, BasicLock* lock) {
    markOop mark = obj->mark();
    
    // 检查是否是无锁状态
    if (mark->is_neutral()) {
        // 将Mark Word保存到Lock Record
        lock->set_displaced_header(mark);
        
        // CAS尝试将Mark Word更新为指向Lock Record
        markOop new_mark = markOopDesc::encode(lock);
        if (obj->cas_set_mark(new_mark, mark) == mark) {
            return true;  // 获取锁成功
        }
    }
    
    return false;  // 获取锁失败
}
```

### 4.3 CAS的ABA问题

**ABA问题**：值从 A 变为 B，再变回 A，CAS 操作无法检测到中间的变化。

**示例**：
```
初始值：A
线程1：读取A，准备CAS为C
线程2：将A改为B
线程3：将B改回A
线程1：CAS(A, C) 成功，但实际上值已经变化过了
```

**在synchronized中的影响**：
- 偏向锁的 epoch 机制可以部分缓解ABA问题
- 轻量级锁中，如果Mark Word被其他线程修改后又恢复，CAS可能成功，但这是安全的（因为锁状态已经改变）

### 4.4 自旋的实现

#### 自旋循环

```cpp
// 伪代码：自旋等待获取锁
void spin_wait_for_lock(oop obj) {
    int spin_count = 0;
    int max_spins = calculate_adaptive_spins();  // 自适应计算自旋次数
    
    while (spin_count < max_spins) {
        markOop mark = obj->mark();
        
        // 检查锁是否已释放
        if (mark->is_neutral() || mark->has_locker()) {
            // 再次尝试获取锁
            if (try_acquire_lightweight_lock(obj, lock)) {
                return;  // 获取成功
            }
        }
        
        // CPU暂停指令，减少功耗
        CPU_PAUSE();
        spin_count++;
    }
    
    // 自旋失败，升级为重量级锁
    inflate_and_enter(obj);
}
```

**CPU_PAUSE()**：
- x86架构：`pause` 指令
- 提示CPU这是一个自旋循环
- 减少CPU功耗，提高超线程性能

---

## 五、内存屏障与可见性保证

### 5.1 synchronized的内存语义

**synchronized 保证**：
1. **可见性**：一个线程的修改对其他线程可见
2. **有序性**：禁止指令重排序
3. **原子性**：临界区代码原子执行

### 5.2 内存屏障的插入

#### 获取锁时的内存屏障

```cpp
// 伪代码：获取锁时的内存屏障
void enter_monitor(oop obj) {
    // Load Barrier：确保之前的所有读操作完成
    // 从主内存加载最新值，清空工作内存
    load_barrier();
    
    // 获取锁的逻辑
    acquire_lock(obj);
    
    // Store Barrier：确保锁获取操作完成
    store_barrier();
}
```

**内存屏障的作用**：
- **Load Barrier**：确保从主内存读取最新值，使其他线程的修改可见
- **Store Barrier**：确保当前线程的修改对其他线程可见

#### 释放锁时的内存屏障

```cpp
// 伪代码：释放锁时的内存屏障
void exit_monitor(oop obj) {
    // Store Barrier：确保临界区内的所有写操作完成
    // 将修改刷新到主内存
    store_barrier();
    
    // 释放锁的逻辑
    release_lock(obj);
    
    // Load Barrier：确保锁释放操作完成
    load_barrier();
}
```

### 5.3 happens-before关系

**synchronized 建立的 happens-before 关系**：

1. **解锁 happens-before 加锁**：
   ```java
   // 线程1
   synchronized (lock) {
       x = 1;  // 写操作
   }  // 释放锁
   
   // 线程2
   synchronized (lock) {
       // 获取锁
       int value = x;  // 能看到 x = 1
   }
   ```

2. **程序顺序规则**：
   ```java
   synchronized (lock) {
       x = 1;    // 操作1
       y = 2;    // 操作2
       // 操作1 happens-before 操作2
   }
   ```

3. **传递性**：
   ```java
   // 线程1的操作A happens-before 线程2的操作B
   // 线程2的操作B happens-before 线程3的操作C
   // 则：操作A happens-before 操作C
   ```

### 5.4 底层实现：CPU内存屏障指令

**x86架构**：
- `mfence`：全屏障（Memory Fence），确保所有内存操作完成
- `lfence`：读屏障（Load Fence），确保所有读操作完成
- `sfence`：写屏障（Store Fence），确保所有写操作完成

**ARM架构**：
- `dmb`：数据内存屏障（Data Memory Barrier）
- `dsb`：数据同步屏障（Data Synchronization Barrier）

**JVM的实现**：
```cpp
// HotSpot中的内存屏障实现（简化）
inline void OrderAccess::storeload() {
    if (os::is_MP()) {  // 多核处理器
        __asm__ __volatile__ ("mfence" ::: "memory");
    }
}
```

---

## 六、性能优化技术

### 6.1 锁消除（Lock Elimination）

**原理**：JIT编译器通过逃逸分析，发现某些锁对象不会逃逸出当前方法，可以安全地消除锁。

**示例**：
```java
public String concat(String s1, String s2) {
    StringBuffer sb = new StringBuffer();
    sb.append(s1);
    sb.append(s2);
    return sb.toString();
}
```

**分析**：
- `StringBuffer` 对象不会逃逸出方法
- `append` 方法内部的 `synchronized` 可以消除
- JIT编译器会自动优化

**开启条件**：
- 逃逸分析开启：`-XX:+DoEscapeAnalysis`（默认开启）
- 锁消除开启：`-XX:+EliminateLocks`（默认开启）

### 6.2 锁粗化（Lock Coarsening）

**原理**：将多个连续的锁操作合并为一个，减少锁的获取和释放次数。

**示例**：
```java
// 优化前：多次获取/释放锁
for (int i = 0; i < 100; i++) {
    synchronized (lock) {
        list.add(i);
    }
}

// 优化后：锁粗化
synchronized (lock) {
    for (int i = 0; i < 100; i++) {
        list.add(i);
    }
}
```

**JVM自动优化**：JIT编译器会自动进行锁粗化优化。

### 6.3 自适应自旋（Adaptive Spinning）

**原理**：根据历史数据动态调整自旋次数。

**策略**：
- 如果上次自旋成功获取锁，增加自旋次数
- 如果上次自旋失败，减少自旋次数
- 如果自旋总是失败，可能直接升级为重量级锁

**优势**：
- 避免固定自旋次数带来的性能浪费
- 根据实际情况动态调整

### 6.4 偏向锁的优化

**适用场景**：
- 单线程重复获取锁
- 锁竞争不激烈

**不适用场景**：
- 多线程竞争激烈
- 偏向锁撤销成本高

**JDK 15的变化**：
- 默认禁用偏向锁（`-XX:-UseBiasedLocking`）
- 原因：现代应用多线程竞争激烈，偏向锁的维护成本高于收益

---

## 七、与JMM的关系

### 7.1 synchronized在JMM中的作用

**JMM的三个特性**：
1. **原子性**：synchronized 保证临界区代码原子执行
2. **可见性**：通过内存屏障保证可见性
3. **有序性**：通过内存屏障禁止重排序

### 7.2 工作内存与主内存的交互

```
线程1（获取锁）：
┌─────────────────────────────────────────┐
│  1. 执行Load Barrier                     │
│     - 清空工作内存                       │
│     - 从主内存加载共享变量的最新值        │
│  2. 执行临界区代码                       │
│     - 在工作内存中修改共享变量            │
│  3. 执行Store Barrier                   │
│     - 将修改刷新到主内存                 │
│  4. 释放锁                               │
└─────────────────────────────────────────┘

线程2（获取锁）：
┌─────────────────────────────────────────┐
│  1. 执行Load Barrier                     │
│     - 清空工作内存                       │
│     - 从主内存加载共享变量的最新值        │
│     - 能看到线程1的修改                  │
│  2. 执行临界区代码                       │
└─────────────────────────────────────────┘
```

### 7.3 与volatile的对比

| 特性 | synchronized | volatile |
|------|-------------|----------|
| **互斥性** | ✅ 保证 | ❌ 不保证 |
| **可见性** | ✅ 保证 | ✅ 保证 |
| **有序性** | ✅ 保证 | ✅ 保证 |
| **原子性** | ✅ 保证（临界区） | ❌ 不保证（单操作） |
| **性能** | 重量级锁有开销 | 轻量级，但有限制 |
| **使用场景** | 复合操作、临界区 | 状态标志、单变量 |

---

## 八、实际案例分析

### 8.1 案例1：单例模式的双重检查锁定

```java
public class Singleton {
    private static volatile Singleton instance;  // 必须volatile
    
    private Singleton() {}
    
    public static Singleton getInstance() {
        if (instance == null) {  // 第一次检查
            synchronized (Singleton.class) {
                if (instance == null) {  // 第二次检查
                    instance = new Singleton();  // 可能重排序
                }
            }
        }
        return instance;
    }
}
```

**为什么需要volatile？**

`new Singleton()` 不是原子操作，包含三个步骤：
1. 分配内存
2. 初始化对象
3. 返回引用

**可能的重排序**：
- 正常顺序：1 → 2 → 3
- 重排序后：1 → 3 → 2

**问题**：如果重排序，其他线程可能拿到未初始化的对象。

**volatile的作用**：
- 禁止指令重排序
- 保证可见性

### 8.2 案例2：高并发计数器的优化

```java
// 方案1：使用synchronized（简单但性能一般）
public class Counter1 {
    private int count = 0;
    private final Object lock = new Object();
    
    public void increment() {
        synchronized (lock) {
            count++;
        }
    }
}

// 方案2：使用AtomicInteger（CAS，性能更好）
import java.util.concurrent.atomic.AtomicInteger;

public class Counter2 {
    private final AtomicInteger count = new AtomicInteger(0);
    
    public void increment() {
        count.incrementAndGet();  // CAS操作
    }
}

// 方案3：使用LongAdder（高并发场景最优）
import java.util.concurrent.atomic.LongAdder;

public class Counter3 {
    private final LongAdder count = new LongAdder();
    
    public void increment() {
        count.increment();  // 分段累加，避免CAS竞争
    }
}
```

**性能对比**（100个线程，每个执行1000000次）：
- Counter1（synchronized）：~15秒
- Counter2（AtomicInteger）：~5秒
- Counter3（LongAdder）：~2秒

### 8.3 案例3：读写分离优化

```java
// 问题：读多写少场景，使用synchronized性能差
public class ReadWriteExample1 {
    private int value = 0;
    private final Object lock = new Object();
    
    public int read() {
        synchronized (lock) {  // 读操作也要加锁，性能差
            return value;
        }
    }
    
    public void write(int v) {
        synchronized (lock) {
            value = v;
        }
    }
}

// 优化：使用读写锁
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

public class ReadWriteExample2 {
    private int value = 0;
    private final ReadWriteLock lock = new ReentrantReadWriteLock();
    
    public int read() {
        lock.readLock().lock();  // 多个读操作可以并发
        try {
            return value;
        } finally {
            lock.readLock().unlock();
        }
    }
    
    public void write(int v) {
        lock.writeLock().lock();  // 写操作互斥
        try {
            value = v;
        } finally {
            lock.writeLock().unlock();
        }
    }
}
```

---

## 九、常见问题与解答

### 9.1 synchronized是可重入的吗？

**答案**：是的，synchronized 是可重入锁。

**示例**：
```java
public class ReentrantExample {
    public synchronized void method1() {
        System.out.println("method1");
        method2();  // 可重入，不会死锁
    }
    
    public synchronized void method2() {
        System.out.println("method2");
    }
}
```

**实现原理**：
- 在对象头或ObjectMonitor中维护重入计数
- 每次获取锁，计数+1
- 每次释放锁，计数-1
- 计数为0时，真正释放锁

### 9.2 synchronized是公平锁还是非公平锁？

**答案**：synchronized 是**非公平锁**。

**原因**：
- JVM 不保证线程获取锁的顺序
- 新来的线程可能比等待的线程先获取锁
- 这是为了性能考虑（减少上下文切换）

**对比**：
- `ReentrantLock` 可以选择公平或非公平
- `synchronized` 只能是非公平

### 9.3 synchronized能响应中断吗？

**答案**：不能直接响应中断，但可以通过其他方式实现。

**问题**：
```java
synchronized (lock) {
    // 如果线程被中断，不会立即响应
    // 必须等待获取锁后才能检查中断状态
}
```

**解决方案**：
```java
// 使用ReentrantLock的lockInterruptibly()
ReentrantLock lock = new ReentrantLock();
try {
    lock.lockInterruptibly();  // 可中断
    // 临界区
} catch (InterruptedException e) {
    // 处理中断
} finally {
    lock.unlock();
}
```

### 9.4 synchronized的性能如何？

**答案**：在低竞争场景下性能很好，在高竞争场景下性能较差。

**性能特点**：
- **低竞争**：偏向锁/轻量级锁，性能接近无锁
- **中等竞争**：轻量级锁+自旋，性能可接受
- **高竞争**：重量级锁，性能较差（阻塞、上下文切换）

**优化建议**：
- 减少锁的持有时间
- 减小锁的粒度
- 使用无锁数据结构（如 `ConcurrentHashMap`）
- 使用读写锁（读多写少场景）

---

## 十、总结

### 10.1 核心要点

1. **字节码层面**：`monitorenter` 和 `monitorexit` 指令
2. **对象头**：Mark Word 存储锁状态信息
3. **锁升级**：无锁 → 偏向锁 → 轻量级锁 → 重量级锁
4. **CAS操作**：轻量级锁和偏向锁使用CAS
5. **内存屏障**：保证可见性和有序性
6. **性能优化**：锁消除、锁粗化、自适应自旋

### 10.2 实现层次

```
Java代码
    ↓ 编译
字节码（monitorenter/monitorexit）
    ↓ JVM解释/编译
C++代码（HotSpot实现）
    ↓ 执行
CPU指令（CAS、内存屏障、系统调用）
    ↓
操作系统（线程阻塞/唤醒）
```

### 10.3 关键数据结构

- **Mark Word**：对象头中的锁信息
- **Lock Record**：线程栈中的锁记录
- **ObjectMonitor**：重量级锁的监视器对象

### 10.4 性能考虑

- **低竞争**：偏向锁/轻量级锁，性能优秀
- **高竞争**：重量级锁，需要优化（减少竞争、使用无锁结构）
- **优化技术**：锁消除、锁粗化、自适应自旋

---

## 参考资料

- 《深入理解Java虚拟机》- 周志明
- 《Java并发编程实战》- Brian Goetz
- [OpenJDK HotSpot源码](https://hg.openjdk.org/)
- [JLS §17 - 线程和锁](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [JOL - Java Object Layout](https://openjdk.java.net/projects/code-tools/jol/)

---

## 更新日志

- 2025-01-23: 初始版本，完成synchronized底层实现的全面总结
