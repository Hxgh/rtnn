# RTNN

RTNN 是一套面向 AI 协作交付的全栈模板 monorepo。它不是 demo 仓库，目标是沉淀一套可派生、可验收、可部署、可继续回流演进的正式模板工程。

## 模板定位

- `apps/backend/`
  - NestJS 模板后端内核，也是唯一后端契约源
- `apps/admin/`
  - Next.js 管理后台
- `apps/app/`
  - Next.js 移动端前台
- `apps/weapp/`
  - Taro + React 小程序端
- `packages/`
  - 共享配置、共享类型、共享 schema、API SDK
- `docs/`
  - 模板使用文档与工程文档
- `scripts/`
  - 模板初始化、契约、发布、smoke 与运行时脚本

## 模板最小承诺

正式提供：

- 以 `backend` 为唯一事实源的接口、权限、OpenAPI、shared contract 与 SDK 链路
- 面向 `admin / app / weapp` 的正式消费端骨架，而不是示例页集合
- 单根 `.env` 驱动的初始化方式，各端运行时变量按目标自动派生
- 面向 AI 协作的规则入口、skills 目录、MCP 配置和工程协作元数据
- 模板初始化校验、后端发布基线校验、消费端交付烟测

明确不承诺：

- demo 示例模块、假导航、占位页面、平行契约定义
- 多套根级 env 体系、端内散落 env 文件
- 仓库级 lockfile 提交策略
- 没有明确消费面的展示型能力

## 快速开始

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

默认端口：

- `backend`: `http://localhost:5100`
- `admin`: `http://localhost:5101`
- `app`: `http://localhost:5102`
- `weapp h5`: `http://localhost:5103`

## 派生业务项目

推荐把当前仓库作为上游模板源码仓复制或 fork 成业务源码仓，再在业务仓内执行：

```bash
pnpm run template:init -- --project-id=acme --brand-name=ACME
pnpm run template:init -- --project-id=acme --brand-name=ACME --rewrite-source --package-scope=acme
```

其中：

- `template:init` 统一编排根级 `.env` 初始化
- `template:init` 会同时生成业务仓 `.rtnn/project.json` 骨架
- `--rewrite-source` 会同步改源码中的项目名、workspace scope 和静态引用
- 业务项目应直接持有完整源码，不再推荐“薄实例目录 + 资产刷新”模式

## 环境与依赖策略

- 根级 `.env` 是模板初始化参数唯一来源
- 根级 `.env.example` 是模板参数参考样板，不再维护各端 `.env*`
- 仓库采用 latest-first 策略，故意不提交 `pnpm-lock.yaml`
- 若业务仓需要可重现安装，应在自己的仓库中恢复 lockfile 策略

## 三仓发布模型

当前主线固定为三仓协作：

- `rtnn`
  - 上游模板源码仓
- 业务源码仓，例如 `rtnn-demo`
  - 持有完整业务源码
  - 拥有 `testing / production` 的构建、发版和验收主线
  - 用 `.rtnn/project.json` 固化仓库角色、部署仓绑定与环境映射
- `rtnn-deploy`
  - 部署执行仓，只负责 deploy / rollback / smoke

固定规则：

- 业务仓 `main -> testing` 自动发布
- 业务仓 `v*` tag 只产出 production 候选镜像
- 业务仓手动执行 `promote-production` 发起正式发布
- 上游模板仓 `rtnn` 默认不直接拥有任何业务环境发布权

## 验收入口

```bash
pnpm run check:template-bootstrap
pnpm run check:template-derivation
pnpm run check:release-candidate
pnpm run smoke:admin
pnpm run check
```

## AI 协作入口

- `.claude/skills/`
  - 唯一维护的 skills 源目录
- `.agents/`
  - 兼容其他 agent 入口的镜像与元数据
- `.mcp.json`
  - MCP 配置
- `CLAUDE.md`
  - 唯一规则来源
- `AGENTS.md`
  - 多 agent 入口提示

## 文档入口

- [文档入口](./docs/README.md)
- [快速开始](./docs/template/getting-started.md)
- [模板最小承诺](./docs/template/minimum-commitment.md)
- [业务源码仓模型](./docs/architecture/template-business-repository-model.md)
- [仓库关系与触发拓扑](./docs/architecture/template-repository-topology.md)
- [部署边界](./docs/architecture/template-deployment-boundary.md)
- [部署契约](./docs/architecture/template-deployment-contract.md)
- [部署仓库方案](./docs/architecture/template-deployment-repository-plan.md)
