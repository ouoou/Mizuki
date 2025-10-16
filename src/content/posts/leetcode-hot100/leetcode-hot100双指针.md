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