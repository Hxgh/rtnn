# 模板快速开始

本文档面向模板使用者，而不是模板维护者。

## 你会得到什么

- 一个以 NestJS `backend` 为契约源的全栈模板
- 一个 Next.js `admin`
- 一个 Next.js `app`
- 一个 Taro `weapp`
- 一套面向 AI 协作交付的规则、skills 和工程元数据

## 第一次启动

```bash
pnpm install
pnpm run bootstrap
pnpm run dev:web
```

按需启动小程序：

```bash
pnpm run dev:weapp
pnpm run dev:weapp:h5
```

## 初始化参数从哪里来

模板只维护一套根级环境参数：

- `/.env`
  - 当前本地运行参数
- `/.env.example`
  - 模板样板与参考参数

`admin`、`app`、`weapp`、`backend` 的运行时变量由脚本按目标自动派生，不再维护 `apps/*/.env*`。

其中：

- `TEMPLATE_TESTING_DATABASE_URL`
- `TEMPLATE_PRODUCTION_DATABASE_URL`

只用于业务仓与独立部署执行仓衔接远程环境数据库连接，不参与本地开发数据库启动。

## 如何派生业务源码仓

推荐先复制或 fork 当前模板仓，形成你自己的业务源码仓，然后在业务仓里执行：

```bash
pnpm run template:init -- --project-id=acme --brand-name=ACME
pnpm run template:init -- --project-id=acme --brand-name=ACME --rewrite-source --package-scope=acme
```

该命令会统一处理：

- 根级 `.env / .env.example`
- `.rtnn/project.json` 业务仓事实文件骨架
- 源码级项目身份改写
- 依赖刷新
- 权限、OpenAPI 与 SDK 契约刷新

## 业务仓推荐补充动作

- 配置 upstream remote，后续从 `rtnn` 同步通用模板能力
- 检查并补齐 `.rtnn/project.json` 中的真实仓库、部署仓与域名信息
- 在业务仓配置 deploy dispatch secrets，并对接独立部署执行仓
- 确认 `.github/workflows/release-images.yml` 与 `.github/workflows/promote-production.yml` 仍由 upstream 保持同步

业务项目不再推荐生成“薄实例目录”壳仓。业务项目应直接持有完整源码。

## 依赖策略

本模板采用 latest-first 策略：

- 仓库故意不提交 `pnpm-lock.yaml`
- 本地与 CI 默认按 `package.json` 范围解析当前兼容版本
- 如果派生业务仓更需要可重现安装，请在业务仓恢复 lockfile 提交策略

## 最小验收

开始继续开发前，至少跑一次：

```bash
pnpm run check:quick
pnpm run check:backend-release
pnpm run check:template-bootstrap
pnpm run check:template-derivation
pnpm run check:release-candidate
```

这三条命令会分别验证：

- 快速静态门禁、契约漂移与后台规则
- 后端正式发布门禁与测试数据库隔离
- 模板初始化链路
- 业务源码仓派生入口
- backend 发布基线与多端交付链路

涉及 backend 契约、权限、SDK、客户端发布事实或 Release Center 时，再补充：

```bash
pnpm run contracts:permissions
pnpm run contracts:sync
pnpm run check:contracts
pnpm --filter @rtnn/api-sdk build
```

正式部署前必须替换 JWT access/refresh secret，并配置
`CLIENT_RELEASE_FACTS_TOKEN`。本地 development/test 仍可使用模板默认值。
