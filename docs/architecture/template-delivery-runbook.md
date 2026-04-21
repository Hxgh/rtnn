# 模板交付手册

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
- 并清理 `apps/*` 下历史遗留 env 文件

若根级 `.env` 已存在，则默认不会覆盖。

若需要在初始化时直接改模板身份，可执行：

```bash
pnpm run template:init -- --project-id=acme --brand-name=ACME
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

根级 `.env` 是模板初始化参数唯一来源；修改后需重新执行 `pnpm run setup:env -- --force`。各端运行时环境由脚本启动时自动派生注入，不再维护 `apps/*/.env*`。

### 1.2.1 重写源码级模板身份

若还需要把 workspace package scope、静态 import、`pnpm --filter` 等源码级身份从当前默认值改成派生模板身份，执行：

```bash
pnpm run template:init -- --project-id=acme --brand-name=ACME --rewrite-source --package-scope=acme
```

约束如下：

- `--package-scope` 不传时，默认回退到 `projectId`
- 脚本不改 generated 产物与本地依赖安装产物
- `template:init` 默认会在改写后自动执行 `pnpm install`
- `template:init` 默认会在改写后自动执行 `pnpm run contracts:permissions` 与 `pnpm run contracts:sync`

### 1.2.2 生成实例目录脚手架

若需要同时生成一个私有实例目录：

```bash
pnpm run template:init -- \
  --project-id=acme \
  --brand-name=ACME \
  --rewrite-source \
  --package-scope=acme \
  --instance-dir=../acme-demo \
  --instance-repo=your-org/acme-demo \
  --deploy-repo=your-org/acme-deploy \
  --base-domain=acme.example.com
```

若只想单独生成实例目录，不改当前仓库源码：

```bash
pnpm run template:scaffold-instance -- \
  --project-id=acme \
  --brand-name=ACME \
  --target-dir=../acme-demo \
  --instance-repo=your-org/acme-demo \
  --deploy-repo=your-org/acme-deploy \
  --base-domain=acme.example.com
```

该脚手架会生成：

- `.rtnn/instance.json`
- `.rtnn/acceptance.md`
- `CLAUDE.md`
- `README.md`
- `scripts/sync-from-template.sh`
- `scripts/render-runtime-env.mjs`

### 1.3 启动数据库

```bash
pnpm run postgres:up
```

默认使用本地 `docker compose` 拉起 PostgreSQL：

- host: `localhost`
- port: `55432`
- database: `rtnn`（当前默认初始化值）
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

### 1.6.1 派生链路自动校验

若需要确认模板派生与实例目录脚手架可用，可执行：

```bash
pnpm run check:template-derivation
```

该命令固定验证：

- `template:init --dry-run`
- `template:scaffold-instance`
- 实例目录关键文件生成
- `instance.json` 中的核心仓库/域名/ingress alias 约束

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
- 根级 `.env` 中数据库参数是否有效
- migrate/seed 是否已跑过

### 2.4 初始化速查

至少确认以下配置与环境一致：

- 根级 `.env` 中的 `TEMPLATE_PROJECT_ID`、`TEMPLATE_DATABASE_NAME`、`TEMPLATE_COOKIE_PREFIX`
- 根级 `.env` 中的 `TEMPLATE_BACKEND_PORT`、`TEMPLATE_ADMIN_PORT`、`TEMPLATE_APP_PORT`、`TEMPLATE_WEAPP_H5_PORT`
- 根级 `.env` 中的 JWT 与数据库参数
- `docker-compose.yml` 的 PostgreSQL 数据库名、端口与根级 `.env` 中的模板数据库参数

## 3. 契约同步

涉及 `backend` 接口、权限、共享类型变更时，先执行：

```bash
pnpm run contracts:permissions
pnpm run contracts:sync
```

核心生成物包括：

- `apps/backend/openapi.json`
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

- 根级 env 就绪
- PostgreSQL 就绪
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

自动化验收：

```bash
pnpm run smoke:weapp:h5
```

覆盖：

- H5 首页识别登录/未登录状态
- customer 登录
- 首页会话恢复
- 我的页信息展示
- 退出登录

补充构建校验：

```bash
pnpm --filter weapp build:h5
```

若需要补做小程序壳层手工验收，至少覆盖：

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
- `pnpm run smoke:weapp:h5`
- `pnpm --filter weapp build:h5`

该命令不替代 `pnpm run check:backend-release`；完整模板回归仍应先跑后端正式 gate，再跑该聚合脚本。

## 5. 回归顺序

推荐严格按以下顺序执行：

1. `pnpm run check:template-bootstrap`
2. `pnpm run check:template-derivation`
3. `pnpm run check:contracts`
4. `pnpm run check:backend-release`
5. `pnpm run smoke:admin:ui`
6. `pnpm run smoke:app:ui`
7. `pnpm run smoke:weapp:h5`
8. `pnpm --filter weapp build:h5`
9. `weapp` 手工验收

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
- 根级 `.env` 中的 backend 端口与派生运行时 base URL 是否正确
- locale/cookie 是否被错误覆盖

### 6.4 Weapp H5 无法联调

优先检查：

- 根级 `.env` 中的 backend 端口配置
- `pnpm run dev:weapp:h5` 是否启动在 `5103`
- `backend` 是否允许当前主机地址访问
