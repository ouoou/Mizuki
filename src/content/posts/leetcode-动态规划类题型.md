---
title: Leetcode-动态规划类题型
published: 2025-09-07
updated: 2025-09-07
description: ""
image: ""
tags:
  - Leetcode
  - 动态规划
category: Leetcode
draft: false
---

# Leetcode2327


## java暴力解法

```java
class Solution {
    public int peopleAwareOfSecret(int n, int delay, int forget) {
        final int MOD = 1_000_000_007;
        List<Integer> list = new ArrayList<>();
        list.add(1);
        for (int day = 2; day <= n; day++) {
            List<Integer> persons = new ArrayList<>();
            for (Integer learnDay : list) {
                if (day >= learnDay + delay && day < learnDay + forget) {
                    persons.add(day);
                }
            }
            list.addAll(persons);
        }
        int ans = 0;
        for (int day : list) {
            if (day + forget > n) {
                ans++;
            }
        }
        return ans % MOD;
    }
}
```

## java暴力空间优化
### 为什么要从``Math.max(1, n - forget + 1)``天开始算
当forget > n 时 从第一天知道消息的人就不会忘记，需从第一天开始算起
当forget < n 时 第i天数所能分享的时间区间是``[i + delay, i + forget)``
最小有效可分享的天数区间是``[n - forget + 1, n]``
```java
class Solution {
    public int peopleAwareOfSecret(int n, int delay, int forget) {
        int MOD = 1_000_000_007;
        // 第i天新知道的人数
        int [] c = new int[n + 1];
        c[1] = 1;

        for (int day = 2; day <= n; day++) {
            int num = 0;
            for (int i = 1; i < day; i++) {
                if (day >= delay + i && day < forget + i) {
                    num = (num + c[i]) % MOD;
                }
            }
            c[day] = num;
        }

        int ans = 0;
        for (int i = Math.max(1, n - forget + 1); i <= n; i++) {
            ans = (ans + c[i]) % MOD;
        }
        return ans;
    }
}
```

## 动态规划+前缀和优化

### 公式推导
假设某人在第 j 天知道秘密，那么他可以在天数区间``[j+delay, j+forget-1]`` 这段时间内每天把秘密分享给 1 个新的人（每个可分享的人每天都分享一次）。
第 i 天能新知道秘密的人 = 来自之前某些天 j 的人分享的结果。

因此第 i 天新知道的人，来自所有能在第 i 天分享的人，也就是满足（判断第 i 天是否落在这个区间）
``j + delay <= i <= j + forget - 1``
**把条件改写成 j 的范围**
因此可得 =>
1: ``i >= j + delay`` => ``j <= i - delay``
2: ``i <= j + forget - 1`` => ``j >= i - forget + 1``
所以j的取值范围可得
``[i - forget + 1, i - delay]``
为什么要 Math.max(1, …)
因为 j 必须 ≥ 1（第 1 天才有人知道秘密），所以：
``Math.max(1, i - forget + 1)``





### 1. 最原始的递推定义

前面已经推过：
第 `i` 天新知道秘密的人数 = 所有在 `[L, R]` 天知道秘密的人传出来的。

数学表达式：

$$
dp[i] = \sum_{j=L}^{R} dp[j]
$$

其中：

* $L = \max(1, i - forget + 1)$
* $R = i - delay$

---

### 2. 问题：如何快速算区间和

如果直接用上式，每算一天就要循环从 L 到 R，复杂度 O(n²)。
优化的关键：区间和可以用 **前缀和**。

---

### 3. 定义前缀和数组

我们定义：

$$
pref[k] = dp[1] + dp[2] + ... + dp[k]
$$

（`pref[0] = 0`）

这样 pref 就存储了前 k 天总共有多少人学会了秘密。

---

### 4. 用前缀和表示区间和

那么区间和

$$
\sum_{j=L}^{R} dp[j]
$$

就可以写作：

$$
pref[R] - pref[L-1]
$$

---

## 5. 代入递推式

所以：

$$
dp[i] = pref[R] - pref[L-1]
$$

注意：要确保 $R \ge L$，否则说明没人能在第 i 天传秘密，dp\[i] = 0。

---

## 6. 举例验证

设 `delay=2, forget=4, n=6`，看第 i=6 天：

* L = 6 - 4 + 1 = 3
* R = 6 - 2 = 4
* 区间 \[3,4]
* 所以：

  $$
  dp[6] = dp[3] + dp[4] = pref[4] - pref[2]
  $$

---

### java解法
```java
class Solution {
    public int peopleAwareOfSecret(int n, int delay, int forget) {
        int MOD = 1_000_000_007;
        int [] dp = new int[n + 1];
        int [] prefix = new int[n + 1];
        dp[1] = 1;
        prefix[1] = 1;

        //  [j+delay,j-forget+1]
        //  [i - forget + 1, i - delay]
        for (int i = 2; i <= n; i++) {
            int l = Math.max(1, i - forget + 1);
            int r = i - delay;
            if (r >= l) {
                dp[i] = (prefix[r] - prefix[l - 1]) % MOD;
                if (dp[i] < 0) dp[i] += MOD;
            }
            prefix[i] = (prefix[i - 1] + dp[i]) % MOD;
        }
        int ans = prefix[n] - prefix[n-forget];
        if (ans < 0) ans += MOD;
        return ans;
    }
}
```