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

# leetcode 234

## java解法O(n)

```JAVA
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
    public boolean isPalindrome(ListNode head) {
        ArrayList<Integer> list = new ArrayList<>();
        while (head != null) {
            list.add(head.val);
            head = head.next;
        }
        int left = 0;
        int right = list.size() - 1;
        while (left <= right) {
            if (list.get(left) != list.get(right)) {
                return false;
            }
            left++;
            right--;
        }
        return true;
    }
}
```

# leetcode 141
## 思路
🧠 思路

用两个指针：

slow 每次走一步

fast 每次走两步

如果链表中有环，那么：

fast 会在环内「追上」slow（相遇）；

否则，fast 会先到达 null（说明无环）。

这类似于两个人在跑道上跑步的情况——
一个跑得快，一个跑得慢，如果有圈，他们一定会相遇。

## java解法

```java
/**
 * Definition for singly-linked list.
 * class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode(int x) {
 *         val = x;
 *         next = null;
 *     }
 * }
 */
public class Solution {
    public boolean hasCycle(ListNode head) {
        if (head == null || head.next == null) {
            return false;
        }
        ListNode s = head;
        ListNode f = head.next;
        while (s != f) {
            if (f == null || f.next == null) {
                return false;
            }
            s = s.next;
            f = f.next.next;
        }
        return true;
    }
}
```

# leetcode 142

## 💡 思路

### 🎯 题目目标

给定一个链表，判断是否存在环。
如果存在，返回 **环的入口节点**；
如果不存在，返回 `null`。

---

### 🧩 思想核心

用两个指针：

* **快指针 fast** 每次走 2 步；
* **慢指针 slow** 每次走 1 步。

当它们第一次相遇时，说明链表中有环。
然后再用第二阶段算法定位**环的入口**。

---

➡️ **相遇说明有环**
此时 `slow` 与 `fast` 在环中某个节点相遇。

---

### 🧭 阶段 2：寻找环的入口

原理推导：

> head 到入口的距离 = 环内相遇点到入口的距离（沿环走）

操作方法：

1. 让一个指针从 **head** 出发；
2. 另一个指针从 **相遇点** 出发；
3. 两者同时每次走一步；
4. 相遇点即为环的入口。

```java
fast = head;
while (fast != slow) {
    fast = fast.next;
    slow = slow.next;
}
return fast; // 或 slow
```

---


### 📘 一句话记忆法

> **“先判圈，再找入口；相遇重置，一步同走。”**

解释：

1. 先用快慢指针判圈；
2. 相遇后一个回到头节点；
3. 两指针一起每次走一步；
4. 相遇点就是入口。

---

### 🧮 原理公式（可选记忆）

设：

* `a` = 从头到环入口的距离；
* `b` = 从入口到相遇点的距离；
* `c` = 环的总长度。

相遇时：

```
快指针路程 = 2 * 慢指针路程
a + b + n*c = 2*(a + b)
=> a = n*c - b
```

所以：
从“头节点”走 `a` 步
= 从“相遇点”走 `c - b` 步（环剩下部分）
→ 相遇处就是环入口。

---


## java解法

```java
/**
 * Definition for singly-linked list.
 * class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode(int x) {
 *         val = x;
 *         next = null;
 *     }
 * }
 */
public class Solution {
    public ListNode detectCycle(ListNode head) {
        if (head == null || head.next == null) {
            return null;
        }
        ListNode s = head;
        ListNode f = head;
        
        while (f != null && f.next != null) {
            s = s.next;
            f = f.next.next;
            if (s == f) {
                break;
            }
        }

        if (f == null || f.next == null) {
            return null;
        }

        f = head;

        while (s != f) {
            s = s.next;
            f = f.next;
        }
        
        return f;
    }
}
```


# leetcode 21

## 🧠 解题思路（核心逻辑）

这是一个典型的 **双指针 + 链表构造** 问题。

我们同时遍历两个链表：

* 每次比较 `list1.val` 和 `list2.val`
* 把较小的那个节点接到结果链表的尾部
* 向前移动取出较小值的链表指针
* 最后，把未遍历完的链表直接接在结果后面（因为它本身就是有序的）

---

## ✅ 思路模板（记忆法）

> 💡 模板口诀：
> “创建哑节点 → 双指针比较 → 小的先走 → 连接尾巴 → 接上剩余”

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
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        ListNode dummy = new ListNode(-1);
        ListNode curr = dummy;
        while (list1 != null && list2 != null) {
            if (list1.val < list2.val) {
                curr.next = list1;
                list1 = list1.next;
            } else {
                curr.next = list2;
                list2 = list2.next;
            }
            curr = curr.next;
        }
        if (list1 != null) {
            curr.next = list1;
        }
        if (list2 != null) {
            curr.next = list2;
        }
        return dummy.next;
    }
}
```

# leetcode 2
## 思路

我们从 个位开始相加，即从链表头开始相加。
每一位需要处理：

当前位的两个数相加；

加上上一位的进位；

求出本位结果和新的进位；

把结果放入新链表。
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
    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(-1);
        ListNode curr = dummy;
        int c = 0;

        while (l1 != null || l2 != null || c != 0) {
            int x = l1 != null ? l1.val : 0;
            int y = l2 != null ? l2.val : 0;
            int sum = x + y + c;

            ListNode node = new ListNode(sum % 10);
            curr.next = node;
            curr = curr.next;

            c = sum / 10;
            if (l1 != null) {
                l1 = l1.next;
            }
            if (l2 != null) {
                l2 = l2.next;
            }
        }
        return dummy.next;
    }
}
```


# leetcode 19

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
    public ListNode removeNthFromEnd(ListNode head, int n) {
        ListNode dummy = new ListNode(-1);
        dummy.next = head;
        ListNode curr = dummy.next;
        int len = 0;
        while (curr != null) {
            curr = curr.next;
            len++;
        }

        curr = dummy;
        for (int i = 0; i < len - n; i++) {
            curr = curr.next;
        }
        
        curr.next = curr.next.next;

        return dummy.next;
    }
}
```


# leetcode24

---

## 💡思路

> 这是最常用、最清晰的写法。

### 🔍核心思路：

1. 使用一个虚拟头节点 `dummy`，指向原链表的头。
2. 用一个指针 `temp` 来遍历链表，每次处理两个节点：

    * 设这两个节点为 `first` 和 `second`。
    * 调整它们的指向顺序：

      ```
      temp.next = second
      first.next = second.next
      second.next = first
      ```
3. 更新 `temp` 到下一对节点的位置（即 `first`）。

---

### 🧠图示（示例: 1→2→3→4）

```
dummy → 1 → 2 → 3 → 4
         ↑
        temp

交换1和2：
dummy → 2 → 1 → 3 → 4
               ↑
              temp 继续到1
```

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
    public ListNode swapPairs(ListNode head) {
        ListNode dummy = new ListNode(-1);
        dummy.next = head;
        ListNode temp = dummy;

        while (temp.next != null && temp.next.next != null) {
            ListNode first = temp.next;
            ListNode second = temp.next.next;

            first.next = second.next;
            second.next = first;
            temp.next =  second;

            temp = first;
        }

        return dummy.next;
    }
}
```

# leetcode 25



## 思路

> **模板口诀（核心记忆）**

```
while (end 有 k 个节点) {
    start = pre.next;   // ✅ 起点
    next = end.next;    // 记录下一段的起点
    end.next = null;    // 断开当前段

    pre.next = reverse(start); // 翻转这一段
    start.next = next;         // 接回原链表

    pre = start; // pre 移动到当前段的尾部
    end = pre;   // end 同步移动
}
```

---

## 🧠 思路要点

| 步骤  | 说明                            |
| --- | ----------------------------- |
| 1️⃣ | 使用 `dummy` 节点指向头，方便处理边界       |
| 2️⃣ | `pre` 表示**上一段的尾巴**（初始为 dummy） |
| 3️⃣ | `end` 每次前进 k 步，确定当前分组的尾巴      |
| 4️⃣ | 不足 k 个直接 break，不反转            |
| 5️⃣ | 翻转 [start, end] 之间的链表         |
| 6️⃣ | 把反转后的部分接回去，然后更新 pre、end       |
| 7️⃣ | 继续下一组，直到不够 k 个为止              |

---

## ⚠️ 容易错的地方（必记❗）

| 错误点                      | 错误后果                  | 正确写法                 |
| ------------------------ | --------------------- | -------------------- |
| ❌ `start = pre`          | 把 dummy（或上一组尾巴）也反转进去了 | ✅ `start = pre.next` |
| ❌ 忘记 `end.next = null`   | 反转时越界，链表错乱或死循环        | ✅ 必须在反转前断开           |
| ❌ 忘记 `start.next = next` | 翻转后断链，后半部分丢失          | ✅ 翻转完接回              |
| ❌ `pre = pre.next`       | pre 没有更新到当前组尾部        | ✅ `pre = start`      |

---

## 🧭 图形版（箭头流向逻辑）

```
[原链表]
dummy → 1 → 2 → 3 → 4 → 5
          ↑         ↑
         pre       end

[反转前断开]
dummy → [1 → 2 → 3]   4 → 5

[反转后]
dummy → [3 → 2 → 1]   4 → 5

[连接后]
dummy → 3 → 2 → 1 → 4 → 5
```

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
    public ListNode reverseKGroup(ListNode head, int k) {
        if (k == 1) return head;
        ListNode dummy = new ListNode(-1);
        dummy.next = head;
        ListNode pre = dummy;
        ListNode end = dummy;

        while (true) {
            for (int i = 0; i < k && end != null; i++) {
                end = end.next;
            }
            if (end == null) {
                break;
            }
            ListNode start = pre.next;
            ListNode next = end.next;
            end.next = null;
            
            pre.next = reverse(start);
            start.next = next;

            pre = start;
            end = start;
        }

        return dummy.next;
    }

    public ListNode reverse(ListNode head) {
        ListNode pre = null;
        ListNode curr = head;
        while (curr != null) {
            ListNode next = curr.next;
            curr.next = pre;
            pre = curr;
            curr = next;
        }
        return pre;
    }

}
```