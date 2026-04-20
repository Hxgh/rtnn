# 模板部署契约

本文档定义模板仓库对独立部署仓库公开的最小部署契约。

约束只有两条：

- 部署仓库只能消费这里已经定义好的运行单元、环境变量、健康检查与发布语义。
- 部署仓库不能反向成为这些规则的平行事实源。

## 1. 运行单元

当前模板仓库首发正式部署面如下：

| 单元 | 形态 | 当前状态 | 说明 |
| --- | --- | --- | --- |
| `backend` | OCI 镜像 | 正式支持 | NestJS 后端内核，唯一后端契约源 |
| `admin` | OCI 镜像 | 正式支持 | Next.js 管理后台 |
| `app` | OCI 镜像 | 正式支持 | Next.js 移动端前台 Web 壳 |
| `weapp` | OCI 镜像（H5 投影） | 正式支持 | Taro 消费端以 H5 预览站点形式纳入首发镜像部署面 |

约束固定为：

- `backend / admin / app / weapp` 都是当前 `release-images` workflow 的正式镜像输出面。
- `weapp` 进入首发部署主线的形式是 H5 预览站点，而不是小程序上传包。
- 小程序平台上传包仍属于后续独立交付面，不和当前 H5 镜像部署语义混在一起。

## 2. 运行时环境变量契约

### 2.1 模板身份类变量

以下变量名称由模板仓库定义，部署仓库只能注入值，不能自行改名：

- `TEMPLATE_PROJECT_ID`
- `TEMPLATE_BRAND_NAME`
- `TEMPLATE_COOKIE_PREFIX`
- `TEMPLATE_IMAGE_NAME_PREFIX`
- `TEMPLATE_DEPLOY_APPLICATION`
- `TEMPLATE_DEPLOY_EVENT_TYPE`

说明：

- 根级 [`.env.example`](../../.env.example) 是这些变量的样板来源。
- 本地开发通过 `setup:env` 渲染出各端运行时变量。
- 正式部署时，部署仓库应按环境注入等价变量值，而不是重新发明一套命名。

### 2.2 backend 运行时契约

`backend` 当前正式 runtime env：

- 必填：
  - `NODE_ENV`
  - `PORT`
  - `DATABASE_URL`
  - `JWT_ISSUER`
  - `JWT_AUDIENCE`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `JWT_ACCESS_EXPIRES_IN`
  - `JWT_REFRESH_EXPIRES_IN`
- 选填：
  - `CORS_ORIGINS`
  - `LOGIN_RATE_LIMIT_WINDOW_SEC`
  - `LOGIN_RATE_LIMIT_MAX_ATTEMPTS`
- 可一并透传的模板身份变量：
  - `TEMPLATE_PROJECT_ID`
  - `TEMPLATE_BRAND_NAME`
  - `TEMPLATE_COOKIE_PREFIX`
  - `TEMPLATE_IMAGE_NAME_PREFIX`
  - `TEMPLATE_DEPLOY_APPLICATION`
  - `TEMPLATE_DEPLOY_EVENT_TYPE`

约束固定为：

- `DATABASE_URL` 是 backend 连接数据库的唯一正式来源。
- `JWT_*` secrets 在部署仓库中必须按环境单独管理，不能沿用 `.env.example` 默认值。
- `CORS_ORIGINS` 若未显式设置，backend 会回退到本地端口白名单；正式部署应由部署仓库显式注入正式域名。

### 2.3 admin 运行时契约

`admin` 当前正式 runtime env：

- `PORT`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_BACKEND_URL`
- `BACKEND_INTERNAL_BASE_URL`
- `NEXT_PUBLIC_TEMPLATE_PROJECT_ID`
- `NEXT_PUBLIC_TEMPLATE_BRAND_NAME`
- `NEXT_PUBLIC_TEMPLATE_COOKIE_PREFIX`
- `TEMPLATE_PROJECT_ID`
- `TEMPLATE_BRAND_NAME`
- `TEMPLATE_COOKIE_PREFIX`

说明：

- 本地模板会把这几个 URL 默认指向 `localhost:${TEMPLATE_BACKEND_PORT}`。
- 正式部署时，部署仓库应显式注入：
  - 浏览器侧可访问的 backend 地址：`NEXT_PUBLIC_API_BASE_URL`
  - 若需要公开展示 backend 绝对地址：`NEXT_PUBLIC_BACKEND_URL`
  - SSR / server action 使用的内网或服务发现地址：`BACKEND_INTERNAL_BASE_URL`

### 2.4 app 运行时契约

`app` 当前正式 runtime env：

- `PORT`
- `NEXT_PUBLIC_API_BASE_URL`
- `BACKEND_INTERNAL_BASE_URL`
- `NEXT_PUBLIC_TEMPLATE_PROJECT_ID`
- `NEXT_PUBLIC_TEMPLATE_BRAND_NAME`
- `NEXT_PUBLIC_TEMPLATE_COOKIE_PREFIX`
- `TEMPLATE_PROJECT_ID`
- `TEMPLATE_BRAND_NAME`
- `TEMPLATE_COOKIE_PREFIX`

说明：

- 本地模板默认把 `NEXT_PUBLIC_API_BASE_URL` 和 `BACKEND_INTERNAL_BASE_URL` 都指向本机 backend。
- 正式部署时，部署仓库应根据浏览器访问地址和服务间访问地址分别注入。

### 2.5 weapp 运行时契约

`weapp` 当前模板运行时变量主要包括：

- `TARO_APP_API_BASE_URL`
- `TARO_APP_TEMPLATE_PROJECT_ID`
- `TARO_APP_TEMPLATE_BRAND_NAME`
- `TARO_APP_TEMPLATE_COOKIE_PREFIX`

说明：

- `TARO_APP_API_BASE_URL` 是 `weapp` H5 镜像运行时正式变量，由部署仓库按环境注入。
- 其余 `TARO_APP_TEMPLATE_*` 变量继续作为模板身份常量，主要用于本地或构建期渲染。
- 小程序正式发布链路尚未独立工程化，因此当前部署契约只覆盖 H5 投影站点，不覆盖上传包发布。

### 2.6 默认验证账号变量

以下变量只服务模板本地验证，不属于正式部署必填项：

- `TEMPLATE_ADMIN_EMAIL`
- `TEMPLATE_ADMIN_PASSWORD`
- `TEMPLATE_ADMIN_DISPLAY_NAME`
- `TEMPLATE_CUSTOMER_EMAIL`
- `TEMPLATE_CUSTOMER_PASSWORD`
- `TEMPLATE_CUSTOMER_DISPLAY_NAME`

部署仓库约束：

- `testing / production` 不应依赖这些默认验证账号变量。
- 如环境需要演示账号，必须在部署仓库内明确声明为环境特例，而不是把模板默认值当成正式能力。

## 3. 健康检查契约

当前正式健康检查只由 `backend` 提供：

- `GET /healthz`
- `GET /readyz`
- `GET /openapi.json`

语义固定为：

- `/healthz`：进程存活。
- `/readyz`：服务就绪，且数据库连接可用。
- `/openapi.json`：后端正式契约导出面。

部署仓库约束：

- 可以把 `/healthz` 和 `/readyz` 作为 backend 容器/服务的探针来源。
- 不得擅自为 `backend` 改写这些路径。
- `admin / app / weapp(H5)` 当前都没有独立 machine health endpoint；部署仓库不得凭空把 `/healthz` 写进它们的正式契约。
- 如果后续确实需要这些前端运行单元的正式探针，应先在模板仓库实现，再更新本文档。

## 4. 数据库迁移与 seed 契约

数据库职责固定为 backend：

- 迁移命令：`pnpm --filter backend prisma:migrate:deploy`
- seed 命令：`pnpm --filter backend prisma:seed`

约束固定为：

- 正式部署时，数据库 schema 迁移由部署仓库编排执行顺序，但不重写 Prisma 语义。
- `prisma:migrate:deploy` 是正式发布链路的一部分，应在 backend 流量切换前完成。
- `prisma:seed` 默认只用于模板初始化、本地验证或明确的一次性环境准备，不作为每次发布的固定步骤。
- 部署仓库若需要“只在首次建库时 seed”，应在部署仓库实现幂等判断，而不是在模板仓库写环境特化逻辑。

## 5. 发布前 gate 与部署关系

模板仓库当前固定的发布前 gate：

- `pnpm run check:template-bootstrap`
- `pnpm run check:backend-release`
- `pnpm run check:release-candidate`

它们的职责分别是：

- `check:template-bootstrap`：验证初始化链路与 backend 公开基线。
- `check:backend-release`：验证 backend 正式发布基线。
- `check:release-candidate`：验证契约、backend、消费端交付闭环。

部署仓库约束：

- 部署仓库消费的是“已经通过模板 gate 的镜像或版本”，而不是在部署仓库重复执行契约生成。
- 部署仓库不得自行生成 OpenAPI、权限或 shared contract 作为发布依据。

## 6. 镜像命名与版本语义

当前 `release-images` workflow 已固定以下镜像规则：

- 镜像前缀：`ghcr.io/<owner>/<TEMPLATE_IMAGE_NAME_PREFIX>-<service>`
- 当前正式服务：
  - `backend`
  - `admin`
  - `app`
  - `weapp`

版本语义固定为：

- `main` 分支发布：
  - 版本 tag：`main-<sha12>`
  - 通道 tag：`testing-latest`
- `v*` tag 发布：
  - 版本 tag：`v*`
  - 通道 tag：`production-latest`

部署仓库约束：

- 优先消费明确版本 tag，例如 `main-abc123def456` 或 `v1.2.3`。
- `testing-latest` / `production-latest` 只作为通道别名，不应成为唯一可追溯版本记录。
- 部署仓库不得自行拼出另一套镜像名规则。

## 7. Deploy 事件契约

当前模板仓库在镜像发布后只会向部署仓库自动发送 `testing` deploy 事件，payload 语义固定包含：

- `application`
- `environment`
- `version`
- `sha`
- `images.backend`
- `images.admin`
- `images.app`
- `images.weapp`

部署仓库约束：

- 应直接消费这些字段。
- 若需要补充环境特有字段，应在部署仓库内部扩展，不反向要求模板仓库混入环境专属信息。
- `production` 不由模板仓库自动 dispatch，而是在部署仓库中手动选择明确版本后发布。

## 8. 后续扩展规则

后续只有在模板仓库先实现真实能力后，以下内容才能进入部署契约：

- `weapp` 小程序上传包正式发布契约
- `admin / app / weapp(H5)` 正式健康检查端点
- 对象存储、消息队列、缓存、定时任务等额外运行单元
- 多租户环境级变量

在此之前，部署仓库不得预先定义这些能力。
