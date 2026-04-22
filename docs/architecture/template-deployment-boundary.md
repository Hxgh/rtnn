# 模板部署边界

本文档定义上游模板仓、业务源码仓与独立部署仓之间的职责切分，避免把“模板能力”“业务环境所有权”“部署执行”混在一起。

## 三方职责

- `rtnn`
  - 负责模板代码、契约、初始化、发布候选校验与通用 workflow
- 业务源码仓
  - 负责当前项目的 `testing / production` 发布主线
- `rtnn-deploy`
  - 负责环境编排、版本提升、回滚与 smoke

## 模板仓负责什么

`rtnn` 正式负责：

- `backend / admin / app / weapp` 模板源码
- 接口、权限、OpenAPI、shared contract 与 SDK 事实源
- 镜像构建与推送规则
- 可复用的业务仓 dispatch workflow 模板

`rtnn` 不负责：

- 某个业务项目的发布决策
- `testing / production` 环境编排文件
- 真实域名、TLS、Ingress、数据库密码和服务器目录

## 业务源码仓负责什么

业务源码仓负责：

- 当前项目的完整源码
- 与 `rtnn` 的同步和本项目增量实现
- 当前项目的 `testing / production` 触发权
- 当前项目的非敏感环境映射，例如 `.rtnn/project.json`

## 部署仓负责什么

`rtnn-deploy` 负责：

- 消费业务源码仓发来的镜像版本与 deploy payload
- 执行 migrate、promote、rollback、smoke
- 注入运行时 env、维护 compose / reverse proxy / release state

`rtnn-deploy` 不负责：

- 成为业务项目的源码事实源
- 决定哪个版本应该进入 `production`
- 重新定义 runtime env key 或健康检查契约

## 协作顺序

1. 上游模板能力回流到 `rtnn`
2. 业务源码仓同步 `rtnn` 并通过正式 gate
3. 业务源码仓构建并推送 `backend / admin / app / weapp(H5)` 镜像到 GHCR
4. 业务源码仓 `main` 通过 dispatch 把 testing 版本交给部署仓库
5. 业务源码仓手动发起 production promote，由部署仓执行发布
