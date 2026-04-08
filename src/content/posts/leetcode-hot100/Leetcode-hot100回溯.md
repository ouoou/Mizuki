---
title: Leetcode-hot100回溯
published: 2026-03-13
updated: 2026-03-13
description: ""
image: ""
tags:
  - hot100
  - 回溯
category: Leetcode
draft: false
---

# leetcode 46

## 一、题目理解

题目：**Permutations（全排列）**

给定一个**不含重复数字**的数组 `nums`，返回其所有可能的全排列。可以按任意顺序返回答案。

### 示例

输入：
```
nums = [1, 2, 3]
```

输出：
```
[[1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]]
```

---

输入：
```
nums = [0, 1]
```

输出：
```
[[0,1], [1,0]]
```

### 关键约束

```
1 <= nums.length <= 6
-10 <= nums[i] <= 10
nums 中所有整数互不相同

全排列总数 = n!（n 的阶乘）
n=6 时，6! = 720，规模不大
```

### 什么是全排列？

```
从 n 个不同元素中取出 n 个元素，排成一列
每个元素恰好使用一次，但顺序可以不同

[1,2,3] 的全排列：
  1开头：[1,2,3], [1,3,2]
  2开头：[2,1,3], [2,3,1]
  3开头：[3,1,2], [3,2,1]
  共 3! = 6 种
```

---

## 二、暴力解法（多重循环枚举）

### 思路（最直观）

最暴力的想法：用多重循环枚举每个位置放哪个元素。

```
对于 n 个元素：
  第 1 个位置：n 种选择
  第 2 个位置：n-1 种选择（不能和第1个重复）
  第 3 个位置：n-2 种选择
  ...

用 n 层嵌套循环，每层选一个元素，保证不重复
```

问题：
```
n 层嵌套循环 → 代码无法泛化！
n=3 需要 3 层循环，n=4 需要 4 层循环
循环层数取决于输入，无法硬编码
```

### 以 n=3 为例的暴力代码思路

```
for i in [0, 1, 2]:         // 第1个位置
  for j in [0, 1, 2]:       // 第2个位置
    if j == i: continue      // 不能重复
    for k in [0, 1, 2]:     // 第3个位置
      if k == i || k == j: continue
      result.add([nums[i], nums[j], nums[k]])
```

这只能处理固定长度，无法通用化。

### 通用化暴力：生成所有排列 → 过滤

```
1. 生成所有 n^n 种可能的序列（每个位置从 n 个中选）
2. 过滤掉有重复元素的序列
3. 留下的就是全排列
```

### Java代码（暴力解法）

```java
import java.util.*;

class Solution {
    public List<List<Integer>> permute(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        int n = nums.length;

        // 生成所有 n^n 种排列（每个位置独立从 n 个中选）
        // 用递归模拟 n 层循环
        generateAll(nums, n, new ArrayList<>(), result);
        return result;
    }

    private void generateAll(int[] nums, int n, List<Integer> current, List<List<Integer>> result) {
        if (current.size() == n) {
            // 检查是否每个元素恰好出现一次
            Set<Integer> set = new HashSet<>(current);
            if (set.size() == n) {
                result.add(new ArrayList<>(current));
            }
            return;
        }

        // 每个位置都尝试放 nums 中的每个元素
        for (int num : nums) {
            current.add(num);
            generateAll(nums, n, current, result);
            current.remove(current.size() - 1);
        }
    }
}
```

### 复杂度分析

时间复杂度：
```
总共生成 n^n 种序列
每种序列需要 O(n) 时间检查是否合法

总时间：O(n^n * n)

n=3: 3^3 = 27 种，其中只有 6 种合法
n=6: 6^6 = 46656 种，其中只有 720 种合法 → 大量浪费！
```

空间复杂度：
```
递归深度：O(n)
结果集：O(n! * n)

总空间：O(n! * n)
```

### 不足之处

❌ 生成了大量不合法的排列（n^n 中只有 n! 个合法）
❌ 时间复杂度 O(n^n) 远大于 O(n!)
❌ 每次都要检查整个序列是否有重复

优化方向：
> 在构建过程中就避免选择已使用的元素 → 回溯 + used 数组

---

## 三、第一次优化（回溯 + used 数组）

### 优化思路

核心思想：**回溯法（Backtracking）**

```
不再"先生成后过滤"
而是在构建排列的过程中，只选择还没被使用过的元素

用一个 boolean[] used 数组记录哪些元素已经被选过
选了 → 标记 used[i] = true
回溯 → 恢复 used[i] = false
```

### 回溯三要素

```
1. 路径（path）：当前已经做出的选择
2. 选择列表：当前还可以做的选择（未被 used 的元素）
3. 结束条件：path 长度 == n，收集一个完整排列
```

### 回溯模板

```
void backtrack(路径, 选择列表) {
    if (满足结束条件) {
        结果.add(路径);
        return;
    }
    for (选择 in 选择列表) {
        做选择;         // path.add(选择), used[i] = true
        backtrack(路径, 选择列表);
        撤销选择;       // path.remove(末尾), used[i] = false
    }
}
```

### 过程图解

以 `nums = [1, 2, 3]` 为例，完整回溯树：

```
                          []
                 /         |         \
              [1]         [2]        [3]
             /   \       /   \      /   \
          [1,2] [1,3] [2,1] [2,3] [3,1] [3,2]
           |      |     |     |     |      |
        [1,2,3][1,3,2][2,1,3][2,3,1][3,1,2][3,2,1]
           ★      ★     ★     ★     ★      ★
```

★ = 到达叶子节点，收集结果

---

### 详细执行过程

```
初始：path = [], used = [F, F, F]

第 1 层：选第 1 个元素
├─ 选 nums[0]=1: path=[1], used=[T,F,F]
│  │
│  第 2 层：选第 2 个元素
│  ├─ nums[0]=1: used[0]=T → 跳过
│  ├─ 选 nums[1]=2: path=[1,2], used=[T,T,F]
│  │  │
│  │  第 3 层：选第 3 个元素
│  │  ├─ nums[0]=1: used[0]=T → 跳过
│  │  ├─ nums[1]=2: used[1]=T → 跳过
│  │  └─ 选 nums[2]=3: path=[1,2,3] ★ 收集！
│  │     回溯：path=[1,2], used=[T,T,F]
│  │
│  │  回溯：path=[1], used=[T,F,F]
│  │
│  └─ 选 nums[2]=3: path=[1,3], used=[T,F,T]
│     │
│     第 3 层：
│     ├─ nums[0]=1: used[0]=T → 跳过
│     ├─ 选 nums[1]=2: path=[1,3,2] ★ 收集！
│     │  回溯：path=[1,3], used=[T,F,T]
│     └─ nums[2]=3: used[2]=T → 跳过
│
│  回溯：path=[], used=[F,F,F]
│
├─ 选 nums[1]=2: path=[2], used=[F,T,F]
│  ├─ 选 nums[0]=1: path=[2,1], used=[T,T,F]
│  │  └─ 选 nums[2]=3: path=[2,1,3] ★ 收集！
│  └─ 选 nums[2]=3: path=[2,3], used=[F,T,T]
│     └─ 选 nums[0]=1: path=[2,3,1] ★ 收集！
│
└─ 选 nums[2]=3: path=[3], used=[F,F,T]
   ├─ 选 nums[0]=1: path=[3,1], used=[T,F,T]
   │  └─ 选 nums[1]=2: path=[3,1,2] ★ 收集！
   └─ 选 nums[1]=2: path=[3,2], used=[F,T,T]
      └─ 选 nums[0]=1: path=[3,2,1] ★ 收集！

最终结果：[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]
```

---

### 回溯状态变化表（部分）

| 操作 | path | used | 动作 |
|------|------|------|------|
| 选 1 | [1] | [T,F,F] | 进入下一层 |
| 选 2 | [1,2] | [T,T,F] | 进入下一层 |
| 选 3 | [1,2,3] | [T,T,T] | ★ 收集结果 |
| 撤销 3 | [1,2] | [T,T,F] | 回溯 |
| 撤销 2 | [1] | [T,F,F] | 回溯 |
| 选 3 | [1,3] | [T,F,T] | 进入下一层 |
| 选 2 | [1,3,2] | [T,T,T] | ★ 收集结果 |
| 撤销 2 | [1,3] | [T,F,T] | 回溯 |
| 撤销 3 | [1] | [T,F,F] | 回溯 |
| 撤销 1 | [] | [F,F,F] | 回溯，选下一个 |
| ... | ... | ... | ... |

### Java代码（第一次优化）

```java
import java.util.*;

class Solution {
    public List<List<Integer>> permute(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        boolean[] used = new boolean[nums.length];
        backtrack(nums, used, new ArrayList<>(), result);
        return result;
    }

    private void backtrack(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> result) {
        // 结束条件：排列长度等于数组长度
        if (path.size() == nums.length) {
            result.add(new ArrayList<>(path)); // 注意：要 new 一份拷贝！
            return;
        }

        for (int i = 0; i < nums.length; i++) {
            if (used[i]) continue; // 已使用，跳过

            // 做选择
            path.add(nums[i]);
            used[i] = true;

            // 递归
            backtrack(nums, used, path, result);

            // 撤销选择（回溯）
            path.remove(path.size() - 1);
            used[i] = false;
        }
    }
}
```

### 复杂度分析

时间复杂度：
```
回溯树的节点数 = n! 个叶子节点 + 内部节点
第 1 层：n 个分支
第 2 层：n*(n-1) 个分支
第 k 层：n!/(n-k)! 个分支

总节点数 ≈ e * n!（数学推导）
每个叶子节点复制路径：O(n)

总时间：O(n * n!)

最好 = 最坏 = 平均 = O(n * n!)
（必须生成所有排列，无法更快）
```

空间复杂度：
```
used 数组：O(n)
递归栈深度：O(n)
path 列表：O(n)
结果集：O(n * n!)

额外空间（不含结果）：O(n)
```

### 优点与不足

✅ 只生成合法排列，不浪费
✅ 时间复杂度 O(n * n!)，已经接近最优
✅ 逻辑清晰，回溯模板通用
❌ 需要额外的 used 数组 O(n)
❌ 每次选择需要遍历整个 nums 并检查 used

优化方向：
> 用"交换法"代替 used 数组，通过原地交换选择元素，省去额外空间

---

## 四、最终优化（回溯 + 原地交换，最优解）

### 优化思路

核心改进：
```
不需要 used 数组
不需要 path 列表
直接在 nums 数组上原地操作！

思路：
  nums[0..idx-1] = 已选择的元素（当前排列的前半部分）
  nums[idx..n-1] = 待选择的元素（还没排的）

  在第 idx 个位置，依次和 nums[idx..n-1] 中的每个元素交换
  相当于从"剩余元素"中选一个放到第 idx 位
```

### 交换法原理图解

以 `nums = [1, 2, 3]`，idx=0 为例：

```
第 0 位选谁？

swap(0, 0): [1, 2, 3]  → 第 0 位选 1 → 递归处理 [2, 3]
swap(0, 1): [2, 1, 3]  → 第 0 位选 2 → 递归处理 [1, 3]
swap(0, 2): [3, 2, 1]  → 第 0 位选 3 → 递归处理 [2, 1]
```

每次 swap 之后，`nums[0..idx]` 就是已确定的部分，`nums[idx+1..n-1]` 是待排列的部分。

### 完整回溯树（交换法）

```
nums = [1, 2, 3]

                     [1, 2, 3]  idx=0
                   /      |      \
         swap(0,0)    swap(0,1)   swap(0,2)
              |           |            |
         [1, 2, 3]   [2, 1, 3]   [3, 2, 1]   idx=1
          /    \       /    \       /    \
     sw(1,1) sw(1,2) sw(1,1) sw(1,2) sw(1,1) sw(1,2)
        |       |       |       |       |       |
    [1,2,3] [1,3,2] [2,1,3] [2,3,1] [3,2,1] [3,1,2]  idx=2
       ★       ★       ★       ★       ★       ★

idx == n → 收集当前 nums 作为一个排列
```

### 详细执行过程

```
初始 nums = [1, 2, 3], idx = 0

─── idx=0：第 0 位选谁？ ───

swap(0,0)：nums = [1, 2, 3]（1 放第 0 位）
│
│  ─── idx=1：第 1 位选谁？ ───
│
│  swap(1,1)：nums = [1, 2, 3]（2 放第 1 位）
│  │  idx=2 → idx==n → ★ 收集 [1,2,3]
│  │  swap 还原：nums = [1, 2, 3]
│  │
│  swap(1,2)：nums = [1, 3, 2]（3 放第 1 位）
│  │  idx=2 → idx==n → ★ 收集 [1,3,2]
│  │  swap 还原：nums = [1, 2, 3]
│
│  swap 还原：nums = [1, 2, 3]

swap(0,1)：nums = [2, 1, 3]（2 放第 0 位）
│
│  swap(1,1)：nums = [2, 1, 3]
│  │  ★ 收集 [2,1,3]
│  │
│  swap(1,2)：nums = [2, 3, 1]
│  │  ★ 收集 [2,3,1]
│
│  swap 还原：nums = [1, 2, 3]

swap(0,2)：nums = [3, 2, 1]（3 放第 0 位）
│
│  swap(1,1)：nums = [3, 2, 1]
│  │  ★ 收集 [3,2,1]
│  │
│  swap(1,2)：nums = [3, 1, 2]
│  │  ★ 收集 [3,1,2]
│
│  swap 还原：nums = [1, 2, 3]

最终结果：[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,2,1],[3,1,2]]
```

---

### 交换法 vs used 数组对比

```
                 used 数组法              交换法
─────────────────────────────────────────────────────
额外空间          boolean[] used O(n)     无额外数组
                  List<Integer> path O(n)
选择方式          遍历 nums 检查 used      swap 交换到当前位
恢复方式          used[i] = false          swap 换回来
收集结果          new ArrayList<>(path)     new ArrayList<>(nums转列表)
代码简洁度        稍长                      更简洁
```

### Java代码（最终优化）

```java
import java.util.*;

class Solution {
    public List<List<Integer>> permute(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        backtrack(nums, 0, result);
        return result;
    }

    private void backtrack(int[] nums, int idx, List<List<Integer>> result) {
        // 结束条件：所有位置都填好了
        if (idx == nums.length) {
            // 将当前 nums 状态转为 List 收集
            List<Integer> perm = new ArrayList<>();
            for (int num : nums) {
                perm.add(num);
            }
            result.add(perm);
            return;
        }

        // 第 idx 位：从 nums[idx..n-1] 中选一个
        for (int i = idx; i < nums.length; i++) {
            swap(nums, idx, i);        // 选择：把 nums[i] 换到第 idx 位
            backtrack(nums, idx + 1, result); // 递归处理后面的位置
            swap(nums, idx, i);        // 撤销选择：换回来
        }
    }

    private void swap(int[] nums, int i, int j) {
        int temp = nums[i];
        nums[i] = nums[j];
        nums[j] = temp;
    }
}
```

### 复杂度分析

时间复杂度：
```
与 used 数组法相同
回溯树叶子节点 = n! 个
每个叶子节点复制数组：O(n)

总时间：O(n * n!)

最好 = 最坏 = 平均 = O(n * n!)

这是最优的，因为输出本身就有 n! 个排列，每个长度 n
```

空间复杂度：
```
递归栈深度：O(n)
无 used 数组，无 path 列表

额外空间（不含结果）：O(n)（仅递归栈）
结果集：O(n * n!)
```

---

## 五、三种解法对比总结

| 解法      | 核心思路        | 时间复杂度      | 额外空间     | 特点        |
| ------- | ----------- | ---------- | -------- | --------- |
| 暴力枚举    | 生成 n^n 种再过滤 | O(n^n * n) | O(n)     | 大量浪费      |
| 回溯+used | used 数组标记已选 | O(n * n!)  | O(n)     | 清晰通用，回溯入门 |
| 回溯+交换   | 原地 swap 选元素 | O(n * n!)  | O(n)仅递归栈 | 最优，无额外数组  |

---

## 六、关键记忆点

### 核心思想

```
看到"全排列/排列/所有可能的顺序" → 回溯法

回溯 = DFS + 撤销选择
关键：做选择 → 递归 → 撤销选择
```

### 回溯通用模板

```java
void backtrack(路径, 选择列表) {
    if (满足结束条件) {
        result.add(路径的拷贝);
        return;
    }
    for (选择 : 选择列表) {
        做选择;
        backtrack(新路径, 新选择列表);
        撤销选择;
    }
}
```

### 两种实现方式

```
方式一：used 数组
  path.add(nums[i]); used[i] = true;
  backtrack();
  path.remove(末尾); used[i] = false;

方式二：swap 交换
  swap(nums, idx, i);
  backtrack(idx + 1);
  swap(nums, idx, i);
```

### 易错点

```
1. 收集结果时必须拷贝：
   ✅ result.add(new ArrayList<>(path))
   ❌ result.add(path)（path 会被后续修改！）

2. 回溯必须撤销选择：
   ✅ path.remove + used[i] = false
   ❌ 忘记撤销 → 结果错误

3. 循环范围：
   used 数组法：i 从 0 到 n-1（每次从头扫，靠 used 跳过）
   交换法：i 从 idx 到 n-1（天然避免重复选择）
```

### 面试答题顺序

```
1. 识别：全排列 → 回溯
2. 画回溯树：展示决策过程
3. 写代码：交换法或 used 数组法
4. 分析：O(n * n!) 时间，O(n) 额外空间
5. 追问变体：
   - 有重复元素？→ 排序 + 剪枝（LeetCode 47）
   - 子集/组合？→ 类似回溯框架
```

### 记忆口诀

```
全排列用回溯解
做选择递归撤选择
used数组标记法通用
swap交换法最省空间
结果收集记得拷贝
撤销选择不能忘
```

---

# leetcode 78

## 一、题目理解

题目：**Subsets（子集）**

给定一个整数数组 `nums`，数组中的元素**互不相同**，返回该数组所有可能的子集（幂集）。解集**不能**包含重复的子集，可以按任意顺序返回。

### 示例

输入：
```
nums = [1, 2, 3]
```

输出：
```
[[], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]]
```

---

输入：
```
nums = [0]
```

输出：
```
[[], [0]]
```

### 关键约束

```
1 <= nums.length <= 10
-10 <= nums[i] <= 10
nums 中所有元素互不相同

子集总数 = 2^n（每个元素"选"或"不选"两种状态）
n=10 时，2^10 = 1024，规模不大
```

### 什么是子集（幂集）？

```
子集 = 从原集合中选出若干元素（可以不选）组成的集合

{1,2,3} 的所有子集：
  选 0 个：{}
  选 1 个：{1}, {2}, {3}
  选 2 个：{1,2}, {1,3}, {2,3}
  选 3 个：{1,2,3}

总共 2^3 = 8 个子集
```

---

## 二、暴力解法（二进制枚举）

### 思路（最直观）

每个元素有两种状态：**选** 或 **不选**。

```
n 个元素，每个元素 2 种状态
总共 2^n 种组合

用一个 n 位的二进制数来表示一种选法：
  第 i 位 = 1 → 选 nums[i]
  第 i 位 = 0 → 不选 nums[i]

枚举 0 到 2^n - 1 的所有数，每个数对应一个子集
```

### 过程图解

以 `nums = [1, 2, 3]` 为例，n=3，枚举 0 到 7：

```
二进制   对应选法        子集
────────────────────────────
 000     不选 不选 不选    []
 001     不选 不选 选3     [3]
 010     不选 选2  不选    [2]
 011     不选 选2  选3     [2,3]
 100     选1  不选 不选    [1]
 101     选1  不选 选3     [1,3]
 110     选1  选2  不选    [1,2]
 111     选1  选2  选3     [1,2,3]
```

---

### 位运算判断

```
mask = 5 (二进制 101)

检查第 0 位：(5 >> 0) & 1 = 1  → 选 nums[0]=1
检查第 1 位：(5 >> 1) & 1 = 0  → 不选 nums[1]
检查第 2 位：(5 >> 2) & 1 = 1  → 选 nums[2]=3

子集 = [1, 3]
```

### Java代码（暴力解法）

```java
import java.util.*;

class Solution {
    public List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        int n = nums.length;
        int total = 1 << n; // 2^n

        // 枚举所有二进制掩码：0 到 2^n - 1
        for (int mask = 0; mask < total; mask++) {
            List<Integer> subset = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                // 检查第 i 位是否为 1
                if ((mask >> i & 1) == 1) {
                    subset.add(nums[i]);
                }
            }
            result.add(subset);
        }

        return result;
    }
}
```

### 复杂度分析

时间复杂度：
```
外层循环：2^n 次
内层循环：每次 n 次检查每一位

总时间：O(n * 2^n)
```

空间复杂度：
```
结果集：O(n * 2^n)
单个子集：O(n)

额外空间（不含结果）：O(n)
```

### 优缺点

✅ 思路直观，利用二进制天然映射
✅ 代码简洁
❌ 不容易推广到其他回溯问题（组合、排列等）
❌ 当 n > 30 时，`1 << n` 会溢出 int

优化方向：
> 用回溯法（递归 + 选/不选），更通用的框架

---

## 三、第一次优化（回溯 —— 选或不选）

### 优化思路

核心思想：**对每个元素做二叉选择——选它 or 不选它**

```
从第 0 个元素开始，逐个决定：
  选 nums[0] → 递归处理 nums[1..n-1]
  不选 nums[0] → 递归处理 nums[1..n-1]

每个元素有两条分支，形成一棵完全二叉树
叶子节点就是所有子集
```

### 回溯树（选/不选）

以 `nums = [1, 2, 3]` 为例：

```
                        []
                      /    \
               选1 /        \ 不选1
               [1]           []
              /    \        /    \
         选2 /  不选2\ 选2 /  不选2\
          [1,2]   [1]   [2]      []
          / \     / \   / \     / \
        选3 不选 选3 不选 选3 不选 选3 不选
         |    |   |   |   |   |   |   |
      [1,2,3][1,2][1,3][1][2,3][2][3] []
         ★    ★    ★   ★   ★   ★  ★   ★
```

★ = 叶子节点，收集当前 path 作为一个子集

8 个叶子节点 = 2^3 = 8 个子集 ✓

### 详细执行过程

```
初始：path = [], idx = 0

dfs(idx=0)：决定 nums[0]=1
├── 选 1：path = [1]
│   dfs(idx=1)：决定 nums[1]=2
│   ├── 选 2：path = [1,2]
│   │   dfs(idx=2)：决定 nums[2]=3
│   │   ├── 选 3：path = [1,2,3]
│   │   │   dfs(idx=3)：idx==n → ★ 收集 [1,2,3]
│   │   │   回溯：path = [1,2]
│   │   └── 不选 3：
│   │       dfs(idx=3)：idx==n → ★ 收集 [1,2]
│   │   回溯：path = [1]
│   └── 不选 2：
│       dfs(idx=2)：决定 nums[2]=3
│       ├── 选 3：path = [1,3]
│       │   dfs(idx=3) → ★ 收集 [1,3]
│       │   回溯：path = [1]
│       └── 不选 3：
│           dfs(idx=3) → ★ 收集 [1]
│   回溯：path = []
│
└── 不选 1：
    dfs(idx=1)：决定 nums[1]=2
    ├── 选 2：path = [2]
    │   dfs(idx=2)：
    │   ├── 选 3：path = [2,3] → ★ 收集 [2,3]
    │   └── 不选 3 → ★ 收集 [2]
    └── 不选 2：
        dfs(idx=2)：
        ├── 选 3：path = [3] → ★ 收集 [3]
        └── 不选 3 → ★ 收集 []

结果：[[1,2,3],[1,2],[1,3],[1],[2,3],[2],[3],[]]
```

### Java代码（第一次优化）

```java
import java.util.*;

class Solution {
    public List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        dfs(nums, 0, new ArrayList<>(), result);
        return result;
    }

    private void dfs(int[] nums, int idx, List<Integer> path, List<List<Integer>> result) {
        // 所有元素都决定完了 → 收集当前子集
        if (idx == nums.length) {
            result.add(new ArrayList<>(path));
            return;
        }

        // 选择一：选 nums[idx]
        path.add(nums[idx]);
        dfs(nums, idx + 1, path, result);
        path.remove(path.size() - 1); // 回溯

        // 选择二：不选 nums[idx]
        dfs(nums, idx + 1, path, result);
    }
}
```

### 复杂度分析

时间复杂度：
```
回溯树是一棵满二叉树，共 2^n 个叶子节点
每个叶子节点复制 path：O(n)

总时间：O(n * 2^n)

最好 = 最坏 = 平均 = O(n * 2^n)
```

空间复杂度：
```
递归栈：O(n)
path 列表：O(n)
结果集：O(n * 2^n)

额外空间（不含结果）：O(n)
```

### 优点与不足

✅ 递归结构清晰，"选/不选"决策直观
✅ 不需要位运算，适合任意大小 n
❌ 只在叶子节点收集结果，中间节点没有利用
❌ 递归分支固定两条，代码模式不如"枚举起点"通用

优化方向：
> 用"枚举子集起点"的回溯模式——每层循环选择下一个元素，每个节点都收集结果

---

## 四、最终优化（回溯 —— 逐步构建，每个节点收集）

### 优化思路

核心改进：
```
不是"选或不选"的二叉决策
而是"从剩余元素中选下一个放入子集"

关键：每进入一个递归节点，就收集当前 path

区别于全排列（只在叶子节点收集），
子集问题在每个节点都收集！
```

### 回溯规则

```
backtrack(start)：
  1. 收集当前 path（每个节点都是一个合法子集）
  2. 从 start 开始遍历剩余元素
  3. 选 nums[i]，递归 backtrack(i+1)
  4. 撤销选择

start 参数保证只选后面的元素，避免重复
  例如：选了 nums[1] 后，只能选 nums[2], nums[3]...
  不会选 nums[0]（因为 [2,1] 和 [1,2] 是同一个子集）
```

### 回溯树

以 `nums = [1, 2, 3]` 为例：

```
                          [] ★
                /          |          \
            [1] ★       [2] ★       [3] ★
           /    \          |
       [1,2] ★  [1,3] ★  [2,3] ★
         |
      [1,2,3] ★

每个节点都标记 ★ = 收集当前 path
```

总共 8 个节点 = 8 个子集 ✓

---

### 详细执行过程

```
backtrack(start=0, path=[])
│  ★ 收集 []
│
├─ i=0: 选 1, path=[1]
│  backtrack(start=1, path=[1])
│  │  ★ 收集 [1]
│  │
│  ├─ i=1: 选 2, path=[1,2]
│  │  backtrack(start=2, path=[1,2])
│  │  │  ★ 收集 [1,2]
│  │  │
│  │  └─ i=2: 选 3, path=[1,2,3]
│  │     backtrack(start=3, path=[1,2,3])
│  │     │  ★ 收集 [1,2,3]
│  │     │  start=3 == n → 无更多选择，返回
│  │     回溯：path=[1,2]
│  │
│  │  回溯：path=[1]
│  │
│  └─ i=2: 选 3, path=[1,3]
│     backtrack(start=3, path=[1,3])
│     │  ★ 收集 [1,3]
│     │  返回
│     回溯：path=[1]
│
│  回溯：path=[]
│
├─ i=1: 选 2, path=[2]
│  backtrack(start=2, path=[2])
│  │  ★ 收集 [2]
│  │
│  └─ i=2: 选 3, path=[2,3]
│     backtrack(start=3, path=[2,3])
│     │  ★ 收集 [2,3]
│     │  返回
│     回溯：path=[2]
│
│  回溯：path=[]
│
└─ i=2: 选 3, path=[3]
   backtrack(start=3, path=[3])
   │  ★ 收集 [3]
   │  返回
   回溯：path=[]

最终结果：[[], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3]]
```

---

### 为什么 start 能避免重复？

```
如果没有 start，选了 2 之后还能选 1：
  path 会出现 [2,1]
  但 [1,2] 和 [2,1] 是同一个子集 → 重复！

有了 start，选了 nums[i] 后只能选 nums[i+1..n-1]：
  保证子集中元素的下标递增
  [1,2] 会出现，[2,1] 不会出现
  天然去重
```

### 三种方法的回溯树对比

```
二进制枚举：    不是树结构，直接遍历 0 到 2^n-1
选/不选二叉树：  满二叉树，只在叶子节点收集
逐步构建：      每个节点都收集，更紧凑的树

节点数对比（n=3）：
  二进制：8 次循环
  选/不选：15 个节点（8叶子+7内部），收集 8 次
  逐步构建：8 个节点，收集 8 次 ← 最紧凑
```

### Java代码（最终优化）

```java
import java.util.*;

class Solution {
    public List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        backtrack(nums, 0, new ArrayList<>(), result);
        return result;
    }

    private void backtrack(int[] nums, int start, List<Integer> path, List<List<Integer>> result) {
        // 每个节点都是一个合法子集，直接收集
        result.add(new ArrayList<>(path));

        // 从 start 开始选择下一个元素
        for (int i = start; i < nums.length; i++) {
            path.add(nums[i]);             // 做选择
            backtrack(nums, i + 1, path, result); // 递归：下一个从 i+1 开始
            path.remove(path.size() - 1);  // 撤销选择
        }
    }
}
```

### 代码设计要点

```
1. 进入函数就收集（不需要 if 判断结束条件）：
   因为每个节点都是合法子集，包括空集

2. 循环从 start 开始：
   保证不回头选，避免重复子集

3. 递归传 i+1（不是 start+1）：
   i 是当前选的元素下标，下一个从 i 的后面开始

4. 回溯：path.remove(末尾)
   和全排列一样，必须撤销选择
```

### 复杂度分析

时间复杂度：
```
子集总数 = 2^n
每个子集平均长度 = n/2
复制每个子集：O(n)

总时间：O(n * 2^n)

最好 = 最坏 = 平均 = O(n * 2^n)

注：这已经是最优的，因为输出本身就有 2^n 个子集
```

空间复杂度：
```
递归栈：O(n)
path 列表：O(n)
结果集：O(n * 2^n)

额外空间（不含结果）：O(n)
```

---

## 五、三种解法对比总结

| 解法       | 核心思路          | 时间复杂度      | 额外空间 | 特点        |
| -------- | ------------- | ---------- | ---- | --------- |
| 二进制枚举    | 位运算映射选/不选     | O(n * 2^n) | O(n) | 直观但不通用    |
| 回溯(选/不选) | 每个元素二叉决策      | O(n * 2^n) | O(n) | 决策清晰，叶子收集 |
| 回溯(逐步构建) | 枚举下一个元素，每节点收集 | O(n * 2^n) | O(n) | 最通用，代码最简  |

---

## 六、关键记忆点

### 核心思想

```
看到"所有子集/幂集/所有组合" → 回溯

子集问题 vs 全排列的区别：
  全排列：只在叶子节点收集（排列必须用完所有元素）
  子集：  每个节点都收集（空集、部分元素、全部元素都是合法子集）
```

### 子集回溯模板

```java
void backtrack(int start, List<Integer> path) {
    result.add(new ArrayList<>(path)); // 每个节点都收集

    for (int i = start; i < nums.length; i++) {
        path.add(nums[i]);
        backtrack(i + 1, path);   // 注意是 i+1
        path.remove(path.size() - 1);
    }
}
```

### 与全排列模板对比

```
全排列模板：                   子集模板：
─────────────────────────────────────────────
for i = 0 to n-1              for i = start to n-1
  if used[i]: skip              （不需要 used）
  path.add(nums[i])            path.add(nums[i])
  used[i] = true                  （不需要 used）
  backtrack(...)                backtrack(i+1, ...)
  path.remove(末尾)             path.remove(末尾)
  used[i] = false                 （不需要 used）

收集时机：                     收集时机：
  path.size() == n 时收集       每次进入函数就收集

循环起点：                     循环起点：
  固定从 0 开始                 从 start 开始（避免重复）
```

### 关键区别记忆

```
全排列 [1,2] ≠ [2,1]  → 顺序有关 → 从 0 开始遍历 + used
子集   {1,2} = {2,1}  → 顺序无关 → 从 start 开始 → 天然去重
```

### 易错点

```
1. 收集时机：
   ✅ 进入函数就收集（子集问题）
   ❌ 只在叶子收集 → 会丢失中间子集

2. 递归参数：
   ✅ backtrack(i + 1)（从下一个元素开始）
   ❌ backtrack(start + 1) → 会跳过某些组合
   ❌ backtrack(i) → 元素被重复选取

3. 拷贝问题（和全排列一样）：
   ✅ result.add(new ArrayList<>(path))
   ❌ result.add(path)
```

### 面试答题顺序

```
1. 识别：子集 / 幂集 → 回溯
2. 说两种思路：选/不选 或 逐步构建
3. 写代码：逐步构建（更简洁通用）
4. 分析：O(n * 2^n) 时间，O(n) 额外空间
5. 追问变体：
   - 有重复元素？→ 排序 + 同层剪枝（LeetCode 90）
   - 组合总和？→ 类似框架 + 目标值剪枝
```

### 记忆口诀

```
子集问题每节点收集
start参数保证不回头
选了i就从i+1继续
进入函数先加结果
回溯撤销别忘记
```

---

# leetcode 17

## 一、题目理解

题目：**Letter Combinations of a Phone Number（电话号码的字母组合）**

给定一个仅包含数字 `2-9` 的字符串 `digits`，返回所有它能表示的字母组合。答案可以按任意顺序返回。

数字到字母的映射（与电话按键相同）：

```
2 → "abc"
3 → "def"
4 → "ghi"
5 → "jkl"
6 → "mno"
7 → "pqrs"
8 → "tuv"
9 → "wxyz"
```

### 示例

输入：
```
digits = "23"
```

输出：
```
["ad","ae","af","bd","be","bf","cd","ce","cf"]
```

---

输入：
```
digits = ""
```

输出：
```
[]
```

---

输入：
```
digits = "2"
```

输出：
```
["a","b","c"]
```

### 关键约束

```
0 <= digits.length <= 4
digits[i] 是范围 ['2', '9'] 之间的数字
不包含 0 和 1（它们不对应任何字母）

每个数字对应 3 或 4 个字母
结果总数 = 各位数字对应字母数的乘积
  例如 "23"：3 * 3 = 9 种
  最坏 "7999"：4 * 4 * 4 * 4 = 256 种
```

### 问题本质

```
本质是一个多叉树遍历问题：
  第 1 个数字 → 第 1 层选择（3 或 4 个分支）
  第 2 个数字 → 第 2 层选择（3 或 4 个分支）
  ...
  每条从根到叶子的路径 = 一个字母组合
```

---

## 二、暴力解法（队列迭代逐层展开）

### 思路（最直观）

最直观的想法：像 BFS 一样，**逐个数字展开**所有组合。

```
1. 初始化队列，放入空字符串 ""
2. 对于 digits 中的每一个数字：
   - 取出当前队列中的所有字符串
   - 每个字符串都和当前数字对应的每个字母拼接
   - 把拼接后的新字符串放回队列
3. 最终队列中的所有字符串就是结果
```

### 过程图解

以 `digits = "23"` 为例：

```
初始队列：[""]

处理数字 '2'（对应 "abc"）：
  弹出 "" → 拼接 a,b,c → 得到 "a","b","c"

队列：["a", "b", "c"]

处理数字 '3'（对应 "def"）：
  弹出 "a" → 拼接 d,e,f → 得到 "ad","ae","af"
  弹出 "b" → 拼接 d,e,f → 得到 "bd","be","bf"
  弹出 "c" → 拼接 d,e,f → 得到 "cd","ce","cf"

队列：["ad","ae","af","bd","be","bf","cd","ce","cf"]
```

---

以 `digits = "79"` 为例：

```
初始队列：[""]

处理数字 '7'（对应 "pqrs"）：
  弹出 "" → 拼接 p,q,r,s

队列：["p","q","r","s"]

处理数字 '9'（对应 "wxyz"）：
  弹出 "p" → "pw","px","py","pz"
  弹出 "q" → "qw","qx","qy","qz"
  弹出 "r" → "rw","rx","ry","rz"
  弹出 "s" → "sw","sx","sy","sz"

队列：["pw","px","py","pz","qw","qx","qy","qz","rw","rx","ry","rz","sw","sx","sy","sz"]

共 4 * 4 = 16 种组合 ✓
```

### 逐层展开状态表

```
digits = "234"

层  | 数字 | 字母  | 队列中字符串数量  | 队列内容
----|------|------|----------------|--------
初始 | -   | -    | 1              | [""]
1   | '2' | abc  | 3              | ["a","b","c"]
2   | '3' | def  | 9              | ["ad","ae","af","bd",...]
3   | '4' | ghi  | 27             | ["adg","adh","adi","aeg",...]
```

### Java代码（暴力解法）

```java
import java.util.*;

class Solution {
    public List<String> letterCombinations(String digits) {
        List<String> result = new ArrayList<>();
        if (digits == null || digits.isEmpty()) {
            return result;
        }

        // 数字到字母的映射
        String[] mapping = {"", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"};

        // 初始化队列，放入空字符串
        Queue<String> queue = new LinkedList<>();
        queue.offer("");

        // 逐个数字展开
        for (char digit : digits.toCharArray()) {
            String letters = mapping[digit - '0'];
            int size = queue.size();

            // 处理当前队列中的所有字符串
            for (int i = 0; i < size; i++) {
                String curr = queue.poll();
                // 每个字符串都拼接当前数字的每个字母
                for (char c : letters.toCharArray()) {
                    queue.offer(curr + c); // 字符串拼接，产生新字符串对象
                }
            }
        }

        // 队列中的就是最终结果
        result.addAll(queue);
        return result;
    }
}
```

### 复杂度分析

时间复杂度：
```
设 digits 长度为 n，每个数字平均对应 k 个字母（k ≈ 3~4）

总组合数 = k^n
每次拼接 curr + c 会创建新的 String 对象：
  第 i 层的字符串长度为 i，拼接 O(i)
  第 i 层的字符串数量为 k^i

总工作量 = Σ(i=1 to n) i * k^i ≈ O(n * k^n)

最好：O(k^n)（digits 长度为 1）
最坏：O(n * k^n)
平均：O(n * k^n)
```

空间复杂度：
```
队列中最多存 k^n 个字符串，每个长度 n

空间：O(n * k^n)

字符串拼接产生大量中间对象（Java 中 String 不可变）
每次 curr + c 都会创建新的 String → 额外 GC 压力
```

### 不足之处

❌ 每次 `curr + c` 都创建新的 String 对象，大量内存分配
❌ 队列中同时存放所有中间结果，内存占用大
❌ 没有利用递归的天然回溯能力

优化方向：
> 用回溯（DFS），逐层选择字母，用 StringBuilder 避免重复创建字符串

---

## 三、第一次优化（回溯 + String 拼接）

### 优化思路

核心改进：
```
用递归回溯代替 BFS 队列：
  DFS 深度优先，一条路走到底再回溯
  空间上只需要维护当前路径，不需要存所有中间结果

思路：
  第 idx 个数字 → 对应的字母集合
  遍历每个字母 → 拼到当前组合后面 → 递归处理下一个数字
  到达末尾 → 收集当前组合
```

### 回溯树

以 `digits = "23"` 为例：

```
                       ""
                /       |       \
          "a"          "b"          "c"         ← 数字 '2' → abc
        / | \        / | \        / | \
     "ad""ae""af" "bd""be""bf" "cd""ce""cf"    ← 数字 '3' → def
      ★   ★   ★    ★   ★   ★    ★   ★   ★

★ = 到达叶子节点，idx == digits.length，收集结果
```

### 详细执行过程

```
digits = "23", mapping: '2'→"abc", '3'→"def"

backtrack(idx=0, curr="")
│  digits[0] = '2' → 字母 "abc"
│
├── 选 'a': backtrack(idx=1, curr="a")
│   │  digits[1] = '3' → 字母 "def"
│   ├── 选 'd': backtrack(idx=2, curr="ad")
│   │   idx == 2 == digits.length → ★ 收集 "ad"
│   ├── 选 'e': backtrack(idx=2, curr="ae")
│   │   ★ 收集 "ae"
│   └── 选 'f': backtrack(idx=2, curr="af")
│       ★ 收集 "af"
│
├── 选 'b': backtrack(idx=1, curr="b")
│   ├── 选 'd': ★ 收集 "bd"
│   ├── 选 'e': ★ 收集 "be"
│   └── 选 'f': ★ 收集 "bf"
│
└── 选 'c': backtrack(idx=1, curr="c")
    ├── 选 'd': ★ 收集 "cd"
    ├── 选 'e': ★ 收集 "ce"
    └── 选 'f': ★ 收集 "cf"

结果：["ad","ae","af","bd","be","bf","cd","ce","cf"]
```

### Java代码（第一次优化）

```java
import java.util.*;

class Solution {
    // 数字到字母映射
    private static final String[] MAPPING = {"", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"};

    public List<String> letterCombinations(String digits) {
        List<String> result = new ArrayList<>();
        if (digits == null || digits.isEmpty()) {
            return result;
        }
        backtrack(digits, 0, "", result);
        return result;
    }

    private void backtrack(String digits, int idx, String curr, List<String> result) {
        // 结束条件：所有数字都处理完了
        if (idx == digits.length()) {
            result.add(curr);
            return;
        }

        // 获取当前数字对应的字母集
        String letters = MAPPING[digits.charAt(idx) - '0'];

        // 遍历每个字母，递归处理下一个数字
        for (char c : letters.toCharArray()) {
            backtrack(digits, idx + 1, curr + c, result); // 拼接字符串传递
            // 不需要显式回溯！因为 curr + c 产生了新字符串，curr 本身没变
        }
    }
}
```

### 关于"不需要显式回溯"

```
注意这里没有 "撤销选择" 的步骤！

原因：String 是不可变对象
  curr + c 创建了一个新的 String 对象
  原来的 curr 没有被修改
  递归返回后，curr 仍然是原来的值

对比：
  全排列用 List<Integer> path → path 是可变的 → 需要 path.remove()
  这里用 String curr → curr 不可变 → 自动"回溯"

代价：
  每次拼接都创建新 String 对象 → 不够高效
```

### 复杂度分析

时间复杂度：
```
与暴力法相同：O(n * k^n)
  k^n 个叶子节点
  每个叶子节点处字符串长度为 n

最好 = 最坏 = 平均 = O(n * k^n)
  其中 n = digits.length, k = 平均每个数字对应的字母数（3~4）
```

空间复杂度：
```
递归栈深度：O(n)
字符串拼接中间对象：每层递归创建一个新 String

额外空间（不含结果）：O(n)
结果集：O(n * k^n)

相比暴力 BFS：节省了队列中存放所有中间结果的空间
```

### 优点与不足

✅ DFS 回溯结构清晰，代码简洁
✅ 不需要队列存放所有中间结果
✅ 不需要显式回溯（String 不可变）
❌ 每次 `curr + c` 创建新 String 对象（O(n) 拷贝）
❌ 大量短生命周期的中间字符串对象

优化方向：
> 用 StringBuilder 代替 String 拼接，避免重复创建字符串对象

---

## 四、最终优化（回溯 + StringBuilder，最优解）

### 优化思路

核心改进：
```
用 StringBuilder 代替 String 拼接
  StringBuilder 是可变对象，append 和 deleteCharAt 都是 O(1)
  不会创建中间字符串对象
  需要显式回溯（deleteCharAt 撤销选择）

对比：
  String 拼接：curr + c → O(n) 创建新对象，不用回溯
  StringBuilder：sb.append(c) → O(1)，需要 sb.deleteCharAt() 回溯
```

### 回溯树（与第一次优化相同）

以 `digits = "23"` 为例：

```
                         ""
                /         |         \
             "a"         "b"         "c"          ← digits[0]='2' → abc
           / | \       / | \       / | \
        "ad" "ae" "af" "bd" "be" "bf" "cd" "ce" "cf"  ← digits[1]='3' → def
         ★    ★    ★    ★    ★    ★    ★    ★    ★
```

### 详细执行过程（StringBuilder 版本）

```
digits = "23", sb = StringBuilder

backtrack(idx=0, sb="")
│  digits[0] = '2' → "abc"
│
├── append('a'): sb="a"
│   backtrack(idx=1, sb="a")
│   │  digits[1] = '3' → "def"
│   │
│   ├── append('d'): sb="ad"
│   │   backtrack(idx=2, sb="ad")
│   │   │  idx==len → ★ 收集 "ad"
│   │   deleteCharAt(1): sb="a"     ← 回溯！
│   │
│   ├── append('e'): sb="ae"
│   │   backtrack(idx=2, sb="ae")
│   │   │  ★ 收集 "ae"
│   │   deleteCharAt(1): sb="a"     ← 回溯！
│   │
│   └── append('f'): sb="af"
│       backtrack(idx=2, sb="af")
│       │  ★ 收集 "af"
│       deleteCharAt(1): sb="a"     ← 回溯！
│
│   deleteCharAt(0): sb=""           ← 回溯！
│
├── append('b'): sb="b"
│   backtrack(idx=1, sb="b")
│   ├── append('d'): sb="bd" → ★ "bd" → 回溯 sb="b"
│   ├── append('e'): sb="be" → ★ "be" → 回溯 sb="b"
│   └── append('f'): sb="bf" → ★ "bf" → 回溯 sb="b"
│   deleteCharAt(0): sb=""           ← 回溯！
│
└── append('c'): sb="c"
    backtrack(idx=1, sb="c")
    ├── append('d'): sb="cd" → ★ "cd" → 回溯 sb="c"
    ├── append('e'): sb="ce" → ★ "ce" → 回溯 sb="c"
    └── append('f'): sb="cf" → ★ "cf" → 回溯 sb="c"
    deleteCharAt(0): sb=""           ← 回溯！

结果：["ad","ae","af","bd","be","bf","cd","ce","cf"]
```

---

### StringBuilder 状态变化追踪

```
操作               sb 内容    动作
────────────────────────────────────
append('a')       "a"        选择
  append('d')     "ad"       选择
    收集 "ad"     "ad"       ★
  delete(1)       "a"        回溯
  append('e')     "ae"       选择
    收集 "ae"     "ae"       ★
  delete(1)       "a"        回溯
  append('f')     "af"       选择
    收集 "af"     "af"       ★
  delete(1)       "a"        回溯
delete(0)         ""         回溯
append('b')       "b"        选择
  append('d')     "bd"       选择
    收集 "bd"     "bd"       ★
  delete(1)       "b"        回溯
  ...（后续类似）
```

### String vs StringBuilder 对比

```
                String 版                   StringBuilder 版
──────────────────────────────────────────────────────────────
选择方式     curr + c（创建新对象）         sb.append(c)（原地修改）
撤销方式     无需撤销（不可变）             sb.deleteCharAt(末尾)
拼接开销     O(n)（每次拷贝整个字符串）      O(1)（均摊）
对象创建     每次递归创建新 String           只有一个 StringBuilder
GC 压力     高（大量短生命周期对象）         低
代码风格     简洁（不用回溯）               经典回溯（做选择/撤销选择）
```

### Java代码（最终优化）

```java
import java.util.*;

class Solution {
    // 数字到字母映射（下标 0,1 不用，2-9 有效）
    private static final String[] MAPPING = {
        "", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"
    };

    public List<String> letterCombinations(String digits) {
        List<String> result = new ArrayList<>();
        if (digits == null || digits.isEmpty()) {
            return result;
        }
        backtrack(digits, 0, new StringBuilder(), result);
        return result;
    }

    private void backtrack(String digits, int idx, StringBuilder sb, List<String> result) {
        // 结束条件：所有数字都处理完，收集当前组合
        if (idx == digits.length()) {
            result.add(sb.toString());
            return;
        }

        // 获取当前数字对应的字母集
        String letters = MAPPING[digits.charAt(idx) - '0'];

        // 遍历每个字母
        for (char c : letters.toCharArray()) {
            sb.append(c);                              // 做选择
            backtrack(digits, idx + 1, sb, result);    // 递归下一个数字
            sb.deleteCharAt(sb.length() - 1);          // 撤销选择（回溯）
        }
    }
}
```

### 代码设计要点

```
1. MAPPING 数组设计：
   下标直接对应数字，mapping[digit - '0'] 即可取到字母集
   下标 0 和 1 为空字符串（题目保证不会出现）

2. 空输入处理：
   digits 为 null 或 "" → 直接返回空列表
   不进入递归

3. 回溯三步曲：
   ① sb.append(c)           → 做选择
   ② backtrack(idx + 1)     → 递归
   ③ sb.deleteCharAt(末尾)   → 撤销选择

4. 收集结果：
   sb.toString() → 创建结果字符串（只在叶子节点创建一次）
```

### 复杂度分析

时间复杂度：
```
设 digits 长度为 n
每个数字对应 k 个字母（k = 3 或 4）

叶子节点数 = k1 * k2 * ... * kn
  最坏（全是 7 或 9）：4^n
  最好（全是 2,3,4,5,6,8）：3^n

每个叶子节点：sb.toString() 创建长度 n 的字符串 → O(n)

总时间：O(n * 4^n)（最坏）/ O(n * 3^n)（最好）

一般表示为：O(n * 4^n)
```

空间复杂度：
```
递归栈深度：O(n)
StringBuilder：O(n)（最长 n 个字符）
结果集：O(n * 4^n)

额外空间（不含结果）：O(n)
```

---

## 五、三种解法对比总结

| 解法             | 核心思路                 | 时间复杂度     | 额外空间 | 特点               |
| -------------- | -------------------- | --------- | ---- | ---------------- |
| BFS 队列迭代       | 逐层展开所有组合             | O(n * 4^n) | O(n * 4^n) | 直观但内存大       |
| 回溯 + String 拼接 | DFS 递归，String 不可变自动回溯 | O(n * 4^n) | O(n) | 简洁但创建多余对象       |
| 回溯 + StringBuilder | DFS 递归，原地修改 + 显式回溯   | O(n * 4^n) | O(n) | 最优，经典回溯，无多余对象 |

---

## 六、关键记忆点

### 核心思想

```
看到"数字/按键对应多个字符，求所有组合" → 回溯

本质：多叉树的 DFS 遍历
  每个数字 = 一层
  每个字母 = 一条分支
  根到叶子的路径 = 一个组合
```

### 与全排列、子集的对比

```
                全排列          子集           电话号码
───────────────────────────────────────────────────────────
选择来源       同一个数组       同一个数组      不同层不同字母集
是否用 start   否（用 used）   是              否（idx 自动递增）
收集时机       叶子节点         每个节点        叶子节点
循环范围       0~n-1           start~n-1      当前数字的字母集
```

### 回溯模板（本题适配）

```java
void backtrack(String digits, int idx, StringBuilder sb) {
    if (idx == digits.length()) {
        result.add(sb.toString());  // 叶子节点收集
        return;
    }

    String letters = MAPPING[digits.charAt(idx) - '0'];

    for (char c : letters.toCharArray()) {
        sb.append(c);
        backtrack(digits, idx + 1, sb);
        sb.deleteCharAt(sb.length() - 1);
    }
}
```

### 易错点

```
1. 空输入：
   ✅ digits 为空直接返回空列表
   ❌ 不检查 → 进入递归后 idx==0==length → 收集空字符串 ""

2. 映射数组下标：
   ✅ MAPPING[digit - '0']（字符转数字）
   ❌ MAPPING[digit]（char 值是 ASCII 码 50~57，越界！）

3. String 版 vs StringBuilder 版的回溯：
   ✅ String 版：不用回溯（不可变，自动恢复）
   ✅ StringBuilder 版：必须 deleteCharAt 回溯
   ❌ StringBuilder 版忘记回溯 → 结果全部拼在一起

4. 结果收集：
   ✅ sb.toString() 创建新字符串存入结果
   ❌ 直接存 sb 引用 → 所有结果指向同一个对象，最终全是空串
```

### 面试答题顺序

```
1. 识别：多个集合各选一个 → 回溯 / 多叉树 DFS
2. 建模：数字→字母映射，每层对应一个数字
3. 画回溯树：展示分支选择
4. 写代码：StringBuilder + 经典回溯三步
5. 复杂度：O(n * 4^n) 时间，O(n) 额外空间
6. 追问优化：String → StringBuilder 的优化理由
```

### 记忆口诀

```
电话号码字母组合
数字映射多叉树
逐层选字母递归
StringBuilder做选择
回溯撤销删末尾
叶子节点收结果
```

---

# leetcode 39

## 一、题目理解

题目：**Combination Sum（组合总和）**

给定一个**无重复元素**的整数数组 `candidates` 和一个目标整数 `target`，找出 `candidates` 中所有可以使数字之和等于 `target` 的组合。

`candidates` 中的**同一个数字可以无限制重复被选取**。如果至少一个数字的被选数量不同，则两种组合是不同的。

### 示例

输入：
```
candidates = [2, 3, 6, 7], target = 7
```

输出：
```
[[2, 2, 3], [7]]
```

解释：
```
2 + 2 + 3 = 7 ✓
7 = 7 ✓
```

---

输入：
```
candidates = [2, 3, 5], target = 8
```

输出：
```
[[2, 2, 2, 2], [2, 3, 3], [3, 5]]
```

---

输入：
```
candidates = [2], target = 1
```

输出：
```
[]
```

### 关键约束

```
1 <= candidates.length <= 30
2 <= candidates[i] <= 40
candidates 中所有元素互不相同
1 <= target <= 40

关键点：
  ① 元素可以重复选取（不限次数）
  ② 组合不能重复（[2,3,3] 和 [3,2,3] 算同一个）
  ③ candidates 无重复元素
```

### 与已做题目的联系

```
子集(78)：    每个元素选 0 或 1 次，收集所有节点
全排列(46)：  每个元素恰好选 1 次，顺序有关
组合总和(39)：每个元素选 0~∞ 次，要求和为 target

关键区别：
  子集 → start 避免重复，每个元素最多选一次
  组合总和 → start 避免重复，但同一元素可以再选（递归传 i 而非 i+1）
```

---

## 二、暴力解法（不去重的全搜索 + 过滤）

### 思路（最直观）

最暴力的想法：不管顺序，生成所有可能的组合，最后过滤掉重复的。

```
对于每一步：
  从 candidates 中任选一个数加入路径
  如果当前和 == target → 收集
  如果当前和 > target → 停止
  否则 → 继续选

问题：
  [2,3,3] 和 [3,2,3] 和 [3,3,2] 都会被生成
  需要排序后去重 → 代码复杂、效率低
```

### 过程图解

以 `candidates = [2, 3], target = 5` 为例：

```
                          [] sum=0
                       /         \
                    [2]           [3]
                   / \            / \
               [2,2] [2,3]    [3,2] [3,3]
               / \     |       |      |
          [2,2,2] ... [2,3,3] [3,2,2] [3,3,3]>5
              ↓
          sum=6>5 停
```

产生大量重复：
```
[2,3] 和 [3,2] 排序后都是 [2,3] → 重复
需要用 Set<List<Integer>> 去重
每次收集前要把 path 排序后检查是否已存在
```

### Java代码（暴力解法）

```java
import java.util.*;

class Solution {
    public List<List<Integer>> combinationSum(int[] candidates, int target) {
        Set<List<Integer>> resultSet = new HashSet<>();
        backtrack(candidates, target, 0, new ArrayList<>(), resultSet);
        return new ArrayList<>(resultSet);
    }

    private void backtrack(int[] candidates, int remain, int sum, List<Integer> path, Set<List<Integer>> resultSet) {
        if (sum == remain) {
            // 排序后加入 Set 去重
            List<Integer> sorted = new ArrayList<>(path);
            Collections.sort(sorted);
            resultSet.add(sorted);
            return;
        }
        if (sum > remain) {
            return; // 超过目标，剪枝
        }

        // 从所有候选数中任选（不限制起点 → 会产生重复组合）
        for (int candidate : candidates) {
            path.add(candidate);
            backtrack(candidates, remain, sum + candidate, path, resultSet);
            path.remove(path.size() - 1);
        }
    }
}
```

### 复杂度分析

时间复杂度：
```
每一步有 n 个选择，递归深度最多 target/min(candidates)
分支数 = n，深度 = T/M（T=target, M=最小候选值）

搜索树节点数：O(n^(T/M))
每个叶子还要排序 O(k log k) 和 Set 查重 O(k)

总时间：O(n^(T/M) * k log k)

极其浪费！大量重复组合被生成后再丢弃
```

空间复杂度：
```
递归栈：O(T/M)
Set 存储去重：额外空间
排序中间列表：O(k)

总空间：O(n^(T/M))（最坏情况 Set 很大）
```

### 不足之处

❌ 生成大量重复组合（[2,3] 和 [3,2]）
❌ 每次收集都要排序 + Set 去重，开销大
❌ 搜索空间远大于实际答案数

优化方向：
> 用 start 参数控制只往后选，从源头避免重复

---

## 三、第一次优化（回溯 + start 去重）

### 优化思路

核心改进：
```
添加 start 参数，每次只从 candidates[start..n-1] 中选择
  保证组合中的元素下标不回头 → 天然去重

与子集问题(78)的区别：
  子集：选了 nums[i] 后递归传 i+1（每个元素最多选一次）
  组合总和：选了 candidates[i] 后递归传 i（同一元素可以再选）
```

### 为什么传 i 而不是 i+1？

```
题目允许重复选取同一元素：
  [2, 2, 3] 是合法的（选了两次 2）
  
如果传 i+1：
  选了 candidates[0]=2 后，下次从 candidates[1] 开始
  → 2 只能被选一次 → 无法生成 [2,2,3]

如果传 i：
  选了 candidates[0]=2 后，下次仍从 candidates[0] 开始
  → 2 可以被再次选取 → 可以生成 [2,2,3] ✓
```

### 回溯树

以 `candidates = [2, 3, 6, 7], target = 7` 为例：

```
                              [] remain=7
                    /          |         \          \
               [2] r=5     [3] r=4    [6] r=1    [7] r=0 ★
              / |  \        / \         |
         [2,2] [2,3] [2,6] [3,3] [3,6] [6,6]
          r=3   r=2   r=-1  r=1   r=-2  r=-5
         / \     |     ✗    |     ✗      ✗
    [2,2,2][2,2,3]  [2,3,3] [3,3,3]
     r=1    r=0 ★   r=-1 ✗  r=-2 ✗
      |
   [2,2,2,2]
    r=-1 ✗

★ = remain == 0，收集结果
✗ = remain < 0，剪枝停止
```

注意：每个节点只向右选择（start 保证不回头），所以不会出现 [3,2,2]。

### 详细执行过程

```
candidates = [2, 3, 6, 7], target = 7

backtrack(start=0, remain=7, path=[])
│
├─ i=0: 选 2, path=[2], remain=5
│  backtrack(start=0, remain=5, path=[2])
│  │
│  ├─ i=0: 选 2, path=[2,2], remain=3
│  │  backtrack(start=0, remain=3, path=[2,2])
│  │  │
│  │  ├─ i=0: 选 2, path=[2,2,2], remain=1
│  │  │  backtrack(start=0, remain=1, path=[2,2,2])
│  │  │  │
│  │  │  ├─ i=0: 选 2, remain=-1 < 0 → 剪枝（其实进入后发现）
│  │  │  │  但 candidates[0]=2 > remain=1？不，2>1 → 如果排序可以直接剪枝
│  │  │  │  不排序时：path=[2,2,2,2], remain=-1 → return
│  │  │  ├─ i=1: 选 3, 3>1 → 同理 remain<0 → return
│  │  │  ├─ i=2: 选 6, 6>1 → return
│  │  │  └─ i=3: 选 7, 7>1 → return
│  │  │  回溯：path=[2,2]
│  │  │
│  │  ├─ i=1: 选 3, path=[2,2,3], remain=0
│  │  │  remain == 0 → ★ 收集 [2,2,3]
│  │  │  回溯：path=[2,2]
│  │  │
│  │  ├─ i=2: 选 6, remain=-3 → return
│  │  └─ i=3: 选 7, remain=-4 → return
│  │  回溯：path=[2]
│  │
│  ├─ i=1: 选 3, path=[2,3], remain=2
│  │  backtrack(start=1, remain=2, path=[2,3])
│  │  │  i=1: 选 3, remain=-1 → return
│  │  │  i=2: 选 6, remain<0 → return
│  │  │  i=3: 选 7, remain<0 → return
│  │  回溯：path=[2]
│  │
│  ├─ i=2: 选 6, remain=-1 → return
│  └─ i=3: 选 7, remain=-2 → return
│  回溯：path=[]
│
├─ i=1: 选 3, path=[3], remain=4
│  backtrack(start=1, remain=4, path=[3])
│  ├─ i=1: 选 3, path=[3,3], remain=1
│  │  │  i=1: 3>1 → return
│  │  │  i=2,3: 更大 → return
│  │  回溯：path=[3]
│  ├─ i=2: 选 6, remain=-2 → return
│  └─ i=3: 选 7, remain=-3 → return
│  回溯：path=[]
│
├─ i=2: 选 6, path=[6], remain=1
│  │  i=2: 6>1 → return
│  │  i=3: 7>1 → return
│  回溯：path=[]
│
└─ i=3: 选 7, path=[7], remain=0
   remain == 0 → ★ 收集 [7]
   回溯：path=[]

最终结果：[[2,2,3], [7]]
```

### Java代码（第一次优化）

```java
import java.util.*;

class Solution {
    public List<List<Integer>> combinationSum(int[] candidates, int target) {
        List<List<Integer>> result = new ArrayList<>();
        backtrack(candidates, target, 0, new ArrayList<>(), result);
        return result;
    }

    private void backtrack(int[] candidates, int remain, int start, List<Integer> path, List<List<Integer>> result) {
        // remain == 0：找到一个合法组合
        if (remain == 0) {
            result.add(new ArrayList<>(path));
            return;
        }
        // remain < 0：超过目标，停止
        if (remain < 0) {
            return;
        }

        // 从 start 开始选择（避免重复组合）
        for (int i = start; i < candidates.length; i++) {
            path.add(candidates[i]);
            // 传 i（不是 i+1）：允许重复选取同一个元素
            backtrack(candidates, remain - candidates[i], i, path, result);
            path.remove(path.size() - 1); // 回溯
        }
    }
}
```

### 复杂度分析

时间复杂度：
```
搜索树的大小取决于 target 和 candidates 的值
设 T = target，M = min(candidates)
最大递归深度 = T/M

不好精确计算，上界为 O(n^(T/M))
但因为 start 参数剪掉了大量分支，实际远小于暴力法

每个合法组合复制 path：O(T/M)
```

空间复杂度：
```
递归栈：O(T/M)
path 列表：O(T/M)

额外空间（不含结果）：O(T/M)
```

### 优点与不足

✅ start 参数天然去重，不需要 Set
✅ 比暴力法少搜索大量重复分支
✅ 允许重复选取（传 i 而非 i+1）
❌ 仍有无效搜索：当 candidates[i] > remain 时还会进入递归后才发现

优化方向：
> 对 candidates 排序，当 candidates[i] > remain 时直接 break（排序后后面的更大，全部可以跳过）

---

## 四、最终优化（回溯 + 排序剪枝，最优解）

### 优化思路

核心改进：**先排序，然后在循环中提前剪枝**

```
排序后：candidates 从小到大排列

剪枝条件：
  如果 candidates[i] > remain → 后面的 candidates[i+1], candidates[i+2]... 都更大
  全部不可能满足 → 直接 break，跳过所有后续分支！

不排序：
  candidates = [7, 3, 2], target = 5
  选 7 → remain=-2 → 才知道不行
  选 3 → remain=2 → 继续
  选 2 → remain=3 → 继续
  没有利用"后续全部更大可以跳过"的信息

排序后：
  candidates = [2, 3, 7], target = 5
  选 2 → remain=3 → 继续
  选 3 → remain=2 → 继续
  选 7 → 7>5 → break！不用再看后面的了
```

### 剪枝效果对比

```
candidates = [2, 3, 6, 7], target = 7

不排序（第一次优化）：
  每个分支都要进入递归后才通过 remain<0 返回

排序后剪枝（最终优化）：
  当 candidates[i] > remain 时直接 break
  节省了进入递归 → 检查 → 返回的开销

示例：backtrack(start=0, remain=3, path=[2,2])
  不剪枝：i=0(2✓), i=1(3✓→remain=0★), i=2(6→进入→return), i=3(7→进入→return)
  剪枝：  i=0(2✓), i=1(3✓→remain=0★), i=2(6>3→break！) → 省了 i=2 和 i=3
```

### 回溯树（排序 + 剪枝）

以 `candidates = [2, 3, 6, 7], target = 7` 为例（已排序）：

```
                          [] remain=7
                   /        |        \          \
              [2] r=5    [3] r=4   [6] r=1   [7] r=0 ★
             / |  \       / \        ✂
        [2,2] [2,3] [2,6] [3,3] [3,6]
         r=3   r=2    ✂    r=1    ✂
        / \     |          ✂
   [2,2,2][2,2,3] [2,3,3]
    r=1    r=0 ★    ✂
     |
  [2,2,2,2]
     ✂ (2>1→break? 不，2>1✓但进入后remain=-1? 不对)

更精确：
  [2,2,2] remain=1
    i=0: candidates[0]=2, 2>1 → break！
    → 直接结束，不再尝试
```

✂ = 被 break 剪掉的分支

### 完整剪枝执行过程

```
排序后 candidates = [2, 3, 6, 7], target = 7

backtrack(start=0, remain=7, path=[])
│
├─ i=0: 2≤7 ✓, 选 2, path=[2], remain=5
│  backtrack(start=0, remain=5, path=[2])
│  │
│  ├─ i=0: 2≤5 ✓, 选 2, path=[2,2], remain=3
│  │  backtrack(start=0, remain=3, path=[2,2])
│  │  │
│  │  ├─ i=0: 2≤3 ✓, 选 2, path=[2,2,2], remain=1
│  │  │  backtrack(start=0, remain=1, path=[2,2,2])
│  │  │  │  i=0: 2>1 → break ✂（2,3,6,7 全部 > 1，一个都不试）
│  │  │  回溯：path=[2,2]
│  │  │
│  │  ├─ i=1: 3≤3 ✓, 选 3, path=[2,2,3], remain=0
│  │  │  ★ 收集 [2,2,3]
│  │  │  回溯：path=[2,2]
│  │  │
│  │  ├─ i=2: 6>3 → break ✂（6,7 都跳过）
│  │  回溯：path=[2]
│  │
│  ├─ i=1: 3≤5 ✓, 选 3, path=[2,3], remain=2
│  │  backtrack(start=1, remain=2, path=[2,3])
│  │  │  i=1: 3>2 → break ✂（3,6,7 全跳过）
│  │  回溯：path=[2]
│  │
│  ├─ i=2: 6>5 → break ✂（6,7 跳过）
│  回溯：path=[]
│
├─ i=1: 3≤7 ✓, 选 3, path=[3], remain=4
│  backtrack(start=1, remain=4, path=[3])
│  │
│  ├─ i=1: 3≤4 ✓, 选 3, path=[3,3], remain=1
│  │  backtrack(start=1, remain=1, path=[3,3])
│  │  │  i=1: 3>1 → break ✂
│  │  回溯：path=[3]
│  │
│  ├─ i=2: 6>4 → break ✂
│  回溯：path=[]
│
├─ i=2: 6≤7 ✓, 选 6, path=[6], remain=1
│  backtrack(start=2, remain=1, path=[6])
│  │  i=2: 6>1 → break ✂
│  回溯：path=[]
│
└─ i=3: 7≤7 ✓, 选 7, path=[7], remain=0
   ★ 收集 [7]
   回溯：path=[]

最终结果：[[2,2,3], [7]]
```

### 剪枝节省的节点数

```
                    不剪枝       排序+剪枝
─────────────────────────────────────────
递归调用次数        约 20 次       约 12 次
无效进入再返回      8 次           0 次
break 直接跳过     0 次           6 次
```

---

### Java代码（最终优化）

```java
import java.util.*;

class Solution {
    public List<List<Integer>> combinationSum(int[] candidates, int target) {
        List<List<Integer>> result = new ArrayList<>();
        Arrays.sort(candidates); // 排序！为剪枝做准备
        backtrack(candidates, target, 0, new ArrayList<>(), result);
        return result;
    }

    private void backtrack(int[] candidates, int remain, int start, List<Integer> path, List<List<Integer>> result) {
        // 找到合法组合
        if (remain == 0) {
            result.add(new ArrayList<>(path));
            return;
        }

        for (int i = start; i < candidates.length; i++) {
            // 剪枝：排序后，如果当前数已经大于 remain，后面的更大，全部跳过
            if (candidates[i] > remain) {
                break;
            }

            path.add(candidates[i]);           // 做选择
            // 传 i：允许重复选取同一元素
            backtrack(candidates, remain - candidates[i], i, path, result);
            path.remove(path.size() - 1);      // 撤销选择
        }
    }
}
```

### 代码设计要点

```
1. Arrays.sort(candidates)：
   排序是剪枝的前提
   排序本身 O(n log n)，远小于回溯的指数级复杂度

2. if (candidates[i] > remain) break：
   不是 continue！而是 break！
   排序后当前值已经超了，后面所有值都更大 → 全部不用试

3. 递归传 i（不是 i+1）：
   允许重复选取同一个候选数
   传 i → 下次仍可以选 candidates[i]
   传 i+1 → 每个数最多用一次（变成"组合总和II"）

4. 不需要 remain < 0 的判断：
   因为 break 已经确保 candidates[i] <= remain
   不会出现 remain < 0 的情况
```

### 复杂度分析

时间复杂度：
```
设 T = target，M = min(candidates), n = candidates.length

搜索树深度：最多 T/M 层（每层至少减少 M）
每层分支数：最多 n 个

理论上界：O(n^(T/M))

但排序剪枝大幅减少实际搜索量：
  一旦 candidates[i] > remain → 后面全部跳过
  实际分支数远小于 n

排序开销：O(n log n)，可忽略

最好：O(n log n)（target < min(candidates)，直接返回空）
最坏：O(n^(T/M))（所有 candidates 都很小）
平均：远小于 O(n^(T/M))
```

空间复杂度：
```
递归栈：O(T/M)
path 列表：O(T/M)

额外空间（不含结果）：O(T/M)
```

---

## 五、三种解法对比总结

| 解法          | 核心思路              | 时间复杂度       | 额外空间  | 特点            |
| ----------- | ----------------- | ----------- | ----- | ------------- |
| 暴力全搜索       | 不限起点 + Set 去重     | O(n^(T/M) * k log k) | O(n^(T/M)) | 大量重复，效率极低     |
| 回溯 + start  | start 限制不回头选      | O(n^(T/M))  | O(T/M) | 天然去重，无多余搜索    |
| 回溯 + 排序剪枝 | 排序 + break 提前终止 | O(n^(T/M))  | O(T/M) | 最优，大幅减少无效分支 |

---

## 六、关键记忆点

### 核心思想

```
看到"组合/和为 target/元素可复选" → 回溯 + start + 传 i

三个关键词对应三个设计：
  "组合"（无序） → start 参数避免重复
  "和为 target" → remain 递减，== 0 时收集
  "可复选"     → 递归传 i（不是 i+1）
```

### 组合总和模板

```java
void backtrack(int[] candidates, int remain, int start, List<Integer> path) {
    if (remain == 0) {
        result.add(new ArrayList<>(path));
        return;
    }

    for (int i = start; i < candidates.length; i++) {
        if (candidates[i] > remain) break; // 剪枝（需排序）

        path.add(candidates[i]);
        backtrack(candidates, remain - candidates[i], i, path); // 传 i
        path.remove(path.size() - 1);
    }
}
```

### 与相关题目的对比表

```
                  组合总和(39)     组合总和II(40)    子集(78)       全排列(46)
──────────────────────────────────────────────────────────────────────────────
元素可复选？       ✅ 可以          ❌ 不可以         ❌ 不可以       ❌ 不可以
有重复元素？       ❌ 没有          ✅ 有             ❌ 没有         ❌ 没有
递归传参          i               i+1              i+1            0（+used）
剪枝             排序+break       排序+break+同层跳  无             无
收集时机          remain==0       remain==0        每个节点        叶子节点
```

### 递归传 i vs i+1 的区别

```
传 i（可复选）：
  选了 candidates[i] 后还可以再选它
  [2,2,3] ✓

传 i+1（不可复选）：
  选了 candidates[i] 后只能选后面的
  [2,2,3] ✗（除非 candidates 中有两个 2）
```

### 易错点

```
1. 递归传参 i vs i+1：
   ✅ 组合总和传 i（元素可复选）
   ❌ 传 i+1 → 每个数最多用一次，漏解

2. 剪枝是 break 不是 continue：
   ✅ break（后面全跳过）
   ❌ continue（只跳当前，后面可能更小？不对，已排序！）

3. 排序是剪枝的前提：
   ✅ 先 Arrays.sort 再回溯
   ❌ 不排序就 break → 可能漏掉后面的小数

4. 收集结果必须拷贝：
   ✅ result.add(new ArrayList<>(path))
   ❌ result.add(path)
```

### 面试答题顺序

```
1. 识别：组合 + 和为 target + 可复选 → 回溯
2. 去重策略：start 参数，只往后选
3. 可复选：递归传 i
4. 优化：排序 + break 剪枝
5. 写代码：sort → backtrack → 收集/剪枝/选择/回溯
6. 复杂度：O(n^(T/M)) 上界，剪枝优化实际远小于此
```

### 记忆口诀

```
组合总和回溯解
start不回头传i可复选
排序之后break剪枝
remain为零收结果
做选择递归撤选择
```

---
