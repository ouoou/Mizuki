---
title: Leetcode-前缀和类题型
published: 2025-09-02
updated: 2025-09-02
description: ""
image: ""
tags:
  - Leetcode
  - 前缀和
category: Leetcode
draft: false
---
# Leetcode 525
## 题目回顾
给定一个二进制数组 nums , 找到含有相同数量的 0 和 1 的最长连续子数组，并返回该子数组的长度。
## 题意理解

给定一个二进制数组（只包含 0 和 1）。

需要找出一个最长的连续子数组，其中 0 和 1 的数量相等。

返回这个子数组的长度

---
## 转化方法

把数组中的 0 替换为 -1，保留 1 为 1。

这样，0 和 1 的数量相等 ⇔ 子数组的元素和为 0。

例如：
nums = [0,1,0]
转换后：[-1,1,-1]
其中子数组 [1,-1] 和为 0，说明 0 和 1 个数相等。

求前缀和：

如果两个前缀和相同，说明这两点之间的子数组和为 0。
所以我们只需要找到 相同前缀和之间的最大距离。

---

## 公式推导
如果有两个位置 i 和 j (i < j)，且 `sum[i] == sum[j]`，说明：
```bash
nums[i+1] + nums[i+2] + ... + nums[j] = sum[j] - sum[i] = 0
```
换句话说，这中间的**子数组和为 0。**



### 例子

```
nums = [0,1,1,1,1,1,0,0,0]
```

先做转化（0 → -1，1 → +1）：

```
[-1, +1, +1, +1, +1, +1, -1, -1, -1]
```

---

#### 1. 计算前缀和

从索引 `-1` 开始（初始 sum=0）：

| i  | nums\[i] | 转换值 | 前缀和 sum |
| -- | -------- | --- | ------- |
| -1 | -        | -   | 0       |
| 0  | 0        | -1  | -1      |
| 1  | 1        | +1  | 0       |
| 2  | 1        | +1  | 1       |
| 3  | 1        | +1  | 2       |
| 4  | 1        | +1  | 3       |
| 5  | 1        | +1  | 4       |
| 6  | 0        | -1  | 3       |
| 7  | 0        | -1  | 2       |
| 8  | 0        | -1  | 1       |

---

#### 2. 用数轴直观表示（sum 曲线）

画成高度变化（sum 是纵轴，i 是横轴）：

```
i:   -1   0   1   2   3   4   5   6   7   8
sum:  0  -1   0   1   2   3   4   3   2   1
```

---

## 3. 为什么相同 sum 代表和为 0 的子数组？

比如：

* sum 在 i=2 时为 1
* sum 在 i=8 时也为 1

👉 说明区间 `(2,8]` 的和为 0，也就是子数组 **\[1,1,1,0,0,0]**。

再看：

* sum 在 i=3 时为 2
* sum 在 i=7 时也为 2

👉 区间 `(3,7]` 和为 0，也就是子数组 **\[1,1,0,0]**。

再看：

* sum 在 i=-1 时为 0
* sum 在 i=1 时为 0

👉 区间 `( -1,1 ]` 和为 0，也就是子数组 **\[0,1]**。

---

## 4. 找到最长子数组

在这个例子里，最长的是：

* sum=1 在 i=2 和 i=8 两次出现
* 区间长度 = 8 - 2 = 6
* 子数组是 **\[1,1,1,0,0,0]**

---

✅ 直观解释就是：
在前缀和曲线上，**“相同高度的两个点之间”** 的区间，表示这段子数组的和为 0 ⇒ 0 和 1 个数相等。

---
![img.png](guide/leetcode525.png)

## java解法
```java
class Solution {
    public int findMaxLength(int[] nums) {
        //  [0,1,0]
        // 0 -1 0 -1
        Map<Integer, Integer> map = new HashMap<>();
        map.put(0, -1);
        int max = 0;
        int sum = 0;
        for (int i = 0; i < nums.length; i++) {
            sum += nums[i] == 1 ? 1 : -1;
            if (map.containsKey(sum)) {
                max = Math.max(max, i - map.get(sum));
            } else {
                map.put(sum, i);
            }
        }
        return max;
    }
}
```

# Leetcode 523


---

## 题目回顾

给你一个整数数组 `nums` 和一个整数 `k`。
请判断是否存在一个 **长度至少为 2** 的连续子数组，使得该子数组的和是 `k` 的倍数。

也就是说：
找到 `sum(nums[i..j]) % k == 0`，并且 `j - i >= 1`。

---

## 思路解析

### **前缀和 + 取模优化**

设前缀和为：

```
prefix[i] = nums[0] + nums[1] + ... + nums[i]
```

如果存在两个下标 `i < j`，满足：

```
(prefix[j] - prefix[i]) % k == 0
```

等价于：

```
prefix[j] % k == prefix[i] % k
```

**关键 insight：**

* 如果两个前缀和除以 `k` 的余数相同，则它们之间的子数组和就是 `k` 的倍数。

---

## 公式推导

如果有两个前缀和：

```
prefix[j] 和 prefix[i]   (i < j)
```

并且满足：

```
prefix[j] % k == prefix[i] % k
```

那么一定有：

```
(prefix[j] - prefix[i]) % k == 0
```

也就是 `nums[i+1..j]` 的和是 `k` 的倍数。

---

### 举个例子

假设数组：

```
nums = [23, 2, 4, 6, 7], k = 6
```

#### 步骤 1：计算前缀和

```
prefix[0] = 23
prefix[1] = 23 + 2 = 25
prefix[2] = 25 + 4 = 29
prefix[3] = 29 + 6 = 35
prefix[4] = 35 + 7 = 42
```

#### 步骤 2：取模

```
prefix[0] % 6 = 23 % 6 = 5
prefix[1] % 6 = 25 % 6 = 1
prefix[2] % 6 = 29 % 6 = 5
prefix[3] % 6 = 35 % 6 = 5
prefix[4] % 6 = 42 % 6 = 0
```

#### 步骤 3：找相同余数

* `prefix[0] % 6 = 5`
* `prefix[2] % 6 = 5`

说明 `prefix[2] - prefix[0]` 是 6 的倍数：

```
29 - 23 = 6
```

而这正好对应子数组 `[2, 4]`，它的和是 6，确实是 6 的倍数。

再看：

* `prefix[3] % 6 = 5`
* `prefix[0] % 6 = 5`

```
35 - 23 = 12
```

对应子数组 `[2, 4, 6]`，和为 12，也是 6 的倍数。

---

### 为什么成立（数学解释）

1. 假设

   ```
   prefix[j] % k = r
   prefix[i] % k = r
   ```

   （它们余数相同，都是 `r`）

2. 根据模的定义

   ```
   prefix[j] = a * k + r
   prefix[i] = b * k + r
   ```

   （a、b 是整数）

3. 两者相减：

   ```
   prefix[j] - prefix[i] = (a - b) * k
   ```

   一定是 k 的倍数 ✅

---

## java解法

```java
class Solution {
    public boolean checkSubarraySum(int[] nums, int k) {
        Map<Integer, Integer> map = new HashMap<>();
        map.put(0,-1);

        int prefix = 0;
        for (int i = 0; i < nums.length; i++) {
            prefix += nums[i];
            int mod = prefix % k;
            if (map.containsKey(mod)) {
                if (i - map.get(mod) >= 2) {
                    return true;
                }
            } else {
                map.put(mod, i);
            }
        }
        return false;
    }
}
```

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