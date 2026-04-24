# 模板部署仓库首发方案

`rtnn-deploy` 的定位固定为部署执行仓，而不是业务项目的发布决策仓。

## 目标

1. 接收业务源码仓已通过 gate 的镜像版本
2. 管理 `testing / production` 两套远程环境
3. 负责 promote / rollback / smoke / release state
4. 默认建议私有；若未来需要开源，必须先完成脱敏且不承载真实 secrets、服务器事实和业务维护备忘

## 环境模型

- `testing`
  - 由业务源码仓 `main` 自动 dispatch
- `production`
  - 由业务源码仓显式 promote 后 dispatch

部署仓不拥有环境所有权，只拥有环境执行权。

## 最小仓库内容

- `compose/`
  - base / testing / production 编排
- `env/`
  - example 与 runtime 输出目录
- `scripts/release/`
  - promote / rollback
- `scripts/ops/`
  - render env / migrate / smoke / print release state
- `.github/workflows/`
  - deploy / rollback workflow

## 与业务源码仓的协作方式

1. 业务源码仓通过正式 gate
2. 业务源码仓构建并推送镜像
3. 若是 `main` push，则自动 dispatch 到 `rtnn-deploy/testing`
4. 若是 `v*` tag，则只产出 production 候选镜像
5. 业务源码仓手动 promote production，部署仓执行 `deploy-production`

## 验收标准

- `testing` 自动发布链路清晰且可验证
- `production` 发布决策明确留在业务源码仓
- deploy repo 默认按私有仓维护，公开前必须完成脱敏审查
- deploy repo 不泄露真实 runtime env
- deploy repo 不重新定义模板运行时契约
