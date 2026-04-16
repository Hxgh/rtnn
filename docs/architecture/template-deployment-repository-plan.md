# 模板部署仓库首发方案

本文档给出独立部署仓库的首发规划，目标是让 `rtnn` 模板工程与后续部署工程顺利衔接，而不是继续把环境编排塞回模板仓库。

建议仓库名：

- `rtnn-deploy`

若后续派生模板，命名跟随 `projectId` 调整，例如：

- `acme-deploy`

## 1. 首发目标

独立部署仓库首发只解决三件事：

1. 接收模板仓库已通过 gate 的镜像版本。
2. 用一套明确目录组织管理环境编排与 secrets 注入。
3. 提供可重复执行的发布、回滚与 smoke 检查入口。

本阶段明确不做：

- Kubernetes / Helm / Terraform 全量接入。
- Preview 环境泛滥。
- 监控、告警、日志平台的完整平台化。
- weapp 小程序发布平台集成。

## 2. 技术基线

首发建议固定为：

- 镜像仓库：GHCR
- 编排方式：Docker Compose
- 发布粒度：`backend / admin / app`
- 环境层次：`staging / production` 为首发必需；`dev` 只保留扩展位

这样做的原因：

- 当前模板仓库已经稳定产出 Compose 友好的容器镜像。
- 首发阶段最重要的是边界清晰、流程可回归，不是把平台复杂度一次性拉满。
- 本地开发的 `docker-compose.yml` 已经留在模板仓库，独立部署仓库无需重复承接“本地开发”职责。

## 3. 推荐目录结构

建议首发目录结构如下：

```text
rtnn-deploy/
├── README.md
├── docs/
│   ├── environments.md
│   ├── release-runbook.md
│   └── rollback-runbook.md
├── compose/
│   ├── compose.base.yml
│   ├── compose.staging.yml
│   └── compose.production.yml
├── env/
│   ├── staging.env.example
│   ├── production.env.example
│   └── shared.env.schema
├── scripts/
│   ├── release/
│   │   ├── promote.sh
│   │   └── rollback.sh
│   └── ops/
│       ├── run-migrate.sh
│       └── smoke-check.sh
└── .github/workflows/
    ├── deploy-staging.yml
    └── deploy-production.yml
```

目录职责固定为：

- `compose/`：只放环境编排，不放契约定义。
- `env/`：只放环境变量样板和字段说明，不提交真实 secrets。
- `scripts/release/`：只承载发布与回滚入口。
- `scripts/ops/`：只承载迁移、探活、诊断等运维辅助动作。
- `docs/`：只写环境与发布 runbook，不复制模板仓库的应用说明。

## 4. 环境分层建议

### 4.1 local

`local` 继续由模板仓库负责：

- 根级 `.env`
- 根级 `docker-compose.yml`
- `bootstrap`
- `dev:web`

不建议把本地开发再平行复制一套到部署仓库。

### 4.2 staging

`staging` 是部署仓库首发必需环境：

- 消费 `main-<sha12>` 或明确的 staging 版本。
- 允许自动部署或较轻量审批。
- 用于联调、回归、验收与候选版本验证。

### 4.3 production

`production` 是部署仓库首发必需环境：

- 消费 `v*` 正式版本。
- 保留人工审批。
- 部署前固定执行迁移、探活与回滚点记录。

### 4.4 dev

`dev` 只保留扩展位：

- 若未来存在共享远程开发环境，再在部署仓库增加。
- 当前不建议为“看起来完整”而先造一个空壳 `dev` 环境。

## 5. 环境变量组织原则

部署仓库中的环境变量组织应遵循：

- 变量名来自模板仓库定义的部署契约。
- 环境文件只管理值，不重命名 key。
- secrets 不提交到仓库。
- `env/*.example` 只给字段参考和必填说明。

建议按三层组织：

1. 共享身份层：
   - `TEMPLATE_PROJECT_ID`
   - `TEMPLATE_BRAND_NAME`
   - `TEMPLATE_COOKIE_PREFIX`
   - `TEMPLATE_IMAGE_NAME_PREFIX`
   - `TEMPLATE_DEPLOY_APPLICATION`
2. backend 安全层：
   - `DATABASE_URL`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `CORS_ORIGINS`
3. web 地址层：
   - `NEXT_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_BACKEND_URL`
   - `BACKEND_INTERNAL_BASE_URL`

## 6. 发布顺序建议

独立部署仓库的发布顺序建议固定为：

1. 解析待发布版本与镜像 tag。
2. 拉取目标镜像。
3. 执行 backend 数据库迁移。
4. 更新 backend。
5. 等待 backend `/readyz` 通过。
6. 更新 `admin / app`。
7. 执行环境 smoke check。
8. 记录发布结果与回滚点。

约束固定为：

- 数据库迁移优先于新版本 backend 流量切换。
- `admin / app` 不应先于 backend 契约版本更新。
- 若 backend 探活失败，部署流程必须中止，不继续推进前端服务。

## 7. 回滚策略建议

首发回滚策略保持简单：

- 回滚单位：镜像 tag
- 回滚入口：`scripts/release/rollback.sh`
- 回滚前提：数据库迁移必须保持向前兼容，或由部署仓库显式定义不可回滚版本策略

建议部署仓库至少记录：

- 上一成功版本 tag
- 上一成功发布时间
- 对应 commit sha
- 是否执行过 schema migration

## 8. 与模板仓库的协作方式

推荐使用两种方式之一：

### 8.1 repository dispatch

由模板仓库 `release-images` workflow 在镜像推送后，向部署仓库发送 dispatch 事件。

优点：

- 版本来源单一。
- 不需要部署仓库自己轮询镜像仓库。
- 便于串联自动部署与审批流。

### 8.2 手动选择版本

部署仓库也可以提供手动输入镜像版本 tag 的工作流。

适合场景：

- 需要回滚到任意历史版本。
- staging 想重复验证旧候选版本。

无论哪种方式，都应遵循模板仓库中已定义的镜像命名与版本语义。

## 9. weapp 的后续处理建议

`weapp` 当前不进入首发部署仓库主线。

后续若需要推进：

- H5 版本：可追加静态站点产物上传与 CDN 发布流程。
- 小程序版本：可追加上传包构建与平台发布流程。

但这两条都应在模板仓库先定义正式产物契约后，再接入独立部署仓库。

## 10. 当前阶段完成标准

当独立部署仓库开始实施时，达到以下标准即可视为首发合格：

- 能消费模板仓库已通过 gate 的 `backend / admin / app` 镜像。
- 能为 `staging / production` 注入正式环境变量。
- 能执行 backend 迁移、服务更新、backend 探活与基础 smoke check。
- 能按镜像 tag 做回滚。
- 不在部署仓库内重新定义接口、权限、OpenAPI、环境变量名或健康检查路径。
