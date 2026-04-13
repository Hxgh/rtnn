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

## 快速开始

先安装整个 workspace 依赖：

```bash
pnpm install
```

初始化 backend：

```bash
cp backend/.env.example backend/.env
pnpm -C backend prisma:generate
pnpm -C backend prisma:migrate:dev
```

按需启动各端：

```bash
pnpm dev:backend
pnpm dev:admin
pnpm dev:app
pnpm dev:weapp
pnpm dev:weapp:h5
```

默认端口：

- `backend`: `http://localhost:5100`
- `admin`: `http://localhost:5101`
- `app`: `http://localhost:5102`
- `weapp h5`: `http://localhost:5003`

## 常用命令

```bash
pnpm contracts:permissions
pnpm contracts:sync
pnpm check
pnpm check:lint
pnpm check:typecheck
pnpm check:test
pnpm check:build
pnpm smoke:admin
```

## 文档入口

- `backend/README.md`
- `admin/README.md`
- `app/README.md`
- `weapp/README.md`
- `docs/architecture/template-overview.md`

## 协作约束

- 仓库规则统一以 `CLAUDE.md` 为准
- `backend` 是接口、权限、OpenAPI、SDK 与 shared contract 的唯一事实源
- 模板工程默认做减法，不保留 demo 式占位能力
