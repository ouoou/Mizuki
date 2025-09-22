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

---

#### 1. 暴力解法为什么要检查 C

* 直接枚举 `(A,B)`，然后得验证：矩形里是否有点 C。
* 所以必须三重循环，把所有点 C 都扫一遍。
* 时间复杂度 O(n³)。

---

#### 2. 优化解法为什么能省掉检查 C

在 O(n²) 解法里，我们做了两件关键优化：

#### **(1) 排序 (x 升序, y 降序)**

这样保证：

* 从左到右遍历点时，x 一定递增。
* 如果 x 相同，y 大的在前面，小的在后面。

#### **(2) 维护 maxY**

对固定 A，往右扫点 B：

* 我们只考虑 `yB ≤ yA` 的点。
* 如果 `yB > maxY`，说明在矩形范围内没有别的点把 B 挡住，B 就是合法的；
* 更新 `maxY = yB`。
* 如果 `yB ≤ maxY`，说明在 A 和 B 之间，已经有过一个点 C（比它更靠上），C 落在矩形里 → 这个 B 自动被“排除”。

---

#### 3. 为什么这样能代替显式检查 C

* 在暴力解里，你要显式扫所有 C。
* 在优化解里，`maxY` 记录的就是 **到目前为止矩形内部的最高点 C 的 y 值**。

  * 如果下一个 B 在这个 `maxY` 之下，那么它一定被挡住，不合法。
  * 如果它比 `maxY` 高，说明它没有被挡住，可以计数。

所以，**maxY 就相当于在隐式检查所有 C**，避免了第三层循环。

---

#### 4. 举例说明

点集：

```
A = (2,6),  B1 = (4,4),  B2 = (6,2)
```

遍历过程：

* 初始 `maxY = -∞`
* 看 B1=(4,4)：

  * `4 ≤ 6 且 4 > -∞` ✅ → 合法
  * 更新 `maxY = 4`
* 看 B2=(6,2)：

  * `2 ≤ 6 但 2 > maxY(4)` ❌
  * 意味着 (4,4) 已经在矩形 A–B2 内 → B2 被挡住，不合法

这正好等价于暴力里显式去检查 "C=(4,4) 在不在矩形里"。

---

## 优化java解法/同3027解法

```java
public int numberOfPairs(int[][] points) {
            // x 小->大
            // Y 大->小
            Arrays.sort(points, (a, b) -> a[0] == b[0] ? b[1] - a[1] : a[0] - b[0]);

            int ans = 0;
            for (int i = 0; i < points.length; i++) {
                int [] a = points[i];
                int maxY = Integer.MIN_VALUE;
                for (int j = i + 1; j < points.length; j++) {
                    int [] b = points[j];
                    if (a[1] >= b[1] && b[1] >= maxY) {
                        ans ++;
                        maxY = b[1];
                    }
                }
            }
            return ans;
        }
```


# Leetcode48

## 思路解析

123
456
789
->
741
852
963
### 1. 先进行对角线交换

```shell
1 2 3
4 5 6
7 8 9
->
1 4 7
2 5 8
3 6 9

(0, 0) -> (0, 0) ❌
(0, 1) -> (1, 0) 
(0, 2) -> (2, 0)

(1, 0) -> (0, 1) ❌
(1, 1) -> (1, 1) ❌
(1, 2) -> (2, 1)

(2, 0) -> (0, 2) ❌
(2, 1) -> (1, 2) ❌
(2, 2) -> (2, 2) ❌
```

### 2. 在进行中线交换

```shell
1 4 7
2 5 8
3 6 9
->
7 4 1
8 5 2
9 6 3

(0, 0) -> (2, 0)
(0, 1) -> (0, 1)
(0, 1) -> (0, 1)

```


## 二维数组类翻转公式汇总


---

### 一、方阵 (n×n)

|名称|对称轴/中线|公式|记忆口诀|
|---|---|---|---|
|主对角线|↘ y = x|`(i, j) ↔ (j, i)`|**交换 i 和 j**|
|副对角线|↙ y = n-1-x|`(i, j) ↔ (n-1-j, n-1-i)`|**交换后再翻转**|
|垂直中线||中线|`(i, j) ↔ (i, n-1-j)`|
|水平中线|— 中线|`(i, j) ↔ (n-1-i, j)`|**固定列，翻行**|

👉 在方阵里 `n = 行数 = 列数`。

---

### 二、矩形 (m×n)

| 名称   | 对称轴/中线 | 公式                    | 说明                    |
| ---- | ------ | --------------------- | --------------------- |
| 垂直中线 |        | 中线                    | `(i, j) ↔ (i, n-1-j)` |
| 水平中线 | — 中线   | `(i, j) ↔ (m-1-i, j)` | m = 行数（高度）            |

---

### 三、快速记忆口诀

- **主对角线**：交换 i 和 j。
    
- **副对角线**：交换后再补 n-1。
    
- **垂直中线**：固定行，翻列 (j ↔ n-1-j)。
    
- **水平中线**：固定列，翻行 (i ↔ m-1-i)。
    

---

## java解法

```java
class Solution {  
    public void rotate(int[][] matrix) {  
        int temp;  
        for (int i = 0; i < matrix.length; i++) {  
            for (int j = 0; j < i; j++) {  
                temp = matrix[i][j];  
                matrix[i][j] = matrix[j][i];  
                matrix[j][i] = temp;  
            }  
        }  
  
        // 垂直中线反转  
        // [i,j] -> [i,n-1-j]  
        for (int i = 0; i < matrix.length; i++) {  
            for (int j = 0; j < matrix[i].length / 2; j++) {  
                temp = matrix[i][j];  
                matrix[i][j] = matrix[i][matrix.length - 1 - j];  
                matrix[i][matrix.length - 1 - j] = temp;  
            }  
        }  
  
    }  
  
}
```

# Leetcode 54

## 思路解析

枚举数组中每一步移动，遍历加入答案中


## java解法

```java
class Solution {  
    public List<Integer> spiralOrder(int[][] matrix) {  
        // 根据偏移量进行移动  
        //  ------->y  
        //  |        
        //  |        
        //  x        
        // 右移动（0,1）  
        // 下移动（1,0）  
        // 左移动（0,-1）  
        // 上移动（-1,0）  
        int [] dx = new int[]{0,1,0,-1};  
        int [] dy = new int[]{1,0,-1,0};  
        List<Integer> res = new ArrayList<>();  
        int m = matrix.length;  
        int n = matrix[0].length;  
        boolean[][] b = new boolean[m][n];  
  
        for (int i = 0, x = 0, y = 0, s = 0, t = 0; i < m * n; i++) {  
            int num = matrix[x][y];  
            res.add(num);  
            b[x][y] = true;  
            int q = x + dx[s%4];  
            int w = y + dy[t%4];  
            if (q >= m || w >= n || q < 0 || w < 0 || b[q][w]) {  
                s++;  
                t++;  
                x += dx[s%4];  
                y += dy[t%4];  
            } else {  
                x = q;  
                y = w;  
            }  
        }  
        return res;  
    }  
}
```
