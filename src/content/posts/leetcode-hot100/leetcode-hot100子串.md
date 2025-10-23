---
title: Leetcode-hot100子串
published: 2025-10-14
updated: 2025-10-14
description: ""
image: ""
tags:
  - hot100
  - 子串
category: Leetcode
draft: false
---
# Leetcode 560

## 题目简述

给定一个整数数组 `nums` 和一个整数 `k`，要求计算：**连续子数组的和等于 `k` 的个数**。

---

## 思路分析

### 前缀和 + 哈希表（O(n)）

核心思想：

* 定义 `prefixSum[i]` 表示数组前 `i` 个元素的和。
* 任意子数组和 `nums[i..j] = prefixSum[j] - prefixSum[i-1]`。
* 如果某一段前缀和为 `prefixSum[j]`，我们想要找一段和为 `k` 的子数组，那么需要：

  ```
  prefixSum[j] - prefixSum[i-1] = k
  → prefixSum[i-1] = prefixSum[j] - k
  ```
* 也就是说，只要之前出现过 `prefixSum[j] - k`，那么就存在一个子数组的和为 `k`。


## 例子解析
用一个具体例子 `[1, 2, 3]`，`k = 3`，画一张 **前缀和 + 哈希表变化表** 来直观展示整个过程。

| i (索引) | num\[i] | 当前前缀和 sum | sum - k | map 状态 (前缀和 -> 次数)   | count |
| ------ | ------- | --------- | ------- | -------------------- | ----- |
| -      | -       | 0         | -       | {0:1}                | 0     |
| 0      | 1       | 1         | -2      | {0:1, 1:1}           | 0     |
| 1      | 2       | 3         | 0       | {0:1, 1:1, 3:1}      | 1     |
| 2      | 3       | 6         | 3       | {0:1, 1:1, 3:1, 6:1} | 2     |

**解释：**

1. 初始时，map里有 `{0:1}` 表示前缀和为0出现过一次（保证从数组开头就能形成子数组）。
2. 遍历到 `i=0`，sum=1，map里没有 `1-3=-2`，所以 count 不变，更新 map 为 `{0:1, 1:1}`。
3. 遍历到 `i=1`，sum=3，map里有 `3-3=0`，说明有一个子数组 `[1,2]` 的和为3，count+=1，更新 map 为 `{0:1,1:1,3:1}`。
4. 遍历到 `i=2`，sum=6，map里有 `6-3=3`，说明有一个子数组 `[3]` 的和为3，count+=1，更新 map 为 `{0:1,1:1,3:1,6:1}`。

最终结果 `count=2`，与前面分析一致。

---


## 公式推导

前缀和 + 哈希表的核心公式是：

$$
prefix[j] - prefix[i] = k \implies prefix[i] = prefix[j] - k
$$

也就是说：

```java
int target = prefix - k;
```

然后检查 `map.containsKey(target)`，如果存在，说明有子数组和为 k。

更新 map 时 **不应该放在 else**，每次都要更新当前前缀和的次数。

---

## java解法

```java
class Solution {
    public int subarraySum(int[] nums, int k) {
        // prefix[j] - prefix[i] = k
        // prefix[i] = prefix[j] - k
        Map<Integer, Integer> map = new HashMap<>();
        map.put(0, 1);
        int prefix = 0;
        int res = 0;
        for (int i = 0; i < nums.length; i++) {
            prefix += nums[i];
            int target = prefix - k;
            if (map.containsKey(target)) {
                res += map.get(target);
            }
            map.put(prefix, map.getOrDefault(prefix, 0) + 1);
        }
        return res;
    }
}

```


# leetcode 239

## 思路

核心思想：
**维护一个单调递减队列**（队头最大，队尾最小）。
队列中保存的是元素的下标。

---

### 🧠 核心逻辑

滑动窗口右移时有两件事要处理：

#### 1️⃣ 保持队列单调递减

当新元素 `nums[i]` 进来时：

* 如果队尾元素比 `nums[i]` 小，就把它移出队尾；
* 因为它不可能再成为未来窗口的最大值（被更大的挡住了）。

#### 2️⃣ 移除窗口外的元素

* 如果队头元素的下标已经滑出窗口（即 `i - k`），就把它弹出。

#### 3️⃣ 当前窗口最大值

* 当 `i >= k - 1` 时，窗口形成，队头的元素就是窗口最大值。

---


## java解法

```java
class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        Deque<Integer> deque = new ArrayDeque<>();
        int n = nums.length;
        int [] res = new int[n - k + 1];
        int idx = 0;
        for (int i = 0; i < nums.length; i++) {
            while (!deque.isEmpty() && deque.peekFirst() <= i - k) {
                deque.pollFirst();
            }
            while (!deque.isEmpty() && nums[i] > nums[deque.peekLast()]) {
                deque.pollLast();
            }
            deque.offerLast(i);
            if (i >= k - 1) {
                res[idx++] = nums[deque.peekFirst()];
            }
        }
        return res;
    }
}
```