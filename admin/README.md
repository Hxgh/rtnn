# rtnn admin

`admin/` 是 `rtnn` 模板工程的 Next.js 管理后台消费端，负责消费 `backend/` 提供的正式 API、权限与会话能力。

它不是独立 API 工程，也不维护与 backend 平行的接口定义。

## 角色定位

- 作为后台管理端消费 `backend`
- 使用 `@rtnn/api-sdk`、`@rtnn/shared-types`、`@rtnn/config`
- 承接管理员登录、权限控制、用户/角色/客户/审计等后台主线

## 开发命令

```bash
pnpm install
pnpm -C admin dev
```

默认访问地址：`http://localhost:5101`

常用脚本：

- `pnpm -C admin dev`
- `pnpm -C admin build`
- `pnpm -C admin start`
- `pnpm -C admin typecheck`

## 与 Backend 的关系

- backend 是唯一契约源
- admin 不手写平行 DTO、权限常量、会话接口定义
- backend 变更接口、权限或 OpenAPI 后，应优先同步 SDK / shared-types，而不是在 admin 端绕过契约

## UI 基线

- `Next.js App Router`
- `shadcn/ui + Tailwind CSS v4 + CSS Variables`
- 后台壳层、路由与权限展示遵循仓库内 `CLAUDE.md` 规则
