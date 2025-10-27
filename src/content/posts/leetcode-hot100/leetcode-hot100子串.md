---
title: Leetcode-hot100子串
published: 2025-10-14
updated: 2025-10-14
description: ""
image: ""
tags:
  - hot100
  - 子串
  - 滑动窗口
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


# leetcode 76

## 🧠 核心思路

这题的关键在于维护一个**动态窗口 [l, r]**，使得：

* 窗口中的字符能**覆盖 t 的所有字符**；
* 并且在满足条件的情况下**尽量缩小窗口**，从而找到最短结果。

---

## 🚀 解题步骤

### 1️⃣ 准备工作

我们需要统计 `t` 中每个字符的出现次数：

```java
Map<Character, Integer> need = new HashMap<>();
for (char c : t.toCharArray()) {
    need.put(c, need.getOrDefault(c, 0) + 1);
}
```

`need` 表示“还需要多少个该字符”。

---

### 2️⃣ 移动右指针扩张窗口

右指针 `r` 从左到右遍历 `s`：

* 把当前字符加入窗口计数；
* 如果该字符是需要的字符，并且窗口中此字符数量刚好满足需求，则说明有一个字符被“匹配上”。

---

### 3️⃣ 当窗口满足条件后，移动左指针收缩窗口

当当前窗口中已经包含了 `t` 的所有字符时（可以用一个 `valid` 计数器判断）：

* 不断移动左指针 `l`，尝试缩小窗口；
* 只要还满足条件，就更新最小子串结果；
* 一旦不满足条件，停止收缩，继续右移 `r` 扩张。

---

### 4️⃣ 判断窗口是否满足条件

可以用一个计数变量 `valid` 来记录当前窗口中**满足条件的字符种类数**：

* 当窗口中一个字符的数量等于 `t` 中的数量时，`valid++`
* 当数量减少后不再匹配时，`valid--`
* 当 `valid == need.size()` 时，说明窗口已覆盖全部字符。

---

## java解法

```java
class Solution {
    public String minWindow(String s, String t) {
        Map<Character, Integer> map = new HashMap<>();
        for (Character c : t.toCharArray()) {
            map.put(c, map.getOrDefault(c, 0) + 1);
        }
        Map<Character, Integer> windows = new HashMap<>();
        int l = 0, r = 0;
        int v = 0;
        int len = Integer.MAX_VALUE;
        int start = 0;
        while (r < s.length()) {
            char c = s.charAt(r);
            r++;
            if (map.containsKey(c)) {
                windows.put(c, windows.getOrDefault(c, 0) + 1);
                if (map.get(c).equals(windows.get(c))) {
                    v++;
                }
            }
            while (v == map.size()) {
                if (r - l < len) {
                    start = l;
                    len = r - l;
                }
                char temp = s.charAt(l);
                l++;
                if (map.containsKey(temp)) {
                    if (map.get(temp).equals(windows.get(temp))) {
                        v--;
                    }
                    windows.put(temp, windows.getOrDefault(temp, 0) - 1);
                }
            }
        }
        return len == Integer.MAX_VALUE ? "" : s.substring(start, start + len);
    }
}
```



# 滑动窗口解题模板套路汇总

---

## 🧭 三、常见问题类型与模板扩展方式

| 类型              | 判断逻辑位置                      | 示例              |
| --------------- | --------------------------- | --------------- |
| ✅ **固定窗口长度**    | 当 `right - left == k` 时处理窗口 | 子数组平均值问题        |
| ✅ **窗口内元素唯一**   | 当 `window.get(c) > 1` 时缩小窗口 | Leetcode 3      |
| ✅ **窗口内满足约束**   | 当 `sum > target` 时缩小        | 连续子数组和问题        |
| ✅ **窗口内出现次数匹配** | 当 `window` 与 `need` 一致时更新   | Leetcode 438、76 |
| ✅ **最多K种字符**    | 当 `window.size() > K` 时缩小   | Leetcode 340    |

---

## 💻 四、五种典型模式的通用模板化写法

### ① 固定窗口大小（长度为 k）

```java
int left = 0, right = 0;
while (right < s.length()) {
    // 加入右边元素
    char c = s.charAt(right);
    right++;

    // 保持窗口大小为 k
    if (right - left > k) {
        char d = s.charAt(left);
        left++;
    }

    // 窗口大小刚好为 k 时进行逻辑处理
    if (right - left == k) {
        // process(window)
    }
}
```

---

### ② 无重复字符的最长子串

```java
Map<Character, Integer> window = new HashMap<>();
int left = 0, right = 0, maxLen = 0;

while (right < s.length()) {
    char c = s.charAt(right++);
    window.put(c, window.getOrDefault(c, 0) + 1);

    while (window.get(c) > 1) { // 出现重复
        char d = s.charAt(left++);
        window.put(d, window.get(d) - 1);
    }
    maxLen = Math.max(maxLen, right - left);
}
```

---

### ③ 最多 K 种不同字符的最长子串

```java
Map<Character, Integer> window = new HashMap<>();
int left = 0, right = 0, maxLen = 0;

while (right < s.length()) {
    char c = s.charAt(right++);
    window.put(c, window.getOrDefault(c, 0) + 1);

    while (window.size() > K) { // 种类超出
        char d = s.charAt(left++);
        window.put(d, window.get(d) - 1);
        if (window.get(d) == 0) window.remove(d);
    }
    maxLen = Math.max(maxLen, right - left);
}
```

---

### ④ 统计固定模式出现次数（如异位词匹配）

```java
Map<Character, Integer> need = new HashMap<>();
Map<Character, Integer> window = new HashMap<>();
for (char c : t.toCharArray()) {
    need.put(c, need.getOrDefault(c, 0) + 1);
}
int left = 0, right = 0, valid = 0;
List<Integer> res = new ArrayList<>();

while (right < s.length()) {
    char c = s.charAt(right++);
    if (need.containsKey(c)) {
        window.put(c, window.getOrDefault(c, 0) + 1);
        if (window.get(c).equals(need.get(c))) valid++;
    }

    while (right - left >= t.length()) {
        if (valid == need.size()) res.add(left);
        char d = s.charAt(left++);
        if (need.containsKey(d)) {
            if (window.get(d).equals(need.get(d))) valid--;
            window.put(d, window.get(d) - 1);
        }
    }
}
```

---

### ⑤ 数组滑动窗口（非字符串）

```java
int left = 0, right = 0;
int windowSum = 0, maxSum = 0;
while (right < nums.length) {
    windowSum += nums[right++]; // 加入右边元素

    while (right - left > k) { // 保持窗口大小
        windowSum -= nums[left++];
    }

    if (right - left == k) {
        maxSum = Math.max(maxSum, windowSum);
    }
}
```

---

💡**一句话模板总结：**

```java
while (right < n) {
    加入右边元素;
    while (窗口不合法) {
        移出左边元素;
    }
    更新结果;
}
```

---
