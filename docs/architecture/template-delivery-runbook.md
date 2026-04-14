# RTNN 模板交付手册

本手册服务于模板执行者，而不是开发记录。

目标只有一个：让执行者按固定顺序完成初始化、联调、验收与回归，不依赖口头说明。

## 1. 初始化

### 1.1 安装依赖

```bash
pnpm install
```

### 1.2 生成环境文件

```bash
pnpm run setup:env
```

该命令会按需生成：

- 根级 `.env`
- `backend/.env`
- `admin/.env.local`
- `app/.env.local`
- `weapp/.env`

若目标文件已存在，则不会覆盖。

若需要在初始化时直接改模板身份，可执行：

```bash
pnpm run setup:env -- --project-id=acme --brand-name=ACME --force
```

常用参数包括：

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

根级 `.env` 是模板初始化参数唯一来源；修改后需重新执行 `pnpm run setup:env -- --force` 以刷新各端环境文件。

### 1.3 启动数据库

```bash
pnpm run postgres:up
```

默认使用本地 `docker compose` 拉起 PostgreSQL：

- host: `localhost`
- port: `5432`
- database: `rtnn`
- user/password: `postgres/postgres`

以上值默认来自根级 `.env`。

### 1.4 初始化后端

```bash
pnpm run setup:backend
```

该命令会执行：

- Prisma generate
- migrate deploy
- seed

### 1.5 一键初始化

```bash
pnpm run bootstrap
```

适用于首次启动或重建本地环境。

### 1.6 初始化自动校验

若需要确认模板初始化链路本身可用，可执行：

```bash
pnpm run check:template-bootstrap
```

该命令固定验证：

- `setup:env`
- `setup:backend`
- backend build 与启动
- `GET /healthz`
- `GET /readyz`
- `GET /openapi.json`

执行前需确保 `5100` 端口没有被其他本地进程占用。

## 2. 联调

### 2.1 Web 主线

```bash
pnpm run dev:web
```

默认会并行启动：

- `backend`: `http://localhost:5100`
- `admin`: `http://localhost:5101`
- `app`: `http://localhost:5102`

### 2.2 单独启动

```bash
pnpm run dev:backend
pnpm run dev:admin
pnpm run dev:app
pnpm run dev:weapp
pnpm run dev:weapp:h5
```

`weapp h5` 默认端口为：

- `http://localhost:5103`

### 2.3 联调前确认

至少确认以下接口可访问：

- `GET /healthz`
- `GET /readyz`
- `GET /openapi.json`

若 `readyz` 未返回数据库可用状态，先检查：

- `docker compose` 是否已启动
- `backend/.env` 中 `DATABASE_URL` 是否有效
- migrate/seed 是否已跑过

### 2.4 初始化速查

至少确认以下配置与环境一致：

- 根级 `.env` 中的 `TEMPLATE_PROJECT_ID`、`TEMPLATE_DATABASE_NAME`、`TEMPLATE_COOKIE_PREFIX`
- `backend/.env` 中 `PORT`、`DATABASE_URL`、`JWT_ACCESS_SECRET`、`JWT_REFRESH_SECRET`
- `admin/.env.local`、`app/.env.local`、`weapp/.env` 中的 backend base URL
- `docker-compose.yml` 的 PostgreSQL 数据库名、端口与 `DATABASE_URL`

## 3. 契约同步

涉及 `backend` 接口、权限、共享类型变更时，先执行：

```bash
pnpm run contracts:permissions
pnpm run contracts:sync
```

核心生成物包括：

- `backend/openapi.json`
- `packages/api-sdk/src/generated/openapi.ts`
- `packages/shared-types/src/permissions.generated.ts`

检查契约漂移：

```bash
pnpm run check:contracts
```

## 4. 验收

### 4.1 初始化 gate

```bash
pnpm run check:template-bootstrap
```

覆盖：

- 环境文件生成
- backend 数据库初始化
- backend 公开基线存活性检查

### 4.2 后端正式 gate

```bash
pnpm run check:backend-release
```

覆盖：

- 权限生成
- OpenAPI 导出
- backend typecheck
- unit
- integration
- e2e

### 4.3 Admin UI 验收

```bash
pnpm run smoke:admin:ui
```

覆盖：

- 后台登录
- 看板
- 角色
- 用户
- 客户
- 审计日志
- 个人中心

### 4.4 App 最小闭环验收

```bash
pnpm run smoke:app:ui
```

目标链路：

- customer 登录
- 首页
- 我的页
- 账户安全页
- 退出登录

### 4.5 Weapp 验收

自动化基础：

```bash
pnpm -C weapp typecheck
pnpm -C weapp build:h5
```

手工验收至少覆盖：

- 打开首页能识别登录/未登录状态
- 登录成功后能进入正式主页面
- 我的页能显示真实账户信息
- 退出登录后能回到未登录状态

### 4.6 模板交付聚合回归

若要重跑消费端交付闭环，可直接执行：

```bash
pnpm run check:template-delivery
```

该命令覆盖：

- `pnpm run smoke:admin:ui`
- `pnpm run smoke:app:ui`
- `pnpm -C weapp typecheck`
- `pnpm -C weapp build:h5`

该命令不替代 `pnpm run check:backend-release`；完整模板回归仍应先跑后端正式 gate，再跑该聚合脚本。

## 5. 回归顺序

推荐严格按以下顺序执行：

1. `pnpm run check:template-bootstrap`
2. `pnpm run check:contracts`
3. `pnpm run check:backend-release`
4. `pnpm run smoke:admin:ui`
5. `pnpm run smoke:app:ui`
6. `pnpm -C weapp typecheck`
7. `pnpm -C weapp build:h5`
8. `weapp` 手工验收

若只需要复跑消费端闭环，可执行：

```bash
pnpm run check:template-delivery
```

## 6. 常见问题

### 6.1 页面一直加载

优先检查：

- 端口是否被旧进程占用
- 当前访问的是否是旧构建独立进程
- `backend` 是否仍可正常响应 `/healthz`

### 6.2 契约检查失败

优先检查：

- 是否已执行 `pnpm run contracts:permissions`
- 是否已执行 `pnpm run contracts:sync`
- 是否把生成物一起提交

### 6.3 Admin 或 App 登录失败

优先检查：

- `backend` seed 数据是否已准备
- 环境变量中的 backend base URL 是否正确
- locale/cookie 是否被错误覆盖

### 6.4 Weapp H5 无法联调

优先检查：

- `weapp/.env` 中 `TARO_APP_API_BASE_URL`
- `pnpm run dev:weapp:h5` 是否启动在 `5103`
- `backend` 是否允许当前主机地址访问
