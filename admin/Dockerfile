FROM node:20-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /workspace

FROM base AS builder

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm run build:packages
RUN pnpm --filter admin build

FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV PORT=5101

WORKDIR /app

COPY --from=builder /workspace/admin/.next/standalone ./
COPY --from=builder /workspace/admin/.next/static ./admin/.next/static
COPY --from=builder /workspace/admin/public ./admin/public

EXPOSE 5101

CMD ["node", "admin/server.js"]
