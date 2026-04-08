---
title: Leetcode-hot100二叉树
published: 2026-03-04
updated: 2026-03-04
description: ""
image: ""
tags:
  - hot100
  - 二叉树
category: Leetcode
draft: false
---

# leetcode94

给定一个二叉树，返回它的 **中序遍历结果**：

> 左子树 → 根节点 → 右子树

---

## 一、问题定义

例如二叉树：

```
    1
     \
      2
     /
    3
```

中序遍历结果：

```
[1, 3, 2]
```

---

## 二、解题思路演进

我们从最直观的做法开始，一步步优化。

---

### ✅ 解法一：暴力解法 —— 递归遍历（最直观）

#### 思路

中序遍历的定义本身就是递归的：

```
inorder(root):
    inorder(root.left)
    visit(root)
    inorder(root.right)
```

所以最直观的解法就是：

* 用递归函数遍历左子树
* 访问当前节点
* 遍历右子树

#### 代码（暴力解法：递归）

```java
import java.util.*;

class Solution {
    public List<Integer> inorderTraversal(TreeNode root) {
        List<Integer> res = new ArrayList<>();
        dfs(root, res);
        return res;
    }

    private void dfs(TreeNode node, List<Integer> res) {
        if (node == null) return;

        dfs(node.left, res);     // 左
        res.add(node.val);       // 根
        dfs(node.right, res);    // 右
    }
}
```

#### 过程图解（递归调用栈）

以示例树为例：

```
        1
         \
          2
         /
        3
```

递归过程：

```
dfs(1)
 └─ dfs(null)        // 左
 └─ add(1)
 └─ dfs(2)
      └─ dfs(3)
           └─ dfs(null)
           └─ add(3)
           └─ dfs(null)
      └─ add(2)
```

输出顺序：

```
1 → 3 → 2
```

#### 复杂度分析

* 时间复杂度：O(n)
  每个节点访问一次
* 空间复杂度：O(n)（最坏情况是链状树，递归栈深度 n）

### 不足之处

❌ 使用了系统递归栈
❌ 在面试中常被追问：

> “能不能不用递归？”

---

### ✅ 解法二：第一次优化 —— 用显式栈模拟递归（迭代法）

#### 优化思路

递归本质 = 栈
我们用一个 `Stack<TreeNode>` 来模拟递归过程。

核心思想：

* 一路向左压栈
* 到底后弹出访问
* 再转向右子树

#### 算法步骤

```
while (当前节点不为空 或 栈不为空):
    一直向左走，入栈
    弹出栈顶节点，访问
    转向右子树
```

---

#### 过程图解（栈变化）

初始树：

```
    1
     \
      2
     /
    3
```

执行过程：

| 操作        | curr | 栈内容   | 输出      |
| --------- | ---- | ----- | ------- |
| push 1    | 1    | [1]   | []      |
| curr=null | null | [1]   | []      |
| pop 1     | 1    | []    | [1]     |
| curr=2    | 2    | []    | [1]     |
| push 2    | 2    | [2]   | [1]     |
| push 3    | 3    | [2,3] | [1]     |
| pop 3     | 3    | [2]   | [1,3]   |
| pop 2     | 2    | []    | [1,3,2] |

---

#### 代码（第一次优化：迭代+栈）

```java
import java.util.*;

class Solution {
    public List<Integer> inorderTraversal(TreeNode root) {
        List<Integer> res = new ArrayList<>();
        Stack<TreeNode> stack = new Stack<>();
        TreeNode curr = root;

        while (curr != null || !stack.isEmpty()) {
            // 一直走到最左边
            while (curr != null) {
                stack.push(curr);
                curr = curr.left; 
            }

            // 处理节点
            curr = stack.pop();
            res.add(curr.val);

            // 转向右子树
            curr = curr.right;
        }

        return res;
    }
}
```

#### 复杂度分析

* 时间复杂度：O(n)
* 空间复杂度：O(n)（显式栈）



# leetcode 104

当然可以！LeetCode **[104] 二叉树的最大深度（Maximum Depth of Binary Tree）** 是一道非常经典的二叉树题目，特别适合用来训练：

> 从直观暴力 → 优化思路 → 最优解法（递归 / BFS）

题目要求：
给定一个二叉树，返回它的 **最大深度（从根节点到最远叶子节点的节点数）**。

---

## 一、问题理解

示例二叉树：

```text
        3
       / \
      9  20
         / \
        15  7
```

最大深度 = 3
路径：3 → 20 → 15 或 3 → 20 → 7

---

## 二、解题思路演进

我们从“最直观”的方法开始，一步步优化。

---

### ✅ 解法一：暴力解法 —— 枚举所有路径，取最大长度

#### 思路（最直观）

最原始的想法是：

1. 找出从根节点到每一个叶子节点的所有路径
2. 记录每条路径的长度
3. 返回其中最大的长度

这相当于：

* 用 DFS 走遍所有路径
* 用一个 List 保存路径长度
* 最后取 max

#### 伪代码

```text
dfs(node, depth):
    如果 node 是叶子节点:
        记录 depth
    dfs(node.left, depth+1)
    dfs(node.right, depth+1)
```

---

#### 过程图解（递归树）

```text
dfs(3,1)
├── dfs(9,2)   → 叶子 → 记录 2
└── dfs(20,2)
     ├── dfs(15,3) → 叶子 → 记录 3
     └── dfs(7,3)  → 叶子 → 记录 3
```

记录的深度集合：

```text
[2, 3, 3] → max = 3
```

---

#### Java代码（暴力解法）

```java
import java.util.*;

class Solution {
    List<Integer> depths = new ArrayList<>();

    public int maxDepth(TreeNode root) {
        if (root == null) return 0;
        dfs(root, 1);
        int max = 0;
        for (int d : depths) {
            max = Math.max(max, d);
        }
        return max;
    }

    private void dfs(TreeNode node, int depth) {
        if (node == null) return;

        if (node.left == null && node.right == null) {
            depths.add(depth);
        }

        dfs(node.left, depth + 1);
        dfs(node.right, depth + 1);
    }
}
```

---

#### 复杂度分析

* 时间复杂度：O(n)（遍历所有节点）
* 空间复杂度：O(n)（存储所有路径深度 + 递归栈）

#### 不足之处

❌ 额外使用 List 存储所有路径
❌ 实际上我们只需要“最大值”，不需要保存所有结果
→ 可以边算边取最大值

---

### ✅ 解法二：第一次优化 —— DFS递归直接返回高度

#### 优化思路

不再保存所有路径，只关心当前节点的最大深度。

定义函数含义：

```text
maxDepth(node) = 该节点为根的子树最大深度
```

递推公式：

```text
maxDepth(node) = max(maxDepth(node.left), maxDepth(node.right)) + 1
```

边界条件：

```text
node == null → 返回 0
```

---

#### 过程图解（自底向上）

```text
            3
           / \
          9  20
             / \
            15  7
```

计算过程：

```text
depth(9)  = 1
depth(15) = 1
depth(7)  = 1
depth(20) = max(1,1)+1 = 2
depth(3)  = max(1,2)+1 = 3
```

---

#### Java代码（第一次优化：递归最优解）

```java
class Solution {
    public int maxDepth(TreeNode root) {
        if (root == null) return 0;

        int leftDepth = maxDepth(root.left);
        int rightDepth = maxDepth(root.right);

        return Math.max(leftDepth, rightDepth) + 1;
    }
}
```

---

#### 复杂度分析

* 时间复杂度：O(n)
* 空间复杂度：O(h)

    * h 为树高度
    * 最坏情况（链状树）：O(n)
    * 平衡树：O(log n)

#### 优点

✅ 不需要额外集合
✅ 代码极简
✅ 思路清晰
✅ 面试首选写法

---

### ✅ 解法三：最终优化 —— BFS层序遍历（迭代最优解）

#### 为什么说这是“最优解之一”？

从问题本质看：

> 最大深度 = 层数

那么我们可以：

* 用 BFS（队列）
* 一层一层遍历
* 每遍历一层，depth++

不需要递归栈，更适合大数据量场景（避免栈溢出）

---

#### 算法步骤

```text
如果 root == null 返回 0
初始化队列 queue，放入 root
depth = 0

while queue 不为空:
    size = queue.size()   // 当前层节点数
    遍历 size 次：
        出队节点
        把左右孩子入队
    depth++
```

---

#### 过程图解（队列变化）

初始：

```text
Queue: [3]
depth = 0
```

第一层：

```text
Queue: [9,20]
depth = 1
```

第二层：

```text
Queue: [15,7]
depth = 2
```

第三层：

```text
Queue: []
depth = 3
```

最终结果：3

---

#### Java代码（最终优化：BFS）

```java
import java.util.*;

class Solution {
    public int maxDepth(TreeNode root) {
        if (root == null) return 0;

        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);
        int depth = 0;

        while (!queue.isEmpty()) {
            int size = queue.size(); // 当前层节点数

            for (int i = 0; i < size; i++) {
                TreeNode node = queue.poll();

                if (node.left != null) queue.offer(node.left);
                if (node.right != null) queue.offer(node.right);
            }

            depth++;
        }

        return depth;
    }
}
```

# leetcode 226


## 一、题目理解（LeetCode 226：翻转二叉树）

题目要求：
给你一棵二叉树的根节点 `root`，请你将这棵树 **左右子树全部交换（镜像翻转）**，并返回翻转后的根节点。

示例：

原树：

```
     4
    / \
   2   7
  / \ / \
 1  3 6  9
```

翻转后：

```
     4
    / \
   7   2
  / \ / \
 9  6 3  1
```

---

## 二、解题思路演进

---

## ✅ 解法一：暴力解法 —— 构造一棵新树（复制 + 翻转）

### 1. 思路（最直观）

最容易想到的做法：

1. 新建一棵树 `newRoot`
2. 对原树进行遍历（DFS）
3. 每访问一个节点，就在新树中创建对应节点
4. 但左右孩子要 **反着挂**：

  * 原来的 `left` → 新树的 `right`
  * 原来的 `right` → 新树的 `left`

本质：

> 用一棵新树来存储“翻转后的结果”

---

### 2. 过程图解（递归构建新树）

原树：

```
    1
   / \
  2   3
```

构建新树时：

```
newRoot = 1
newRoot.left  = invert(old.right)  -> 3
newRoot.right = invert(old.left)   -> 2
```

结果：

```
    1
   / \
  3   2
```

---

### 3. Java代码（暴力解法）

```java
class Solution {
    public TreeNode invertTree(TreeNode root) {
        if (root == null) return null;

        // 创建新节点
        TreeNode newRoot = new TreeNode(root.val);

        // 递归构造：左右子树对调
        newRoot.left = invertTree(root.right);
        newRoot.right = invertTree(root.left);

        return newRoot;
    }
}
```

---

### 4. 复杂度分析

* 时间复杂度：

  * O(n)，每个节点访问一次
* 空间复杂度：

  * O(n)，新建了一棵树
  * 递归栈最坏 O(n)

---

### 5. 不足之处

❌ 额外创建了一整棵新树（浪费内存）
❌ 题目并不要求新树，可以原地修改

优化方向：

> 能否 **在原树上直接交换左右子树（原地修改）？**

---

## ✅ 解法二：第一次优化 —— DFS 原地交换（递归）

### 1. 优化思路

不再创建新树，而是在原树上操作：

对每一个节点：

1. 交换 `left` 和 `right`
2. 再递归处理左右子树

递归函数含义：

```
invertTree(root)：翻转以 root 为根的子树
```

---

### 2. 递归公式

边界条件：

```
if (root == null) return null;
```

核心逻辑：

```
交换 root.left 和 root.right
invertTree(root.left)
invertTree(root.right)
```

---

### 3. 过程图解（递归展开）

原树：

```
    4
   / \
  2   7
```

步骤：

1️⃣ 在节点 4：

```
交换 2 和 7
```

变成：

```
    4
   / \
  7   2
```

2️⃣ 对 7 递归：

```
交换 6 和 9
```

3️⃣ 对 2 递归：

```
交换 1 和 3
```

最终：

```
     4
    / \
   7   2
  / \ / \
 9  6 3  1
```

---

### 4. Java代码（第一次优化：递归原地翻转）

```java
class Solution {
    public TreeNode invertTree(TreeNode root) {
        if (root == null) return null;

        // 交换左右子树
        TreeNode temp = root.left;
        root.left = root.right;
        root.right = temp;

        // 递归翻转左右子树
        invertTree(root.left);
        invertTree(root.right);

        return root;
    }
}
```

---

### 5. 复杂度分析

* 时间复杂度：

  * O(n)，每个节点交换一次
* 空间复杂度：

  * O(h)，递归栈深度
  * 最坏（链状树）：O(n)
  * 平衡树：O(log n)

---

### 6. 优点与不足

✅ 不创建新树，原地修改
✅ 代码简洁
❌ 使用递归，可能存在栈溢出风险（极深的树）

进一步优化方向：

> 用 **迭代（BFS / 栈）** 替代递归

---

## ✅ 解法三：最终优化 —— BFS 层序遍历（迭代，最优解）

### 1. 为什么这是最优解？

从本质看：

> 每个节点都要交换一次左右子树 → 必须访问所有节点（O(n)）

BFS（队列）：

* 不依赖递归栈
* 更稳定
* 不会栈溢出
* 同样是 O(n)

因此：

> 时间最优 O(n)，空间可控，是工程实践中的最优解法之一

---

### 2. 算法步骤（BFS）

```
如果 root == null，返回 null
初始化队列 queue，把 root 放进去

while queue 不为空：
    node = queue.poll()
    交换 node.left 和 node.right
    如果 node.left != null，入队
    如果 node.right != null，入队
```

---

### 3. 过程图解（队列变化）

初始：

```
Queue: [4]
```

第一轮：

```
取出 4，交换左右子树
Queue: [7, 2]
```

第二轮：

```
取出 7，交换
取出 2，交换
Queue: [9,6,3,1]
```

第三轮：

```
取出 9,6,3,1（叶子节点）
Queue: []
```

完成。

---

### 4. Java代码（最终优化：BFS）

```java
import java.util.*;

class Solution {
    public TreeNode invertTree(TreeNode root) {
        if (root == null) return null;

        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);

        while (!queue.isEmpty()) {
            TreeNode node = queue.poll();

            // 交换左右孩子
            TreeNode temp = node.left;
            node.left = node.right;
            node.right = temp;

            // 入队
            if (node.left != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }

        return root;
    }
}
```

---

### 5. 复杂度分析

* 时间复杂度：

  * O(n)，每个节点访问一次
* 空间复杂度：

  * O(n)，队列最坏存一层节点（完全二叉树最后一层）

---

## 三、三种解法对比总结

| 解法     | 思路     | 时间复杂度 | 空间复杂度 | 特点        |
| ------ | ------ | ----- | ----- | --------- |
| 暴力解法   | 构造新树   | O(n)  | O(n)  | 浪费空间      |
| 递归原地   | DFS 交换 | O(n)  | O(h)  | 最常用       |
| BFS 迭代 | 层序交换   | O(n)  | O(n)  | 最稳健（最优实践） |

---

## 四、记忆口诀（复习用）

### 递归版口诀

> 先交换
> 再递归
> 左右都翻

```
swap(root.left, root.right)
invert(left)
invert(right)
```







# leetcode 543


## 一、题目理解

题目：**Diameter of Binary Tree**

给定一棵二叉树，求 **树的直径**。

**直径定义：**

> 二叉树中 **任意两个节点之间最长路径的边数**

注意：

* 路径 **不一定经过根节点**
* 计算的是 **边数，不是节点数**

示例：

```
      1
     / \
    2   3
   / \
  4   5
```

最长路径：

```
4 -> 2 -> 1 -> 3
```

边数：

```
4-2
2-1
1-3
共 3 条边
```

输出：

```
3
```

---

## 二、暴力解法

### 思路

直观想法：

**枚举每一个节点作为“拐点”**

计算：

```
左子树最大深度 + 右子树最大深度
```

取最大值。

因为：

```
最长路径一定会在某个节点拐弯
```

即：

```
左最深叶子 -> 当前节点 -> 右最深叶子
```

所以：

```
diameter = max( leftDepth + rightDepth )
```

问题：

计算 **depth() 会重复计算很多次**

---

## 算法步骤

对每个节点：

```
1 计算左子树深度
2 计算右子树深度
3 更新最大直径
4 递归左右子树
```

---

## ASCII执行流程

树：

```
        1
       / \
      2   3
     / \
    4   5
```

计算：

```
节点4
左=0 右=0
直径=0

节点5
左=0 右=0
直径=0

节点2
左深度=1
右深度=1

直径 = 2

节点3
左=0
右=0

节点1
左深度=2
右深度=1

直径 = 3
```

---

## Java代码（暴力）

```java
class Solution {

    public int diameterOfBinaryTree(TreeNode root) {
        if (root == null) return 0;

        int left = depth(root.left);
        int right = depth(root.right);

        int curr = left + right;

        int leftDia = diameterOfBinaryTree(root.left);
        int rightDia = diameterOfBinaryTree(root.right);

        return Math.max(curr, Math.max(leftDia, rightDia));
    }

    // 计算树深度
    public int depth(TreeNode node) {
        if (node == null) return 0;

        return Math.max(depth(node.left), depth(node.right)) + 1;
    }
}
```

---

## 复杂度分析

### 时间复杂度

```
每个节点都会计算 depth()

depth() = O(N)

总节点 = N
```

所以：

```
O(N²)
```

最坏情况：

```
链式树

1
 \
  2
   \
    3
```

---

### 空间复杂度

递归栈：

```
O(H)
```

H = 树高度

最坏：

```
O(N)
```

---

## 三、第一次优化（记忆化）

### 问题

暴力解法最大问题：

```
depth() 被重复计算
```

例如：

```
depth(4)
depth(5)
```

被计算多次。

---

## 优化思路

使用 **HashMap缓存深度**

```
Map<TreeNode, depth>
```

如果算过：

```
直接返回
```

---

## Java代码（记忆化）

```java
import java.util.*;

class Solution {

    Map<TreeNode, Integer> map = new HashMap<>();

    public int diameterOfBinaryTree(TreeNode root) {
        if (root == null) return 0;

        int left = depth(root.left);
        int right = depth(root.right);

        int curr = left + right;

        int leftDia = diameterOfBinaryTree(root.left);
        int rightDia = diameterOfBinaryTree(root.right);

        return Math.max(curr, Math.max(leftDia, rightDia));
    }

    public int depth(TreeNode node) {
        if (node == null) return 0;

        if (map.containsKey(node)) {
            return map.get(node);
        }

        int d = Math.max(depth(node.left), depth(node.right)) + 1;

        map.put(node, d);

        return d;
    }
}
```

---

## 复杂度

### 时间复杂度

```
每个节点depth只算一次
```

```
O(N)
```

但是：

```
diameterOfBinaryTree 仍然遍历N次
```

整体：

```
O(N)
```

---

### 空间复杂度

HashMap：

```
O(N)
```

递归栈：

```
O(H)
```

---

## 四、最终优化（最优解）

### 核心思想

**一次DFS同时计算**

```
深度
直径
```

关键观察：

```
计算深度时
已经知道左右深度
```

所以可以顺便更新直径。

---

## 算法

DFS返回：

```
当前节点的深度
```

同时更新：

```
diameter = max(diameter, left + right)
```

---

## 执行流程图解

树：

```
        1
       / \
      2   3
     / \
    4   5
```

递归顺序（后序）：

```
4 -> 5 -> 2 -> 3 -> 1
```

---

### Step1

节点4

```
left = 0
right = 0

diameter = 0
depth = 1
```

---

### Step2

节点5

```
left = 0
right = 0

diameter = 0
depth = 1
```

---

### Step3

节点2

```
left = 1
right = 1

diameter = max(0, 1+1)
         = 2

depth = 2
```

图示

```
    2
   / \
  4   5

路径:
4 -> 2 -> 5
长度=2
```

---

### Step4

节点3

```
left = 0
right = 0

depth = 1
```

---

### Step5

节点1

```
left = 2
right = 1

diameter = max(2, 2+1)
         = 3
```

路径：

```
4 -> 2 -> 1 -> 3
```

最终：

```
diameter = 3
```

---

## 递归树

```
depth(1)
 ├─ depth(2)
 │   ├─ depth(4)
 │   └─ depth(5)
 └─ depth(3)
```

每个节点只访问 **一次**

---

## Java代码（最优）

```java
class Solution {

    int max = 0;

    public int diameterOfBinaryTree(TreeNode root) {
        depth(root);
        return max;
    }

    // 返回节点深度
    public int depth(TreeNode node) {

        if (node == null) {
            return 0;
        }

        int left = depth(node.left);
        int right = depth(node.right);

        // 更新直径
        max = Math.max(max, left + right);

        // 返回当前深度
        return Math.max(left, right) + 1;
    }
}
```

---

# 五、复杂度分析

## 时间复杂度

每个节点访问一次：

```
O(N)
```

N = 节点数

---

## 空间复杂度

递归栈：

```
O(H)
```

H = 树高度

最坏：

```
O(N)
```

平衡树：

```
O(logN)
```

---

# leetcode 102


## java解法

```java
class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> res = new ArrayList<>();
        if (root == null) {
            return res;
        }
        Deque<TreeNode> deque = new ArrayDeque<>();
        deque.offer(root);

        while (!deque.isEmpty()) {
            int size = deque.size();
            List<Integer> list = new ArrayList<>();
            for (int i = 0; i < size; i++) {
                TreeNode poll = deque.poll();
                list.add(poll.val);
                if (poll.left != null) {
                    deque.offer(poll.left);
                }
                if (poll.right != null) {
                    deque.offer(poll.right);
                }
            }

            res.add(list);
        }

        return res;
    }
}
```

# leetcode 108

## 一、题目理解

题目：**Convert Sorted Array to Binary Search Tree**

给定：

```
一个升序排列的数组 nums
```

要求：

```
将其转换为一棵高度平衡的二叉搜索树（BST）
```

### 什么是 BST

BST 性质：

```
左子树所有节点 < 根节点
右子树所有节点 > 根节点
```

### 什么是高度平衡

```
任意节点左右子树高度差 ≤ 1
```

---

### 示例

输入

```
nums = [-10,-3,0,5,9]
```

一个合法输出

```
        0
       / \
    -10   5
      \    \
      -3    9
```

也可以是

```
        0
       / \
     -3   9
     /   /
   -10  5
```

只要 **高度平衡 + BST** 即可。

---

## 二、暴力解法

### 直观思路

因为数组是 **升序**，所以：

```
数组中间元素作为根节点
```

这样左右元素数量最均衡。

暴力思路：

```
1 取中点
2 左半数组递归
3 右半数组递归
```

但是暴力写法常见问题是：

```
每次递归创建新的子数组
```

例如：

```
Arrays.copyOfRange()
```

这样会导致 **大量数组复制**。

---

### 算法步骤

数组：

```
[-10,-3,0,5,9]
```

步骤：

```
Step1 取中点
mid = 2

root = 0
```

左数组

```
[-10,-3]
```

右数组

```
[5,9]
```

递归继续。

---

### 执行过程图

```
数组
[-10,-3,0,5,9]
       ↑
      root
```

递归：

```
           0
         /   \
   [-10,-3]  [5,9]
```

左侧：

```
[-10,-3]
   ↑
  -3
```

右侧：

```
[5,9]
  ↑
  9
```

最终：

```
        0
       / \
     -3   9
     /   /
  -10   5
```

---

### Java代码（暴力）

```java
class Solution {

    public TreeNode sortedArrayToBST(int[] nums) {

        if (nums.length == 0) {
            return null;
        }

        int mid = nums.length / 2;

        TreeNode root = new TreeNode(nums[mid]);

        // 创建新数组（低效）
        int[] left = java.util.Arrays.copyOfRange(nums, 0, mid);
        int[] right = java.util.Arrays.copyOfRange(nums, mid + 1, nums.length);

        root.left = sortedArrayToBST(left);
        root.right = sortedArrayToBST(right);

        return root;
    }
}
```

---

### 时间复杂度

数组复制成本：

```
每层复制 O(N)
```

树高：

```
logN
```

总体：

```
O(N log N)
```

---

### 空间复杂度

数组复制：

```
O(N log N)
```

递归栈：

```
O(logN)
```

问题：

```
内存浪费严重
```

---

## 三、第一次优化（使用索引）

### 优化思路

避免：

```
数组复制
```

改为使用：

```
数组下标范围
```

例如：

```
build(nums, left, right)
```

这样：

```
数组只用一份
```

---

### 递归逻辑

```
mid = (left + right) / 2
```

构建：

```
root = nums[mid]
```

递归：

```
左子树

build(left, mid-1)

右子树

build(mid+1, right)
```

---

### 过程图解

数组

```
index

0 1 2 3 4
-10 -3 0 5 9
```

第一次：

```
left=0 right=4

mid = 2

root = 0
```

```
           0
```

左子树：

```
left=0 right=1

mid = 0
```

```
           0
         /
      -10
```

右子树：

```
left=3 right=4

mid = 3
```

最终：

```
        0
       / \
    -10   5
      \    \
      -3    9
```

---

### Java代码（优化）

```java
class Solution {

    public TreeNode sortedArrayToBST(int[] nums) {

        return build(nums, 0, nums.length - 1);
    }

    private TreeNode build(int[] nums, int left, int right) {

        if (left > right) {
            return null;
        }

        int mid = (left + right) / 2;

        TreeNode root = new TreeNode(nums[mid]);

        root.left = build(nums, left, mid - 1);
        root.right = build(nums, mid + 1, right);

        return root;
    }
}
```

---

### 时间复杂度

每个节点访问一次：

```
O(N)
```

---

### 空间复杂度

递归栈：

```
O(logN)
```

因为树是平衡的。

---


# leetcode 98

## 一、题目理解

题目：**Validate Binary Search Tree**

给定一棵二叉树，判断它是否是 **二叉搜索树（BST）**。

### BST定义

对于任意节点：

```text
左子树所有节点 < 当前节点
右子树所有节点 > 当前节点
```

并且：

```text
左右子树本身也必须是 BST
```

注意关键点：

```text
不是只和父节点比较
而是要满足整个子树范围
```

例如下面这个例子：

```
    5
   / \
  1   4
     / \
    3   6
```

节点 `3` 在 `5` 的右子树，但 `3 < 5`，因此 **不是BST**。

---

## 二、暴力解法

### 直观思路

最直观的方法：

对于每个节点：

```
检查左子树最大值 < 当前节点
检查右子树最小值 > 当前节点
```

只要某个节点违反规则，就不是BST。

---

### 算法步骤

对于节点 `root`：

```
1 找到左子树最大值
2 找到右子树最小值
3 判断
  leftMax < root.val < rightMin
4 递归判断左右子树
```

---

### 过程图解

示例：

```
        5
       / \
      1   7
         / \
        6   8
```

检查 `5`

```
左子树最大值 = 1
右子树最小值 = 6

1 < 5 < 6  ✔
```

检查 `7`

```
左最大 = 6
右最小 = 8

6 < 7 < 8 ✔
```

最终合法。

---

### 复杂度问题

每个节点：

```
需要遍历子树求最大最小
```

例如：

```
N个节点
每次遍历O(N)
```

总复杂度：

```
O(N²)
```

---

### Java代码（暴力）

```java
class Solution {

    public boolean isValidBST(TreeNode root) {
        if (root == null) return true;

        // 检查左子树最大值
        if (root.left != null && max(root.left) >= root.val) {
            return false;
        }

        // 检查右子树最小值
        if (root.right != null && min(root.right) <= root.val) {
            return false;
        }

        return isValidBST(root.left) && isValidBST(root.right);
    }

    private int max(TreeNode node) {
        while (node.right != null) {
            node = node.right;
        }
        return node.val;
    }

    private int min(TreeNode node) {
        while (node.left != null) {
            node = node.left;
        }
        return node.val;
    }
}
```

---

### 复杂度分析

时间复杂度

```
最坏情况 O(N²)
```

空间复杂度

```
递归栈 O(H)
```

H 为树高。

---

## 三、第一次优化（范围限制法）

### 暴力解法的问题

暴力法只比较：

```
父节点
```

但实际上：

```
需要比较整个祖先范围
```

例如：

```
    10
   /  \
  5   15
     /
    6
```

节点 `6`：

```
6 < 15 ✔
```

但：

```
6 < 10 ❌
```

说明：

```
右子树节点必须 > 10
```

---

### 优化思路

给每个节点设置：

```
合法区间 (min , max)
```

规则：

```
node.val 必须满足

min < node.val < max
```

递归更新区间：

```
左子树

(min , node.val)

右子树

(node.val , max)
```

---

### 过程图解

树：

```
        10
       /  \
      5   15
         /
        6
```

开始：

```
root=10

范围 (-∞ , +∞)
```

---

左子树：

```
node=5

范围 (-∞ , 10)
```

合法：

```
-∞ < 5 < 10
```

---

右子树：

```
node=15

范围 (10 , +∞)
```

合法：

```
10 < 15 < +∞
```

---

继续：

```
node=6

范围 (10 , 15)
```

检查：

```
10 < 6 < 15 ❌
```

立即返回 false。

---

### Java代码（优化）

```java
class Solution {

    public boolean isValidBST(TreeNode root) {
        return dfs(root, Long.MIN_VALUE, Long.MAX_VALUE);
    }

    private boolean dfs(TreeNode node, long min, long max) {

        if (node == null) {
            return true;
        }

        if (node.val <= min || node.val >= max) {
            return false;
        }

        return dfs(node.left, min, node.val) &&
               dfs(node.right, node.val, max);
    }
}
```

---

### 复杂度分析

时间复杂度

```
O(N)
```

每个节点访问一次。

空间复杂度

```
O(H)
```

递归栈深度。

---

## 四、最终优化（中序遍历）

### 关键性质

BST 的 **中序遍历** 一定是：

```
严格递增序列
```

例如：

```
    4
   / \
  2   6
 / \ / \
1  3 5  7
```

中序遍历：

```
1 2 3 4 5 6 7
```

如果出现：

```
前一个 >= 后一个
```

就不是BST。

---

### 算法思想

中序遍历：

```
左 -> 根 -> 右
```

维护变量：

```
prev = 上一个节点值
```

检查：

```
current > prev
```

否则：

```
不是BST
```

---

### 过程图解

树：

```
      5
     / \
    3   7
   / \
  2   4
```

中序遍历顺序：

```
2 → 3 → 4 → 5 → 7
```

检查：

```
2 < 3 ✔
3 < 4 ✔
4 < 5 ✔
5 < 7 ✔
```

合法。

---

若出现：

```
3 → 5 → 4
```

检查：

```
5 < 4 ❌
```

返回 false。

---

### 执行流程

递归栈：

```
        5
       /
      3
     /
    2
```

访问顺序：

```
2 → 3 → 4 → 5 → 7
```

维护：

```
prev = 上一个访问节点
```

---

### Java代码（最优）

```java
class Solution {

    private long prev = Long.MIN_VALUE;

    public boolean isValidBST(TreeNode root) {
        return inorder(root);
    }

    private boolean inorder(TreeNode node) {

        if (node == null) {
            return true;
        }

        // 左
        if (!inorder(node.left)) {
            return false;
        }

        // 根
        if (node.val <= prev) {
            return false;
        }

        prev = node.val;

        // 右
        return inorder(node.right);
    }
}
```

---

## 五、复杂度分析

时间复杂度

```
O(N)
```

每个节点访问一次。

最好情况

```
O(N)
```

最坏情况

```
O(N)
```

---

空间复杂度

递归栈：

```
O(H)
```

平衡树

```
O(logN)
```

退化链表

```
O(N)
```

---

## 六、三种解法总结

| 方法   | 思路        | 时间复杂度 | 空间复杂度 |
| ---- | --------- | ----- | ----- |
| 暴力   | 每次找子树最大最小 | O(N²) | O(H)  |
| 范围限制 | 维护合法区间    | O(N)  | O(H)  |
| 中序遍历 | 判断递增序列    | O(N)  | O(H)  |

---

## 七、面试快速记忆

看到：

```
验证BST
```

立刻想到两种方法：

### 方法1（最经典）

```
区间限制
```

模板：

```
node.val 必须

min < node.val < max
```

---

### 方法2（最优雅）

```
BST中序遍历递增
```

模板：

```
if(curr <= prev) return false
```

---

口诀：

```
验证BST两大法

区间限制
中序递增
```

---

# leetcode 230

## java

```java
class Solution {
    public int kthSmallest(TreeNode root, int k) {
        List<Integer> list = new ArrayList<>();
        dfs(root, list);
        return list.get(k - 1);
    }

    private void dfs(TreeNode root, List<Integer> list) {
        if (root == null) {
            return;
        }

        dfs(root.left, list);
        list.add(root.val);
        dfs(root.right, list);
    }
}
```

# leetcode 199

## java

```java
class Solution {
    public List<Integer> rightSideView(TreeNode root) {
        List<Integer> res = new ArrayList<>();
        if (root == null) return res;
        Deque<TreeNode> deque = new ArrayDeque<>();
        deque.offer(root);
        while (!deque.isEmpty()) {
            int size = deque.size();
            for (int i =0; i < size; i++) {
                TreeNode poll = deque.poll();
                if (i == 0) {
                    res.add(poll.val);
                }

                if (poll.right != null) {
                    deque.offer(poll.right);
                }
                if (poll.left != null) {
                    deque.offer(poll.left);
                }
            }
        }
        return res;
    }
}
```



# leetcode114

LeetCode **114. Flatten Binary Tree to Linked List**
要求：把一棵二叉树 **原地展开为链表**，顺序必须是 **前序遍历（root → left → right）**。

最终结构要求：

```
原树:
      1
     / \
    2   5
   / \   \
  3   4   6

展开后:
1
 \
  2
   \
    3
     \
      4
       \
        5
         \
          6
```

所有节点必须满足：

```
node.left = null
node.right = next
```

---

## 一、暴力解法（先前序遍历再重建）

### 思路

最直观的方法：

1. **先做前序遍历**
2. 把所有节点保存到 **List**
3. 按顺序重新连接

步骤：

```
1 前序遍历
  root → left → right

得到序列：
[1,2,3,4,5,6]

2 重新连接

1 -> 2 -> 3 -> 4 -> 5 -> 6
```

---

### 过程图解

原树

```
      1
     / \
    2   5
   / \   \
  3   4   6
```

前序遍历

```
visit(1)
visit(2)
visit(3)
visit(4)
visit(5)
visit(6)
```

得到

```
list = [1,2,3,4,5,6]
```

重新连接

```
1.right = 2
2.right = 3
3.right = 4
4.right = 5
5.right = 6

所有 left = null
```

---

### Java代码

```java
class Solution {
    public void flatten(TreeNode root) {
        if (root == null) return;

        List<TreeNode> list = new ArrayList<>();

        preorder(root, list);

        for (int i = 1; i < list.size(); i++) {
            TreeNode prev = list.get(i - 1);
            TreeNode curr = list.get(i);

            prev.left = null;
            prev.right = curr;
        }
    }

    private void preorder(TreeNode node, List<TreeNode> list) {
        if (node == null) return;

        list.add(node);
        preorder(node.left, list);
        preorder(node.right, list);
    }
}
```

---

### 复杂度分析

时间复杂度

```
前序遍历 O(n)
重新连接 O(n)

总计 O(n)
```

空间复杂度

```
List存储所有节点
O(n)
```

---

### 暴力解法缺点

问题：

```
需要额外 O(n) 空间
```

题目要求：

```
最好原地修改
```

因此需要优化。

---



## 三、最终优化（Morris思想 O(1)空间）

这是 **最优解法**。

核心思想：

```
当前节点如果有左子树

找到左子树最右节点

把原来的 right 接到这里
```

结构：

```
     1
    / \
   2   5
  / \
 3   4
```

步骤：

### Step1

当前节点 = 1

找到

```
left subtree rightmost
```

```
4
```

连接：

```
4.right = 5
```

然后：

```
1.right = 2
1.left = null
```

变成

```
1
 \
  2
 / \
3   4
     \
      5
```

继续处理 2

---

## 完整过程图解

初始

```
      1
     / \
    2   5
   / \   \
  3   4   6
```

---

### Step1

当前 = 1

```
找 left 最右 = 4
```

连接：

```
4.right = 5
```

变为

```
      1
     /
    2
   / \
  3   4
       \
        5
         \
          6
```

然后

```
1.right = 2
1.left = null
```

---

### Step2

当前 = 2

找：

```
left 最右 = 3
```

连接：

```
3.right = 4
```

结果

```
1
 \
 2
  \
   3
    \
     4
      \
       5
        \
         6
```

---

算法流程图

```
curr = root

while curr != null

    if curr.left != null

        找 predecessor
        predecessor.right = curr.right

        curr.right = curr.left
        curr.left = null

    curr = curr.right
```

---

## Java代码（最优）

```java
class Solution {

    public void flatten(TreeNode root) {

        TreeNode curr = root;

        while (curr != null) {

            if (curr.left != null) {

                TreeNode pre = curr.left;

                // 找左子树最右节点
                while (pre.right != null) {
                    pre = pre.right;
                }

                // 连接原右子树
                pre.right = curr.right;

                // 左子树移到右边
                curr.right = curr.left;
                curr.left = null;
            }

            curr = curr.right;
        }
    }
}
```

---

# leetcode 105

## 一、题目理解

题目：**Construct Binary Tree from Preorder and Inorder Traversal**

给定两个数组：
- `preorder`：前序遍历序列
- `inorder`：中序遍历序列

要求：
- 构造并返回对应的二叉树
- 假设树中没有重复元素

### 前序遍历与中序遍历

前序遍历：
```
根 → 左子树 → 右子树
```

中序遍历：
```
左子树 → 根 → 右子树
```

### 关键观察

前序遍历的第一个元素一定是根节点。

在中序遍历中找到根节点后：
- 左边是左子树
- 右边是右子树

### 示例

输入：
```
preorder = [3,9,20,15,7]
inorder = [9,3,15,20,7]
```

输出：
```
    3
   / \
  9  20
    /  \
   15   7
```

---

## 二、暴力解法

### 思路（最直观）

最直观的方法：

1. 从前序遍历中取第一个元素作为根节点
2. 在中序遍历中找到根节点的位置
3. 根据位置划分左右子树
4. 递归构建左右子树

问题：
- 每次递归都创建新的子数组（`Arrays.copyOfRange()`）
- 大量数组复制操作，浪费时间和空间

### 算法步骤

示例：
```
preorder = [3,9,20,15,7]
inorder = [9,3,15,20,7]
```

步骤：

```
Step1: 根节点 = 3（preorder第一个）
Step2: 在inorder中找到3的位置 = 索引1
Step3: 划分：
  左子树：
    preorder: [9]
    inorder: [9]
  右子树：
    preorder: [20,15,7]
    inorder: [15,20,7]
Step4: 递归构建左右子树
```

### 过程图解

初始：
```
preorder: [3,9,20,15,7]
inorder:  [9,3,15,20,7]
```

第一层递归：
```
根节点 = 3
在inorder中位置 = 1

左子树范围：
  preorder: [9]
  inorder:  [9]

右子树范围：
  preorder: [20,15,7]
  inorder:  [15,20,7]
```

构建：
```
    3
   / \
  ?   ?
```

左子树递归：
```
preorder: [9]
inorder:  [9]

根节点 = 9
左右子树都为空
```

右子树递归：
```
preorder: [20,15,7]
inorder:  [15,20,7]

根节点 = 20
在inorder中位置 = 1

左子树：
  preorder: [15]
  inorder:  [15]
右子树：
  preorder: [7]
  inorder:  [7]
```

最终：
```
    3
   / \
  9  20
    /  \
   15   7
```

### Java代码（暴力解法）

```java
import java.util.*;

class Solution {
    public TreeNode buildTree(int[] preorder, int[] inorder) {
        if (preorder.length == 0 || inorder.length == 0) {
            return null;
        }

        // 根节点是前序遍历第一个元素
        int rootVal = preorder[0];
        TreeNode root = new TreeNode(rootVal);

        // 在中序遍历中找到根节点位置
        int rootIndex = 0;
        for (int i = 0; i < inorder.length; i++) {
            if (inorder[i] == rootVal) {
                rootIndex = i;
                break;
            }
        }

        // 创建左右子数组（低效）
        int[] leftPreorder = Arrays.copyOfRange(preorder, 1, 1 + rootIndex);
        int[] leftInorder = Arrays.copyOfRange(inorder, 0, rootIndex);
        
        int[] rightPreorder = Arrays.copyOfRange(preorder, 1 + rootIndex, preorder.length);
        int[] rightInorder = Arrays.copyOfRange(inorder, rootIndex + 1, inorder.length);

        // 递归构建
        root.left = buildTree(leftPreorder, leftInorder);
        root.right = buildTree(rightPreorder, rightInorder);

        return root;
    }
}
```

### 复杂度分析

时间复杂度：
```
每次递归都要：
1. 查找根节点位置：O(n)
2. 复制数组：O(n)

递归深度：O(log n)（平衡树）或 O(n)（链状树）

总时间复杂度：O(n²)
```

空间复杂度：
```
数组复制：
每层复制 O(n)
递归深度 O(log n) 或 O(n)

总空间复杂度：O(n²)
```

### 不足之处

❌ 每次递归都创建新数组，浪费内存
❌ 数组复制操作耗时
❌ 时间复杂度 O(n²)，不够高效

优化方向：
> 使用索引范围代替数组复制

---

## 三、第一次优化（使用索引范围）

### 优化思路

避免数组复制：
- 不再创建新的子数组
- 使用索引范围 `[left, right]` 表示子数组
- 递归时传递索引范围

函数签名：
```
buildTree(preorder, inorder, preLeft, preRight, inLeft, inRight)
```

### 关键计算

前序遍历：
```
根节点位置：preLeft
左子树范围：[preLeft+1, preLeft+leftSize]
右子树范围：[preLeft+leftSize+1, preRight]
```

中序遍历：
```
根节点位置：rootIndex（需要查找）
左子树范围：[inLeft, rootIndex-1]
右子树范围：[rootIndex+1, inRight]
```

左子树大小：
```
leftSize = rootIndex - inLeft
```

### 过程图解

初始：
```
preorder: [3,9,20,15,7]
           ↑           ↑
         preLeft    preRight

inorder:  [9,3,15,20,7]
           ↑          ↑
         inLeft    inRight
```

第一层递归：
```
根节点 = preorder[0] = 3
在inorder中查找3的位置 = 1

leftSize = 1 - 0 = 1

左子树：
  preorder: [preLeft+1, preLeft+leftSize] = [1, 1]
  inorder:  [inLeft, rootIndex-1] = [0, 0]

右子树：
  preorder: [preLeft+leftSize+1, preRight] = [2, 4]
  inorder:  [rootIndex+1, inRight] = [2, 4]
```

递归树：
```
buildTree(0,4, 0,4)
├─ 根节点 = 3
├─ buildTree(1,1, 0,0)  // 左子树
│  └─ 根节点 = 9
└─ buildTree(2,4, 2,4)  // 右子树
   ├─ 根节点 = 20
   ├─ buildTree(2,2, 2,2)  // 左子树
   │  └─ 根节点 = 15
   └─ buildTree(3,4, 3,4)  // 右子树
      └─ 根节点 = 7
```

### Java代码（第一次优化）

```java
class Solution {
    public TreeNode buildTree(int[] preorder, int[] inorder) {
        return build(preorder, inorder, 0, preorder.length - 1, 0, inorder.length - 1);
    }

    private TreeNode build(int[] preorder, int[] inorder, 
                          int preLeft, int preRight, 
                          int inLeft, int inRight) {
        
        // 边界条件
        if (preLeft > preRight || inLeft > inRight) {
            return null;
        }

        // 根节点是前序遍历第一个元素
        int rootVal = preorder[preLeft];
        TreeNode root = new TreeNode(rootVal);

        // 在中序遍历中找到根节点位置
        int rootIndex = inLeft;
        for (int i = inLeft; i <= inRight; i++) {
            if (inorder[i] == rootVal) {
                rootIndex = i;
                break;
            }
        }

        // 计算左子树大小
        int leftSize = rootIndex - inLeft;

        // 递归构建左子树
        root.left = build(preorder, inorder, 
                         preLeft + 1, preLeft + leftSize,  // 左子树前序范围
                         inLeft, rootIndex - 1);            // 左子树中序范围

        // 递归构建右子树
        root.right = build(preorder, inorder, 
                          preLeft + leftSize + 1, preRight,  // 右子树前序范围
                          rootIndex + 1, inRight);            // 右子树中序范围

        return root;
    }
}
```

### 复杂度分析

时间复杂度：
```
每个节点访问一次：O(n)
每次查找根节点位置：O(n)

总时间复杂度：O(n²)
```

空间复杂度：
```
递归栈：O(h)
h = 树高度
平衡树：O(log n)
链状树：O(n)

不再需要数组复制空间
```

### 优点与不足

✅ 不再创建新数组，节省空间
✅ 空间复杂度优化到 O(h)
❌ 每次查找根节点位置仍是 O(n)
❌ 总时间复杂度仍是 O(n²)

进一步优化方向：
> 使用 HashMap 预处理中序遍历，将查找时间优化到 O(1)

---

## 四、最终优化（HashMap优化查找）

### 优化思路

核心问题：
```
每次递归都要在中序遍历中查找根节点位置
时间复杂度：O(n)
```

解决方案：
```
预处理：用 HashMap 存储中序遍历的值到索引的映射
查找时间：O(1)
```

### 算法改进

预处理阶段：
```java
Map<Integer, Integer> map = new HashMap<>();
for (int i = 0; i < inorder.length; i++) {
    map.put(inorder[i], i);
}
```

查找阶段：
```java
int rootIndex = map.get(rootVal);  // O(1)
```

### 过程图解

预处理：
```
inorder: [9,3,15,20,7]

HashMap:
9  -> 0
3  -> 1
15 -> 2
20 -> 3
7  -> 4
```

递归过程（查找优化后）：
```
buildTree(0,4, 0,4)
├─ 根节点 = 3
├─ 查找：map.get(3) = 1  // O(1)
├─ leftSize = 1 - 0 = 1
├─ buildTree(1,1, 0,0)  // 左子树
│  ├─ 根节点 = 9
│  ├─ 查找：map.get(9) = 0  // O(1)
│  └─ 返回叶子节点
└─ buildTree(2,4, 2,4)  // 右子树
   ├─ 根节点 = 20
   ├─ 查找：map.get(20) = 3  // O(1)
   ├─ leftSize = 3 - 2 = 1
   ├─ buildTree(2,2, 2,2)  // 左子树
   │  └─ 根节点 = 15
   └─ buildTree(3,4, 3,4)  // 右子树
      └─ 根节点 = 7
```

### Java代码（最终优化）

```java
import java.util.*;

class Solution {
    private Map<Integer, Integer> map;

    public TreeNode buildTree(int[] preorder, int[] inorder) {
        // 预处理：建立中序遍历值到索引的映射
        map = new HashMap<>();
        for (int i = 0; i < inorder.length; i++) {
            map.put(inorder[i], i);
        }

        return build(preorder, inorder, 0, preorder.length - 1, 0, inorder.length - 1);
    }

    private TreeNode build(int[] preorder, int[] inorder, 
                          int preLeft, int preRight, 
                          int inLeft, int inRight) {
        
        // 边界条件
        if (preLeft > preRight || inLeft > inRight) {
            return null;
        }

        // 根节点是前序遍历第一个元素
        int rootVal = preorder[preLeft];
        TreeNode root = new TreeNode(rootVal);

        // O(1) 查找根节点在中序遍历中的位置
        int rootIndex = map.get(rootVal);

        // 计算左子树大小
        int leftSize = rootIndex - inLeft;

        // 递归构建左子树
        root.left = build(preorder, inorder, 
                         preLeft + 1, preLeft + leftSize,
                         inLeft, rootIndex - 1);

        // 递归构建右子树
        root.right = build(preorder, inorder, 
                          preLeft + leftSize + 1, preRight,
                          rootIndex + 1, inRight);

        return root;
    }
}
```

### 复杂度分析

时间复杂度：
```
预处理HashMap：O(n)
每个节点访问一次：O(n)
每次查找根节点位置：O(1)

总时间复杂度：O(n)
```

空间复杂度：
```
HashMap：O(n)
递归栈：O(h)
h = 树高度
平衡树：O(log n)
链状树：O(n)

总空间复杂度：O(n)
```

### 优点

✅ 时间复杂度优化到 O(n)
✅ 空间复杂度 O(n)，可接受
✅ 代码清晰，易于理解
✅ 面试最优解

---

## 五、三种解法对比总结

| 解法 | 思路 | 时间复杂度 | 空间复杂度 | 特点 |
|------|------|-----------|-----------|------|
| 暴力解法 | 数组复制 | O(n²) | O(n²) | 直观但低效 |
| 索引优化 | 使用索引范围 | O(n²) | O(h) | 空间优化 |
| HashMap优化 | 预处理映射 | O(n) | O(n) | 时间最优 |

---

## 六、关键记忆点

### 核心思路

```
前序遍历：根 → 左 → 右
中序遍历：左 → 根 → 右

关键步骤：
1. 前序第一个 = 根节点
2. 在中序中找到根节点位置
3. 划分左右子树
4. 递归构建
```

### 索引计算

```
左子树大小：leftSize = rootIndex - inLeft

左子树前序：[preLeft+1, preLeft+leftSize]
左子树中序：[inLeft, rootIndex-1]

右子树前序：[preLeft+leftSize+1, preRight]
右子树中序：[rootIndex+1, inRight]
```

### 优化技巧

```
暴力：数组复制 → O(n²)
优化1：索引范围 → O(n²) 但空间优化
优化2：HashMap查找 → O(n) 最优
```

### 记忆口诀

```
前中序建树三步走
前序首元素是根
中序找根分左右
HashMap优化查找快
```

---

# leetcode 437

## 一、题目理解

题目：**Path Sum III**

给定一个二叉树和一个目标和 `targetSum`，找出路径和等于目标和的路径总数。

关键约束：
- 路径不需要从根节点开始
- 路径不需要在叶子节点结束
- 路径方向必须向下（只能从父节点指向子节点）

### 示例

输入：
```
root = [10,5,-3,3,2,null,11,3,-2,null,1]
targetSum = 8
```

树结构：
```
      10
     /  \
    5   -3
   / \    \
  3   2   11
 / \   \
3  -2   1
```

输出：
```
3
```

解释：
- 路径1：5 → 3
- 路径2：5 → 2 → 1
- 路径3：-3 → 11

---

## 二、暴力解法

### 思路（最直观）

最直观的方法：

对每个节点，都作为路径起点：
1. 从当前节点开始向下DFS
2. 累加路径和
3. 如果路径和等于targetSum，计数+1
4. 继续向下搜索（即使已经找到一条路径）

核心思想：
```
枚举所有可能的路径起点
枚举所有可能的路径终点
```

### 算法步骤

关键点：题目要求"路径不需要从根节点开始"，所以每个节点都可以作为路径起点。

算法流程：
```
对于树中的每个节点：
1. 以当前节点为起点，向下DFS搜索所有可能的路径
2. 在DFS过程中，如果路径和 == targetSum，count++
3. 递归处理左右子树（让子树中的每个节点也作为起点）

注意：
- 根节点也需要作为起点（因为路径可以从根节点开始）
- 每个节点都会被处理一次作为起点
- DFS会搜索从当前节点向下的所有路径（包括单节点路径）
```

### 过程图解

示例树：
```
      10
     /  \
    5   -3
   / \    \
  3   2   11
 / \   \
3  -2   1
```

targetSum = 8

---

### 以节点10为起点

```
DFS(10, 0)
├─ sum = 0 + 10 = 10
├─ 10 != 8，继续
├─ DFS(5, 10)
│  ├─ sum = 10 + 5 = 15
│  ├─ 15 != 8，继续
│  ├─ DFS(3, 15)
│  │  ├─ sum = 15 + 3 = 18
│  │  ├─ 18 != 8，继续
│  │  ├─ DFS(3, 18)
│  │  │  └─ sum = 18 + 3 = 21
│  │  └─ DFS(-2, 18)
│  │     └─ sum = 18 + (-2) = 16
│  └─ DFS(2, 15)
│     ├─ sum = 15 + 2 = 17
│     └─ DFS(1, 17)
│        └─ sum = 17 + 1 = 18
└─ DFS(-3, 10)
   ├─ sum = 10 + (-3) = 7
   ├─ 7 != 8，继续
   └─ DFS(11, 7)
      └─ sum = 7 + 11 = 18
```

结果：0条路径

---

### 以节点5为起点

```
DFS(5, 0)
├─ sum = 0 + 5 = 5
├─ 5 != 8，继续
├─ DFS(3, 5)
│  ├─ sum = 5 + 3 = 8  ✓ 找到一条路径！
│  ├─ count++
│  ├─ DFS(3, 8)
│  │  └─ sum = 8 + 3 = 11
│  └─ DFS(-2, 8)
│     └─ sum = 8 + (-2) = 6
└─ DFS(2, 5)
   ├─ sum = 5 + 2 = 7
   ├─ 7 != 8，继续
   └─ DFS(1, 7)
      └─ sum = 7 + 1 = 8  ✓ 找到一条路径！
         └─ count++
```

结果：2条路径

---

### 以节点-3为起点

```
DFS(-3, 0)
├─ sum = 0 + (-3) = -3
├─ -3 != 8，继续
└─ DFS(11, -3)
   └─ sum = -3 + 11 = 8  ✓ 找到一条路径！
      └─ count++
```

结果：1条路径

---

### 完整递归树

```
pathSum(10)
├─ dfs(10, 0) → 搜索以10为起点的所有路径
├─ pathSum(5) → 递归处理左子树
│  ├─ dfs(5, 0) → 搜索以5为起点的所有路径
│  ├─ pathSum(3) → 递归处理左子树
│  │  └─ dfs(3, 0) → 搜索以3为起点的所有路径
│  └─ pathSum(2) → 递归处理右子树
│     └─ dfs(2, 0) → 搜索以2为起点的所有路径
└─ pathSum(-3) → 递归处理右子树
   └─ dfs(-3, 0) → 搜索以-3为起点的所有路径
```

### Java代码（暴力解法）

```java
class Solution {  
    private int count;  
  
    public int pathSum(TreeNode root, int targetSum) {  
        count = 0;  
        traverse(root, targetSum);  
        return count;  
    }  
  
    private void traverse(TreeNode root, int targetSum) {  
        if (root == null) return;  
        dfs(root, 0, targetSum);  
        traverse(root.left, targetSum);  
        traverse(root.right, targetSum);  
    }  
  
    private void dfs(TreeNode root, long sum, int targetSum) {  
        if (root == null) return;  
        sum += root.val;  
        if (sum == targetSum) {  
            count++;  
        }  
        dfs(root.left, sum, targetSum);  
        dfs(root.right, sum, targetSum);  
    }  
}
```

### 复杂度分析

时间复杂度：
```
外层递归：遍历所有节点作为起点 O(n)
内层DFS：对每个起点，最坏遍历所有子节点 O(n)

总时间复杂度：O(n²)
```

空间复杂度：
```
递归栈深度：O(h)
h = 树高度
平衡树：O(log n)
链状树：O(n)
```

### 不足之处

❌ 时间复杂度 O(n²)，效率低
❌ 存在大量重复计算
❌ 例如：从根节点到某个节点的路径和被重复计算多次

优化方向：
> 使用前缀和 + HashMap 避免重复计算

---

## 三、第一次优化（前缀和 + HashMap）

### 优化思路

核心问题：
```
暴力法对每个节点都要重新计算路径和
存在大量重复计算
```

解决方案：
```
使用前缀和思想：
- 记录从根节点到当前节点的路径和
- 如果存在前缀和 prefixSum，使得：
  currentSum - prefixSum = targetSum
- 则说明存在一条路径和为targetSum
```

关键观察：
```
路径和 = 当前前缀和 - 某个历史前缀和
targetSum = currentSum - prefixSum
prefixSum = currentSum - targetSum
```

### 算法步骤

1. 用HashMap存储前缀和及其出现次数
2. DFS遍历树：
   - 计算当前前缀和
   - 查找 `currentSum - targetSum` 是否在HashMap中
   - 如果在，说明存在路径，累加计数
   - 将当前前缀和加入HashMap
   - 递归处理左右子树
   - 回溯：从HashMap中移除当前前缀和（重要！）

### 过程图解

示例树：
```
      10
     /  \
    5   -3
   / \    \
  3   2   11
 / \   \
3  -2   1
```

targetSum = 8

HashMap状态变化：
```
map: {前缀和 -> 出现次数}
```

---

### Step1: 访问节点10

```
当前路径：10
currentSum = 10
查找：10 - 8 = 2 是否在map中？否
map: {10: 1}
count = 0
```

---

### Step2: 访问节点5

```
当前路径：10 → 5
currentSum = 15
查找：15 - 8 = 7 是否在map中？否
map: {10: 1, 15: 1}
count = 0
```

---

### Step3: 访问节点3

```
当前路径：10 → 5 → 3
currentSum = 18
查找：18 - 8 = 10 是否在map中？是！(出现1次)
count += 1 = 1
map: {10: 1, 15: 1, 18: 1}
```

找到路径：5 → 3（因为18 - 10 = 8）

---

### Step4: 访问节点3（左）

```
当前路径：10 → 5 → 3 → 3
currentSum = 21
查找：21 - 8 = 13 是否在map中？否
map: {10: 1, 15: 1, 18: 1, 21: 1}
count = 1
```

---

### Step5: 回溯节点3（左）

```
回溯：移除21
map: {10: 1, 15: 1, 18: 1}
```

---

### Step6: 访问节点-2

```
当前路径：10 → 5 → 3 → -2
currentSum = 16
查找：16 - 8 = 8 是否在map中？否
map: {10: 1, 15: 1, 18: 1, 16: 1}
count = 1
```

---

### Step7: 回溯节点-2和3

```
回溯：移除16, 18
map: {10: 1, 15: 1}
```

---

### Step8: 访问节点2

```
当前路径：10 → 5 → 2
currentSum = 17
查找：17 - 8 = 9 是否在map中？否
map: {10: 1, 15: 1, 17: 1}
count = 1
```

---

### Step9: 访问节点1

```
当前路径：10 → 5 → 2 → 1
currentSum = 18
查找：18 - 8 = 10 是否在map中？是！(出现1次)
count += 1 = 2
map: {10: 1, 15: 1, 17: 1, 18: 1}
```

找到路径：5 → 2 → 1（因为18 - 10 = 8）

---

### Step10: 回溯到节点5

```
回溯：移除18, 17, 15
map: {10: 1}
```

---

### Step11: 访问节点-3

```
当前路径：10 → -3
currentSum = 7
查找：7 - 8 = -1 是否在map中？否
map: {10: 1, 7: 1}
count = 2
```

---

### Step12: 访问节点11

```
当前路径：10 → -3 → 11
currentSum = 18
查找：18 - 8 = 10 是否在map中？是！(出现1次)
count += 1 = 3
map: {10: 1, 7: 1, 18: 1}
```

找到路径：-3 → 11（因为18 - 10 = 8）

---

### 完整执行流程表

| 节点 | 路径 | currentSum | 查找值 | 是否找到 | count | map状态 |
|------|------|-----------|--------|---------|-------|---------|
| 10   | 10   | 10        | 2      | 否      | 0     | {10:1}  |
| 5    | 10→5 | 15        | 7      | 否      | 0     | {10:1,15:1} |
| 3    | 10→5→3 | 18    | 10     | 是✓     | 1     | {10:1,15:1,18:1} |
| 3(左)| 10→5→3→3 | 21 | 13     | 否      | 1     | {10:1,15:1,18:1,21:1} |
| -2   | 10→5→3→-2 | 16 | 8      | 否      | 1     | {10:1,15:1,18:1,16:1} |
| 2    | 10→5→2 | 17        | 9      | 否      | 1     | {10:1,15:1,17:1} |
| 1    | 10→5→2→1 | 18    | 10     | 是✓     | 2     | {10:1,15:1,17:1,18:1} |
| -3   | 10→-3 | 7         | -1     | 否      | 2     | {10:1,7:1} |
| 11   | 10→-3→11 | 18    | 10     | 是✓     | 3     | {10:1,7:1,18:1} |

### Java代码（第一次优化）

```java
import java.util.*;

class Solution {  
    public int pathSum(TreeNode root, int targetSum) {  
        HashMap<Long, Integer> map = new HashMap<>();  
        map.put(0L,1);  
        return dfs(root, targetSum, 0L, map);  
    }  
  
    private int dfs(TreeNode root, int targetSum, Long currSum, HashMap<Long, Integer> map) {  
        if (root == null) {  
            return 0;  
        }  
        currSum += root.val;  
        Long preSum = currSum - targetSum;  
        int count = map.getOrDefault(preSum, 0);  
        map.put(currSum, map.getOrDefault(currSum, 0) + 1);  
  
        count += dfs(root.left, targetSum, currSum, map);  
        count += dfs(root.right, targetSum, currSum, map);  
  
        map.put(currSum, map.getOrDefault(currSum, 0) - 1);  
        return count;  
    }  
  
  
}
```

### 复杂度分析

时间复杂度：
```
每个节点访问一次：O(n)
HashMap操作（put/get/remove）：O(1)

总时间复杂度：O(n)
```

空间复杂度：
```
HashMap：O(n)（最坏情况，所有节点前缀和都不同）
递归栈：O(h)
h = 树高度

总空间复杂度：O(n)
```

### 优点与不足

✅ 时间复杂度优化到 O(n)
✅ 避免了重复计算
✅ 使用前缀和思想，思路清晰
✅ 回溯机制保证正确性

这是最优解法！

---

## 四、关键细节说明

### 为什么需要初始化 prefixSumMap.put(0L, 1)？

考虑从根节点开始的路径：
```
路径：10 → 5 → 3
currentSum = 18
targetSum = 8

查找：18 - 8 = 10
如果10在map中，说明存在路径和为8的路径
```

但是：
```
如果路径就是：10 → 5 → 3（从根节点开始）
那么需要查找的前缀和应该是：18 - 8 = 10
而10正好是根节点10的前缀和
```

更准确地说：
```
如果路径从根节点开始，那么：
currentSum - 0 = targetSum
所以需要 prefixSum = 0 存在
```

因此需要初始化 `prefixSumMap.put(0L, 1)`。

### 为什么需要回溯？

考虑以下情况：
```
      10
     /  \
    5   -3
```

如果不回溯：
```
访问10：map = {10:1}
访问5：map = {10:1, 15:1}
访问-3：map = {10:1, 15:1, 7:1}

当访问-3时，查找 7-8=-1
但实际上，-3不应该看到节点5的前缀和15
因为-3不在5的子树中
```

回溯后：
```
访问10：map = {10:1}
访问5：map = {10:1, 15:1}
回溯5：map = {10:1}  ← 移除15
访问-3：map = {10:1, 7:1}  ← 正确！
```

回溯保证了：
```
map中只包含当前路径（从根到当前节点）的前缀和
不会包含其他分支的前缀和
```

---

## 五、两种解法对比总结

| 解法 | 思路 | 时间复杂度 | 空间复杂度 | 特点 |
|------|------|-----------|-----------|------|
| 暴力解法 | 枚举所有起点和终点 | O(n²) | O(h) | 直观但低效 |
| 前缀和+HashMap | 利用前缀和避免重复计算 | O(n) | O(n) | 最优解 |

---

## 六、关键记忆点

### 核心思想

```
路径和问题 → 前缀和思想

关键公式：
currentSum - prefixSum = targetSum
prefixSum = currentSum - targetSum

查找 prefixSum 是否在历史前缀和中存在
```

### 算法模板

```
1. 初始化：map.put(0, 1)
2. DFS遍历：
   - 计算currentSum
   - 查找 currentSum - targetSum
   - 更新count
   - 将currentSum加入map
   - 递归左右子树
   - 回溯：从map中移除currentSum
```

### 关键点

```
1. 必须初始化 prefixSumMap.put(0L, 1)
   处理从根节点开始的路径

2. 必须回溯
   保证map中只包含当前路径的前缀和

3. 使用Long类型
   避免整数溢出
```

### 记忆口诀

```
路径和问题前缀和
currentSum减targetSum
查找历史前缀和
回溯清理保正确
```

---

# leetcode 236

## 一、题目理解

题目：**Lowest Common Ancestor of a Binary Tree**

给定一棵二叉树和两个节点 `p`、`q`，找到它们的最近公共祖先（LCA）。

最近公共祖先定义：
- 若节点 `x` 是 `p`、`q` 的公共祖先，且 `x` 尽可能“深”（离 `p/q` 更近），则 `x` 是 LCA
- 节点可以是它自己的祖先

示例：
```
root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1
```

树结构：
```
        3
       / \
      5   1
     / \ / \
    6  2 0  8
      / \
     7   4
```

输出：
```
3
```

---

## 二、暴力解法

### 思路（最直观）

最直观做法：先分别找出 `root -> p` 和 `root -> q` 的路径，再比较两条路径最后一个公共节点。

核心步骤：
1. DFS 找 `root -> p` 路径
2. DFS 找 `root -> q` 路径
3. 从头比较两条路径，最后一个相同节点就是 LCA

### 过程图解

示例：`p = 5, q = 4`
```
        3
       / \
      5   1
     / \ / \
    6  2 0  8
      / \
     7   4
```

路径1（到 p=5）：
```
[3, 5]
```

路径2（到 q=4）：
```
[3, 5, 2, 4]
```

逐位比较：
```
index=0: 3 == 3  -> 公共
index=1: 5 == 5  -> 公共
index=2: 越界/不同 -> 停止
```

最后一个公共节点：
```
5
```

### Java代码（暴力解法）

```java
import java.util.*;

class Solution {
    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        List<TreeNode> pathP = new ArrayList<>();
        List<TreeNode> pathQ = new ArrayList<>();

        findPath(root, p, pathP);
        findPath(root, q, pathQ);

        TreeNode ans = null;
        int len = Math.min(pathP.size(), pathQ.size());
        for (int i = 0; i < len; i++) {
            if (pathP.get(i) == pathQ.get(i)) {
                ans = pathP.get(i);
            } else {
                break;
            }
        }
        return ans;
    }

    // 在树中找 root -> target 的路径，找到返回 true
    private boolean findPath(TreeNode root, TreeNode target, List<TreeNode> path) {
        if (root == null) return false;

        path.add(root);
        if (root == target) return true;

        if (findPath(root.left, target, path)) return true;
        if (findPath(root.right, target, path)) return true;

        // 回溯：当前分支找不到目标，移除当前节点
        path.remove(path.size() - 1);
        return false;
    }
}
```

### 复杂度分析

时间复杂度：
```
找 pathP: O(n)
找 pathQ: O(n)
比较路径: O(h)

总计: O(n)
```

空间复杂度：
```
两条路径 + 递归栈: O(h)
最坏链状树: O(n)
```

### 不足之处

❌ 需要两次找路径  
❌ 需要额外存储路径  
❌ 回溯写法相对繁琐

优化方向：
> 是否能一次 DFS 直接得出 LCA？

---

## 三、第一次优化（单次递归返回）

### 优化思路

定义递归函数含义：
```
f(root): 在以 root 为根的子树中，返回 p/q/LCA/null
```

递归规则：
1. `root == null` 返回 `null`
2. `root == p` 或 `root == q`，直接返回 `root`
3. 递归左子树得到 `left`，右子树得到 `right`
4. 若 `left != null && right != null`，说明 `p`、`q` 分居两侧，`root` 即 LCA
5. 否则返回非空的一侧（或都空返回 null）

### 过程图解

示例：`p=5, q=1`
```
LCA(3)
├─ left  = LCA(5) -> 5
└─ right = LCA(1) -> 1

left != null && right != null
=> 返回 3
```

再看 `p=5, q=4`：
```
LCA(3)
├─ left  = LCA(5) -> 5  (在5子树里已确定)
└─ right = LCA(1) -> null

只有 left 非空
=> 返回 5
```

### Java代码（第一次优化）

```java
class Solution {
    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        if (root == null) return null;
        if (root == p || root == q) return root;

        TreeNode left = lowestCommonAncestor(root.left, p, q);
        TreeNode right = lowestCommonAncestor(root.right, p, q);

        // p 和 q 分别在左右子树，当前 root 就是 LCA
        if (left != null && right != null) {
            return root;
        }

        // 否则返回非空子树结果
        return left != null ? left : right;
    }
}
```

### 复杂度分析

时间复杂度：
```
每个节点最多访问一次 -> O(n)
```

空间复杂度：
```
递归栈 O(h)
平衡树 O(log n)，最坏 O(n)
```

### 相比暴力的提升

✅ 一次 DFS 完成  
✅ 不需要显式存路径  
✅ 代码更短、更接近面试标准答案

---

## 四、最终优化（最优解）

对于 LeetCode 236（普通二叉树，非 BST），上面的“单次递归返回法”已经是最优解法：

- 必须至少看一遍节点，时间下界是 `O(n)`
- 该解法正好是 `O(n)`，已达最优时间复杂度
- 额外空间仅递归栈 `O(h)`，也是 DFS 框架下最优实践

因此最终优化就是：**将第一次优化作为标准最优解，重点把边界和返回语义彻底吃透。**

### 最优解详细执行流程（重点图解）

示例：`p = 7, q = 4`
```
        3
       / \
      5   1
     / \ / \
    6  2 0  8
      / \
     7   4
```

后序视角（先算左右，再算当前）：
```
LCA(3)
├─ LCA(5)
│  ├─ LCA(6) -> null
│  └─ LCA(2)
│     ├─ LCA(7) -> 7   (命中 p)
│     └─ LCA(4) -> 4   (命中 q)
│
│     在节点2：left=7, right=4 都非空
│     => LCA(2) 返回 2
│
│  在节点5：left=null, right=2
│  => 返回 2
│
└─ LCA(1)
   ├─ LCA(0) -> null
   └─ LCA(8) -> null
   => 返回 null

在节点3：left=2, right=null
=> 返回 2（最终答案）
```

可以把“返回值语义”记成：
```
返回值不是“是否存在”，而是“当前子树对上层有价值的节点”
可能是：p / q / LCA / null
```

### Java代码（最终最优解）

```java
class Solution {
    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        // 1) 空节点，直接返回空
        if (root == null) return null;

        // 2) 命中 p 或 q，直接向上返回
        if (root == p || root == q) return root;

        // 3) 在左右子树中继续查找
        TreeNode left = lowestCommonAncestor(root.left, p, q);
        TreeNode right = lowestCommonAncestor(root.right, p, q);

        // 4) 左右都找到，说明当前节点是最近公共祖先
        if (left != null && right != null) {
            return root;
        }

        // 5) 只有一边非空，返回那一边（可能是 p/q/LCA）
        return left != null ? left : right;
    }
}
```

### 最优解复杂度分析

时间复杂度：
```
最好：O(1)（root 恰好是 p 或 q）
平均：O(n)
最坏：O(n)
```

空间复杂度：
```
递归栈深度 O(h)
最好（平衡且很快命中）：接近 O(log n)
平均（平衡树）：O(log n)
最坏（链状树）：O(n)
```

---

## 五、解法对比总结

| 解法 | 核心思想 | 时间复杂度 | 空间复杂度 | 特点 |
|------|----------|------------|------------|------|
| 暴力解法 | 找两条 root->node 路径再比较 | O(n) | O(h) | 直观但实现繁琐 |
| 第一次优化 | 单次递归，靠返回值合并信息 | O(n) | O(h) | 简洁高效 |
| 最终最优 | 与第一次优化一致（已最优） | O(n) | O(h) | 面试标准答案 |

---

## 六、复习速记

### 关键边界

```
if (root == null) return null;
if (root == p || root == q) return root;
```

### 关键判断

```
left != null && right != null  => root 是 LCA
否则返回非空那边
```

### 记忆口诀

```
先判空，再判命中
左右递归拿结果
两边都有返回根
一边有就往上送
```

---
# leetcode 124

## 一、题目理解

题目：**Binary Tree Maximum Path Sum**

给定一棵二叉树，返回其最大路径和。

关键点：
- 路径可以从任意节点出发，到任意节点结束
- 路径上节点不能重复（本质是一条简单路径）
- 路径不一定经过根节点
- 节点可能为负数

示例：
```
    -10
    /  \
   9   20
      /  \
     15   7
```

最大路径：
```
15 -> 20 -> 7
```

结果：
```
42
```

---

## 二、暴力解法

### 思路（最直观）

把每个节点都当成路径“拐点”（最高点）：

对于每个节点 `node`：
1. 求左子树向下最大贡献 `leftGain`
2. 求右子树向下最大贡献 `rightGain`
3. 经过 `node` 的路径和：
   ```
   node.val + max(0, leftGain) + max(0, rightGain)
   ```
4. 用全局变量更新最大值

暴力点在于：每枚举一个节点，都会重复递归计算大量 `leftGain/rightGain`。

### 过程图解（重复计算）

树：
```
      1
     / \
    2   3
   / \
  4   5
```

枚举节点 `1` 时，会算：
```
gain(2), gain(3), gain(4), gain(5)
```

枚举节点 `2` 时，又会重新算：
```
gain(4), gain(5)
```

所以子树收益被反复计算。

### Java代码（暴力解法）

```java
class Solution {
    private int ans = Integer.MIN_VALUE;

    public int maxPathSum(TreeNode root) {
        if (root == null) return 0;
        enumerate(root);
        return ans;
    }

    // 枚举每个节点作为拐点
    private void enumerate(TreeNode node) {
        if (node == null) return;

        int leftGain = maxGain(node.left);
        int rightGain = maxGain(node.right);

        int through = node.val + Math.max(0, leftGain) + Math.max(0, rightGain);
        ans = Math.max(ans, through);

        enumerate(node.left);
        enumerate(node.right);
    }

    // 返回“从当前节点向下走”的最大路径和（只能选一边）
    private int maxGain(TreeNode node) {
        if (node == null) return 0;

        int left = maxGain(node.left);
        int right = maxGain(node.right);
        return node.val + Math.max(0, Math.max(left, right));
    }
}
```

### 复杂度分析

时间复杂度：
```
最好：O(n log n)（接近平衡树）
平均：O(n log n)
最坏：O(n^2)（链状树，重复计算最严重）
```

空间复杂度：
```
递归栈 O(h)
最好/平均（平衡树）O(log n)
最坏（链状树）O(n)
```

### 不足之处

❌ 重复计算子树收益  
❌ 最坏时间复杂度退化到 O(n^2)

优化方向：
> 给 `maxGain(node)` 做缓存，避免重复求值。

---

## 三、第一次优化（记忆化）

### 优化思路

使用 `HashMap<TreeNode, Integer>` 缓存每个节点的 `maxGain`：

```
第一次计算 maxGain(node) 后存入 map
下次再用直接 O(1) 读取
```

这样枚举拐点时，不会重复递归计算相同子树。

### 过程图解（缓存命中）

还是这棵树：
```
      1
     / \
    2   3
   / \
  4   5
```

第一次枚举 `1`：
```
计算并缓存：
gain(4), gain(5), gain(2), gain(3)
```

后面枚举 `2`：
```
直接命中缓存 gain(4), gain(5)
不再递归下探
```

### Java代码（第一次优化）

```java
import java.util.*;

class Solution {
    private int ans = Integer.MIN_VALUE;
    private Map<TreeNode, Integer> memo = new HashMap<>();

    public int maxPathSum(TreeNode root) {
        if (root == null) return 0;
        enumerate(root);
        return ans;
    }

    private void enumerate(TreeNode node) {
        if (node == null) return;

        int leftGain = maxGain(node.left);
        int rightGain = maxGain(node.right);

        int through = node.val + Math.max(0, leftGain) + Math.max(0, rightGain);
        ans = Math.max(ans, through);

        enumerate(node.left);
        enumerate(node.right);
    }

    private int maxGain(TreeNode node) {
        if (node == null) return 0;
        if (memo.containsKey(node)) return memo.get(node);

        int left = maxGain(node.left);
        int right = maxGain(node.right);
        int gain = node.val + Math.max(0, Math.max(left, right));

        memo.put(node, gain);
        return gain;
    }
}
```

### 复杂度分析

时间复杂度：
```
最好：O(n)
平均：O(n)
最坏：O(n)
```

空间复杂度：
```
HashMap: O(n)
递归栈: O(h)
总计: O(n)
```

### 改进与不足

✅ 时间降到 O(n)  
❌ 仍然有两套递归（枚举 + gain），实现偏重  
❌ 多用了 O(n) 额外缓存空间

继续优化方向：
> 能否一次 DFS 同时完成“向上贡献值”和“全局答案更新”？

---

## 四、最终优化（最优解：一次后序DFS）

### 核心思想

对每个节点，后序计算：

1. `leftGain = max(0, dfs(node.left))`
2. `rightGain = max(0, dfs(node.right))`
3. 更新全局答案（把当前节点作为拐点）：
   ```
   ans = max(ans, node.val + leftGain + rightGain)
   ```
4. 向父节点返回“单边最大贡献”：
   ```
   return node.val + max(leftGain, rightGain)
   ```

为什么要“只返回单边”？
```
父节点继续往上延伸时，路径不能分叉，只能选左或右一条边。
```

### 详细过程图解（重点）

示例：
```
    -10
    /  \
   9   20
      /  \
     15   7
```

后序顺序：
```
9 -> 15 -> 7 -> 20 -> -10
```

状态表：

| 节点  | leftGain | rightGain | 以该点为拐点路径和 | 全局ans | 向上返回值 |
| --- | -------- | --------- | --------- | ----- | ----- |
| 9   | 0        | 0         | 9         | 9     | 9     |
| 15  | 0        | 0         | 15        | 15    | 15    |
| 7   | 0        | 0         | 7         | 15    | 7     |
| 20  | 15       | 7         | 42        | 42    | 35    |
| -10 | 9        | 35        | 34        | 42    | 25    |

最终答案：
```
42
```

### 递归树示意

```
dfs(-10)
├─ dfs(9)  -> return 9
└─ dfs(20)
   ├─ dfs(15) -> return 15
   └─ dfs(7)  -> return 7

在20处更新 ans=42，并向上返回 35
在-10处再更新一次 ans=max(42,34)=42
```

### Java代码（最终最优解）

```java
class Solution {
    private int ans = Integer.MIN_VALUE;

    public int maxPathSum(TreeNode root) {
        dfs(root);
        return ans;
    }

    // 返回值：从当前节点出发、向下走、且只能选一条分支的最大贡献
    private int dfs(TreeNode node) {
        if (node == null) return 0;

        int leftGain = Math.max(0, dfs(node.left));   // 负贡献直接丢弃
        int rightGain = Math.max(0, dfs(node.right)); // 负贡献直接丢弃

        // 当前节点作为“拐点”的完整路径和
        int through = node.val + leftGain + rightGain;
        ans = Math.max(ans, through);

        // 向父节点返回单边最大贡献（路径不能分叉）
        return node.val + Math.max(leftGain, rightGain);
    }
}
```

### 复杂度分析（最优解）

时间复杂度：
```
最好：O(n)
平均：O(n)
最坏：O(n)
```

空间复杂度：
```
递归栈 O(h)
最好/平均（平衡树）O(log n)
最坏（链状树）O(n)
```

最优性说明：
```
任意算法都至少要看一次所有节点，时间下界是 O(n)。
本解法达到 O(n)，因此时间最优。
```

---

## 五、三种解法对比总结

| 解法    | 思路              | 时间复杂度     | 空间复杂度 | 特点    |
| ----- | --------------- | --------- | ----- | ----- |
| 暴力解法  | 每个节点做拐点，重复算gain | 最坏 O(n^2) | O(h)  | 直观但慢  |
| 第一次优化 | 暴力 + memo缓存gain | O(n)      | O(n)  | 可过但偏重 |
| 最终优化  | 一次后序DFS同步计算     | O(n)      | O(h)  | 最简最优  |

---

## 六、关键记忆点

### 一句话模型

```
全局答案看“拐点三段和”
向上返回只给“单边最大贡献”
```

### 模板公式

```
leftGain = max(0, dfs(left))
rightGain = max(0, dfs(right))

ans = max(ans, node.val + leftGain + rightGain)
return node.val + max(leftGain, rightGain)
```

### 常见坑

```
1) 不要把 ans 初始化为 0，要用 Integer.MIN_VALUE（全负树）
2) 更新 ans 用双边，返回父节点只能单边
3) 负贡献要截断为 0
```

### 记忆口诀

```
后序遍历算贡献
负数分支直接断
拐点三段更答案
向上单边别分叉
```

