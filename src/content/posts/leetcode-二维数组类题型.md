---
title: Leetcode-二维数组类题型
published: 2025-09-02
updated: 2025-09-02
description: ""
image: ""
tags:
  - Leetcode
  - 二维数组
category: Leetcode
draft: false
---
# LeetCode 3025

## 题意回顾

- 给定若干二维点 `(x, y)`。
    
- 我们要数出所有合法的点对 `(A, B)` 数量，要求：
    
    1. `x_A <= x_B` 且 `y_A ≥ y_B`（A 在 B 的左上方或正上方）。
        
    2. 在以 `A` 为左上角、`B` 为右下角的矩形区域中，不能有第三个点存在。

## 暴力思路

- 枚举所有点对 `(A, B)`，检查是否满足条件。
    
- 对每一对 `(A, B)`，再遍历所有点 `C` 看是否落在矩形区域中。
    
- 时间复杂度：**O(n³)**，n ≤ 50，可以过，但比较慢。

## java解法

```java
public int numberOfPairs(int[][] points) {  
    int ans = 0;  
    for (int i = 0; i < points.length; i++) {  
        int[] a = points[i];  
        for (int j = 0; j < points.length; j++) {  
            if (i == j) continue;  
            int[] b = points[j];  
            if (a[0] <= b[0] && a[1] >= b[1]) {  
                boolean ok = true;  
                for (int k = 0;  k < points.length; k++) {  
                    if (i == k || j == k) continue;  
                    int[] c = points[k];  
                    if (c[0] >= a[0] && c[1] <= a[1] && c[0] <= b[0] && c[1] >= b[1]) {  
                        ok = false;  
                        break;  
                    }  
                }  
                if (ok) ans++;  
            }  
        }  
    }  
    return ans;  
}
```

## 优化思路

### 暴力解法检查 C

- 直接枚举 `(A,B)`，然后得验证：矩形里是否有点 C。
    
- 所以必须三重循环，把所有点 C 都扫一遍。
    
- 时间复杂度 O(n³)。

### 优化第三重循环

