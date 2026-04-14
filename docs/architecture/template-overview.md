# rtnn Template Overview

`rtnn` 是一个顶层并列式 monorepo 模板，不再采用 demo 工程的松散组织方式。

## 顶层结构

- `backend/`: NestJS 正式后端内核
- `admin/`: Next.js 管理后台消费端
- `app/`: Next.js 前台消费端
- `weapp/`: Taro + React 小程序消费端
- `packages/config`: 端口、环境、design tokens 等公共常量
- `packages/shared-types`: 跨端共享类型
- `packages/shared-schemas`: 跨端运行时 schema
- `packages/api-sdk`: 基于 Backend OpenAPI 的 SDK 封装

## 主线约束

- 顶层使用 `pnpm workspace`
- `backend` 是 API、权限模型、OpenAPI、shared-types、shared-schemas 与 SDK 的唯一契约源
- `admin`、`app`、`weapp` 都是 backend 的消费者，不各自维护平行接口定义
- Web 端默认采用 server-first 方式，通过 `@rtnn/api-sdk` 调用 backend
- `weapp` 共享契约层，但保留独立 UI 与 transport adapter

## Backend 首发边界

`backend` 当前首发正式支持：

- `core`
- `auth`
- `iam`
- `customers`
- `audit`
- `dashboard`

当前明确不作为模板首发能力交付：

- `Example` 示例主线
- `system/me` 泛化自省接口
- 真正的多租户隔离
- 缓存、队列、调度、对象存储、消息通知、字段级审计 diff

## 部署基线

- 生产部署链路统一走 GHCR + 独立部署仓库
- backend 发布前固定执行权限生成、OpenAPI 导出、typecheck 与 backend 核心测试

## 交付文档

- 交付闭环计划：`docs/architecture/template-delivery-closure-plan.md`
- 执行手册：`docs/architecture/template-delivery-runbook.md`
- 发布工程化计划：`docs/architecture/template-release-engineering-plan.md`
- 初始化工程化计划：`docs/architecture/template-initialization-engineering-plan.md`
