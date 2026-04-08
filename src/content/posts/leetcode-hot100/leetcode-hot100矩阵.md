---
title: Leetcode-hot100矩阵
published: 2026-03-04
updated: 2026-03-04
description: ""
image: ""
tags:
  - hot100
  - 矩阵
category: Leetcode
draft: false
---
---
# leetcode 73

## 一、题目理解

题目：**Set Matrix Zeroes**

给定一个 `m x n` 矩阵，如果某个元素为 `0`，则将它所在的整行和整列都设为 `0`。要求 **原地修改**。

示例：
```
输入：
[
  [1,1,1],
  [1,0,1],
  [1,1,1]
]

输出：
[
  [1,0,1],
  [0,0,0],
  [1,0,1]
]
```

关键难点：
```
在遍历过程中一旦直接改成0，会污染后续判断。
```

---

## 二、暴力解法

### 思路（最直观）

最直观方式是：先拷贝一份矩阵 `copy`，遍历 `copy` 找到 0，再去修改原矩阵对应行列。

这样不会被“新写入的 0”干扰判断。

### 算法步骤

```
1. copy = matrix 的完整副本
2. 遍历 copy[i][j]
3. 若 copy[i][j] == 0：
   - 将 matrix 第 i 行全部置0
   - 将 matrix 第 j 列全部置0
```

### 过程图解

原矩阵：
```
[
  [1,1,1,1],
  [1,0,1,1],
  [1,1,1,0]
]
```

扫描 `copy`：
- 发现 `(1,1)=0`，置第1行和第1列
- 发现 `(2,3)=0`，置第2行和第3列

最终：
```
[
  [1,0,1,0],
  [0,0,0,0],
  [0,0,0,0]
]
```

### Java代码（暴力解法）

```java
class Solution {
    public void setZeroes(int[][] matrix) {
        int m = matrix.length, n = matrix[0].length;

        // 拷贝矩阵，避免遍历时被已写入的0污染
        int[][] copy = new int[m][n];
        for (int i = 0; i < m; i++) {
            System.arraycopy(matrix[i], 0, copy[i], 0, n);
        }

        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (copy[i][j] == 0) {
                    // 置第 i 行为0
                    for (int col = 0; col < n; col++) {
                        matrix[i][col] = 0;
                    }
                    // 置第 j 列为0
                    for (int row = 0; row < m; row++) {
                        matrix[row][j] = 0;
                    }
                }
            }
        }
    }
}
```

### 复杂度分析

时间复杂度：
```
最好：O(m*n)（没有0时只扫描）
平均：O(m*n + k*(m+n))
最坏：O(m*n*(m+n))（几乎每个位置都是0）
```
其中 `k` 是 0 的个数。

空间复杂度：
```
O(m*n)（copy矩阵）
```

### 不足之处

❌ 空间开销大（整矩阵拷贝）  
❌ 0 很多时，重复置行置列，最坏时间高

优化方向：
> 只记录“哪些行、哪些列要清零”，不必复制整个矩阵。

---

## 三、第一次优化（行列标记数组 / 哈希集合）

### 优化思路

两次遍历：
1. 第一遍只记录：哪些行有0、哪些列有0
2. 第二遍根据记录统一置0

可用 `boolean[]`，也可用 `HashSet<Integer>`。这里用数组更高效。

关键变量：
```
rowZero[i] = 第 i 行是否需要清零
colZero[j] = 第 j 列是否需要清零
```

### 过程图解

矩阵：
```
[
  [1,1,1,1],
  [1,0,1,1],
  [1,1,1,0]
]
```

第一遍记录：
```
rowZero = [false, true, true]
colZero = [false, true, false, true]
```

第二遍填充：
```
若 rowZero[i] == true 或 colZero[j] == true
=> matrix[i][j] = 0
```

结果：
```
[
  [1,0,1,0],
  [0,0,0,0],
  [0,0,0,0]
]
```

### Java代码（第一次优化）

```java
class Solution {
    public void setZeroes(int[][] matrix) {
        int m = matrix.length, n = matrix[0].length;
        boolean[] rowZero = new boolean[m];
        boolean[] colZero = new boolean[n];

        // 第一次遍历：记录哪些行/列要清零
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (matrix[i][j] == 0) {
                    rowZero[i] = true;
                    colZero[j] = true;
                }
            }
        }

        // 第二次遍历：按标记置0
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (rowZero[i] || colZero[j]) {
                    matrix[i][j] = 0;
                }
            }
        }
    }
}
```

### 复杂度分析

时间复杂度：
```
最好：O(m*n)
平均：O(m*n)
最坏：O(m*n)
```

空间复杂度：
```
O(m+n)
```

### 改进与不足

✅ 时间达到线性扫描级别  
✅ 逻辑清晰，容易写对  
❌ 仍需 O(m+n) 额外空间，不满足“常数空间最优”

继续优化方向：
> 用矩阵首行和首列本身作为标记数组，实现 O(1) 额外空间。

---

## 四、最终优化（最优解：首行首列标记法，O(1)额外空间）

### 核心思想

把 `matrix[0][j]` 当作“第 j 列是否清零”的标记，  
把 `matrix[i][0]` 当作“第 i 行是否清零”的标记。

但首行首列本身也可能原来就有 0，所以要额外两个变量：
```
firstRowZero: 首行是否原本需要清零
firstColZero: 首列是否原本需要清零
```

### 算法步骤

```
1) 先检查首行是否有0 -> firstRowZero
2) 先检查首列是否有0 -> firstColZero
3) 遍历 (1..m-1, 1..n-1):
   若 matrix[i][j]==0:
      matrix[i][0] = 0
      matrix[0][j] = 0
4) 再遍历 (1..m-1, 1..n-1):
   若 matrix[i][0]==0 或 matrix[0][j]==0:
      matrix[i][j] = 0
5) 若 firstRowZero 为 true，清空首行
6) 若 firstColZero 为 true，清空首列
```

### 详细图解（重点）

初始矩阵：
```
[
  [1,1,1,1],
  [1,0,1,1],
  [1,1,1,0],
  [1,1,1,1]
]
```

#### Step1/2：检查首行首列
```
首行无0 -> firstRowZero = false
首列无0 -> firstColZero = false
```

#### Step3：用首行首列打标记

发现 `(1,1)=0`：
```
matrix[1][0] = 0
matrix[0][1] = 0
```

发现 `(2,3)=0`：
```
matrix[2][0] = 0
matrix[0][3] = 0
```

此时矩阵（标记态）：
```
[
  [1,0,1,0],
  [0,0,1,1],
  [0,1,1,0],
  [1,1,1,1]
]
```

#### Step4：根据标记清零内部区域

规则：
```
matrix[i][0]==0 或 matrix[0][j]==0 -> matrix[i][j]=0
```

内部处理后：
```
[
  [1,0,1,0],
  [0,0,0,0],
  [0,0,0,0],
  [1,0,1,0]
]
```

#### Step5/6：处理首行首列
本例 `firstRowZero=false, firstColZero=false`，首行首列不额外清空。

最终结果：
```
[
  [1,0,1,0],
  [0,0,0,0],
  [0,0,0,0],
  [1,0,1,0]
]
```

### Java代码（最终最优解）

```java
class Solution {
    public void setZeroes(int[][] matrix) {
        int m = matrix.length, n = matrix[0].length;

        boolean firstRowZero = false;
        boolean firstColZero = false;

        // 1) 检查首行是否有0
        for (int j = 0; j < n; j++) {
            if (matrix[0][j] == 0) {
                firstRowZero = true;
                break;
            }
        }

        // 2) 检查首列是否有0
        for (int i = 0; i < m; i++) {
            if (matrix[i][0] == 0) {
                firstColZero = true;
                break;
            }
        }

        // 3) 使用首行首列做标记
        for (int i = 1; i < m; i++) {
            for (int j = 1; j < n; j++) {
                if (matrix[i][j] == 0) {
                    matrix[i][0] = 0;
                    matrix[0][j] = 0;
                }
            }
        }

        // 4) 按标记清空内部元素
        for (int i = 1; i < m; i++) {
            for (int j = 1; j < n; j++) {
                if (matrix[i][0] == 0 || matrix[0][j] == 0) {
                    matrix[i][j] = 0;
                }
            }
        }

        // 5) 根据标志处理首行
        if (firstRowZero) {
            for (int j = 0; j < n; j++) {
                matrix[0][j] = 0;
            }
        }

        // 6) 根据标志处理首列
        if (firstColZero) {
            for (int i = 0; i < m; i++) {
                matrix[i][0] = 0;
            }
        }
    }
}
```

### 复杂度分析（最优解）

时间复杂度：
```
最好：O(m*n)
平均：O(m*n)
最坏：O(m*n)
```

空间复杂度：
```
O(1) 额外空间
```

为什么是最优：
```
至少要读取每个元素一次，时间下界是 O(m*n)；
本解法达到下界，且额外空间为常数，故为最优实践。
```

---

## 五、三种解法对比总结

| 解法 | 核心思路 | 时间复杂度 | 空间复杂度 | 特点 |
| --- | --- | --- | --- | --- |
| 暴力解法 | 拷贝矩阵后逐个0扩散行列 | 最坏 O(m*n*(m+n)) | O(m*n) | 直观但代价高 |
| 第一次优化 | 记录待清零行列（row/col数组） | O(m*n) | O(m+n) | 常用且易写 |
| 最终优化 | 首行首列原地标记 + 双标志 | O(m*n) | O(1) | 面试最优解 |

---

## 六、关键记忆点

### 一句话

```
首行首列当标记位，两个布尔防冲突。
```

### 模板顺序（不能乱）

```
先记首行首列 -> 再打内部标记 -> 再清内部
最后再处理首行首列
```

### 常见坑

```
1) 忘记 firstRowZero / firstColZero
2) 先把首行首列改了，导致标记信息被覆盖
3) 从 (0,0) 开始清内部，污染标记
```

### 记忆口诀

```
首行首列做记号
内部遍历后清零
首行首列最后做
常数空间最精妙
```

---