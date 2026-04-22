# 业务源码仓模型

当前模板进入真实交付阶段后的正式模型固定为三仓：

1. `rtnn`
   - 上游模板源码仓
   - 负责模板代码、后端契约、通用 workflow、模板规则和可回流能力
2. 业务源码仓，例如 `rtnn-demo`
   - 持有完整业务源码
   - 拥有 `testing / production` 的构建、发版、验收主线
   - 通过 upstream remote 或定期 merge 同步 `rtnn`
3. `rtnn-deploy`
   - 部署执行仓
   - 只负责 deploy / rollback / smoke / runtime env 注入

## 为什么不再使用薄实例目录

旧的“私有实例目录 + 模板托管资产刷新”模型已经下线，原因很直接：

- 它无法真实承接模板源码，最终还是会回到手工复制和口头约定
- 它把业务环境归属描述错了，容易让人误以为 `rtnn` 直接拥有 `testing / production`
- 它会在模板仓、实例仓、部署仓之间制造重复入口和多套事实源

模板首发之后，业务项目就应该是完整源码仓，而不是只存少量映射文件的壳仓。

## 正式发布所有权

发布所有权固定如下：

- `testing` 属于业务源码仓
- `production` 也属于业务源码仓
- `rtnn` 默认不直接拥有任何业务环境发布权
- `rtnn-deploy` 只执行业务仓已经明确发起的部署动作

对应触发口径：

- 业务仓 `main` push
  - 构建 `main-<sha12>` 镜像
  - 自动 dispatch 到 `rtnn-deploy/testing`
- 业务仓 `v*` tag
  - 只产出 production 候选镜像
- 业务仓手动执行 `promote-production`
  - dispatch 到 `rtnn-deploy/production`

## 业务仓与模板仓同步

业务仓与模板仓的关系固定为：

- 功能和通用工程能力优先进入 `rtnn`
- 业务仓通过 upstream merge 或受控 cherry-pick 同步 `rtnn`
- 业务仓自己的环境配置、域名、服务器映射、当前线上版本等事实，集中维护在业务仓自己的 `.rtnn/project.json`

## 机器配置唯一入口

业务仓当前推荐固定一份非敏感事实文件：

- `.rtnn/project.json`

它至少负责：

- 当前 repo 身份
- 仓库角色，例如 `business-source`
- 上游模板 repo
- 部署 repo
- `testing / production` 域名
- 服务器运行根目录与 compose project 名
- 当前线上版本快照

真实 secrets 不进入业务仓，继续留在 GitHub Environment secrets 或服务器受限 env 文件中。
