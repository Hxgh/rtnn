# weapp

`weapp` is the Taro + React mini-program template app in `rtnn`.

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
pnpm -C weapp install
```

From repo root helper script:

```bash
pnpm weapp:install
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

## Template scope

This scaffold provides:

- Home page
- Login guide page
- Profile page
- Session storage adapter skeleton
- Weapp transport + `@rtnn/api-sdk` integration entrypoint

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
│   ├── app.scss
│   └── app.ts
├── package.json
└── project.config.json
```

## Shared contract integration

- SDK entrypoint: `src/lib/sdk/client.ts`
- Taro transport binding: `src/lib/sdk/client.ts` (via `createTaroTransport`)
- Session adapter: `src/lib/session/storage.ts`
- Auth state helper: `src/lib/session/auth.ts`

The current implementation uses `@rtnn/api-sdk` as the request foundation and lets backend failures surface as error messages, with no mock login/session fallbacks.
