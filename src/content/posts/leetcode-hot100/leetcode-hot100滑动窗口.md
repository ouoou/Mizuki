---
title: Leetcode-hot100滑动窗口
published: 2025-10-14
updated: 2025-10-14
description: ""
image: ""
tags:
  - hot100
  - 滑动窗口
category: Leetcode
draft: false
---

# leetcode 3

## 思路

### 💡 核心思路：滑动窗口（Sliding Window）

> 用两个指针维护一个**不重复的窗口区间**，动态调整窗口大小。

---

### 🧠 思考过程一步步：

1. **定义左右指针**

    * `left` 表示窗口的左边界；
    * `right` 表示右边界；
    * 窗口表示当前不含重复字符的子串。

2. **使用哈希集合（或Map）记录字符是否出现**

    * 当 `right` 所指字符**不在集合中**：说明还没重复，可以扩展窗口，右指针右移；
    * 当 `right` 所指字符**已存在于集合中**：说明发生了重复，要从左边开始收缩窗口（移动 `left`），直到重复字符被移除。

3. **在移动过程中记录最大长度**

---

### 📜 模拟示例

`s = "abcabcbb"`

| 步骤 | left | right | 当前窗口   | 说明                | maxLen |
| -- | ---- | ----- | ------ | ----------------- | ------ |
| 1  | 0    | 0     | "a"    | 新增 a              | 1      |
| 2  | 0    | 1     | "ab"   | 新增 b              | 2      |
| 3  | 0    | 2     | "abc"  | 新增 c              | 3      |
| 4  | 0    | 3     | "abca" | a 重复 → left 移动到 1 | 3      |
| 5  | 1    | 3     | "bca"  | 无重复               | 3      |
| 6  | 1    | 4     | "bcab" | b 重复 → left 移动到 2 | 3      |
| 7  | 2    | 4     | "cab"  | 无重复               | 3      |

最终答案：`maxLen = 3`

---


## java解法

```java
class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> map = new HashMap<>();
        int res = 0;
        int l = 0;
        for (int r = 0; r < s.length(); r++) {
            char c = s.charAt(r);
            if (map.containsKey(c) && map.get(c) >= l) {
                l = map.get(c) + 1;
            }
            map.put(c, r);
            res = Math.max(res, r - l + 1);
        }
        return res;
    }
}
```

# leetcode 438


## 💡 核心思路：滑动窗口 + 频次统计

> 用一个长度固定为 `p.length()` 的滑动窗口，在 `s` 中移动，判断窗口内的字符是否是 `p` 的异位词。

---

### 🧠 一步步分析：

#### 1️⃣ 异位词定义

两个字符串是异位词 ⇒ 每个字母出现的次数相同。
例如：

* `"abc"` 和 `"cab"` ✅
* `"abc"` 和 `"abd"` ❌

所以我们可以用一个 **字符频次数组** 来判断。

---

#### 2️⃣ 思路框架

1. 统计字符串 `p` 中每个字符的出现次数。
2. 使用一个固定长度为 `p.length()` 的滑动窗口遍历字符串 `s`：

    * 每当右指针 `right` 向右滑动，窗口加入一个字符；
    * 当窗口大小超过 `p.length()` 时，左指针 `left` 向右滑动，移除一个字符；
    * 每次都比较窗口与 `p` 的字符频率是否一致；
    * 若一致，记录当前 `left` 为一个有效起点。

---

#### 3️⃣ 如何高效比较两个频次数组？

如果每次都完全比较 26 个字符的数组，时间会太慢。
优化方式：

* 维护一个 `match` 计数器，记录当前有多少个字符频率匹配。
* 当 `match == 26` 时，说明窗口与 `p` 的频率完全相同。

不过在这题中，因为字母集仅 26 个（小写字母），
即使每次比较整个数组，性能也能过（`O(26 * n)` ≈ `O(n)`）。

---

## java解法
```java
class Solution {
    public List<Integer> findAnagrams(String s, String p) {
        List<Integer> list = new ArrayList<>();
        int [] windows = new int[26];
        int [] count = new int[26];
        
        for (int i = 0; i < p.length(); i++) {
            count[p.charAt(i) - 'a'] ++;
        }

        int l = 0;
        int r = 0;
        while (r < s.length()) {
            char c = s.charAt(r);
            windows[c - 'a']++;
            r++;
            if (r - l > p.length()) {
                windows[s.charAt(l) - 'a']--;
                l++;
            }
            if (Arrays.equals(windows, count)) {
                list.add(l);
            }
        }
        return list;
    }
}
```