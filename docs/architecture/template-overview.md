# 模板总体架构

本文档给出当前模板工程的总体轮廓。

## 当前主线

- `backend` 是唯一后端契约源
- `admin / app / weapp` 是正式消费端骨架
- 模板交付基线包含契约导出、测试、镜像构建与 smoke
- 正式发布链路统一走 GHCR + 独立部署仓库
- 环境模型固定为 `testing + production`
- 环境所有权固定属于业务源码仓，而不是 `rtnn`
- `rtnn` 只定义模板边界、通用 workflow 与部署契约，不直接承载业务环境发布权

## 三仓模型

- `rtnn`
  - 上游模板源码仓
- 业务源码仓，例如 `rtnn-demo`
  - 拥有 `testing / production` 主线
- `rtnn-deploy`
  - 部署执行仓

## 相关文档

- [业务源码仓模型](./template-business-repository-model.md)
- [部署边界](./template-deployment-boundary.md)
- [部署契约](./template-deployment-contract.md)
- [仓库拓扑](./template-repository-topology.md)
