# Weapp 小程序模板消费端

`weapp/` 是当前模板仓库的 Taro + React 小程序消费端。

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
```

If your private registry/mirror is unstable, use npmjs directly:

```bash
CI=true pnpm -C weapp install --no-frozen-lockfile --registry=https://registry.npmjs.org --store-dir /tmp/pnpm-store
```

## Run

From repo root:

```bash
pnpm weapp:dev
```

From app directory:

```bash
pnpm -C weapp dev:weapp
```

Build output is generated under `weapp/dist`.
Import `weapp/dist` into WeChat DevTools.

## Other scripts

```bash
pnpm weapp:build
pnpm weapp:dev:h5
pnpm weapp:build:h5
pnpm weapp:typecheck
```

默认 H5 本地预览端口：`http://localhost:5103`

## Template scope

Current first-release template scope:

- Customer home page
- Customer login page
- Customer profile page
- Session restore / logout basic flow
- Weapp transport + current default `@rtnn/api-sdk` integration entrypoint

## Project structure

```text
weapp/
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
- profile page shows the authenticated customer
- logout returns to the login page

Commands:

```bash
pnpm weapp:typecheck
pnpm weapp:build:h5
```
