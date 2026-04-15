# App 前台模板消费端

`apps/app/` 是当前模板仓库的 Next.js 前台消费端，负责消费 `apps/backend/` 提供的 customer 向正式 API 与会话能力。

它不是 demo 页面集合，也不维护独立于 backend 的平行接口层。

## 角色定位

- 作为前台用户端消费 `backend`
- 当前默认使用 `@rtnn/api-sdk`、`@rtnn/shared-types`、`@rtnn/config`
- 承接 customer 会话闭环：登录、刷新、登出、会话自省、修改密码
- 提供移动端首发骨架：首页、个人页、账户安全页（不含资料编辑）

## 开发命令

```bash
pnpm install
pnpm run setup:env
pnpm -C apps/app dev
```

默认访问地址：`http://localhost:5102`

`apps/app` 不再维护 `.env.local`，运行时变量由根级 `.env` 在脚本启动时自动注入。

常用脚本：

- `pnpm -C apps/app dev`
- `pnpm -C apps/app build`
- `pnpm -C apps/app start`
- `pnpm -C apps/app typecheck`
- `pnpm run smoke:app:ui`

## 与 Backend 的关系

- customer 正式自省接口为 `auth/customer/me`
- customer 正式认证接口为 `auth/customer/login|refresh|logout|change-password`
- app 不再依赖 `system/me` 这类泛化 demo 接口
- backend 变更接口、权限或 OpenAPI 后，应通过 SDK / shared-types 同步到 app
- 若需要切换默认 workspace package scope，使用根命令 `pnpm run template:rewrite-source`

## 前端基线

- `Next.js App Router`
- server-first 数据获取
- 多语言、主题和共享配置当前默认基于 `@rtnn/config`
- `Tailwind CSS v4 + CSS Variables`（不引入 `shadcn/ui`）
- 视觉方向：中性底色 + 单一强调色 + 移动端单列结构

## 验收主线

最小正式闭环验收覆盖：

- 登录
- 首页
- 我的页
- 账户安全页
- 退出登录

统一入口：

```bash
pnpm run smoke:app:ui
```
