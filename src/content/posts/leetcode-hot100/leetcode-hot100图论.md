---
title: Leetcode-hot100图论
published: 2026-03-11
updated: 2026-03-11
description: ""
image: ""
tags:
  - hot100
  - 图论
category: Leetcode
draft: false
---

# leetcode 200

## 一、题目理解

题目：**Number of Islands**

给定一个由 `'1'`（陆地）和 `'0'`（水）组成的二维网格 `grid`，计算网格中岛屿的数量。

岛屿被水包围，由水平或垂直方向上相邻的陆地连接而成。可以假设网格的四个边均被水包围。

### 示例

输入：
```
grid = [
  ['1','1','1','1','0'],
  ['1','1','0','1','0'],
  ['1','1','0','0','0'],
  ['0','0','0','0','0']
]
```

输出：
```
1
```

---

输入：
```
grid = [
  ['1','1','0','0','0'],
  ['1','1','0','0','0'],
  ['0','0','1','0','0'],
  ['0','0','0','1','1']
]
```

输出：
```
3
```

### 关键约束

```
连通方向：上下左右（四个方向），不含对角线
'1' 是陆地，'0' 是水
相邻的 '1' 属于同一个岛屿
```

---

## 二、暴力解法（BFS 逐格搜索 + visited 数组）

### 思路（最直观）

最直观的方法：

1. 遍历每个格子
2. 遇到 `'1'`，检查它是否被访问过
3. 如果没访问过，说明发现了一个新岛屿，岛屿计数+1
4. 从这个格子出发，BFS/DFS 把整个岛屿都标记为已访问
5. 使用一个额外的 `boolean[][] visited` 数组来记录已访问状态

### 算法步骤

```
1. 创建 visited[m][n]，全部初始化为 false
2. 遍历 grid 的每个格子 (i, j)：
   - 如果 grid[i][j] == '1' 且 visited[i][j] == false：
     - count++
     - BFS/DFS 标记所有连通的 '1' 为已访问
3. 返回 count
```

### 过程图解

初始网格：
```
grid:
1 1 0 0 0
1 1 0 0 0
0 0 1 0 0
0 0 0 1 1

visited:
F F F F F
F F F F F
F F F F F
F F F F F
```

---

### Step1: 扫描到 (0,0)，grid='1'，visited=false

发现新岛屿！count = 1

BFS 从 (0,0) 开始扩散：
```
Queue: [(0,0)]

弹出(0,0) → 标记visited → 检查四邻：
  右(0,1)='1'未访问 → 入队
  下(1,0)='1'未访问 → 入队

Queue: [(0,1),(1,0)]

弹出(0,1) → 标记visited → 检查四邻：
  右(0,2)='0' → 跳过
  下(1,1)='1'未访问 → 入队

Queue: [(1,0),(1,1)]

弹出(1,0) → 标记visited → 检查四邻：
  下(2,0)='0' → 跳过
  右(1,1)已在队列

Queue: [(1,1)]

弹出(1,1) → 标记visited → 检查四邻：
  下(2,1)='0' → 跳过
  右(1,2)='0' → 跳过

Queue: []  BFS结束
```

visited 状态：
```
T T F F F
T T F F F
F F F F F
F F F F F
```

---

### Step2: 扫描到 (2,2)，grid='1'，visited=false

发现新岛屿！count = 2

BFS 从 (2,2) 开始扩散：
```
Queue: [(2,2)]

弹出(2,2) → 标记visited → 四邻都是 '0' 或已访问

Queue: []  BFS结束
```

visited 状态：
```
T T F F F
T T F F F
F F T F F
F F F F F
```

---

### Step3: 扫描到 (3,3)，grid='1'，visited=false

发现新岛屿！count = 3

BFS 从 (3,3) 开始扩散：
```
Queue: [(3,3)]

弹出(3,3) → 标记visited → 检查四邻：
  右(3,4)='1'未访问 → 入队

Queue: [(3,4)]

弹出(3,4) → 标记visited → 无未访问邻居

Queue: []  BFS结束
```

最终 visited：
```
T T F F F
T T F F F
F F T F F
F F F T T
```

最终结果：count = 3

---

### Java代码（暴力解法）

```java
import java.util.*;

class Solution {
    public int numIslands(char[][] grid) {
        int m = grid.length, n = grid[0].length;
        boolean[][] visited = new boolean[m][n];
        int count = 0;

        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (grid[i][j] == '1' && !visited[i][j]) {
                    count++;
                    bfs(grid, visited, i, j, m, n);
                }
            }
        }

        return count;
    }

    private void bfs(char[][] grid, boolean[][] visited, int i, int j, int m, int n) {
        Queue<int[]> queue = new LinkedList<>();
        queue.offer(new int[]{i, j});
        visited[i][j] = true;

        int[][] dirs = {{0, 1}, {0, -1}, {1, 0}, {-1, 0}};

        while (!queue.isEmpty()) {
            int[] curr = queue.poll();

            for (int[] d : dirs) {
                int ni = curr[0] + d[0];
                int nj = curr[1] + d[1];

                // 边界检查 + 是否为陆地 + 是否已访问
                if (ni >= 0 && ni < m && nj >= 0 && nj < n
                    && grid[ni][nj] == '1' && !visited[ni][nj]) {
                    visited[ni][nj] = true;
                    queue.offer(new int[]{ni, nj});
                }
            }
        }
    }
}
```

### 复杂度分析

时间复杂度：
```
遍历网格：O(m*n)
BFS 总共访问每个格子最多一次：O(m*n)

总时间复杂度：O(m*n)
```

空间复杂度：
```
visited 数组：O(m*n)
BFS 队列：最坏 O(m*n)

总空间复杂度：O(m*n)
```

### 不足之处

❌ 需要额外的 `visited[m][n]` 数组，占用 O(m*n) 空间
❌ 题目给的 grid 本身就可以复用来做标记

优化方向：
> 直接修改原始 grid，将访问过的 '1' 改为 '0'（沉岛），省掉 visited 数组

---

## 三、第一次优化（DFS 沉岛法，省去 visited）

### 优化思路

核心改进：
```
不再使用 visited 数组
而是把访问过的 '1' 直接改成 '0'（沉岛）
这样天然不会重复访问
```

好处：
```
省去 O(m*n) 的额外 visited 空间
用 DFS 代替 BFS，代码更简洁
```

### 算法步骤

```
遍历 grid 的每个格子 (i, j)：
  如果 grid[i][j] == '1'：
    count++
    dfs(i, j)  // 把整个岛沉掉

dfs(i, j)：
  如果越界 或 grid[i][j] != '1'：返回
  grid[i][j] = '0'  // 沉岛
  dfs 四个方向
```

### 过程图解

初始网格：
```
1 1 0 0 0
1 1 0 0 0
0 0 1 0 0
0 0 0 1 1
```

---

### Step1: 扫描到 (0,0)，grid='1'

count = 1，开始 DFS 沉岛：

```
dfs(0,0): grid[0][0] = '0'
├─ dfs(0,1): grid[0][1] = '0'
│  ├─ dfs(0,2): '0' 返回
│  ├─ dfs(1,1): grid[1][1] = '0'
│  │  ├─ dfs(1,2): '0' 返回
│  │  ├─ dfs(2,1): '0' 返回
│  │  └─ dfs(1,0): grid[1][0] = '0'
│  │     ├─ dfs(2,0): '0' 返回
│  │     └─ (0,0) 已经是 '0' 返回
│  └─ (-1,1) 越界 返回
└─ dfs(1,0): 已经是 '0' 返回
```

网格变为：
```
0 0 0 0 0
0 0 0 0 0
0 0 1 0 0
0 0 0 1 1
```

---

### Step2: 扫描到 (2,2)，grid='1'

count = 2，开始 DFS 沉岛：

```
dfs(2,2): grid[2][2] = '0'
├─ 四个方向邻居全是 '0'
└─ 返回
```

网格变为：
```
0 0 0 0 0
0 0 0 0 0
0 0 0 0 0
0 0 0 1 1
```

---

### Step3: 扫描到 (3,3)，grid='1'

count = 3，开始 DFS 沉岛：

```
dfs(3,3): grid[3][3] = '0'
└─ dfs(3,4): grid[3][4] = '0'
   └─ 无未访问邻居
```

网格变为：
```
0 0 0 0 0
0 0 0 0 0
0 0 0 0 0
0 0 0 0 0
```

最终结果：count = 3

---

### Java代码（第一次优化）

```java
class Solution {
    public int numIslands(char[][] grid) {
        int m = grid.length, n = grid[0].length;
        int count = 0;

        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (grid[i][j] == '1') {
                    count++;
                    dfs(grid, i, j, m, n);
                }
            }
        }

        return count;
    }

    // DFS 沉岛：把当前岛屿所有 '1' 变为 '0'
    private void dfs(char[][] grid, int i, int j, int m, int n) {
        // 越界 或 不是陆地，直接返回
        if (i < 0 || i >= m || j < 0 || j >= n || grid[i][j] != '1') {
            return;
        }

        // 沉岛
        grid[i][j] = '0';

        // 四个方向递归
        dfs(grid, i + 1, j, m, n);
        dfs(grid, i - 1, j, m, n);
        dfs(grid, i, j + 1, m, n);
        dfs(grid, i, j - 1, m, n);
    }
}
```

### 复杂度分析

时间复杂度：
```
遍历网格：O(m*n)
DFS 总共访问每个格子最多一次：O(m*n)

总时间复杂度：O(m*n)
```

空间复杂度：
```
递归栈：O(m*n)（最坏情况：全是 '1'，递归深度达到 m*n）
无额外 visited 数组

总空间复杂度：O(m*n)（递归栈）
```

### 优点与不足

✅ 代码极简
✅ 不需要 visited 数组
✅ 面试最常写的版本
❌ 修改了原始输入（有些场景不允许）
❌ 递归栈在极端情况（全 '1' 的大网格）可能溢出

优化方向：
> 使用并查集（Union-Find），迭代实现，无递归栈溢出风险

---

## 五、三种解法对比总结

| 解法     | 核心思路             | 时间复杂度             | 空间复杂度     | 特点        |
| ------ | ---------------- | ----------------- | --------- | --------- |
| 暴力解法   | BFS + visited 数组 | O(m*n)            | O(m*n)    | 直观但多余空间   |
| DFS 沉岛 | DFS + 修改原 grid   | O(m*n)            | O(m*n)递归栈 | 代码最简，面试首选 |
| 并查集    | Union-Find       | O(m*n·α) ≈ O(m*n) | O(m*n)    | 不改原图，无栈溢出 |

---

## 六、关键记忆点

### 核心思想

```
看到"连通区域计数"→ 想到三种方法：
1. BFS 洪水填充
2. DFS 沉岛
3. 并查集
```

### DFS 沉岛模板

```java
if (越界 || grid[i][j] != '1') return;
grid[i][j] = '0';
dfs(上); dfs(下); dfs(左); dfs(右);
```

### 并查集模板

```java
find(x): 路径压缩找根
union(x,y): 按秩合并 + count--
初始化: 每个 '1' 自成集合
遍历: 只看右和下两个方向
```

### 面试选择建议

```
默认写 DFS 沉岛（最快最短）
追问"不能改原数组" → BFS + visited
追问"并查集" → Union-Find 版
```

### 记忆口诀

```
岛屿计数三板斧
DFS沉岛最简洁
BFS洪水不改图需visited
并查集合并计数最通用
```

---

# leetcode 994

```java
class Solution {  
  
    int [] dx = new int[]{0, 1, -1, 0};  
    int [] dy = new int[]{1, 0, 0, -1};  
    public int orangesRotting(int[][] grid) {  
        Deque<int[]> deque = new ArrayDeque<>();  
  
        int x = grid.length;  
        int y = grid[0].length;  
  
        for (int i = 0; i < x; i++) {  
            for (int j = 0; j < y; j++) {  
                if (grid[i][j] == 2) {  
                    deque.offer(new int[]{i,j});  
                }  
            }  
        }  
  
        int ans = -1;  
        while (!deque.isEmpty()) {  
            int size = deque.size();  
            for (int n = 0 ; n < size; n++) {  
                int[] poll = deque.poll();  
                for (int i = 0; i < 4; i++) {  
                    int nx = poll[0] + dx[i];  
                    int ny = poll[1] + dy[i];  
                    if (nx >= 0 && nx < x && ny >= 0 && ny < y && grid[nx][ny] == 1) {  
                        grid[nx][ny] = 2;  
                        deque.offer(new int[]{nx, ny});  
                    }  
                }  
            }  
            ans ++;  
        }  
  
        for (int i = 0; i < x; i++) {  
            for (int j = 0; j < y; j++) {  
                if (grid[i][j] == 1) {  
                    return -1;  
                }  
            }  
        }  
        return ans == -1 ? 0 : ans;  
    }  
}
```

---

# leetcode 207

## 一、题目理解

题目：**Course Schedule（课程表）**

你这个学期必须选修 `numCourses` 门课程，记为 `0` 到 `numCourses - 1`。

在选修某些课程之前需要一些先修课程。先修课程按数组 `prerequisites` 给出，其中 `prerequisites[i] = [a, b]` 表示如果要学习课程 `a`，则需要先完成课程 `b`。

判断你是否可以完成所有课程的学习。如果可以返回 `true`，否则返回 `false`。

### 示例

输入：
```
numCourses = 2
prerequisites = [[1,0]]
```

输出：
```
true
```

解释：总共 2 门课，学习课程 1 之前需要先完成课程 0。所以可行。

---

输入：
```
numCourses = 2
prerequisites = [[1,0],[0,1]]
```

输出：
```
false
```

解释：学课程 1 需要先完成课程 0，学课程 0 需要先完成课程 1，互为前置 → 形成环 → 不可能完成。

### 关键约束

```
本质：判断有向图中是否存在环
  课程 = 节点，先修关系 = 有向边
  [a, b] → 从 b 指向 a（先学 b 再学 a）

有环 → 无法完成（return false）
无环 → 可以完成（return true）
```

### 建模图示

```
prerequisites = [[1,0],[2,0],[3,1],[3,2]]

       0
      / \
     v   v
     1   2
      \ /
       v
       3

无环，可以按 0→1→2→3 的顺序完成
```

```
prerequisites = [[1,0],[0,1]]

   0 ⇄ 1   （互相依赖，形成环）

有环，无法完成
```

---

## 二、暴力解法（逐节点 DFS 检测环）

### 思路（最直观）

最直观的想法：对每个课程，检查"从它出发，是否能走回自己"。

```
1. 构建邻接表（有向图）
2. 对每个节点 i，做一次 DFS
3. DFS 中维护一个 visited 集合，记录本次路径上已访问的节点
4. 如果 DFS 过程中再次遇到起始节点 → 有环 → return false
5. 每次 DFS 前都要重置 visited
6. 所有节点都检查完没有环 → return true
```

### 过程图解

以 `numCourses=4, prerequisites=[[1,0],[2,0],[3,1],[3,2]]` 为例：

邻接表：
```
0 → [1, 2]
1 → [3]
2 → [3]
3 → []
```

逐节点检查：
```
从节点 0 出发：
  path = {0}
  → 访问 1, path = {0,1}
    → 访问 3, path = {0,1,3}
      → 无邻居，回溯
    → 回溯
  → 访问 2, path = {0,2}
    → 访问 3, path = {0,2,3}
      → 无邻居，回溯
    → 回溯
  没有回到 0 → 无环 ✓

从节点 1 出发：
  path = {1}
  → 访问 3, path = {1,3}
    → 无邻居
  没有回到 1 → 无环 ✓

从节点 2 出发：同理 ✓
从节点 3 出发：无邻居 ✓

全部通过 → return true
```

有环的例子 `[[1,0],[0,1]]`：
```
邻接表：
0 → [1]
1 → [0]

从节点 0 出发：
  path = {0}
  → 访问 1, path = {0,1}
    → 访问 0, 0 已在 path 中！→ 检测到环！→ return false
```

### Java代码（暴力解法）

```java
import java.util.*;

class Solution {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        // 构建邻接表
        List<List<Integer>> graph = new ArrayList<>();
        for (int i = 0; i < numCourses; i++) {
            graph.add(new ArrayList<>());
        }
        for (int[] pre : prerequisites) {
            graph.get(pre[1]).add(pre[0]); // pre[1] → pre[0]
        }

        // 对每个节点单独做 DFS 检测环
        for (int i = 0; i < numCourses; i++) {
            Set<Integer> path = new HashSet<>();
            if (hasCycle(graph, i, path)) {
                return false;
            }
        }

        return true;
    }

    // 从 node 出发 DFS，判断是否有环
    private boolean hasCycle(List<List<Integer>> graph, int node, Set<Integer> path) {
        if (path.contains(node)) {
            return true; // 再次访问到路径上的节点 → 有环
        }

        path.add(node);

        for (int neighbor : graph.get(node)) {
            if (hasCycle(graph, neighbor, path)) {
                return true;
            }
        }

        path.remove(node); // 回溯
        return false;
    }
}
```

### 复杂度分析

时间复杂度：
```
构建邻接表：O(E)，E = prerequisites.length
对每个节点做 DFS：每次 DFS 最坏遍历所有边
  单次 DFS：O(V + E)
  共 V 次：O(V * (V + E))

最好：O(V + E)（无边，直接过）
最坏：O(V * (V + E))（每个节点都要深度搜索整张图）
平均：O(V * (V + E))
```

空间复杂度：
```
邻接表：O(V + E)
path 集合：O(V)
递归栈：O(V)

总空间复杂度：O(V + E)
```

### 不足之处

❌ 每个节点都从头做一遍 DFS，大量重复工作
❌ 节点 3 可能被节点 0、1、2 各访问一次，重复判断
❌ 时间复杂度 O(V*(V+E)) 太高

优化方向：
> 用"三色标记法"，一次 DFS 遍历就能完成环检测，对已确认无环的节点不再重复访问

---

## 三、第一次优化（DFS 三色标记法）

### 优化思路

核心思想：给每个节点标记三种状态（颜色）

```
白色（0 - 未访问）：还没有被处理
灰色（1 - 访问中）：正在当前 DFS 路径上（递归栈中）
黑色（2 - 已完成）：已经确认以它为起点无环
```

规则：
```
DFS 时遇到白色节点 → 标记为灰色，继续深入
DFS 时遇到灰色节点 → 发现环！（它在当前路径上被再次访问）
DFS 时遇到黑色节点 → 跳过（已确认安全）
DFS 回溯时 → 灰色变黑色（确认安全）
```

关键优化点：
```
黑色节点直接跳过，不再重复搜索
每个节点最多被访问一次（白→灰→黑）
总时间 O(V + E)
```

### 过程图解

以 `numCourses=4, prerequisites=[[1,0],[2,0],[3,1],[3,2]]` 为例：

邻接表：
```
0 → [1, 2]
1 → [3]
2 → [3]
3 → []
```

初始状态：
```
color: [白, 白, 白, 白]
        0    1    2    3
```

---

### DFS 从节点 0 开始

```
dfs(0): color[0] = 灰
│
├─ dfs(1): color[1] = 灰
│  │
│  └─ dfs(3): color[3] = 灰
│     │  没有邻居
│     │  color[3] = 黑 ✓（确认安全）
│     └─ 返回 false（无环）
│
│  color[1] = 黑 ✓
│  └─ 返回 false
│
├─ dfs(2): color[2] = 灰
│  │
│  └─ 访问邻居 3: color[3] = 黑 → 跳过！（已确认安全）
│
│  color[2] = 黑 ✓
│  └─ 返回 false
│
color[0] = 黑 ✓
└─ 返回 false
```

最终 color：
```
color: [黑, 黑, 黑, 黑]  → 全部安全，无环 → return true
```

关键优化效果：
```
暴力法：节点 3 被访问了多次（从 0→1→3, 从 0→2→3, 从 1→3, 从 3）
三色法：节点 3 只被深入访问 1 次，第二次遇到时已是黑色直接跳过
```

---

### 有环的例子

`prerequisites = [[1,0],[0,1]]`：

邻接表：
```
0 → [1]
1 → [0]
```

```
dfs(0): color[0] = 灰
│
└─ dfs(1): color[1] = 灰
   │
   └─ 访问邻居 0: color[0] = 灰！
      → 灰色 = 当前路径上 → 检测到环！→ return true

发现环 → return false
```

---

### 三色状态转移图

```
     ┌─────────┐   DFS进入    ┌─────────┐   DFS回溯    ┌─────────┐
     │  白色(0)  │ ──────────→ │  灰色(1)  │ ──────────→ │  黑色(2)  │
     │  未访问   │              │  访问中   │              │  已完成   │
     └─────────┘              └─────────┘              └─────────┘
                                   │
                              遇到灰色邻居
                                   │
                                   v
                              ┌─────────┐
                              │  有环！   │
                              └─────────┘
```

### Java代码（第一次优化）

```java
import java.util.*;

class Solution {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        // 构建邻接表
        List<List<Integer>> graph = new ArrayList<>();
        for (int i = 0; i < numCourses; i++) {
            graph.add(new ArrayList<>());
        }
        for (int[] pre : prerequisites) {
            graph.get(pre[1]).add(pre[0]);
        }

        // 0=白色(未访问), 1=灰色(访问中), 2=黑色(已完成)
        int[] color = new int[numCourses];

        // 对每个未访问的节点发起 DFS
        for (int i = 0; i < numCourses; i++) {
            if (color[i] == 0) { // 只处理白色节点
                if (hasCycle(graph, i, color)) {
                    return false;
                }
            }
        }

        return true;
    }

    private boolean hasCycle(List<List<Integer>> graph, int node, int[] color) {
        color[node] = 1; // 标记为灰色（进入递归栈）

        for (int neighbor : graph.get(node)) {
            if (color[neighbor] == 1) {
                return true; // 遇到灰色 → 有环！
            }
            if (color[neighbor] == 0) { // 白色 → 继续深入
                if (hasCycle(graph, neighbor, color)) {
                    return true;
                }
            }
            // 黑色（2）→ 跳过，已确认安全
        }

        color[node] = 2; // 标记为黑色（确认安全）
        return false;
    }
}
```

### 复杂度分析

时间复杂度：
```
构建邻接表：O(E)
DFS：每个节点最多访问一次（白→灰→黑），每条边最多检查一次

最好：O(V + E)
最坏：O(V + E)
平均：O(V + E)

相比暴力的 O(V*(V+E))，巨大提升！
```

空间复杂度：
```
邻接表：O(V + E)
color 数组：O(V)
递归栈：O(V)

总空间复杂度：O(V + E)
```

### 优点与不足

✅ O(V+E) 时间，每个节点和边只处理一次
✅ 三色标记避免重复搜索
❌ 使用递归，节点数极多时可能栈溢出
❌ DFS 检测环在概念上不如拓扑排序直观

优化方向：
> 用 BFS 拓扑排序（Kahn 算法），迭代实现，无递归，更直观

---

## 四、最终优化（BFS 拓扑排序 / Kahn 算法）

### 优化思路

核心思想：**拓扑排序**

```
如果一个有向图可以被拓扑排序 → 无环 → 可以完成所有课程
如果不能完成拓扑排序（有节点永远无法入队）→ 有环 → 无法完成
```

什么是拓扑排序？
```
将有向无环图（DAG）的所有节点排成一个线性序列，
使得对于每条有向边 u→v，u 都在 v 之前。

直觉：先修课排在前面，依赖它的课排在后面。
```

Kahn 算法步骤：
```
1. 计算每个节点的入度（有多少条边指向它）
2. 将所有入度为 0 的节点入队（没有先修要求，可以直接学）
3. BFS：每次弹出一个节点，表示"学完这门课"
   - 将它所有邻居的入度 -1（解锁依赖）
   - 如果邻居入度变为 0，入队（先修课都学完了，可以学了）
4. 统计弹出的节点数 count
5. count == numCourses → 全部课程可完成 → return true
   count < numCourses → 有环（环内节点入度永远不为0）→ return false
```

### 为什么有环时拓扑排序会失败？

```
环中的每个节点至少有一条来自环内的入边
环内节点的入度永远不会减到 0
所以它们永远不会被加入队列
最终 count < numCourses
```

### 过程图解（完整）

以 `numCourses=6, prerequisites=[[1,0],[2,0],[3,1],[3,2],[4,3],[5,4]]` 为例：

邻接表和入度：
```
邻接表（谁指向谁）：
0 → [1, 2]
1 → [3]
2 → [3]
3 → [4]
4 → [5]
5 → []

入度（被几条边指向）：
节点:  0  1  2  3  4  5
入度:  0  1  1  2  1  1
```

图结构：
```
0 ──→ 1 ──→ 3 ──→ 4 ──→ 5
│           ↑
└───→ 2 ───┘
```

---

### Step0: 初始化

```
入度为 0 的节点：[0]
Queue: [0]
count = 0
```

---

### Step1: 弹出节点 0

```
弹出 0, count = 1

0 的邻居：1, 2
  入度[1]: 1→0 → 入队！
  入度[2]: 1→0 → 入队！

Queue: [1, 2]

入度: [0, 0, 0, 2, 1, 1]
             ↑  ↑
            刚清零
```

---

### Step2: 弹出节点 1

```
弹出 1, count = 2

1 的邻居：3
  入度[3]: 2→1 → 不为0，不入队

Queue: [2]

入度: [0, 0, 0, 1, 1, 1]
```

---

### Step3: 弹出节点 2

```
弹出 2, count = 3

2 的邻居：3
  入度[3]: 1→0 → 入队！

Queue: [3]

入度: [0, 0, 0, 0, 1, 1]
```

---

### Step4: 弹出节点 3

```
弹出 3, count = 4

3 的邻居：4
  入度[4]: 1→0 → 入队！

Queue: [4]

入度: [0, 0, 0, 0, 0, 1]
```

---

### Step5: 弹出节点 4

```
弹出 4, count = 5

4 的邻居：5
  入度[5]: 1→0 → 入队！

Queue: [5]

入度: [0, 0, 0, 0, 0, 0]
```

---

### Step6: 弹出节点 5

```
弹出 5, count = 6

5 的邻居：无

Queue: []（空）
```

count = 6 == numCourses → **return true** ✓

拓扑序列：0 → 1 → 2 → 3 → 4 → 5

---

### 有环的例子

`numCourses=3, prerequisites=[[1,0],[2,1],[0,2]]`：

```
邻接表：          入度：
0 → [1]          0: 1
1 → [2]          1: 1
2 → [0]          2: 1

图：0 → 1 → 2 → 0（环！）
```

```
初始：入度全为 1，没有入度为 0 的节点
Queue: []（空！）

BFS 直接结束，count = 0

count(0) != numCourses(3) → return false ✓
```

---

### 入度变化追踪表（无环例子）

| 步骤 | 弹出 | Queue变化 | 入度变化 | count |
|------|------|----------|---------|-------|
| 初始 | - | [0] | [0,1,1,2,1,1] | 0 |
| Step1 | 0 | [1,2] | [0,**0**,**0**,2,1,1] | 1 |
| Step2 | 1 | [2] | [0,0,0,**1**,1,1] | 2 |
| Step3 | 2 | [3] | [0,0,0,**0**,1,1] | 3 |
| Step4 | 3 | [4] | [0,0,0,0,**0**,1] | 4 |
| Step5 | 4 | [5] | [0,0,0,0,0,**0**] | 5 |
| Step6 | 5 | [] | [0,0,0,0,0,0] | 6 |

count == numCourses ✓

---

### Java代码（最终优化）

```java
import java.util.*;

class Solution {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        // 构建邻接表 + 统计入度
        List<List<Integer>> graph = new ArrayList<>();
        int[] inDegree = new int[numCourses];

        for (int i = 0; i < numCourses; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] pre : prerequisites) {
            graph.get(pre[1]).add(pre[0]); // pre[1] → pre[0]
            inDegree[pre[0]]++;            // pre[0] 的入度 +1
        }

        // 将所有入度为 0 的节点入队
        Queue<Integer> queue = new LinkedList<>();
        for (int i = 0; i < numCourses; i++) {
            if (inDegree[i] == 0) {
                queue.offer(i);
            }
        }

        int count = 0; // 已"学完"的课程数

        // BFS 拓扑排序
        while (!queue.isEmpty()) {
            int course = queue.poll();
            count++;

            // 将该课程的所有后继课程入度 -1
            for (int next : graph.get(course)) {
                inDegree[next]--;
                if (inDegree[next] == 0) {
                    queue.offer(next); // 入度为 0，所有先修课已完成
                }
            }
        }

        // 如果所有课程都被处理 → 无环 → 可完成
        return count == numCourses;
    }
}
```

### 复杂度分析

时间复杂度：
```
构建邻接表 + 计算入度：O(V + E)
BFS：每个节点入队出队一次 O(V)，每条边检查一次 O(E)

最好：O(V + E)
最坏：O(V + E)
平均：O(V + E)

V = numCourses, E = prerequisites.length
```

空间复杂度：
```
邻接表：O(V + E)
入度数组：O(V)
BFS 队列：最坏 O(V)

总空间复杂度：O(V + E)
```

---

## 五、三种解法对比总结

| 解法 | 核心思路 | 时间复杂度 | 空间复杂度 | 特点 |
|------|---------|-----------|-----------|------|
| 暴力 DFS | 逐节点 DFS 查环 | O(V*(V+E)) | O(V+E) | 直观但大量重复 |
| DFS 三色标记 | 一次 DFS + 白灰黑 | O(V+E) | O(V+E) | 高效，递归实现 |
| BFS 拓扑排序 | Kahn 算法 | O(V+E) | O(V+E) | 迭代，无栈溢出，最直观 |

---

## 六、关键记忆点

### 核心思想

```
看到"课程/任务依赖关系 + 能否全部完成" → 有向图环检测 → 拓扑排序

两种主流方法：
1. DFS 三色标记（递归）
2. BFS 拓扑排序 / Kahn 算法（迭代）
```

### BFS 拓扑排序模板（Kahn 算法）

```java
// 1. 建图 + 算入度
for (边) { graph[u].add(v); inDegree[v]++; }

// 2. 入度为 0 的先入队
for (节点) if (inDegree[i] == 0) queue.offer(i);

// 3. BFS
while (!queue.isEmpty()) {
    int node = queue.poll();
    count++;
    for (int next : graph[node]) {
        if (--inDegree[next] == 0) queue.offer(next);
    }
}

// 4. 判断
return count == 总节点数;
```

### DFS 三色标记模板

```java
// 0=白, 1=灰, 2=黑
boolean hasCycle(int node) {
    color[node] = 1;  // 灰（进入）
    for (int next : graph[node]) {
        if (color[next] == 1) return true;   // 遇灰 → 环
        if (color[next] == 0 && hasCycle(next)) return true;
    }
    color[node] = 2;  // 黑（安全）
    return false;
}
```

### 易错点

```
1. 边的方向：
   [a, b] 意味着 b → a（先学 b 才能学 a）
   ✅ graph[b].add(a); inDegree[a]++
   ❌ 不要反了

2. 拓扑排序判断条件：
   ✅ count == numCourses → 无环
   ❌ 不是 queue.isEmpty()（队列空不代表全处理完）

3. 孤立节点（没有任何依赖关系）：
   ✅ 入度为 0，直接入队，count 会正确计数
```

### 面试答题顺序

```
1. 识别：课程依赖 → 有向图 → 环检测
2. 说方法：拓扑排序（Kahn / BFS）
3. 解释：入度为 0 → 可学习 → 解锁后续
4. 代码：建图 → 入度 → BFS → count判断
5. 复杂度：O(V+E)
6. 追问：可以用 DFS 三色标记做（另一种思路）
```

### 记忆口诀

```
课程依赖看成图
有向无环才能修
拓扑排序Kahn法
入度为零先入队
逐个弹出减邻居
count等于课程数
```

---

# leetcode 208

## 一、题目理解

题目：**Implement Trie (Prefix Tree)（实现前缀树）**

实现一个 Trie 类，包含以下三个操作：

- `void insert(String word)`：向前缀树中插入字符串 `word`
- `boolean search(String word)`：如果字符串 `word` 在前缀树中，返回 `true`；否则返回 `false`
- `boolean startsWith(String prefix)`：如果之前已经插入的字符串中有以 `prefix` 为前缀的，返回 `true`；否则返回 `false`

### 示例

```
Trie trie = new Trie();
trie.insert("apple");
trie.search("apple");     // 返回 true
trie.search("app");       // 返回 false
trie.startsWith("app");   // 返回 true
trie.insert("app");
trie.search("app");       // 返回 true
```

### 关键约束

```
word 和 prefix 仅由小写英文字母组成
1 <= word.length, prefix.length <= 2000
最多调用 3 * 10^4 次 insert、search、startsWith

核心区别：
  search("app")    → 必须是一个完整插入过的单词 → false
  startsWith("app") → 只要有单词以 "app" 开头即可 → true（因为有 "apple"）
```

---

## 二、暴力解法（List 存储 + 逐一比较）

### 思路（最直观）

最简单的做法：用一个 List 存储所有插入的单词。

```
insert(word)：将 word 添加到 List
search(word)：遍历 List，逐个比较是否有完全相同的单词
startsWith(prefix)：遍历 List，逐个检查是否有单词以 prefix 开头
```

### 过程图解

```
操作序列：insert("apple"), insert("app"), insert("apart")

List: ["apple", "app", "apart"]

search("app"):
  "apple" == "app" ? ❌
  "app"   == "app" ? ✅ → return true

startsWith("ap"):
  "apple".startsWith("ap") ? ✅ → return true

startsWith("b"):
  "apple".startsWith("b") ? ❌
  "app".startsWith("b")   ? ❌
  "apart".startsWith("b") ? ❌
  → return false
```

### Java代码（暴力解法）

```java
import java.util.*;

class Trie {
    private List<String> words;

    public Trie() {
        words = new ArrayList<>();
    }

    public void insert(String word) {
        words.add(word);
    }

    public boolean search(String word) {
        for (String w : words) {
            if (w.equals(word)) {
                return true;
            }
        }
        return false;
    }

    public boolean startsWith(String prefix) {
        for (String w : words) {
            if (w.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }
}
```

### 复杂度分析

时间复杂度：
```
insert：O(1)（ArrayList.add 均摊 O(1)）
search：O(N * L)（N = 单词数，L = 单词平均长度，逐个比较）
startsWith：O(N * L)（同上）

最好：O(1)（第一个就匹配）
最坏：O(N * L)（遍历完所有单词）
```

空间复杂度：
```
存储所有单词：O(N * L)
```

### 不足之处

❌ search 和 startsWith 每次都要遍历整个列表
❌ 没有利用字符串之间的公共前缀
❌ 大量操作时性能很差

优化方向：
> 用 HashSet 优化 search 到 O(L)，但 startsWith 仍需要特殊处理

---

## 三、第一次优化（HashSet + 前缀 HashSet）

### 优化思路

核心改进：
```
用两个 HashSet：
1. wordSet：存储所有完整单词 → search 直接 O(L) 查找
2. prefixSet：存储所有单词的所有前缀 → startsWith 直接 O(L) 查找

insert("apple") 时：
  wordSet 加入 "apple"
  prefixSet 加入 "a", "ap", "app", "appl", "apple"
```

### 过程图解

```
insert("apple"):
  wordSet:   {"apple"}
  prefixSet: {"a", "ap", "app", "appl", "apple"}

insert("app"):
  wordSet:   {"apple", "app"}
  prefixSet: {"a", "ap", "app", "appl", "apple"}
              ↑ "a","ap","app" 已存在，不会重复

search("apple")   → wordSet.contains("apple")   → true  ✅
search("app")     → wordSet.contains("app")     → true  ✅
search("ap")      → wordSet.contains("ap")      → false ✅
startsWith("app") → prefixSet.contains("app")   → true  ✅
startsWith("b")   → prefixSet.contains("b")     → false ✅
```

### Java代码（第一次优化）

```java
import java.util.*;

class Trie {
    private Set<String> wordSet;
    private Set<String> prefixSet;

    public Trie() {
        wordSet = new HashSet<>();
        prefixSet = new HashSet<>();
    }

    public void insert(String word) {
        wordSet.add(word);
        // 将所有前缀加入 prefixSet
        for (int i = 1; i <= word.length(); i++) {
            prefixSet.add(word.substring(0, i));
        }
    }

    public boolean search(String word) {
        return wordSet.contains(word);
    }

    public boolean startsWith(String prefix) {
        return prefixSet.contains(prefix);
    }
}
```

### 复杂度分析

时间复杂度：
```
insert：O(L^2)
  （substring 生成 L 个前缀，每个前缀的 substring + hashCode 计算为 O(L)）
search：O(L)（HashSet 查找，计算 hashCode O(L)）
startsWith：O(L)（同上）
```

空间复杂度：
```
wordSet：O(N * L)
prefixSet：O(N * L^2)（每个长度 L 的单词产生 L 个前缀字符串）

总空间：O(N * L^2) ← 非常浪费！
```

### 优点与不足

✅ search 和 startsWith 都是 O(L)，查询非常快
❌ insert 是 O(L^2)，需要生成所有前缀子串
❌ 空间浪费严重：O(N * L^2)，大量重复前缀被存为独立字符串
❌ 没有利用"共享前缀"的思想

优化方向：
> 使用 Trie（前缀树）数据结构，共享公共前缀，空间效率大幅提升

---

## 四、最终优化（Trie 前缀树，最优解）

### 优化思路

核心思想：**前缀树（Trie）**

```
Trie 是一棵多叉树，每条边代表一个字符
从根节点到某个节点的路径 = 一个前缀
共享公共前缀 → 只存储一次

节点结构：
  children[26]：26 个子节点指针（对应 a-z）
  isEnd：标记该节点是否是某个完整单词的结尾
```

### Trie 结构图解

插入 "apple"、"app"、"apart" 后的 Trie：

```
         root
          |
         [a]
          |
         [p]
        /    \
      [p]    [a]
      / \      \
    [l]  ★     [r]
     |          |
    [e]        [t]
     |          |
     ★          ★

★ = isEnd = true（表示完整单词结尾）

路径解读：
  root → a → p → p → l → e  = "apple" ★
  root → a → p → p           = "app"   ★
  root → a → p → a → r → t  = "apart" ★
```

关键观察：
```
"apple" 和 "app" 共享前缀 "app"（3 个节点）
"apple" 和 "apart" 共享前缀 "ap"（2 个节点）
不需要重复存储公共部分！
```

### 三个操作的执行过程

### insert("apple") 过程

```
从 root 开始，逐字符创建/遍历节点：

root ──'a'──→ 创建节点A
             ──'p'──→ 创建节点P1
                      ──'p'──→ 创建节点P2
                               ──'l'──→ 创建节点L
                                        ──'e'──→ 创建节点E
                                                  设 isEnd = true ★
```

### insert("app") 过程（复用已有路径）

```
从 root 开始：
  'a' → 节点A 已存在，直接走过去 ✓
  'p' → 节点P1 已存在，直接走过去 ✓
  'p' → 节点P2 已存在，直接走过去 ✓
  所有字符用完 → 设 P2.isEnd = true ★

注意：没有创建任何新节点！只是给 P2 标记了 isEnd
```

### search("app") 过程

```
从 root 开始逐字符向下走：
  'a' → children['a'-'a'] = 节点A ✓ 存在
  'p' → children['p'-'a'] = 节点P1 ✓ 存在
  'p' → children['p'-'a'] = 节点P2 ✓ 存在

走完所有字符，检查当前节点的 isEnd：
  P2.isEnd = true → return true ✅
```

### search("ap") 过程

```
从 root 开始：
  'a' → 节点A ✓
  'p' → 节点P1 ✓

走完所有字符，检查 P1.isEnd：
  P1.isEnd = false → return false ✅
  （"ap" 只是前缀，不是完整单词）
```

### startsWith("ap") 过程

```
从 root 开始：
  'a' → 节点A ✓
  'p' → 节点P1 ✓

走完所有字符，不需要检查 isEnd
只要路径存在即可 → return true ✅
```

### search("xyz") 过程

```
从 root 开始：
  'x' → children['x'-'a'] = null ✗ 不存在

路径断了 → return false ✅
```

---

### search 与 startsWith 的唯一区别

```
search：     沿路径走完后，检查 isEnd == true
startsWith： 沿路径走完后，不需要检查 isEnd，路径存在即可

本质上就差一个 isEnd 的判断！
```

---

### 完整操作状态变化

```
操作                          Trie 变化              结果
─────────────────────────────────────────────────────────
insert("apple")              创建 a→p→p→l→e★         -
search("apple")              找到路径，isEnd=true     true
search("app")                找到路径，isEnd=false    false
startsWith("app")            找到路径                 true
insert("app")                复用路径，标记 p★        -
search("app")                找到路径，isEnd=true     true
```

---

### Java代码（最终优化）

```java
class Trie {
    // Trie 节点定义
    private Trie[] children;  // 26 个子节点（a-z）
    private boolean isEnd;    // 是否是某个单词的结尾

    public Trie() {
        children = new Trie[26];
        isEnd = false;
    }

    // 插入单词
    public void insert(String word) {
        Trie node = this; // 从根节点开始
        for (char c : word.toCharArray()) {
            int index = c - 'a';
            // 如果对应子节点不存在，创建新节点
            if (node.children[index] == null) {
                node.children[index] = new Trie();
            }
            node = node.children[index]; // 移动到子节点
        }
        node.isEnd = true; // 标记单词结尾
    }

    // 搜索完整单词
    public boolean search(String word) {
        Trie node = searchPrefix(word);
        // 节点存在 且 是完整单词结尾
        return node != null && node.isEnd;
    }

    // 搜索前缀
    public boolean startsWith(String prefix) {
        // 只要前缀路径存在即可
        return searchPrefix(prefix) != null;
    }

    // 辅助方法：沿前缀路径走，返回最后一个节点（路径不存在返回 null）
    private Trie searchPrefix(String prefix) {
        Trie node = this;
        for (char c : prefix.toCharArray()) {
            int index = c - 'a';
            if (node.children[index] == null) {
                return null; // 路径断了
            }
            node = node.children[index];
        }
        return node; // 返回前缀的最后一个节点
    }
}
```

### 代码设计要点

```
1. searchPrefix 是核心辅助方法：
   search 和 startsWith 都先调用它找到前缀末端节点
   search：额外检查 isEnd
   startsWith：不检查 isEnd

2. 节点本身就是 Trie 类：
   children[26] = 26 个 Trie 子节点
   简洁，无需单独定义 TrieNode 类

3. null 判断：
   children[index] == null → 该字符路径不存在
   这是 Trie 的天然"剪枝"
```

### 复杂度分析

时间复杂度：
```
insert(word)：O(L)，L = word.length
  每个字符只需一次数组访问和可能的节点创建

search(word)：O(L)
  每个字符只需一次数组访问

startsWith(prefix)：O(L)
  每个字符只需一次数组访问

最好 = 最坏 = 平均 = O(L)
所有操作都与字符串长度线性相关，与已存储的单词数无关！
```

空间复杂度：
```
每个节点：children[26] 数组 = O(26) = O(1)
最坏情况：所有单词没有公共前缀
  总节点数 = 所有单词长度之和 = O(N * L)
  每个节点 O(26)
  总空间：O(26 * N * L) = O(N * L)

最好情况：所有单词前缀高度重叠
  节点大量复用，空间远小于 O(N * L)
```

---

## 五、三种解法对比总结

| 解法        | insert | search | startsWith | 空间      | 特点       |
| --------- | ------ | ------ | ---------- | ------- | -------- |
| List 暴力   | O(1)   | O(N*L) | O(N*L)     | O(N*L)  | 简单但查询慢   |
| 双 HashSet | O(L²)  | O(L)   | O(L)       | O(N*L²) | 查询快但空间爆炸 |
| Trie 前缀树  | O(L)   | O(L)   | O(L)       | O(N*L)  | 全面最优     |
|           |        |        |            |         |          |

---

## 六、关键记忆点

### 核心思想

```
看到"前缀匹配/前缀查询" → 前缀树 Trie

Trie 本质：
  一棵 26 叉树（小写字母场景）
  每条边 = 一个字符
  路径 = 字符串前缀
  isEnd 标记 = 完整单词结尾
```

### Trie 节点结构模板

```java
class Trie {
    Trie[] children = new Trie[26];  // 子节点
    boolean isEnd = false;           // 单词结尾标记
}
```

### 三个操作的核心逻辑

```
insert：逐字符走，没有就创建，最后标记 isEnd = true
search：逐字符走，走不通返回 false，走完检查 isEnd
startsWith：逐字符走，走不通返回 false，走完直接返回 true

search 与 startsWith 唯一区别 = 是否检查 isEnd
```

### 代码复用技巧

```java
// 抽取公共方法 searchPrefix
private Trie searchPrefix(String s) {
    Trie node = this;
    for (char c : s.toCharArray()) {
        if (node.children[c - 'a'] == null) return null;
        node = node.children[c - 'a'];
    }
    return node;
}

search(word)       → searchPrefix(word) != null && .isEnd
startsWith(prefix) → searchPrefix(prefix) != null
```

### 易错点

```
1. search vs startsWith：
   ✅ search 必须检查 isEnd
   ❌ 不检查 isEnd 就变成了 startsWith

2. insert 时不要忘记最后设 isEnd = true：
   ✅ node.isEnd = true
   ❌ 忘记标记 → search 永远 false

3. children 数组下标：
   ✅ c - 'a'（将 'a'-'z' 映射到 0-25）
   ❌ 直接用 char 做下标（越界）
```

### 面试答题顺序

```
1. 解释 Trie 结构：多叉树，每条边一个字符，共享前缀
2. 画出示例 Trie 图
3. 说明 isEnd 的作用：区分"前缀"和"完整单词"
4. 写代码：节点结构 → insert → searchPrefix → search/startsWith
5. 复杂度：所有操作 O(L)，空间 O(N*L)
```

### 记忆口诀

```
前缀查询用Trie树
二十六叉每条边一字符
isEnd区分词和缀
insert建路search走路
走不通就返回false
走完了查isEnd
```

---