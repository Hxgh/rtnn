# rtnn

`rtnn` 是一个面向正式交付的全栈模板 monorepo。

它的主线很明确：

- `backend` 是唯一后端契约源
- `admin` 是 Next.js 管理后台
- `app` 是 Next.js 移动端前台
- `weapp` 是 Taro 小程序消费端

## Workspace 结构

- `backend/`: NestJS 模板后端内核
- `admin/`: Next.js 管理后台
- `app/`: Next.js 移动端前台
- `weapp/`: Taro + React 小程序端
- `packages/config`: 共享配置与基础常量
- `packages/shared-types`: 跨端共享类型
- `packages/shared-schemas`: 跨端运行时 schema
- `packages/api-sdk`: 基于 backend OpenAPI 生成的 SDK
- `docs/architecture/template-overview.md`: 模板整体架构说明
- `docs/architecture/template-delivery-closure-plan.md`: 模板交付闭环计划
- `docs/architecture/template-delivery-runbook.md`: 初始化、联调、验收、回归手册
- `docs/architecture/template-release-engineering-plan.md`: 模板发布工程化计划
- `docs/architecture/template-initialization-engineering-plan.md`: 模板初始化工程化计划

## 快速开始

1. 安装整个 workspace 依赖：

```bash
pnpm install
```

2. 用一条命令初始化本地开发环境：

```bash
pnpm run bootstrap
```

这会依次完成：

- 生成根级 `.env`
- 生成 `backend/.env`
- 生成 `admin/.env.local`
- 生成 `app/.env.local`
- 生成 `weapp/.env`
- 启动本地 PostgreSQL
- 执行 backend Prisma generate / migrate deploy / seed

3. 启动 Web 主线：

```bash
pnpm run dev:web
```

4. 按需单独启动其他端：

```bash
pnpm dev:weapp
pnpm dev:weapp:h5
```

默认端口：

- `backend`: `http://localhost:5100`
- `admin`: `http://localhost:5101`
- `app`: `http://localhost:5102`
- `weapp h5`: `http://localhost:5103`

## 本地数据库

仓库提供 `docker-compose.yml` 来启动一个与模板一致的 PostgreSQL 实例，默认参数来自根级 `.env`。首次执行 `pnpm run setup:env` 或 `pnpm run bootstrap` 后，会先生成该文件。默认情况下，数据库以 `postgres` 用户/密码和 `rtnn` 数据库对外暴露 `5432` 端口。推荐在首次开发或重建环境时运行：

```bash
pnpm run postgres:up
```

初始化完数据库后，`DATABASE_URL` 可以保持为 `postgresql://postgres:postgres@localhost:5432/rtnn?schema=public`，与 `backend/.env.example` 中的默认值一致。完成开发后可运行：

```bash
pnpm run postgres:down
```

如需查看实时日志：

```bash
pnpm run postgres:logs
```

如只想生成环境变量文件而不启动数据库，可执行：

```bash
pnpm run setup:env
```

默认情况下，`setup:env` 不会覆盖已存在的本地环境文件。若需要在初始化时直接改模板身份，可使用：

```bash
pnpm run setup:env -- --project-id=acme --brand-name=ACME --force
```

当前正式支持的高频参数包括：

- `--project-id`
- `--brand-name`
- `--database-name`
- `--backend-port`
- `--admin-port`
- `--app-port`
- `--weapp-port`
- `--image-prefix`
- `--deploy-application`
- `--deploy-event-type`

根级 `.env` 是模板初始化参数唯一来源；后续如需继续调整，可直接编辑根级 `.env` 后重新执行 `pnpm run setup:env -- --force`。

## 常用命令

```bash
pnpm setup:env
pnpm setup:backend
pnpm bootstrap
pnpm dev:web
pnpm contracts:permissions
pnpm contracts:sync
pnpm check:contracts
pnpm check:backend-release
pnpm check:template-bootstrap
pnpm check:release-candidate
pnpm smoke:admin:ui
pnpm smoke:app:ui
pnpm weapp:typecheck
pnpm weapp:build:h5
pnpm check:template-delivery
pnpm check
pnpm check:lint
pnpm check:typecheck
pnpm check:test
pnpm check:build
pnpm smoke:admin
```

其中：

- `pnpm check:backend-release` 是后端正式发布 gate
- `pnpm check:template-bootstrap` 是模板初始化 gate，验证环境文件生成、数据库初始化与 backend 公开基线
- `pnpm check:release-candidate` 是模板发布候选 gate，串联契约漂移、backend 正式 gate 与消费端交付回归
- `pnpm check:template-delivery` 是消费端聚合回归入口，覆盖 `admin` UI 验收、`app` UI 验收、`weapp` 类型校验与 H5 构建
- 做完整模板工程回归时，先跑 `pnpm check:template-bootstrap`，再跑 `pnpm check:release-candidate`

## 初始化速查

- 根级 `.env` 是模板项目名、品牌名、数据库名、cookie 前缀、镜像前缀和默认账号的唯一初始化参数源
- `backend/.env` 至少确认 `PORT`、`DATABASE_URL`、`JWT_ACCESS_SECRET`、`JWT_REFRESH_SECRET`
- `admin/.env.local`、`app/.env.local`、`weapp/.env` 至少确认 backend base URL
- `docker-compose.yml` 中的 PostgreSQL 数据库名、端口与 `DATABASE_URL` 必须一致
- 初始化后至少确认 `http://localhost:5100/healthz`、`http://localhost:5100/readyz`、`http://localhost:5100/openapi.json`

## 文档入口

- `backend/README.md`
- `admin/README.md`
- `app/README.md`
- `weapp/README.md`
- `docs/architecture/template-overview.md`
- `docs/architecture/template-delivery-closure-plan.md`
- `docs/architecture/template-delivery-runbook.md`
- `docs/architecture/template-release-engineering-plan.md`
- `docs/architecture/template-initialization-engineering-plan.md`

## 协作约束

- 仓库规则统一以 `CLAUDE.md` 为准
- `backend` 是接口、权限、OpenAPI、SDK 与 shared contract 的唯一事实源
- 模板工程默认做减法，不保留 demo 式占位能力
