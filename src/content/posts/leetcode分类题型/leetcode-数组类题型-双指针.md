---
title: Leetcode-数组类题型-双指针
published: 2025-09-23
updated: 2025-09-23
description: ""
image: ""
tags:
  - Leetcode
  - 数组
  - 双指针
category: Leetcode
draft: false
---
# LeetCode 165


## 题目要求：  
给定两个版本号 `version1` 和 `version2`，比较它们的大小。

- 如果 `version1 > version2` 返回 `1`
    
- 如果 `version1 < version2` 返回 `-1`
    
- 如果相等返回 `0`
    

版本号格式：

- 由数字和 `.` 分隔，比如 `"1.01"`, `"1.0"`, `"1.0.0"`。
    
- 每个部分可能有前导零，但比较时要忽略前导零，例如 `"01"` 和 `"1"` 相等。
    
- 末尾的 `.0` 不影响比较，例如 `"1.0"` 和 `"1"` 相等。
    

---

### 解题思路

#### 思路 1：按分割比较（推荐）

1. 用 `split("\\.")` 将 `version1` 和 `version2` 分别切分为数组。
    
    - 比如 `"1.01"` → `[1, 1]`，`"1.001"` → `[1, 1]`。
        
2. 遍历两个数组的最长长度：
    
    - 若某一数组越界，则补零。
        
    - 比较对应位置的数字大小。
        
3. 遇到不相等直接返回 `1` 或 `-1`，否则继续。
    
4. 全部比完返回 `0`。
    

---

#### 思路 2：双指针遍历（更省内存）

1. 不需要一次性 `split` 整个字符串。
    
2. 用两个指针分别在 `version1` 和 `version2` 上移动。
    
3. 每次提取一个段落（遇到 `.` 停止），转成整数比较。
    
4. 如果相等则继续移动，直到字符串末尾。
    
5. 若所有段落都相等，返回 `0`。
    

---


## java解法（分割遍历）

```java
class Solution {  
    public int compareVersion(String version1, String version2) {  
        String[] split1 = version1.split("\\.");  
        String[] split2 = version2.split("\\.");  
        int n = Math.max(split1.length, split2.length);  
  
        for (int i = 0; i < n; i++) {  
            int i1 = i > split1.length - 1 ? 0 : Integer.parseInt(split1[i]);  
            int i2 = i > split2.length - 1 ? 0 : Integer.parseInt(split2[i]);  
  
            if (i1 > i2) {  
                return 1;  
            } else if (i2 > i1){  
                return -1;  
            }  
        }  
        return 0;  
    }  
}
```

## java解法 （双指针）

```java
class Solution {  
    public int compareVersion(String version1, String version2) {  
        int i = 0;  
        int j = 0;  
        int n = version1.length();  
        int m = version2.length();  
        while (i < n || j < m) {  
            int num1 = 0;  
            int num2 = 0;  
            while (i < n && version1.charAt(i) != '.') {  
                num1 = num1 * 10 + version1.charAt(i) - '0';  
                i++;  
            }  
  
            while (j < m && version2.charAt(j) != '.') {  
                num2 = num2 * 10 + version2.charAt(j) - '0';  
                j++;  
            }  
            if (num1 > num2) return 1;  
            if (num2 > num1) return -1;  
            i++;  
            j++;  
        }  
        return 0;  
    }  
}
```


# Leetcode 151

## java（split遍历）

```java
class Solution {  
    public String reverseWords(String s) {  
        String[] split = s.split(" ");  
        StringBuilder ans = new StringBuilder();  
        for (int i = split.length - 1; i >= 0; i--) {  
            if (Objects.equals(split[i], "")) {  
                continue;  
            }  
            ans.append(split[i]);  
            ans.append(" ");  
        }  
        return ans.substring(0, ans.length() - 1);  
    }  
}
```
## java（双指针）

```java
class Solution {  
    public String reverseWords(String s) {  
        int n = s.length();  
        int r = n - 1, l = r;  
        StringBuilder ans = new StringBuilder();  
        while (r >= 0) {  
            while (r >= 0 && s.charAt(r) == ' ') {  
                r--;  
            }  
            if (r < 0) break; // 说明处理完了  
  
            l = r;  
            while (l >= 0 && s.charAt(l) != ' ') {  
                l--;  
            }  
            ans.append(s.substring(l + 1, r + 1));  
            ans.append(" ");  
            r = l;  
        }  
        return ans.substring(0, ans.length() - 1);  
    }  
}
```

# Leetcode26

## java解法（双指针）

```java
class Solution {  
    public int removeDuplicates(int[] nums) {  
        int idx = 0;  
        int last = nums[idx++];  
        for (int i = 1; i < nums.length; i++) {  
            if (last == nums[i]) {  
                continue;  
            }  
            nums[idx++] = nums[i];  
            last = nums[i];  
        }  
        return idx;  
    }  
}
```
