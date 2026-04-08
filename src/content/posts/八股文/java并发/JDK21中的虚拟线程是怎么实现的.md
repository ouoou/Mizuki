---
title: JDK21 中的虚拟线程是怎么实现的
published: 2025-12-08
updated: 2025-12-08
description: "深入拆解 JDK21 Loom 正式版虚拟线程的实现机制与运行流程"
tags:
  - Java
  - 并发
  - 虚拟线程
category: Java并发
draft: false
---

# JDK21 中的虚拟线程是怎么实现的

## 📋 目录
- [What - 是什么](#what---是什么)
- [Why - 为什么](#why---为什么)
- [When - 什么时候用](#when---什么时候用)
- [How - 如何使用](#how---如何使用)
- [原理全流程解析](#原理全流程解析)
- [全流程图解](#全流程图解)
- [核心要点](#核心要点)
- [常见错误](#常见错误)
- [记忆技巧](#记忆技巧)
- [相关知识点](#相关知识点)
- [实战案例](#实战案例)

---

## What - 是什么

### 🎯 定义
JDK21 将虚拟线程作为一等线程实现（java.lang.Thread 的一种），由 JVM 运行时调度，轻量、廉价创建，可将大量阻塞 I/O 线程转为事件驱动的可挂起任务。

### 🔍 本质特征
- 线程对象仍是 `Thread`，但不与 OS 线程一一对应
- 由 JDK 自带的协作式调度器管理，支持自动挂起/恢复
- 栈按需分块分配（stack chunking），不长期占用内核栈

### 📐 基本结构/组成
```
Java Thread(虚拟线程)
  ├─ Continuation（保存执行点 + 栈帧块）
  ├─ Scheduler(ForkJoinPool 封装)
  └─ Carrier Thread（平台线程，实际运行承载者）
      └─ OS Thread（操作系统线程，1:1 映射）

关系说明：
- 虚拟线程 ↔ Carrier: M:N 映射（多个虚拟线程共享少量 Carrier）
- Carrier ↔ OS 线程: 1:1 映射（每个 Carrier 对应一个 OS 线程）
- 虚拟线程与 Carrier 是临时绑定，可以动态切换
```

### 📝 关键术语
| 术语 | 说明 |
|------|------|
| 虚拟线程 | 由 JVM 管理、可挂起的轻量线程，不直接对应 OS 线程 |
| Carrier Thread（载体线程） | **平台线程（Platform Thread）**，即传统 OS 线程，是虚拟线程的物理执行载体。多个虚拟线程可以共享同一个 Carrier，虚拟线程与 Carrier 是临时绑定关系 |
| Continuation | 可保存/恢复调用栈的抽象，实现虚拟线程的挂起和恢复 |
| Stack Chunk | 栈分块，将栈帧保存到堆内存，减少持久内核栈占用 |
| 平台线程 | 传统的 Java 线程，与 OS 线程 1:1 映射，即 Carrier |

---

## Why - 为什么

### 🧠 设计原理
采用协作式挂起 + 栈分块保存，让阻塞调用不占用内核线程，提供「线程即结构化并发单元」的简单模型。

### 💡 解决的问题
- **阻塞占线程**: 传统平台线程在 I/O 阻塞时占用宝贵内核线程数。
- **线程创建成本高**: 大量短生命周期任务创建 OS 线程昂贵。

### ⚡ 优势/优点
1. **高并发**: 支持百万级线程，避免 OS 线程耗尽。
2. **阻塞即非阻塞**: `Socket`、`FileChannel` 等阻塞点自动变为可挂起。
3. **简单模型**: 继续用同步/阻塞思维编码，降低心智负担。

### ⚠️ 局限性/缺点
- **Pinned 场景退化**: `synchronized` 持锁或本地调用导致线程被固定在 Carrier 上。
- **JVMTI/Agent 兼容性**: 部分老探针不支持 Continuation 安全点。

### 🔬 为什么这样设计
保持「每个请求一个线程」的可读性，同时借助 continuation 挂起避免线程资源浪费，比回调/Future 更直观。

---

## When - 什么时候用

### ✅ 适用场景
1. **高并发 I/O 服务**: 
   - 描述：大量网络 I/O，单任务逻辑简单。
   - 示例：网关、聊天服务器、爬虫。
2. **阻塞式第三方 SDK**: 
   - 描述：无法改造的同步客户端。
   - 示例：同步数据库驱动、HTTP 客户端。

### ❌ 不适用场景
- **CPU 密集任务**: 线程切换不能提高吞吐。
- **大量 native 调用且长时间持锁**: 导致持续 pinned，失去虚拟化收益。

### 🎯 判断标准
> **什么时候选择虚拟线程？**
> - 阻塞 I/O 为主，CPU 低到中等
> - 需要海量并发、又想保留同步风格
> - 能接受少量 pinned 退化开销

### 📊 与其他方案对比
| 方案 | 适用场景 | 优缺点 | 选择建议 |
|------|---------|--------|----------|
| 事件回调/NIO | 极高并发，避免线程 | 代码复杂，状态机心智负担 | 已有框架可继续用 |
| 传统平台线程 | 低并发或重计算 | 简单但线程昂贵 | 计算密集仍可用 |
| 虚拟线程 | 高并发阻塞 I/O | 轻量、易读，pinned 需关注 | JDK21+ 首选 |

---

## How - 如何使用

### 🔧 基本步骤
1. **选择执行器**: 使用 `Executors.newVirtualThreadPerTaskExecutor()`。
2. **提交任务**: 像平台线程一样提交 `Callable/Runnable`。
3. **避免长时间 pinned**: 减少同步锁和 native 阻塞。

### 💻 代码实现

#### 基础版本
```java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    executor.submit(() -> {
        try (var socket = SocketChannel.open(new InetSocketAddress("example.com", 80))) {
            // 阻塞 I/O 自动转为挂起
            socket.write(StandardCharsets.UTF_8.encode("GET / HTTP/1.1\r\n\r\n"));
        } catch (IOException e) {
            e.printStackTrace();
        }
    });
}
```

#### 优化版本
```java
var scheduler = Thread.ofVirtual()
    .name("vt-", 0)
    .factory();

try (var executor = Executors.newThreadPerTaskExecutor(scheduler)) {
    executor.submit(() -> {
        // 避免 synchronized，改用 ReentrantLock try/finally
        // 避免长时间 JNI 阻塞
    });
}
```

### 🧩 关键步骤详解
- **创建**: `Thread.Builder.OfVirtual` 创建虚拟线程实例。
- **调度**: 提交到内置 `ForkJoinPool`（默认 parallelism = CPU 核数）。
- **挂起/恢复**: 阻塞点调用 `Continuation.yield` 将栈保存为 chunk，线程从 Carrier 卸下。

### 📈 复杂度分析
- **时间复杂度**: 调度近似 O(1) 入队/出队。
- **空间复杂度**: 每线程初始栈块极小（KB 级），按需扩展。
- **分析过程**: 栈按需分块，挂起后释放 Carrier 栈，显著降低整体内存。

---

## 原理全流程解析

### 🔄 完整流程概述
虚拟线程**不是操作系统线程**，而是 JVM 层面的轻量级抽象。虚拟线程通过 **Carrier（载体线程）**来执行代码，Carrier 是传统的平台线程（与 OS 线程 1:1 映射）。当虚拟线程遇到可挂起阻塞点时，通过 continuation 保存栈帧到堆中，**从 Carrier 上卸载**，释放 Carrier 给其他虚拟线程使用；当 I/O 就绪或 `unpark` 时，调度器将虚拟线程**重新绑定到可用 Carrier**（可能是同一个或不同的 Carrier）继续执行。这种设计实现了 M:N 映射：大量虚拟线程共享少量 Carrier，从而支持百万级并发。

### 📋 详细流程步骤

#### 步骤1: 创建虚拟线程
**目的**: 拿到轻量线程实例  
**操作**: `Thread.ofVirtual().unstarted(runnable)` 创建并注册 continuation  
**结果**: 线程处于 NEW，持有栈块元数据  
**关键点**: 不创建 OS 线程，只分配最小栈块

#### 步骤2: 提交到调度器
**目的**: 让线程获得运行机会  
**操作**: 入队到默认 `ForkJoinPool`（或自定义 Scheduler）  
**结果**: 等待 Carrier 拉取执行  
**关键点**: parallelism 由 CPU 核决定，可通过系统属性调整

#### 步骤3: 执行与挂起
**目的**: 在 Carrier 上运行并在阻塞点让出  
**操作**: 执行到 `park`、`I/O`、`sleep` 等时触发 `Continuation.yield`  
**结果**: 栈帧序列被拆分为 chunk 存入堆，Carrier 释放  
**关键点**: pinned 段（synchronized、本地方法）无法 yield，需等结束

#### 步骤4: 唤醒与恢复
**目的**: 在条件满足时恢复执行  
**操作**: I/O 就绪、`unpark`、`sleep` 超时后被重新调度到可用 Carrier  
**结果**: 恢复栈帧，从 yield 点继续  
**关键点**: 恢复后可迁移到不同 Carrier，支持负载均衡

### 🔗 流程间的关联
- **创建 → 调度**: 创建仅分配元数据，真正运行依赖调度入队
- **调度 → 执行**: Carrier 拉取任务执行
- **执行 → 唤醒**: 挂起后等待事件，再次入队恢复
- **整体循环**: 多次挂起/恢复直到 RUNNABLE 结束

### ⚙️ 关键机制说明

#### Carrier Thread（载体线程）详解
**什么是 Carrier？**
- **定义**: Carrier 是**平台线程（Platform Thread）**，即传统的操作系统线程，是虚拟线程的**物理执行载体**。
- **关系映射**: 
  - 多个虚拟线程可以**共享**同一个 Carrier（M:N 映射）
  - 虚拟线程与 Carrier 是**临时绑定**关系，可以动态切换
  - 一个 Carrier 同一时刻只能运行一个虚拟线程
- **作用**: Carrier 提供实际的 CPU 执行能力，虚拟线程通过"借用" Carrier 来执行代码
- **数量**: 默认 Carrier 数量 = CPU 核心数，可通过系统属性 `jdk.virtualThreadScheduler.parallelism` 调整

**虚拟线程与操作系统线程的关系**
- **虚拟线程不是 OS 线程**: 虚拟线程是 JVM 层面的抽象，**不直接对应**操作系统线程
- **间接关系**: 虚拟线程通过 Carrier（平台线程）间接使用 OS 线程
  ```
  虚拟线程 → Carrier（平台线程）→ OS 线程（1:1）
  多个虚拟线程可以共享少量 Carrier
  ```
- **与传统线程的区别**:
  - **传统平台线程**: Java Thread ↔ OS 线程（1:1 映射），线程创建即创建 OS 线程
  - **虚拟线程**: Java Thread ↔ Continuation（可挂起），运行时绑定到 Carrier（OS 线程）
- **优势**: 
  - 可以创建百万级虚拟线程，但只需要少量 Carrier（如 8-16 个）
  - 虚拟线程阻塞时，Carrier 可以立即切换到其他虚拟线程，不浪费 OS 线程资源

#### Continuation/Stack Chunking
- **原理**: 栈帧被拷贝到堆中链表，避免占用 1MB 内核栈。
- **实现**: 当虚拟线程挂起时，JVM 将当前调用栈的栈帧保存为多个 Stack Chunk，存储在堆内存中
- **恢复**: 虚拟线程恢复时，从堆中恢复栈帧，重建调用栈

#### 协作式挂起
- **机制**: 仅在已标记的阻塞点 yield，保证安全点一致性。
- **触发点**: `park()`、`sleep()`、I/O 阻塞等已适配的操作会自动触发挂起
- **安全保证**: 只在 JVM 可控的安全点挂起，避免破坏 JVM 内部状态

#### Pinned 检测
- **机制**: JVM 在持有监视器（synchronized）或 JNI Critical 时标记 pinned，禁止迁移。
- **影响**: Pinned 的虚拟线程无法从 Carrier 上卸载，会一直占用 Carrier 直到 unpinned
- **避免**: 减少 synchronized 使用，改用 `ReentrantLock` 等可中断锁

#### 调度器实现
- **基础**: 基于 `ForkJoinPool` 轻改版，禁用 work-stealing 阻塞限制，支持大量短任务。
- **调度策略**: Carrier 线程从调度队列中拉取虚拟线程执行，采用 FIFO 或 LIFO 策略
- **负载均衡**: 虚拟线程恢复时可以绑定到任意可用的 Carrier，实现负载均衡

### 🎯 流程优化点
- 减少同步块范围，改用细粒度锁或无锁结构。
- 避免长时间 native 阻塞，必要时改为异步接口。

---

## 全流程图解

### 📊 整体流程图
```
┌──────────────┐
│ 创建虚拟线程 │
└──────┬───────┘
       │入队
       ▼
┌──────────────┐
│ 调度到Carrier │
└──────┬───────┘
       │执行
       ▼
┌──────────────┐
│ 阻塞点yield  │
└──────┬───────┘
       │保存栈块
       ▼
┌──────────────┐
│ 等待事件/唤醒 │
└──────┬───────┘
       │事件就绪
       ▼
┌──────────────┐
│ 重新绑定运行 │
└──────┬───────┘
       │重复直至结束
       ▼
┌──────────────┐
│ 终止          │
└──────────────┘
```

### 🔀 状态转换图
```
NEW ──start──> RUNNABLE ──yield/park──> WAITING
  ^             │                        │
  │             └──执行完──> TERMINATED  └──unpark/I/O──> RUNNABLE
```

### 🔄 数据流图
```
任务提交
  │
  ▼
调度器队列 ──> Carrier 执行 ──> 阻塞点保存栈块 ──> 事件驱动唤醒
```

### 🎨 时序图（如果适用）
```
虚拟线程      Carrier线程      I/O事件循环
    | start         |               |
    |────────run────>               |
    |----阻塞yield-->               |
    |                |--就绪事件--> |
    |<---重新调度----|               |
    |------run------>|               |
```

### 📐 层次结构图（如果适用）
```
┌────────────────────────┐
│   Java Thread API      │
└──────────┬─────────────┘
           │
   ┌───────▼────────┐
   │ Virtual Thread  │
   └───────┬────────┘
           │ uses
   ┌───────▼────────┐
   │ Continuation   │
   └───────┬────────┘
           │ runs on
   ┌───────▼────────┐
   │ Carrier Thread │
   └────────────────┘
```

### 🔍 关键节点详解
- **阻塞点 yield**: 将当前帧复制到堆，Carrier 立即可执行其他任务。
- **Pinned 检测**: JVM 检查监视器/本地段，必要时保持绑定防止栈损坏。
- **恢复**: 读取 stack chunk 链表，重建帧并跳回指令指针。

### 💡 流程图解读要点
1. **起点和终点**: 从虚拟线程创建到终止。
2. **关键路径**: 创建→调度→执行→挂起→唤醒→继续。
3. **分支条件**: 是否遇到挂起点，是否被 pinned。
4. **异常处理**: 异常同样在虚拟线程内抛出，可被调用者捕获。

---

## 核心要点

### 🔑 核心思想
> 用 continuation 将「阻塞」转化为「可挂起」，让线程模型保持简单而资源开销接近事件驱动。

### 🎯 关键技巧
1. **用虚拟线程执行器**: 避免混用老的 `newCachedThreadPool`。
2. **减少 pinned**: 用锁替代或缩小 `synchronized` 范围。
3. **监控指标**: 关注 `jdk.virtualThreadPinned` 事件（JFR）。

### ⚠️ 易错点
| 易错点 | 错误示例 | 正确做法 | 原因 |
|--------|----------|----------|------|
| 在虚拟线程中长时间 synchronized | 大范围同步块 | 使用可重入锁或缩小锁粒度 | pinned 导致失去伸缩性 |
| 调用长时间阻塞的 JNI | native 阻塞几秒 | 改异步或放平台线程池 | 无法挂起，耗尽 Carrier |
| 仍用旧线程池 | `newFixedThreadPool` | `newVirtualThreadPerTaskExecutor` | 否则仍是平台线程 |

---

## 常见错误

### ❌ 错误1: 虚拟线程里持锁等待 I/O
**错误表现**: 性能退化，线程数上不去  
**错误原因**: pinned 阻止挂起  
**正确做法**: 释放锁后再做 I/O，或改无锁/细粒度锁  
**示例**:
```java
// ❌
public void read() {
    synchronized (this) {
        socket.read(buf); // pinned
    }
}

// ✅
public void read() throws IOException {
    lock.lock();
    try {
        // 只保护必要区域
    } finally {
        lock.unlock();
    }
    socket.read(buf); // 可挂起
}
```

### ❌ 错误2: 用旧线程池包装虚拟线程任务
**错误表现**: 线程数受限，内存占用高  
**错误原因**: 仍在平台线程池执行  
**正确做法**: 使用虚拟线程执行器或直接 `Thread.startVirtualThread`  

---

## 记忆技巧

### 🧠 记忆口诀
> 「虚拟载体，阻塞可卸；分块存栈，事件再接。」

### 📝 思维导图/流程图
```
创建 -> 调度 -> 执行 -> 阻塞yield -> 保存栈块 -> 事件唤醒 -> 继续
```

### 🔗 类比理解
像地铁（Carrier）和乘客（虚拟线程）：乘客在站台等待（挂起）不占车厢，车厢周转载更多乘客。

---

## 相关知识点

### 🔗 前置知识
- Java 线程模型: 理解 Thread 与 OS 线程映射。
- NIO/异步 I/O: 虚拟线程将阻塞封装在协作挂起之上。

### 🔗 后续知识
- 结构化并发（Structured Concurrency）: 虚拟线程是基础。
- JFR 监控: 观察 pinned 事件、调度延迟。

### 🔗 相似知识点对比
| 知识点 | 相同点 | 不同点 | 使用场景 |
|--------|--------|--------|----------|
| Kotlin Coroutine | 协作挂起 | 语言层库实现 | Kotlin 项目 |
| Go goroutine | 轻量线程 | 自带调度、抢占 | Go 服务端 |
| 虚拟线程 | 协作挂起 | JVM 原生、Thread 语义 | Java/JDK21+ |

---

## 实战案例

### 📚 案例1: 将同步 Web 服务迁移到虚拟线程
**问题描述**: 传统 servlet + 阻塞 JDBC 导致线程池耗尽。  
**解决思路**: 使用虚拟线程执行器承载请求处理。  
**代码实现**:
```java
var server = HttpServer.create(new InetSocketAddress(8080), 0);
server.createContext("/users", exchange -> {
    try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
        executor.submit(() -> {
            var body = userRepo.findById(1); // 阻塞 JDBC
            exchange.sendResponseHeaders(200, body.length());
            exchange.getResponseBody().write(body.getBytes());
        });
    }
});
server.start();
```
**关键点**: 线程数不再受限于平台线程池，JDBC 阻塞转为可挂起。

---

## 总结

### ✨ 一句话总结
> 虚拟线程用 continuation 挂起阻塞、堆上栈分块与轻量调度，让「每请求一线程」在 JDK21 成为可扩展方案。

### 📌 核心记忆点
1. JVM 原生 Thread 语义，协作式挂起
2. stack chunking 释放内核栈，支持百万级并发
3. 避免 pinned：缩锁、少 JNI 阻塞，监控 JFR

### 🎓 掌握标准
- [x] 能够清晰解释 What（是什么）
- [x] 能够深入理解 Why（为什么）
- [x] 能够准确判断 When（什么时候用）
- [x] 能够熟练实现 How（如何使用）
- [x] 能够识别常见错误并避免
- [ ] 能够在实际项目中应用

---

## 参考资料
- [OpenJDK Loom JEP 444](https://openjdk.org/jeps/444)
- [Inside Java: Virtual Threads](https://inside.java)
- [Java Virtual Threads Pinning](https://openjdk.org/jeps/425)

---

## 更新日志
- 2025-12-08: 初始版本

