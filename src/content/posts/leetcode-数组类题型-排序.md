---
title: Leetcode-数组类题型-排序
published: 2025-09-02
updated: 2025-09-02
description: ""
image: ""
tags:
  - Leetcode
  - 数组
  - 排序
category: Leetcode
draft: false
---
# LeetCode 2785

## 题意回顾

给你一个下标从 0 开始的字符串 s ，将 s 中的元素重新 排列 得到新的字符串 t ，它满足：

所有辅音字母都在原来的位置上。更正式的，如果满足 0 <= i < s.length 的下标 i 处的 s[i] 是个辅音字母，那么 t[i] = s[i] 。
元音字母都必须以他们的 ASCII 值按 非递减 顺序排列。更正式的，对于满足 0 <= i < j < s.length 的下标 i 和 j ，如果 s[i] 和 s[j] 都是元音字母，那么 t[i] 的 ASCII 值不能大于 t[j] 的 ASCII 值。
请你返回结果字母串。

元音字母为 'a' ，'e' ，'i' ，'o' 和 'u' ，它们可能是小写字母也可能是大写字母，辅音字母是除了这 5 个字母以外的所有字母。

示例 1：

输入：s = "lEetcOde"
输出："lEOtcede"
解释：'E' ，'O' 和 'e' 是 s 中的元音字母，'l' ，'t' ，'c' 和 'd' 是所有的辅音。将元音字母按照 ASCII 值排序，辅音字母留在原地。
示例 2：

输入：s = "lYmpH"
输出："lYmpH"
解释：s 中没有元音字母（s 中都为辅音字母），所以我们返回 "lYmpH" 。

## java暴力-排序O(nlogn)

```java
class Solution {
    public String sortVowels(String s) {
        List<Character> list = new ArrayList<>();
        char[] charArr = s.toCharArray();
        for (char c : charArr) {
            if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u' || c == 'A' || c == 'E' || c == 'I' || c == 'O' || c == 'U') {
                list.add(c);
            }
        }
        if (list.size() == 0) return s;
        List<Character> collect = list.stream().sorted().collect(Collectors.toList());
        Deque<Character> deque = new ArrayDeque<>(collect);
        for (int i = 0; i < charArr.length; i++) {
            char c = charArr[i];
            if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u' || c == 'A' || c == 'E' || c == 'I' || c == 'O' || c == 'U') {
                charArr[i] = deque.pop();
            }
        }
        return new String(charArr);
    }
}
```

## hash解法 O(n)
统计元音出现次数（频率数组大小 = 128 或 256，直接用 ASCII 索引）。

再次遍历字符串，遇到元音时，就按字典序依次填充。

先从小写/大写 ASCII 范围中取出下一个有计数的元音，放回字符串。

这样避免了 List、stream().sorted()、Deque 的额外开销。
```java
class Solution {
    public String sortVowels(String s) {
        String str = "AEIOUaeiou";
        int [] hash = new int[128];
        char[] chars = s.toCharArray();
        for (char c : chars) {
            if (str.indexOf(c) >= 0) {
                hash[c]++;
            }
        }

        for (int i = 0; i < chars.length; i++) {
            if (str.indexOf(chars[i]) >= 0) {
                chars[i] = next(hash);
            }
        }
        return new String(chars);
    }
    public char next(int [] hash) {
        for (int j = 0; j < 128; j++) {
            if (hash[j] > 0) {
                hash[j]--;
                return (char) j;
            }
        }
        return ' ';
    }
}
```