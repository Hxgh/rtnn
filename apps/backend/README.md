# Backend 模板后端内核

`apps/backend/` 是当前模板仓库的正式 NestJS 后端内核，不是 demo，也不是 Next.js 的一部分。

它负责作为 `admin`、`app`、`weapp` 的唯一后端契约源，统一输出权限、OpenAPI、shared-types、shared-schemas 与 SDK 上游能力。

## 首发能力边界

正式支持的模块：

- `core`：配置、日志、Prisma、健康检查、OpenAPI、请求级 locale、统一异常过滤
- `auth`：admin/customer 登录、refresh、logout、change-password、会话失效
- `iam`：管理员、角色、权限
- `customers`：客户、客户分组、客户标签、客户状态、重置密码
- `audit`：可信基础审计写入与列表查询
- `dashboard`：模板首发所需的管理统计

本轮明确不支持：

- `Example` 模块、`/api/v1/examples` 及相关 demo 契约
- `system/me` 泛化自省接口
- 真正的多租户隔离与租户管理接口
- 缓存、队列、任务调度、对象存储、消息推送、邮件短信、字段级审计 diff

## 正式契约

默认 API base URL：`http://localhost:5100/api/v1`

公开端点：

- `GET /healthz`
- `GET /readyz`
- `GET /version`
- `GET /openapi.json`
- `POST /api/v1/auth/admin/login`
- `POST /api/v1/auth/admin/refresh`
- `POST /api/v1/auth/admin/logout`
- `POST /api/v1/auth/customer/login`
- `POST /api/v1/auth/customer/refresh`
- `POST /api/v1/auth/customer/logout`

受保护的会话自省端点：

- `GET /api/v1/auth/admin/me`
- `GET /api/v1/auth/customer/me`

## Quick Start

先在仓库根目录安装 workspace 依赖，再初始化 backend：

```bash
pnpm install
pnpm run setup:env
pnpm -C apps/backend prisma:generate
pnpm -C apps/backend prisma:migrate:dev
pnpm -C apps/backend start:dev
```

`apps/backend` 不再维护独立 `.env` 文件，所有运行时变量都从仓库根级 `.env` 派生。

## 测试与发布校验

测试分层：

- `pnpm -C apps/backend test:unit`
- `pnpm -C apps/backend test:integration`
- `pnpm -C apps/backend test:e2e`

发布前固定校验：

- `pnpm -C apps/backend generate:permissions`
- `pnpm -C apps/backend export:openapi`
- `pnpm -C apps/backend typecheck`
- `pnpm -C apps/backend check:release`

`integration/e2e` 测试基于独立 PostgreSQL schema 运行。测试 harness 会在启动时重建测试 schema，通过 `prisma db push` 同步当前 schema，并在结束时删除本次测试 schema。

可选测试环境变量：

- `TEST_BASE_DATABASE_URL`：用于连接 PostgreSQL `public` schema 执行测试 schema 的创建/删除
- `TEST_DATABASE_SCHEMA`：显式测试 schema 名称；默认按测试类型与进程号自动派生，避免 `integration/e2e` 并行时互相删除 schema
- `TEST_DATABASE_SCHEMA_PREFIX`：自动派生 schema 的前缀，默认 `backend_template_test`
- `TEST_KEEP_DATABASE_SCHEMA=1`：调试时保留本次测试 schema，默认测试结束后删除

测试 schema 残留审计：

- `pnpm run check:backend-test-schemas`：检查默认或当前环境指定前缀下是否存在测试 schema 残留
- `pnpm run check:backend-test-schemas -- --prune`：确认残留均可删除后执行清理

## 常用脚本

- `pnpm -C apps/backend start:dev`
- `pnpm -C apps/backend build`
- `pnpm -C apps/backend typecheck`
- `pnpm -C apps/backend test`
- `pnpm -C apps/backend test:unit`
- `pnpm -C apps/backend test:integration`
- `pnpm -C apps/backend test:e2e`
- `pnpm -C apps/backend export:openapi`
- `pnpm -C apps/backend generate:permissions`
- `pnpm -C apps/backend check:release`
- `pnpm -C apps/backend prisma:migrate:dev`

根目录提供并行稳定性检查：

- `pnpm run check:backend-tests-parallel`
- `pnpm run check:backend-release` 会串联后端发布基线、并行稳定性检查与测试 schema 残留审计
