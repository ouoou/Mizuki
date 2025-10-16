---
title: Leetcode-hot100哈希
published: 2025-10-14
updated: 2025-10-14
description: ""
image: ""
tags:
  - hot100
  - 哈希
category: Leetcode
draft: false
---

# Leetcode 49

## hash枚举解法

```java
class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> map = new HashMap<>();
        for (String str : strs) {
            int[] hash = new int[26];
            for (char c : str.toCharArray()) {
                hash[c - 'a'] ++;
            }

            StringBuilder sb = new StringBuilder();
            for (int count : hash) {
                sb.append(count).append('#');
            }
            String key = sb.toString();
            if (map.containsKey(key)) {
                List<String> list = map.get(key);
                list.add(str);
            } else {
                List<String> list = new ArrayList<>();
                list.add(str);
                map.put(key,list);
            }
        }
        return new ArrayList(map.values());
    }
}
```

# leetcode 128

## 暴力解法

```java
class Solution {
    public int longestConsecutive(int[] nums) {
        HashSet<Integer> hash = new HashSet<>();
        for (int num : nums) {
            hash.add(num);
        }
        int res = 0;
        for (int num : nums) {
            int t = num;
            int n = 0;
            while (hash.contains(t++)) {
                n++;
            }
            res = Math.max(res, n);
        }
        return res;
    }
}
```

---


## ❌ 问题分析：

while (hash.contains(t++)) {
    n++;
}

这个 `while` 会对每个 `num` 从自身开始一直往上找连续数字。
如果数组是 `[1, 2, 3, 4, 5]`，每个元素都会重复扫描后续数字，导致：

```
num = 1 → 检查 1,2,3,4,5
num = 2 → 检查 2,3,4,5
num = 3 → 检查 3,4,5
...
```

时间复杂度约为 `O(n²)`。

---

## ✅ 优化目标：让每个元素最多被访问一次（O(n)）

关键思想：

> 只有当一个数字是“连续序列的起点”时，我们才从它开始向后扩展。

判断“起点”的条件：

> 当前数 `num` 没有前驱元素 `num - 1`。

这样，每个数字只会被访问一次，复杂度变成 O(n)。

---


## O(n)优化

```java
class Solution {
    public int longestConsecutive(int[] nums) {
        HashSet<Integer> hash = new HashSet<>();
        for (int num : nums) {
            hash.add(num);
        }
        int res = 0;
        for (int num : hash) {
            if (!hash.contains(num - 1)) {
                int t = num;
                int n = 0;
                while (hash.contains(t++)) {
                    n++;
                }
                res = Math.max(res, n);
            }
        }
        return res;
    }
}
```


