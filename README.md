# RTNN

RTNN 是一套面向 AI 协作交付的全栈模板 monorepo。它不是 demo 仓库，主线是把 `backend`、`admin`、`app`、`weapp` 和 AI 协作元数据一起沉淀成可派生、可验收、可继续扩展的正式模板工程。

## 模板定位

- `apps/backend/`：NestJS 模板后端内核，也是唯一后端契约源
- `apps/admin/`：Next.js 管理后台
- `apps/app/`：Next.js 移动端前台
- `apps/weapp/`：Taro + React 小程序端
- `packages/`：共享配置、共享类型、共享 schema、API SDK
- `docs/`：模板使用文档与内部工程文档
- `scripts/`：按职责分层的仓库级工程脚本
- `tests/acceptance/` 与 `tooling/playwright/`：交付验收与 UI 烟测基座

## 模板最小承诺

正式提供：

- 以 `backend` 为唯一事实源的接口、权限、OpenAPI、shared contract 与 SDK 链路
- 面向 `admin`、`app`、`weapp` 的正式消费端骨架，而不是示例页集合
- 单根 `.env` 驱动的初始化方式，各端运行时变量按目标自动派生
- 面向 AI 协作的规则入口、skills 目录、MCP 配置和工程协作元数据
- 模板初始化校验、后端发布基线校验、消费端交付烟测

明确不承诺：

- demo 示例模块、假导航、占位页面、平行契约定义
- 多套根级 env 体系、端内散落 env 文件
- 仓库级 lockfile 提交策略
- 没有明确消费面的“展示型能力”

更完整的边界说明见 [模板最小承诺](./docs/template/minimum-commitment.md)。

## 快速开始

1. 安装 workspace 依赖：

```bash
pnpm install
```

2. 初始化本地模板环境：

```bash
pnpm run bootstrap
```

3. 启动 Web 主线：

```bash
pnpm run dev:web
```

4. 按需启动其他端：

```bash
pnpm run dev:weapp
pnpm run dev:weapp:h5
```

默认端口：

- `backend`: `http://localhost:5100`
- `admin`: `http://localhost:5101`
- `app`: `http://localhost:5102`
- `weapp h5`: `http://localhost:5103`

## 派生模板

派生新项目时，先改模板身份参数，再决定是否同步改源码中的项目名与 package scope。

```bash
pnpm run setup:env -- --project-id=acme --brand-name=ACME --force
pnpm run template:rewrite-source -- --dry-run
pnpm run template:rewrite-source -- --project-id=acme --package-scope=acme --brand-name=ACME
pnpm install
pnpm run contracts:permissions
pnpm run contracts:sync
```

`setup:env` 会以根级 `.env` 为唯一来源，清理 `apps/*` 下历史 env 文件，并维护根级 `.env.example`。

## 环境与依赖策略

- 根级 `.env` 是模板初始化参数唯一来源
- 根级 `.env.example` 是模板参数参考样板，不再维护各端 `.env*`
- 仓库采用 latest-first 策略，故意不提交 `pnpm-lock.yaml`
- 如果派生项目需要可重现安装，应在自己的仓库中恢复 lockfile 策略

这不是疏漏，而是模板层的明确取舍：模板仓库优先保持升级弹性，业务仓库再决定是否收紧安装确定性。

## 验收入口

常用验收命令：

```bash
pnpm run check:template-bootstrap
pnpm run check:release-candidate
pnpm run smoke:admin
pnpm run check
```

其中：

- `check:template-bootstrap`：验证根级环境生成、数据库初始化和 backend 基线公开能力
- `check:release-candidate`：串联契约漂移、backend 发布基线与多端交付烟测
- `smoke:admin`：做一次管理后台 HTTP 冒烟
- `check`：做仓库级 lint、typecheck、contracts、backend release、build 聚合检查

## AI 协作入口

本仓库把 AI 协作视为模板工程的一等能力，以下目录和文件是正式资产，不是临时杂物：

- `.claude/skills/`：唯一维护的 skills 源目录
- `.agents/`：兼容其他 agent 入口的镜像与元数据
- `.mcp.json`：MCP 配置
- `CLAUDE.md`：唯一规则来源
- `AGENTS.md`：多 agent 入口提示

## 文档入口

- 模板使用者先看：[文档入口](./docs/README.md)
- 模板快速开始：[快速开始](./docs/template/getting-started.md)
- 模板最小承诺：[最小承诺](./docs/template/minimum-commitment.md)
- 部署边界与契约：[部署工程文档组](./docs/architecture/template-deployment-boundary.md)
- 实例仓库与服务器契约：[实例与服务器方案](./docs/architecture/template-instance-repository-model.md)
- backend 说明：[backend README](./apps/backend/README.md)
- admin 说明：[admin README](./apps/admin/README.md)
- app 说明：[app README](./apps/app/README.md)
- weapp 说明：[weapp README](./apps/weapp/README.md)

## 协作约束

- 仓库规则统一以 `CLAUDE.md` 为准
- `backend` 是接口、权限、OpenAPI、SDK 与 shared contract 的唯一事实源
- 模板工程默认做减法，不保留 demo 式占位能力
