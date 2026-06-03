# 模板部署契约

本文档定义业务源码仓对独立部署仓库公开的最小部署契约。

## 契约所有权

- 接口、权限、OpenAPI、shared contract：`backend`
- 镜像命名规则、运行时 env key、健康检查路径：模板体系统一定义
- 运行环境具体值：业务仓 `.rtnn/project.json` + deploy repo GitHub Environment secrets

部署仓只能消费这些契约，不能自行改名或重新定义。

## 正式部署面

当前首发部署面固定为：

- `backend`
- `admin`
- `app`
- `weapp(H5)`

## 发布可观测性

backend 必须公开以下无鉴权探活/版本端点：

- `GET /healthz`
- `GET /readyz`
- `GET /version`
- `GET /openapi.json`

`/version` 返回当前运行环境、发布版本、源码 SHA 与 backend 镜像名。部署仓 smoke 应用它校验实际运行版本是否与本次 `DEPLOY_VERSION / DEPLOY_SOURCE_SHA / BACKEND_IMAGE` 一致。

## 最小运行时变量

部署仓必须能消费以下分组：

- 模板身份
  - `TEMPLATE_PROJECT_ID`
  - `TEMPLATE_BRAND_NAME`
  - `TEMPLATE_COOKIE_PREFIX`
  - `TEMPLATE_IMAGE_NAME_PREFIX`
  - `TEMPLATE_DEPLOY_APPLICATION`
  - `TEMPLATE_DEPLOY_EVENT_TYPE`
- 镜像版本
  - `BACKEND_IMAGE`
  - `ADMIN_IMAGE`
  - `APP_IMAGE`
  - `WEAPP_IMAGE`
  - `DEPLOY_VERSION`
  - `DEPLOY_SOURCE_SHA`
- backend runtime
  - `DATABASE_URL`
  - `JWT_ISSUER`
  - `JWT_AUDIENCE`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
- web runtime
  - `NEXT_PUBLIC_API_BASE_URL`
  - `NEXT_PUBLIC_BACKEND_URL`
  - `PUBLIC_ADMIN_BASE_URL`
  - `PUBLIC_APP_BASE_URL`
  - `PUBLIC_WEAPP_BASE_URL`
  - `BACKEND_INTERNAL_BASE_URL`

## 发布事件 payload

业务源码仓会向部署仓发送 `repository_dispatch`。payload 最小语义固定包含：

- `application`
- `environment`
- `version`
- `sha`
- `source_repository`
- `source_ref`
- `images.backend`
- `images.admin`
- `images.app`
- `images.weapp`

规则固定为：

- `testing` 自动 dispatch
- `production` 由业务源码仓手动 promote
- 部署仓只根据 payload 执行，不反向决定发布版本

## 运行事实报告

部署仓应提供不含 secrets 的运行事实报告，用于把实际运行版本同步回业务源码仓的 `.rtnn/project.json liveState`。

报告只允许包含：

- deploy 绑定关系
- `DEPLOY_VERSION` 与 `DEPLOY_SOURCE_SHA`
- 四端镜像名
- 公网 URL / smoke URL
- 可选探活与容器状态

报告不允许包含数据库连接串、JWT secret、GHCR token、dispatch token 或服务器 SSH 信息。

业务源码仓负责执行：

```bash
pnpm run release:status -- --facts-file /tmp/rtnn-runtime-facts.json
pnpm run release:status -- --facts-file /tmp/rtnn-runtime-facts.json --summary-md --output /tmp/rtnn-release-status.json
pnpm run release:sync-live-state -- --facts-file /tmp/rtnn-runtime-facts.json --check
pnpm run release:sync-live-state -- --facts-file /tmp/rtnn-runtime-facts.json --write
pnpm run release:prepare-live-state-pr -- --facts-file /tmp/rtnn-runtime-facts.json --summary-md /tmp/live-state-pr.md --json
pnpm run release:status:ci -- --facts-file /tmp/rtnn-runtime-facts.json --output-dir /tmp/rtnn-release-status
pnpm run release:prepare-live-state-pr:ci -- --facts-file /tmp/rtnn-runtime-facts.json --environment testing --no-push
```

`liveState` 是业务仓的非敏感事实，不是 deploy 仓的发布决策来源。
`release:status` 是只读入口，用来回答线上 runtime facts 是否与业务仓
`liveState` 一致；写回必须显式使用 sync 命令，或由 CI 使用
`release:prepare-live-state-pr` 准备 liveState-only PR。

业务源码仓还提供 `.github/workflows/sync-live-state.yml`。部署仓可在完成
deploy/smoke 后上传 `rtnn-runtime-facts` artifact，并以
`repository_dispatch` 的 `sync-rtnn-live-state` 事件触发业务仓：

```json
{
  "event_type": "sync-rtnn-live-state",
  "client_payload": {
    "source_repository": "owner/rtnn-deploy",
    "source_run_id": "1234567890",
    "runtime_facts_artifact": "rtnn-runtime-facts",
    "runtime_facts_file": "runtime-facts.json",
    "environment": "testing",
    "mode": "prepare-pr"
  }
}
```

`mode=status` 只产出 release status artifact；`mode=prepare-pr` 会在业务仓
准备 liveState-only PR。CI 判断必须读取 `status/code`，不要解析人类文案。
