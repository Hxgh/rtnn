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

如需单独启动小程序：

```bash
pnpm run dev:weapp
pnpm run dev:weapp:h5
```

## 初始化参数从哪里来

模板只维护一套根级环境参数：

- `/.env`：当前本地运行参数
- `/.env.example`：模板样板与参考参数

`admin`、`app`、`weapp`、`backend` 的运行时变量由脚本按目标自动派生，不再维护 `apps/*/.env*`。

## 派生自己的模板身份

推荐直接走统一入口：

```bash
pnpm run template:init -- --project-id=acme --brand-name=ACME
```

该命令会统一执行：

- 根级 `.env` / `.env.example` 维护
- 历史 `apps/*` env 文件清理

如果还要同步改源码中的项目名、workspace package scope 和静态引用：

```bash
pnpm run template:init -- --project-id=acme --brand-name=ACME --rewrite-source --package-scope=acme
```

该命令默认还会继续执行：

- `pnpm install`
- `pnpm run contracts:permissions`
- `pnpm run contracts:sync`

如果要同时生成一个私有实例目录脚手架：

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

若只想单独生成实例目录，也可以执行：

```bash
pnpm run template:scaffold-instance -- \
  --project-id=acme \
  --brand-name=ACME \
  --target-dir=../acme-demo \
  --instance-repo=your-org/acme-demo \
  --deploy-repo=your-org/acme-deploy \
  --base-domain=acme.example.com
```

## 依赖策略

本模板采用 latest-first 策略：

- 仓库故意不提交 `pnpm-lock.yaml`
- 本地与 CI 默认按 `package.json` 范围解析当前兼容版本
- 如果你的派生项目更需要可重现安装，请在派生仓库恢复 lockfile 提交策略

## 最小验收

开始继续开发前，至少跑一次：

```bash
pnpm run check:template-bootstrap
pnpm run check:template-derivation
pnpm run check:release-candidate
```

这三条命令会分别验证：

- 模板初始化链路
- 模板派生与实例脚手架链路
- backend 发布基线与多端交付链路
