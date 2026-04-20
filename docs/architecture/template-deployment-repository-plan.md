# 模板部署仓库首发方案

本文档给出 `rtnn-deploy` 的正式首发模型。目标不是把“某台服务器的运维记录”塞进仓库，而是把部署引擎、环境边界和触发关系固定下来。

## 1. 首发目标

独立部署仓库首发只解决四件事：

1. 接收模板仓库已通过 gate 的镜像版本。
2. 管理 `testing / production` 两套远程环境。
3. 提供可重复执行的 deploy / rollback / smoke 入口。
4. 保持开源可见部分脱敏，不承接真实实例 secrets。

## 2. 技术基线

首发基线固定为：

- 镜像仓库：GHCR
- 编排方式：Docker Compose
- 部署粒度：`backend / admin / app / weapp(H5)`
- 环境层次：`testing / production`
- 触发模型：
  - `testing`：模板仓库 `main` push 后自动 dispatch
  - `production`：部署仓库手动提升

原因固定为：

- `testing` 负责持续验证模板主线，不应再靠人工抄版本。
- `production` 必须基于明确版本手动确认，避免模板仓库自动把生产环境推走。
- `local` 继续由 `rtnn` 自己负责，不在部署仓库平行再造一套。

## 3. 推荐目录结构

```text
rtnn-deploy/
├── README.md
├── docs/
│   ├── environments.md
│   ├── integration-checklist.md
│   ├── release-runbook.md
│   └── rollback-runbook.md
├── compose/
│   ├── compose.base.yml
│   ├── compose.testing.yml
│   └── compose.production.yml
├── env/
│   ├── testing.env.example
│   ├── production.env.example
│   ├── shared.env.schema
│   └── runtime/
├── scripts/
│   ├── ci/
│   ├── lib/
│   ├── ops/
│   └── release/
└── .github/workflows/
    ├── deploy-testing.yml
    ├── deploy-production.yml
    ├── rollback-testing.yml
    └── rollback-production.yml
```

## 4. 环境模型

### 4.1 `testing`

`testing` 是模板主线的自动验证环境：

- 消费 `main-<sha12>` 镜像版本。
- 由 `rtnn` 的 `release-images` 自动 dispatch 触发。
- 默认用于联调、回归、验收与模板链路真实性验证。

### 4.2 `production`

`production` 是正式环境：

- 消费明确版本，例如 `v1.0.0`。
- 只在 `rtnn-deploy` 仓库中手动执行发布。
- 部署前固定执行迁移、探活、回滚点记录。

### 4.3 `local`

`local` 不属于 `rtnn-deploy`：

- 根级 `.env`
- 根级 `docker-compose.yml`
- `bootstrap`
- `dev:web`

这些都继续留在模板仓库 `rtnn`。

## 5. 开源边界

`rtnn-deploy` 可以开源，但必须满足以下边界：

- 允许进入仓库：
  - compose overlay
  - deploy/rollback/smoke 脚本
  - env example
  - 文档、workflow、校验脚本
- 不允许进入仓库：
  - 真实 runtime env
  - 真实域名与服务器路径实值
  - 数据库密码、JWT secrets、dispatch token
  - 某个实例专属的说明、截图和维护备忘

实例级非敏感映射应放在 `rtnn-demo` 这类本地或私有实例目录，而不是硬塞进 `rtnn` 或 `rtnn-deploy`。

## 6. 与模板仓库的协作方式

协作关系固定为：

1. `rtnn` 通过发布前 gate。
2. `rtnn` 构建并推送镜像到 GHCR。
3. 若是 `main` push，则自动 dispatch 到 `rtnn-deploy/testing`。
4. 若是 `v*` tag，则只产出 production 候选镜像。
5. 生产发布由 `rtnn-deploy` 手动执行 `deploy-production`。

## 7. 完成标准

当 `rtnn-deploy` 达到以下标准，即可认为模板部署工程首发合格：

- 可以消费 `backend / admin / app / weapp(H5)` 正式镜像。
- `testing` 自动发布链路清晰且可验证。
- `production` 手动提升入口固定且可回归。
- 仓库公开内容不含真实实例 secrets。
- 能执行 backend 迁移、服务更新、backend 探活与基础 smoke check。
- 能按镜像 tag 做回滚。
- 不在部署仓库内重新定义接口、权限、OpenAPI、环境变量名或健康检查路径。
