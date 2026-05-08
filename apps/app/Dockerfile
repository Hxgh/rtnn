FROM node:20-alpine AS base

ARG NPM_CONFIG_REGISTRY=https://registry.npmjs.org

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NPM_CONFIG_REGISTRY=$NPM_CONFIG_REGISTRY
ENV npm_config_registry=$NPM_CONFIG_REGISTRY
ENV COREPACK_NPM_REGISTRY=$NPM_CONFIG_REGISTRY

RUN corepack enable

WORKDIR /workspace

FROM base AS builder

COPY . .

RUN pnpm install --no-frozen-lockfile
RUN pnpm run build:packages
RUN pnpm --filter app build

FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV PORT=5102
ENV HOSTNAME=0.0.0.0

WORKDIR /app

COPY --from=builder /workspace/apps/app/.next/standalone ./
COPY --from=builder /workspace/apps/app/.next/static ./apps/app/.next/static
COPY --from=builder /workspace/apps/app/public ./apps/app/public

EXPOSE 5102

CMD ["node", "apps/app/server.js"]
