---
title: Leetcode-hot100链表
published: 2025-10-29
updated: 2025-10-29
description: ""
image: ""
tags:
  - hot100
  - 链表
category: Leetcode
draft: false
---

# leetcode 160

## 思路

### 🔑 核心思路

两个链表长度可能不一样，但我们可以通过**让两个指针同时遍历两条链表、并在到达尾部时切换到另一条链表**，来保证它们**最终能在相交节点对齐**。

### 🧠 思考过程

1. 定义两个指针 `pA`、`pB`，分别指向 `headA` 和 `headB`。
2. 同步向前移动：

   * 当 `pA` 走到尾部后，改为从 `headB` 开始走。
   * 当 `pB` 走到尾部后，改为从 `headA` 开始走。
3. 这样两者最终会：

   * 在**相交点相遇**；
   * 或者**同时为 null**（说明没有交点）。

### 🎯 为什么可行

* 设 A 链长度为 `a + c`（c 为公共部分长度）；
* B 链长度为 `b + c`；
* 当两指针都走完 `a + b + c` 步时：

   * pA 走了：a + c + b
   * pB 走了：b + c + a
     → 它们正好走了相同的距离，所以如果有交点，会在相交处相遇。

---


## java解法

```java
/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode(int x) {
 *         val = x;
 *         next = null;
 *     }
 * }
 */
public class Solution {
    public ListNode getIntersectionNode(ListNode headA, ListNode headB) {
        ListNode pa = headA;
        ListNode pb = headB;
        while (pa != pb) {
            pa = pa == null ? headB : pa.next;
            pb = pb == null ? headA : pb.next;
        }
        return pa;
    }
}
```

# leetcode 206

## 思路

---

### 🔑 核心思想

逐个“翻转”链表节点的指针方向。
每次把当前节点 `cur` 的 `next` 指针改成指向前一个节点 `prev`。

---
ss
### 🧠 步骤分解

假设链表：

```
head → 1 → 2 → 3 → null
```

我们维护三个指针：

* `prev`：反转后链表的前一个节点（初始为 null）
* `cur`：当前正在处理的节点（初始为 head）
* `next`：临时保存当前节点的下一个节点（防止断链）

循环步骤：

1. 保存 `next = cur.next`
2. 反转指针 `cur.next = prev`
3. 向后移动：`prev = cur`, `cur = next`

直到 `cur == null`，说明反转完成，返回 `prev`（新头节点）

---

### 🧩 动画理解（关键指针变化）

| 步骤    | cur    | prev | 操作              |
| ----- | ------ | ---- | --------------- |
| 初始    | 1      | null | -               |
| step1 | 1→2    | null | `1.next = null` |
| step2 | 2→3    | 1    | `2.next = 1`    |
| step3 | 3→null | 2    | `3.next = 2`    |
| 结束    | null   | 3    | 返回 `3`          |

最终链表：`3 → 2 → 1 → null`

---

## java解法

```java
/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode() {}
 *     ListNode(int val) { this.val = val; }
 *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }
 * }
 */
class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode cur = head;
        ListNode prev = null;
        while (cur != null) {
            ListNode next = cur.next;
            cur.next = prev;
            prev = cur;
            cur = next;
        }
        return prev;
    }
}
```