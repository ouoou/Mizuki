---
title: Leetcode-数学类题型
published: 2025-09-05
updated: 2025-09-05
description: ""
image: ""
tags:
  - Leetcode
  - 数学
category: Leetcode
draft: false
---

# Leetcode 1304

## 题目回顾
给你一个整数 n，请你返回 任意 一个由 n 个 各不相同 的整数组成的数组，并且这 n 个数相加和为 0 。

## java解法

```java
class Solution {
    public int[] sumZero(int n) {
        int [] res = new int[n];
        int idx = 0;
        for (int i = 1; i <= n / 2; i++) {
            res[idx++] = i;
            res[idx++] = -i;
        }
        if (n % 2 == 1) {
            res[idx] = 0;
        }
        return res;
    }
}
```

# Leetcode 2749

## 题意回顾
给你两个整数：num1 和 num2 。

在一步操作中，你需要从范围 [0, 60] 中选出一个整数 i ，并从 num1 减去 2i + num2 。

请你计算，要想使 num1 等于 0 需要执行的最少操作数，并以整数形式返回。

如果无法使 num1 等于 0 ，返回 -1 。

## 公式推导

要使：num1 - (2^i + num2) = 0
```shell
num1 = (2^i + num2) + (2^i2 + num2) + ... + (2^ik + num2)

num1 = (2^i + 2^i2 + ... + 2^ik) + k * num2

num1 - (k * num2) = 2^i + 2^i2 + ... + 2^ik

```

设m = num1 - (k * num2)
**必要条件**：
1. M>0
m 是 k个2的幂次之和
所以m肯定>0
2. k<=m
2的幂次的最小值是1（即2^0 = 1）
所以k个2的幂次之和至少为k（当所有幂次都是2^0时）
因此，m = 2^i1 + 2^i2 + ... + 2^ik ≥ k
k ≤ m
3. 二进制中1的个数 ≤ k
任何正整数m都可以表示为若干个2的幂次之和，这正是m的二进制表示
m的二进制表示中1的个数，就是表示m所需的最少2的幂次个数
例如：
m = 5 = 101(二进制)，需要2个2的幂次：2^2 + 2^0
m = 7 = 111(二进制)，需要3个2的幂次：2^2 + 2^1 + 2^0

## java解法

```java
class Solution {
    public int makeTheIntegerZero(long num1, long num2) {
        for (int k = 1; ; k++) {
            long m = num1 - k * num2;
            if (m < k) {
                return -1;
            }
            int count = 0;
            long temp = m;
            while (temp > 0) {
                count += temp & 1;
                temp >>= 1;
            }
            if (count <= k) {
                return k;
            }
        }
    }
}
```






