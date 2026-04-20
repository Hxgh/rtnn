# 模板部署边界

本文档定义模板仓库与独立部署仓库的职责切分，避免把“应用模板”和“环境编排”继续混在一个仓库里。

当前阶段的原则很简单：

- `rtnn` 模板仓库负责应用代码、契约、初始化、发布候选校验与镜像产出。
- 独立部署仓库负责环境编排、密钥注入、版本提升、发布与回滚。
- 两边都只维护自己的唯一事实源，不互相复制对方的职责。

## 为什么必须拆分

如果继续把模板工程和部署工程混在一起，会同时出现三个问题：

1. 模板仓库会被环境差异污染，逐渐长出 `testing/production` 以外的实例特化配置、运维脚本和私有化约束。
2. 部署仓库会反向复制接口、环境变量、健康检查和镜像命名规则，形成平行事实源。
3. 派生模板时，执行者会分不清哪些资产属于“可复用模板”，哪些资产属于“某个环境的私有运维实现”。

因此，模板仓库只定义部署契约，不直接承载正式环境编排。

## 模板仓库负责什么

模板仓库正式负责：

- `backend / admin / app / weapp` 的源代码与正式模板边界。
- `backend` 作为唯一后端契约源，输出 OpenAPI、权限、shared-types、shared-schemas、SDK。
- 根级 `.env` 与 `.env.example` 作为模板初始化参数来源。
- 本地开发与模板初始化所需的 `docker-compose.yml`、`bootstrap`、数据库初始化脚本。
- 发布候选 gate：
  - `check:template-bootstrap`
  - `check:backend-release`
  - `check:release-candidate`
- 镜像构建定义：
  - `apps/backend/Dockerfile`
  - `apps/admin/Dockerfile`
  - `apps/app/Dockerfile`
- 镜像发布与 deploy 事件分发 workflow。
- 模板维护文档，包括部署边界、部署契约、部署仓库首发方案。

模板仓库不负责：

- `testing / production` 环境编排文件。
- 生产域名、TLS、Ingress、反向代理、WAF、CDN。
- 环境级 secrets、秘钥轮换、证书与账户权限治理。
- 回滚历史、环境清单、运维审批流、值班与监控平台配置。

## 部署仓库负责什么

独立部署仓库正式负责：

- 环境目录与编排资产，例如 Compose overlay、反向代理配置、运行脚本。
- 各环境的镜像版本绑定与版本提升。
- Secrets 注入与环境变量落地。
- 数据库迁移执行顺序、发布顺序与回滚入口。
- 环境级 smoke check、发布记录与运维 runbook。
- 接收模板仓库的镜像版本或 repository dispatch 事件，并据此执行部署。
- 对 `testing` 自动部署和 `production` 手动提升进行落实。

部署仓库不负责：

- 重新定义 API 路由、权限、DTO、OpenAPI、SDK。
- 重新命名 runtime env key。
- 自行推导镜像名、健康检查路径、数据库迁移命令。
- 在部署仓库内维护一套“看起来差不多”的模板说明文档。

## 唯一事实源

这两类事实源必须固定：

- 应用与契约事实源：模板仓库。
- 环境与发布状态事实源：部署仓库。

进一步收敛后，唯一来源如下：

- API、权限、OpenAPI、shared contract：`apps/backend/`
- 模板初始化参数样板：根级 `.env.example`
- 本地开发数据库编排：根级 `docker-compose.yml`
- 镜像构建方式：各端 `Dockerfile`
- 镜像版本与环境绑定：独立部署仓库
- 发布记录、回滚记录、环境级变量值：独立部署仓库

## 禁止回流到模板仓库的内容

以下内容即使后续补齐，也不应回流到模板仓库主线：

- `compose.testing.yml`、`compose.production.yml` 这类环境专属编排文件。
- Nginx/Caddy/Traefik 生产代理配置。
- 环境域名、证书、Webhook 地址、仓库 dispatch 地址实值。
- 环境专属的数据库备份、恢复、回滚脚本。
- 为某个环境写死的 `NEXT_PUBLIC_API_BASE_URL`、内网域名或私有网段地址。
- 生产监控、告警、日志平台接入细节。

## 当前阶段的协作主线

当前模板仓库与后续部署仓库的协作顺序固定为：

1. 模板仓库通过正式 gate，产出可发布候选。
2. 模板仓库构建并推送 `backend / admin / app / weapp(H5)` 镜像到 GHCR。
3. `main` 分支通过 dispatch 事件把 testing 版本交给部署仓库。
4. `v*` tag 只产出 production 候选镜像，由部署仓库手动提升。
5. 部署仓库完成环境变量注入、迁移、部署、探活与回滚管理。

## 与现有文档的关系

- 模板总体结构：[`template-overview.md`](./template-overview.md)
- 模板交付执行手册：[`template-delivery-runbook.md`](./template-delivery-runbook.md)
- 模板发布工程化计划：[`template-release-engineering-plan.md`](./template-release-engineering-plan.md)
- 部署契约定义：[`template-deployment-contract.md`](./template-deployment-contract.md)
- 仓库关系与触发拓扑：[`template-repository-topology.md`](./template-repository-topology.md)
- 部署仓库首发方案：[`template-deployment-repository-plan.md`](./template-deployment-repository-plan.md)
