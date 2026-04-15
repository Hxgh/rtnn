# 全栈模板 Monorepo

当前仓库是一套面向正式交付的全栈模板 monorepo，默认 `projectId` 为 `rtnn`。

它的主线很明确：

- `backend` 是唯一后端契约源
- `admin` 是 Next.js 管理后台
- `app` 是 Next.js 移动端前台
- `weapp` 是 Taro 小程序消费端

## Workspace 结构

- `apps/backend/`: NestJS 模板后端内核
- `apps/admin/`: Next.js 管理后台
- `apps/app/`: Next.js 移动端前台
- `apps/weapp/`: Taro + React 小程序端
- `packages/config`: 共享配置与基础常量
- `packages/shared-types`: 跨端共享类型
- `packages/shared-schemas`: 跨端运行时 schema
- `packages/api-sdk`: 基于 backend OpenAPI 生成的 SDK
- `scripts/`: 仓库级工程脚本
- `tests/acceptance/`: 仓库级交付验收用例
- `tooling/playwright/`: 仓库级 Playwright 配置
- `docs/architecture/template-overview.md`: 模板整体架构说明
- `docs/architecture/template-delivery-closure-plan.md`: 模板交付闭环计划
- `docs/architecture/template-delivery-runbook.md`: 初始化、联调、验收、回归手册
- `docs/architecture/template-release-engineering-plan.md`: 模板发布工程化计划
- `docs/architecture/template-initialization-engineering-plan.md`: 模板初始化工程化计划

## 根目录准入

- 根目录只保留 workspace 基座、统一入口和顶层产品目录
- 各可部署端统一收敛在 `apps/`，共享包统一收敛在 `packages/`
- 仓库级自动化测试配置统一放在 `tooling/`，测试用例统一放在 `tests/`
- 运行产物统一落到隐藏目录，避免把根目录变成实现细节和临时文件的堆放区

## 依赖策略

- 仓库保留 `pnpm-workspace.yaml` 作为 monorepo 结构声明
- 仓库采用 latest-first 依赖策略，不提交 `pnpm-lock.yaml`
- CI 与本地安装默认按各 package manifest 解析当前兼容版本，而不是依赖仓库内锁文件

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
- 清理 `apps/*` 下历史遗留 env 文件
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

仓库提供 `docker-compose.yml` 来启动一个与模板一致的 PostgreSQL 实例，默认参数来自根级 `.env`。首次执行 `pnpm run setup:env` 或 `pnpm run bootstrap` 后，会先生成该文件。当前仓库默认以 `postgres` 用户/密码和 `rtnn` 数据库对外暴露 `5432` 端口。推荐在首次开发或重建环境时运行：

```bash
pnpm run postgres:up
```

初始化完数据库后，backend 的实际 `DATABASE_URL` 会由根级 `.env` 派生，默认等价于 `postgresql://postgres:postgres@localhost:5432/rtnn?schema=public`。完成开发后可运行：

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

根级 `.env` 是模板初始化参数唯一来源；后续如需继续调整，可直接编辑根级 `.env` 后重新执行 `pnpm run setup:env -- --force`。`admin/app/weapp/backend` 的运行时环境由各自脚本在启动时自动派生注入，不再维护 `apps/*/.env*`。

若需要把源码级身份一并改成派生模板的正式名字，再执行：

```bash
pnpm run template:rewrite-source -- --dry-run
pnpm run template:rewrite-source -- --project-id=acme --package-scope=acme --brand-name=ACME
```

这条脚本会统一改写：

- 根 `package.json` 的项目名
- workspace 包的 `@rtnn/*` scope
- 各端 `package.json` 依赖、`pnpm --filter`、静态 import
- Next.js / Taro 的静态 alias 与 transpile 配置

若未显式传入 `--package-scope`，默认回退到 `projectId`。执行完成后，继续运行：

```bash
pnpm install
pnpm run contracts:permissions
pnpm run contracts:sync
```

## 常用命令

```bash
pnpm setup:env
pnpm template:rewrite-source
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
pnpm smoke:weapp:h5
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
- `pnpm check:template-delivery` 是消费端聚合回归入口，覆盖 `admin` UI 验收、`app` UI 验收、`weapp` H5 自动化验收与 H5 构建
- 做完整模板工程回归时，先跑 `pnpm check:template-bootstrap`，再跑 `pnpm check:release-candidate`

## 初始化速查

- 根级 `.env` 是模板项目名、品牌名、数据库名、cookie 前缀、镜像前缀和默认账号的唯一初始化参数源
- backend/admin/app/weapp 的运行时变量都由根级 `.env` 派生，不再单独维护端内 env 文件
- `docker-compose.yml` 中的 PostgreSQL 数据库名、端口应与根级 `.env` 中的模板数据库参数一致
- 初始化后至少确认 `http://localhost:5100/healthz`、`http://localhost:5100/readyz`、`http://localhost:5100/openapi.json`

## 文档入口

- `apps/backend/README.md`
- `apps/admin/README.md`
- `apps/app/README.md`
- `apps/weapp/README.md`
- `docs/architecture/template-overview.md`
- `docs/architecture/template-delivery-closure-plan.md`
- `docs/architecture/template-delivery-runbook.md`
- `docs/architecture/template-release-engineering-plan.md`
- `docs/architecture/template-initialization-engineering-plan.md`

## 协作约束

- 仓库规则统一以 `CLAUDE.md` 为准
- `backend` 是接口、权限、OpenAPI、SDK 与 shared contract 的唯一事实源
- 模板工程默认做减法，不保留 demo 式占位能力
