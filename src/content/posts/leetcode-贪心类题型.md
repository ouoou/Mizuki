---
title: Leetcode-贪心类题型
published: 2025-09-06
updated: 2025-09-06
description: ""
image: ""
tags:
  - Leetcode
  - 贪心
category: Leetcode
draft: false
---

# LeetCode 3495

## 题目回顾

你有一个二维数组 `queries`，其中每个查询 `queries[i] = [li, ri]` 代表一个包含从 `li` 到 `ri`（包含两端）所有整数的数组 `nums`。

你可以执行以下操作任意次：
*   选择同一个 `nums` 数组中的**两个**整数 `x` 和 `y`。
*   将它们分别替换为 `floor(x / 4)` 和 `floor(y / 4)`。

目标是计算使 `queries` 中**所有**查询对应的数组元素最终都变为 0 所需的**最少总操作次数**。

## 思路拆解

### 第一步：将“除以4”操作转化为“操作次数”

关键洞察是，对于任何一个正整数 `n`，我们关心的不是它本身，而是**需要多少次“除以4”的操作才能让它变成0**。

这个次数是可以预先计算出来的：
*   数字 `1, 2, 3`：经过 1 次 `//4` 操作后变为 0。
*   数字 `4, 5, ..., 15` (即 4^1 到 4^2 - 1)：需要 2 次操作。第一次 `//4` 后变成 `1, 1, ..., 3`，第二次再 `//4` 变成 0。
*   数字 `16, 17, ..., 63` (即 4^2 到 4^3 - 1)：需要 3 次操作。
*   ...
*   一般规律：数字 `n` 需要的操作次数是 `⌈log₄(n + 1)⌉` 或者更简单地说，是满足 `4^(k-1) <= n < 4^k` 的那个 `k`。

我们可以定义一个函数 `f(n)`，它返回将数字 `n` 变为 0 所需的操作次数。

### 第二步：将原问题转化为新问题

经过第一步的转化，原来的 `queries[i] = [li, ri]` 不再是一个包含 `(ri - li + 1)` 个连续整数的数组，而变成了一个包含 `(ri - li + 1)` 个“操作次数”的数组。

例如，如果 `li=1`, `ri=5`，那么原始数组是 `[1, 2, 3, 4, 5]`，对应的操作次数数组是 `[f(1), f(2), f(3), f(4), f(5)] = [1, 1, 1, 2, 2]`。

现在，我们的操作也发生了变化：
*   **旧操作**：选择数组中的两个数 `x`, `y`，将它们变为 `x//4`, `y//4`。
*   **新操作**：选择操作次数数组中的两个**正数**，将它们各自**减 1**。（因为一次“除以4”操作会让该数字剩余所需的操作次数减少1）

**因此，原问题被完美地转化为了一个经典问题：**

> 给定一个由非负整数组成的数组，每次操作可以选择其中两个大于0的元素，并将它们各自减1。问最少需要多少次操作，才能让数组中所有元素都变为0？

### 第三步：解决经典贪心问题

现在，我们需要解决的是针对每个查询 `[li, ri]`，计算其对应的操作次数数组 `A = [f(li), f(li+1), ..., f(ri)]` 变为全0所需的最少操作数。

这是一个非常经典的贪心/数学问题。设数组 `A` 的总和为 `S`，最大值为 `M`。

我们来仔细推导为什么最少操作次数的公式是：

$$
\text{ans} = \max(M, \lceil S/2 \rceil)
$$

---


经过前面步骤的转化后：

* 给定一个数组 $A = [f(l), f(l+1), \dots, f(r)]$，其中每个元素表示一个数字变为 0 所需的操作次数。
* 每次操作可以选择 **两个大于 0 的元素**，将它们各自减 1。
* 问最少操作次数，使数组全部变为 0。

记：

* $S = \sum_{i=l}^r f(i)$ → 所有操作次数的总和
* $M = \max\{f(i)\}$ → 区间最大操作次数

---


**(1) 下界 1：总和 S 限制**

* 一次操作最多可以同时减少两个元素各 1，总共减少 **2**。
* 因此，要将总和 $S$ 减到 0，至少需要：

$$
\lceil S/2 \rceil
$$

次操作。

> 这是因为即使每次都能选择两个正数，也最多消耗 2 个单位。

---

**(2) 下界 2：最大值 M 限制**

* 假设区间中最大元素为 $M$。
* 每次操作每个数最多减 1，因此 **这个最大数至少需要被操作 M 次**。
* 所以最少操作次数也不能小于 $M$。

---

**(3) 两个下界取最大**

因此，综合两个约束，最少操作次数满足：

$$
\text{ans} = \max(M, \lceil S/2 \rceil)
$$

---

### 第四步：高效计算区间和与最大值

最后的挑战是如何高效地计算任意区间 `[l, r]` 内所有 `f(i)` 的和 `S` 以及最大值 `M`。


## java解法暴力

```java
class Solution {
    public long minOperations(int[][] queries) {
        int n = queries.length;
        long res = 0;
        for (int i = 0; i < n; i++) {
            int[] query = queries[i];
            int [] f = change(query);
            int s = 0;
            int m = 0;
            for (int j = 0; j < f.length; j++) {
                s += f[j];
                m = Math.max(m, f[j]);
            }
            res += Math.max(m, (s + 1) / 2);
        }
        return res;
    }

    private int[] change(int[] query) {
        int [] f = new int[query[1] - query[0] + 1];
        for (int i = query[0], j = 0; i <= query[1]; i++, j++) {
            int k = 0;
            while ((1L << (2 * k)) <= i) {
                k++;
            }
            f[j] = k;
        }
        return f;
    }
}
```

### 为什么是``(1L << (2 * k)) <= i``？
数字i满足 `4^(k-1) <= i < 4^k` 的那个 `k`。

数学里我们常写 `4^k`。
但是在程序里，乘方运算通常比较慢（`Math.pow` 还是 `double`，容易出精度问题）。

于是考虑：

$$
4^k = (2^2)^k = 2^{2k}
$$

---

**位运算替代乘方**

在 Java 里，`1L << m` 等价于 $2^m$。
比如：

* `1L << 3 = 8` （因为 $2^3 = 8$）
* `1L << 6 = 64` （因为 $2^6 = 64$）

所以：

$$
4^k = 2^{2k} = (1L << (2 * k))
$$

---

**放进不等式**

我们想要找到最小的 `k` 使得：

$$
i < 4^k
$$

也就是：

$$
i < (1L << (2 * k))
$$

同时，要保证：

$$
i \ge 4^{k-1} = (1L << (2 * (k-1)))
$$

---


### 为什么是`(s + 1) / 2`

1. 来源：一次操作最多消耗 2 个单位**

* 总操作量 = $S = \sum f(i)$
* 每次操作可以选择两个大于 0 的数，各减 1 → 每次最多减少 2 单位。

所以理论上至少需要：

$$
\frac{S}{2} \text{次操作}
$$

---

**2. 为什么要取上界**

* 当 $S$ 是偶数时：$S/2$ 正好够
* 当 $S$ 是奇数时：$S/2$ 会有小数，操作次数必须是整数 → 取上界：

$$
\lceil S/2 \rceil
$$

* 例如：`S = 7`

    * 7/2 = 3.5
    * 至少需要 4 次操作 → $\lceil 3.5 \rceil = 4$

---

**3. 为什么 Java 写成 `(s + 1) / 2`**

* Java 整数除法会 **向下取整**

    * `7 / 2 = 3`
* 为了实现上取整，可以利用公式：

$$
\lceil S/2 \rceil = \frac{S + 1}{2} \quad \text{当 S 为整数时}
$$

* 例子：

    * S=7 → (7+1)/2 = 8/2 = 4 ✅
    * S=6 → (6+1)/2 = 7/2 = 3 (向下取整) ❌
      → 注意这里 `(S+1)/2` 在 S 偶数时会多算 1

---

# leetcode 1733

## 暴力思路

遍历所有语言 L（假设一共有 m 种语言）。

对于每一对好友 (u, v)：

如果他们已经能交流 → 跳过；

如果不能交流 → 那么至少 u 或 v 中有人要学语言 L。

对于所有不能交流的好友，把涉及的人标记下来：

如果该人不会语言 L → 他就需要被教。

统计需要被教的人数，作为当前语言 L 的代价。

所有语言里，取最小代价作为答案。

## java暴力解法

```java
class Solution {
    public int minimumTeachings(int n, int[][] languages, int[][] friendships) {
        int mu = languages.length;
        List<Set<Integer>> userKnows = new ArrayList<>();
        for (int i = 0; i < mu; i++) {
            Set<Integer> know = new HashSet<>();
            for (int l : languages[i]) {
                know.add(l);
            }
            userKnows.add(know);
        }

        int ans = mu;
        for (int i = 1; i <= n; i++) {
            HashSet<Integer> needTeach = new HashSet<>();
            for (int[] friends : friendships) {
                int friend1 = friends[0];
                int friend2 = friends[1];
                Set<Integer> friend1Languages = userKnows.get(friend1 - 1);
                Set<Integer> friend2Languages = userKnows.get(friend2 - 1);
                if (friend1Languages.stream().anyMatch(friend2Languages::contains)) {
                    continue;
                }
                if (!friend1Languages.contains(i)) {
                    needTeach.add(friend1);
                }
                if (!friend2Languages.contains(i)) {
                    needTeach.add(friend2);
                }
            }
            ans = Math.min(ans, needTeach.size());
        }
        return ans;
    }
}
```
## 优化思路

把每个人会的语言存成集合 know[i]（i 0-based）。同时记录语言编号的上界 m（或用 map）以便计数。

遍历每个好友对 (u,v)（输入是 1-based，先减 1）：

如果 know[u] 与 know[v] 有交集 → 他们能交流，跳过。

否则把 u 和 v 加入 conflictPeople（集合 S）。

如果 S 为空，答案 0（所有好友对都能交流）。

对 S 中的每个人 p，遍历 know[p]，统计 cnt[lang]++。

找到 maxCnt = max_L cnt[L]，答案 = |S| - maxCnt。

直观：选那门语言能覆盖最多冲突人群中的已知员，剩下要教的人最少。

## java贪心优化

```java
class Solution {
    public int minimumTeachings(int n, int[][] languages, int[][] friendships) {
        List<HashSet<Integer>> userKnows = new ArrayList<>();
        int ml = 0;
        for (int[] ls : languages) {
            HashSet<Integer> knows = new HashSet<>();
            for (int l : ls) {
                knows.add(l);
                ml = Math.max(ml, l);
            }
            userKnows.add(knows);
        }
        HashSet<Integer> c = new HashSet<>();
        for (int [] fs : friendships) {
            int a = fs[0];
            int b = fs[1];
            HashSet<Integer> aKnows = userKnows.get(a - 1);
            HashSet<Integer> bKnows = userKnows.get(b - 1);
            if (aKnows.stream().noneMatch(bKnows::contains)) {
                c.add(a);
                c.add(b);
            }
        }
        if (c.isEmpty()) return 0;
        int [] cnt = new int[ml + 1];
        for (Integer user : c) {
            HashSet<Integer> knows = userKnows.get(user - 1);
            for (Integer l : knows) {
                cnt[l]++;
            }
        }

        int ans = Integer.MAX_VALUE;
        for (int i = 1; i <= ml; i++) {
            ans = Math.min(ans, c.size() - cnt[i]);
        }
        return ans;
    }
}
```