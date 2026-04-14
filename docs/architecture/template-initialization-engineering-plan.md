# RTNN 模板初始化工程化计划

## 目标

上一阶段已经完成模板交付闭环与发布工程化。

下一阶段的主线不再是继续扩业务，而是把“一个新执行者从仓库拉起模板”的初始化路径收敛成正式工程能力，让模板具备：

- 初始化步骤可自动验证，而不是依赖口头说明。
- 环境文件、数据库初始化、backend 公开基线有固定 gate。
- 后续品牌替换、项目名替换、镜像名替换有明确落点，而不是散落排查。

## 本阶段边界

本阶段正式纳入：

- 模板初始化 gate。
- 初始化手册与速查清单。
- PR CI / release 前验证中纳入初始化链路校验。
- 初始化相关硬编码点的分层归类与后续收敛计划。

本阶段明确不纳入：

- 全仓品牌替换自动化。
- package namespace 重命名。
- 镜像名、deploy event、应用名的一键改写。
- Docker / deploy 仓库整体重构。

## 关键问题

当前仓库虽然已经具备：

- `setup:env`
- `setup:backend`
- `bootstrap`
- `check:backend-release`
- `check:release-candidate`

但初始化主线仍然存在两个问题：

- 初始化是否真的可跑通，没有独立 gate。
- 项目名、数据库名、cookie key、默认账号等模板身份硬编码尚未系统收敛。

## 实施主线

### 一、先把初始化链路做成正式 gate

固定验证：

1. 生成环境文件
2. 初始化数据库
3. 构建并启动 backend
4. 检查 `healthz / readyz / openapi.json`

这样模板至少能保证：

- 执行者拿到仓库后，基础环境能跑起来。
- backend 公开基线没有因为脚本、配置或迁移问题失效。

### 二、再把初始化 gate 接入持续门禁

约束固定为：

- PR CI 不能只验证 release candidate，还要验证初始化链路。
- release 前验证也必须覆盖初始化链路，避免“能发布但初始化断裂”。

### 三、最后收敛模板身份硬编码

这一部分作为第二波任务推进，重点处理：

- 项目名/应用名
- 数据库名
- cookie / locale key 前缀
- 镜像名与 deploy payload 中的应用标识
- 默认账号与自动化脚本输入

## 第一优先级任务

本轮直接实施：

1. 新增 `check:template-bootstrap`
2. 升级 `ci-check.yml`
3. 升级 `release-images.yml`
4. 补初始化速查与手册入口

## 验收标准

- 根级存在可重复执行的初始化 gate。
- PR CI 与 release 前验证都覆盖初始化 gate。
- README 与 runbook 能明确给出初始化命令与最小检查清单。
- 初始化链路和发布链路职责清晰，不把品牌替换问题与首个 gate 混为一体。
