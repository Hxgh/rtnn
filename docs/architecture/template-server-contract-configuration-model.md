# 模板服务器契约与配置分层模型

本文档定义 `rtnn` 进入真实部署阶段后的服务器契约模型，目标是把“服务器怎么接入模板主线”收敛成可配置、可渲染、可校验的结构，而不是继续依赖人工 SSH、手写 compose 和口头约定。

本文档默认建立在“三层结构”之上：

- `rtnn`：模板源码主线
- 私有实例目录：本地或私有仓库维护的实例承接层
- `rtnn-deploy`：部署引擎仓库

## 1. 核心原则

### 1.1 公开仓库只放规则，不放敏感值

以下内容可以进入公开仓库：

- 域名结构
- 入口模式
- 网络模式
- compose 组织方式
- PostgreSQL / Redis 的复用策略
- 目录布局
- runner 模式

以下内容不得进入公开仓库：

- 真实 SSH 私钥
- 真实数据库密码
- Redis 密码
- JWT secrets
- 服务器 root 密码
- 证书私钥

### 1.2 部署必须由契约驱动，而不是由人脑驱动

后续部署链路必须固定为：

1. 读取实例级非敏感契约。
2. 读取环境级 secrets。
3. 通过 `rtnn-deploy` 的模板与渲染脚本生成运行产物。
4. 由 deploy / rollback 脚本消费这些产物执行发布。

不能继续依赖：

- 人工编辑 compose 文件
- 人工拼接 runtime env
- 人工记忆 PG/Redis 如何复用
- 人工维护 Nginx 路由分发

## 2. 配置分层

推荐固定为三层配置：

### 2.1 应用契约层

来自 `rtnn`：

- 镜像名与镜像版本语义
- health 路径
- OpenAPI
- backend runtime env key
- 发布 gate

### 2.2 实例契约层

来自私有实例目录：

- 域名
- 入口模式
- 网络模式
- PG/Redis 模式
- 目录布局
- runner 是否启用

这一层是非敏感、可版本化、应进入 git 的真实实例结构配置。

### 2.3 敏感值层

来自 GitHub Environment secrets 或服务器本地受限 env：

- SSH 连接信息
- 数据库密码
- Redis 密码
- JWT secrets
- GHCR 凭据
- 证书材料

## 3. 推荐配置载体

### 3.1 在私有实例目录中

建议提供：

- `.rtnn/project.yaml`
- `.rtnn/server-profile.yaml`
- `.rtnn/sync-manifest.yaml`

其中：

- `project.yaml`：实例身份。
- `server-profile.yaml`：服务器契约。
- `sync-manifest.yaml`：与 `rtnn` 的同步保留规则。

### 3.2 在 `rtnn-deploy` 中

建议提供：

- `contracts/schema/server-contract.v1.schema.json`
- `contracts/examples/*.example.yaml`
- `templates/compose/*.tmpl`
- `templates/nginx/*.tmpl`
- `scripts/render/*`
- `scripts/validate/*`

`rtnn-deploy` 只存 schema、模板与渲染器，不存某个实例的真实配置。

## 4. 推荐的 `server-profile.yaml` 字段

建议首版至少覆盖：

- `version`
- `environment`
- `host_model`
- `placement`
- `domains`
- `tls`
- `ingress`
- `network`
- `postgres`
- `redis`
- `runner`
- `paths`

### 4.1 当前阶段推荐的 `testing` 结构

首发建议固定为：

- 单机 Docker 模型
- 接入既有 Docker 网络或指定的共享网络
- 继续复用既有反向代理作为对外入口
- PostgreSQL / Redis 支持复用既有基础设施，但逻辑隔离
- `runner` 同机容器化部署

对应的推荐值如下：

```yaml
version: v1
environment: testing

host_model: single-host
placement: shared-host-isolated-stack

domains:
  base: <instance-base-domain>
  api: api.<instance-base-domain>
  admin: admin.<instance-base-domain>
  app: app.<instance-base-domain>
  weapp: weapp.<instance-base-domain>

tls:
  mode: shared-existing
  cert_hosts:
    - <instance-base-domain>
    - '*.<instance-base-domain>'

ingress:
  mode: subdomain
  provider: existing-proxy

network:
  mode: shared-existing
  name: <shared-docker-network>

postgres:
  mode: shared-existing
  container_name: <postgres-container-name>
  database: <instance-postgres-database>
  username: <instance-postgres-username>

redis:
  mode: shared-existing
  container_name: <redis-container-name>
  db: <instance-redis-db>
  key_prefix: <instance-redis-key-prefix>

runner:
  enabled: true
  mode: same-host-container
  scope: repo-only

paths:
  root: <instance-root-path>
  runtime_dir: <instance-runtime-dir>
  infra_dir: <instance-infra-dir>
  ops_dir: <instance-ops-dir>
  env_dir: <instance-env-dir>
  data_dir: <instance-data-dir>
```

## 5. 当前部署形态的容器角色

若按当前服务器方案推进，首发容器角色建议固定为：

- `proxy`
- `backend`
- `admin`
- `app`
- `weapp`
- `postgres`
- `redis`
- `runner`

但它们不应全塞进一个大 compose，而应按职责拆分：

### 5.1 runtime 组

- `proxy`
- `backend`
- `admin`
- `app`
- `weapp`

### 5.2 infra 组

- `postgres`
- `redis`

### 5.3 ops 组

- `runner`

这样可以保证：

- 业务发布不会误动数据库和 runner
- runner 升级不会影响线上应用
- infra 组件的备份与恢复边界清晰

## 6. secrets 命名规则

为了让脚本无需人工映射，建议 GitHub Environment secret 命名规则固定为：

- `DEPLOY_SSH_HOST`
- `DEPLOY_SSH_USER`
- `DEPLOY_SSH_PRIVATE_KEY`
- `DEPLOY_POSTGRES_PASSWORD`
- `DEPLOY_REDIS_PASSWORD`
- `DEPLOY_JWT_ACCESS_SECRET`
- `DEPLOY_JWT_REFRESH_SECRET`
- `DEPLOY_GHCR_USERNAME`
- `DEPLOY_GHCR_TOKEN`

如后续需要更多项，也应继续走统一前缀命名，而不是每个实例自造一套 key 名。

## 7. 渲染产物

`rtnn-deploy` 的脚本应消费：

- 私有实例目录中的 `.rtnn/project.yaml`
- 私有实例目录中的 `.rtnn/server-profile.yaml`
- GitHub Environment secrets

然后生成中间产物，例如：

- `generated/<env>/runtime.env`
- `generated/<env>/compose.runtime.yml`
- `generated/<env>/compose.infra.yml`
- `generated/<env>/compose.ops.yml`
- `generated/<env>/nginx.rtnn.conf`

这些产物：

- 由脚本生成
- 不提交到 git
- 作为 deploy / rollback 的直接输入

## 8. `server/` 现状目录的定位

当前本地 `server/README.md` 描述的是现有服务器运行现状，可以继续作为迁移和抽象时的参考材料。

但正式长期边界应改为：

- `server/README.md`：历史现状与人工排障参考
- 私有实例目录中的 `.rtnn/server-profile.yaml`：实例级服务器契约事实源
- `rtnn-deploy` 渲染器：部署生成与发布执行事实源

## 9. 验收标准

当服务器契约模型落地后，应达到以下标准：

1. 服务器如何接入 `rtnn` 不再依赖口头约定。
2. 开源仓库不存真实敏感值。
3. `rtnn-deploy` 可以只靠契约文件和 secrets 渲染出部署产物。
4. 现有服务器上的 PG/Redis/Nginx 复用策略有稳定配置来源。
5. 未来若迁到新主机，只需更新实例契约与 secrets，不重写部署逻辑。
