FROM node:20-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /workspace

FROM base AS builder

COPY . .

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @rtnn/config build \
  && pnpm --filter @rtnn/shared-types build \
  && pnpm --filter @rtnn/shared-schemas build
RUN pnpm --filter backend prisma:generate
RUN pnpm --filter backend build

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=5100

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/backend/prisma apps/backend/prisma
COPY apps/backend/prisma.config.ts apps/backend/prisma.config.ts
COPY packages/config/package.json packages/config/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-schemas/package.json packages/shared-schemas/package.json

RUN pnpm install --filter backend... --prod --no-frozen-lockfile
RUN pnpm --dir apps/backend run prisma:generate

COPY --from=builder /workspace/apps/backend/dist ./apps/backend/dist
COPY --from=builder /workspace/packages/config/dist ./packages/config/dist
COPY --from=builder /workspace/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /workspace/packages/shared-schemas/dist ./packages/shared-schemas/dist

EXPOSE 5100

CMD ["node", "apps/backend/dist/main"]
