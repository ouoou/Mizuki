---
title: Leetcode-优先级队列题型
published: 2025-09-02
updated: 2025-09-02
description: ''
image: ''
tags: [Leetcode, 大根堆]
category: 'Leetcode'
draft: false 
---
# LeetCode 1792

## 1. 问题重述

有 `n` 个班级，每个班级有 `passi` 个通过、`totali` 个总数。
额外的学生一定能通过，可以选择将他们分配到任意班级。
目标是让所有班级的平均通过率最大。

**平均通过率定义：**

$$
\text{avg} = \frac{1}{n} \sum_{i=1}^{n} \frac{pass_i}{total_i}
$$


## 2. 如何决定额外学生放在哪个班级？

设某个班级目前的通过率为：

$$
\frac{p}{t}
$$

如果再放一个学生进去，新的通过率为：

$$
\frac{p+1}{t+1}
$$

对整体平均分数的提升取决于 **增量**：

$$
\Delta = \frac{p+1}{t+1} - \frac{p}{t}
$$

**贪心思想：**
每次选择能带来最大增益 $\Delta$ 的班级，把学生分给它。

---

## 3. 算法设计

1. 计算每个班级如果多一个通过学生时的增益 $\Delta$。
2. 使用 **最大堆（优先队列）**，每次选出增益最大的班级，把一个额外学生放进去。
3. 更新该班级的 `(p, t)`，重新计算它的 $\Delta$，再放回堆里。
4. 重复 `extraStudents` 次。
5. 最后计算所有班级的平均通过率。

---

## 4. 复杂度分析

* 每次分配需要 **堆操作 O(log n)**。
* 总共 `extraStudents` 次分配，所以时间复杂度：

$$
O(extraStudents \cdot \log n)
$$

* 空间复杂度：

$$
O(n)
$$

---

## 5. 示例推导

例子：`classes = [[1,2],[3,5],[2,2]], extraStudents = 2`

* 班级1：$\Delta = \frac{2}{3} - \frac{1}{2} = 0.1667$
* 班级2：$\Delta = \frac{4}{6} - \frac{3}{5} = 0.0333$
* 班级3：$\Delta = \frac{3}{3} - \frac{2}{2} = 0$

第一个额外学生 → 放班级1
更新后：`(2,3)`，新的 $\Delta = \frac{3}{4} - \frac{2}{3} \approx 0.0833$

第二个额外学生 → 仍然放班级1
更新后：`(3,4)`

最后平均通过率：

$$
\frac{\frac{3}{4} + \frac{3}{5} + \frac{2}{2}}{3} = 0.78333
$$

---

## 暴力解法
```JAVA
class Solution {
    public double maxAverageRatio(int[][] classes, int extraStudents) {
        for (int k = 0; k < extraStudents; k++) {
            int bestIdx = 0;
            double bestRate = 0.0;
            for (int i = 0; i < classes.length; i++) {
                int p = classes[i][0];
                int t = classes[i][1];
                double rate = (double) (p + 1) / (t + 1) - (double) p / t;
                if (rate > bestRate) {
                    bestIdx = i;
                    bestRate = rate;
                }
            }
            classes[bestIdx][0]++;
            classes[bestIdx][1]++;
        }
        double sum = 0.0;
        for (int[] c : classes) {
            sum += (double) c[0] / c[1];
        }
        return sum / classes.length;
    }
}
```

## 大根堆/优先级队列

```JAVA
class Solution {

    class Info{
        int p;
        int t;
        double rate;

        public Info(int p, int t) {
            this.p = p;
            this.t = t;
            this.rate = calRate();
        }

        public double calRate() {
            return (double) (p + 1) / (t + 1) - (double) p / t;
        }

        public void add() {
            p++;
            t++;
            rate = calRate();
        }
    }
    public double maxAverageRatio(int[][] classes, int extraStudents) {
        PriorityQueue<Info> queue = new PriorityQueue<>(
                (a,b) -> Double.compare(b.rate, a.rate)
        );

        for (int [] clazz : classes) {
            queue.offer(new Info(clazz[0], clazz[1]));
        }

        for (int k = 0; k < extraStudents; k++) {
            Info poll = queue.poll();
            poll.add();
            queue.offer(poll);
        }

        double sum = 0;
        while (!queue.isEmpty()) {
            Info poll = queue.poll();
            sum += (double) poll.p / poll.t;
        }
        return sum / classes.length;
    }
}
```
