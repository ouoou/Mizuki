---
title: Leetcode-hot100哈希
published: 2025-10-14
updated: 2025-10-14
description: ""
image: ""
tags:
  - hot100
  - 双指针
category: Leetcode
draft: false
---

# leetcode 283

## java解法

```java
class Solution {
    public void moveZeroes(int[] nums) {
        int l = 0;
        for (int r = 0; r < nums.length; r++) {
            if (nums[r] != 0) {
                nums[l++] = nums[r];
            }
        }
        while (l < nums.length) {
            nums[l++] = 0;
        }
    }
}
```


# leetcode 11

## java解法
```JAVA
class Solution {
    public int maxArea(int[] height) {
        int l = 0;
        int r = height.length - 1;
        int res = 0;
        while (l < r) {
            int area = (r - l) * Math.min(height[l], height[r]);
            res = Math.max(res, area);
            if (height[l] < height[r]) {
                l++;
            } else {
                r--;
            }
        }
        return res;
    }
}
```

# leetcode 15

## 思路

---

### 1️⃣ 排序是关键

先把数组排序（从小到大），这样我们可以用双指针方便地移动。

```java
Arrays.sort(nums);
```

排序之后，整个问题变成：

> 对每一个固定的 `nums[i]`，
> 在它右边的区间 `[i+1, n-1]` 内，找出两个数 `nums[l]` 和 `nums[r]`，使得
> `nums[i] + nums[l] + nums[r] == 0`

---

### 2️⃣ 固定一个数，用双指针找另外两个数

我们遍历数组（`i` 从 0 到 n-3），每次固定一个数 `nums[i]`。

然后设置：

* 左指针 `l = i + 1`
* 右指针 `r = n - 1`

根据三数之和来移动指针：

* 如果 `sum = nums[i] + nums[l] + nums[r] < 0` → 左边太小，`l++`
* 如果 `sum > 0` → 右边太大，`r--`
* 如果 `sum == 0` → 找到一个组合，保存下来，然后跳过重复的数。

---

### 3️⃣ 避免重复三元组

要防止结果重复，注意两点：

1. **固定数去重**：如果 `nums[i] == nums[i-1]`，直接跳过。
2. **左右指针去重**：当找到一个符合的三元组后：

   ```java
   while (l < r && nums[l] == nums[l + 1]) l++;
   while (l < r && nums[r] == nums[r - 1]) r--;
   ```

---


## java解法

```java
class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> res = new ArrayList<>();
        for (int i = 0; i < nums.length - 2; i++) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            int l = i + 1;
            int r = nums.length - 1;
            while (l < r) {
                int sum = nums[i] + nums[l] + nums[r];
                if (sum == 0) {
                    List<Integer> ans = new ArrayList<>();
                    ans.add(nums[i]);
                    ans.add(nums[l]);
                    ans.add(nums[r]);
                    res.add(ans);
                    while (l < r && nums[l] == nums[l + 1]) l++;
                    while (l < r && nums[r] == nums[r - 1]) r--;
                    r--;
                    l++;
                } else if (sum < 0) {
                    l++;
                } else {
                    r--;
                }
            }
        }
        return res;
    }
}
```
