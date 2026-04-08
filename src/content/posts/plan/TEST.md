---
title: 学习计划
published: 2025-09-23
updated: 2025-09-23
description: ""
image: ""
tags:
  - plan
category: plan
draft: false
---
# 自我介绍


## 项目介绍
采购流程


会员流程


专利流程
AI选品流程
代码生成流程
元数据同步流程
debuggerX流程

## 亮点

## 难点

### 项目线上定时任务扫表 发现慢sql 扫不动

背景：项目上对积分流水进行统计报表，运营数据统计（积分使用趋势/积分使用率/积分过期统计）异常情况监控（大额积分变动/短时间内多次操作）

```sql
select * from table_name where operate_flag = '' and id > 123456789 and deleted = 0
order by id
limit 100
```
索引：idx_flag_deleted

explain查看sql执行计划

| 字段名   | 值           |
| ----- | ----------- |
| type  | range       |
| key   | PRIMARY KEY |
| rows  | 8121269     |
| extra | using where |

虽然有索引idx_flag_deleted 但还是选择了主键索引

sql执行顺序：
- 使用 PRIMARY 索引查询：首先，数据库会使用 PRIMARY 索引l来快速定位 id 大于或等于 123456789的行
- 全行读取：因为查询要求 SELECT ，这意味着需要获取表中的所有列。所以对于满足所有 WHERE 条件的行，数据库需要从磁盘读取完整的行数据。
- 行过滤：数据库会根据where条件进行数据过滤
- 排序操作：对数据进行排序，由于查询中包含 ORDER BY id，所以这个步骤可能会非常快，因为数据已经id排序了
- 限制条数返回：找到前100个符合条件的行 会立马返回


虽然用了主键索引，但是过滤的数据不多导致的，这里根据条件能查询到百万条数据，主要是因为order by id这个子句，在mysql8.0中有个优化 为了避免额外的排序操作，当mysql order by这个字段有索引时，优化器为了避免file sort，会愿意选择该索引，索引天然有序


解决方法：
1.
强制使用索引：idx_flag_deleted

2.
order by 子查询换成create_date
索引idx_flag_deleted增加create_date
这样会引起另一个问题，当多行具有相同的值，服务器可以自由以任何顺序返回，这里会导致重复，如果业务接受重复，可采用该方式



### 数据库死锁


背景：同事线上发布的时候，很多线上报警，很多关于数据库死锁的
数据库版本8.0 引擎InnoDB 隔离级别RC


数据库表
```sql


```


# mysql

