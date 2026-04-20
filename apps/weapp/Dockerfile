FROM node:20-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /workspace

FROM base AS builder

ARG TARO_APP_API_BASE_URL=__RTNN_RUNTIME_API_BASE_URL__
ENV TARO_APP_API_BASE_URL=$TARO_APP_API_BASE_URL

COPY . .

RUN pnpm install --no-frozen-lockfile
RUN pnpm run build:packages
RUN pnpm --filter weapp build:h5

FROM nginx:alpine AS runner

ENV PORT=5103
ENV TARO_APP_API_BASE_URL=http://backend:5100

COPY apps/weapp/docker/nginx.conf /etc/nginx/nginx.conf
COPY apps/weapp/docker/entrypoint.sh /docker-entrypoint.d/40-rtnn-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-rtnn-runtime-config.sh
COPY --from=builder /workspace/apps/weapp/dist /usr/share/nginx/html

EXPOSE 5103

CMD ["nginx", "-g", "daemon off;"]
