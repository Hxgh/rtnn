# 模板发布工程化计划

## 目标

上一阶段已经把 `backend / admin / app / weapp` 收敛为可初始化、可联调、可验收、可回归的正式模板。

下一阶段的主线不是继续扩业务，而是把这些成果固化成稳定的工程化门禁，让模板具备：

- PR 阶段能自动识别契约漂移、后端回归、消费端闭环回归。
- `main` / tag 发布不会绕过正式 gate 直接产出镜像。
- 执行者不需要记忆隐式步骤，CI 与 release 走同一套正式校验语义。

## 本阶段边界

本阶段正式纳入：

- GitHub Actions PR 质量门禁升级。
- GitHub Actions 镜像发布前验证门禁。
- 根脚本统一发布候选校验入口。
- 发布工程化文档说明。

本阶段明确不纳入：

- 新业务模块、新页面、新导航。
- Dockerfile 重构、部署仓库编排重写。
- 多环境配置矩阵、Preview 环境、灰度策略。
- 运行时监控、日志平台、告警平台接入。

## 关键问题

当前仓库虽然已经具备：

- `check:backend-release`
- `check:template-delivery`
- `smoke:admin:ui`
- `smoke:app:ui`
- `weapp` 类型与 H5 构建

但这些能力还没有完整进入持续门禁主线：

- PR CI 没有把消费端闭环校验纳入正式 gate。
- release workflow 会直接构建并推送镜像，没有先执行模板正式校验。
- workflow 中缺少统一入口，规则容易在脚本与 CI 配置里分叉。

## 实施主线

### 一、统一发布候选 gate

新增根级统一脚本，作为模板“可发布候选”的唯一工程化入口，固定串联：

1. 契约漂移检查
2. backend 正式 gate
3. template delivery 聚合回归

必要时再在 workflow 中单独保留 lint / typecheck / build，但发布候选语义只认这一条主线。

### 二、PR CI 正式化

PR workflow 需要补齐：

- 环境文件初始化
- Playwright 浏览器依赖安装
- 模板发布候选 gate

这样 PR 阶段才能真正验证：

- backend 契约与测试没坏
- admin / app / weapp(H5) 闭环没坏
- weapp 类型和 H5 构建没坏

### 三、Release 前置 gate

`main` / tag 触发的镜像发布流程必须先通过正式校验，再允许 build-and-push。

约束固定为：

- 不允许绕过 gate 直接推送 `backend / admin / app / weapp(H5)` 镜像。
- 发布 workflow 与 PR workflow 使用同一套正式校验入口，避免语义漂移。

## 第一优先级任务

本轮直接实施：

1. 新增统一发布候选脚本入口。
2. 升级 `ci-check.yml`。
3. 升级业务仓 `release-images` workflow 模板。

## 验收标准

- PR workflow 能覆盖模板正式 gate，而不只是 lint/typecheck/backend/build。
- release workflow 在推送镜像前必须先通过正式 gate。
- gate 的唯一工程化入口在根脚本中可见，不需要在多个 workflow 手写一套命令序列。
- 文档能说明这条主线的目标和边界。
