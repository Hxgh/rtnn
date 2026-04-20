# Weapp 小程序模板消费端

`apps/weapp/` 是当前模板仓库的 Taro + React 小程序消费端。

## Stack

- Taro `4.1.11`
- React `18.3`
- TypeScript
- Vite runner
- Target platform: WeChat Mini Program (`weapp`)

## Prerequisites

- Node.js LTS (`20.x` or `22.x` recommended)
- pnpm `>=9`
- WeChat DevTools installed

## Install

Recommended:

```bash
pnpm install
pnpm run setup:env
```

If your private registry/mirror is unstable, use npmjs directly:

```bash
CI=true pnpm -C apps/weapp install --no-frozen-lockfile --registry=https://registry.npmjs.org --store-dir /tmp/pnpm-store
```

## Run

From repo root:

```bash
pnpm run weapp:dev
```

From app directory:

```bash
pnpm -C apps/weapp dev:weapp
```

`apps/weapp` 不再维护独立 `.env`，运行时变量由根级 `.env` 在脚本启动时自动注入。

Build output is generated under `apps/weapp/dist`.
Import `apps/weapp/dist` into WeChat DevTools.

## Other scripts

```bash
pnpm run weapp:build
pnpm run weapp:dev:h5
pnpm run weapp:build:h5
pnpm run weapp:typecheck
```

默认 H5 本地预览端口：`http://localhost:5103`

## Docker / Deploy

`apps/weapp/` 现在提供了 H5 部署镜像入口，用于把小程序消费端的 H5 投影作为正式验收面部署出去。

- 镜像构建文件：`apps/weapp/Dockerfile`
- 容器默认端口：`5103`
- 运行时 API 地址：`TARO_APP_API_BASE_URL`

生产容器启动时会生成 `/runtime-config.js`，因此 `TARO_APP_API_BASE_URL` 可以在运行时注入，而不需要为不同环境重新构建镜像。

## Template scope

Current first-release template scope:

- Customer home page
- Customer login page
- Customer me page
- Session restore / logout basic flow
- Weapp transport + current default `@rtnn/api-sdk` integration entrypoint

## Project structure

```text
apps/weapp/
├── config/
├── src/
│   ├── lib/
│   │   ├── api/
│   │   ├── sdk/
│   │   └── session/
│   ├── pages/
│   │   ├── index/
│   │   ├── login/
│   │   └── profile/
│   ├── app.config.ts
│   ├── app.css
│   └── app.ts
├── package.json
└── project.config.json
```

## Shared contract integration

- SDK entrypoint: `src/lib/sdk/client.ts`
- Taro transport binding: `src/lib/sdk/client.ts` (via `createTaroTransport`)
- Session adapter: `src/lib/session/storage.ts`
- Auth state helper: `src/lib/session/auth.ts`

The current implementation uses the default `@rtnn/api-sdk` package as the request foundation and lets backend failures surface as error messages, with no mock login/session fallbacks.

## Acceptance baseline

At minimum, verify:

- open H5 and reach the home page
- login succeeds with the template customer account
- session reload still restores the authenticated state
- me page shows the authenticated customer
- logout returns to the login page

Commands:

```bash
pnpm run smoke:weapp:h5
pnpm run weapp:build:h5
```
