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

先改根级环境参数：

```bash
pnpm run setup:env -- --project-id=acme --brand-name=ACME --force
```

如果还要同步改源码中的项目名、workspace package scope 和静态引用：

```bash
pnpm run template:rewrite-source -- --dry-run
pnpm run template:rewrite-source -- --project-id=acme --package-scope=acme --brand-name=ACME
pnpm install
pnpm run contracts:permissions
pnpm run contracts:sync
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
pnpm run check:release-candidate
```

这两条命令会验证模板初始化、backend 发布基线和多端交付链路。
