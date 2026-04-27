# 模板中立性边界

本文档定义 `rtnn` 作为上游模板源码仓时必须保持的中立边界，避免把某个业务项目或某台服务器的事实反向固化进模板。

## 模板仓可以保留什么

- 通用源码、契约、权限、OpenAPI、SDK 与自动化测试。
- 可复用的业务仓 release / promote workflow。
- 通过 `.rtnn/project.json` 读取业务仓事实的通用脚本。
- 可替换的 env key、镜像命名规则、dispatch payload 结构和运行事实同步脚本。
- 用占位值说明业务仓、部署仓、域名和服务器如何接入。

## 模板仓不能保留什么

- 具体业务仓名称、真实 GitHub owner、真实 GHCR owner。
- 真实公网域名、服务器路径、数据库连接串、token、secret。
- 某个业务项目的 `testing / production` live state。
- 让新业务项目必须使用固定部署仓名称、固定域名结构或固定服务器目录的规则。

## 业务仓负责什么

派生后的业务源码仓负责维护自己的非敏感事实：

- `project.repo`
- `deployment.repo`
- `deployment.imageNamePrefix`
- `deployment.dispatchEventType`
- `domains.testing / domains.production`
- `server`
- `liveState`

这些事实集中放在业务仓 `.rtnn/project.json`，不回写到模板仓。

## 部署执行仓负责什么

独立部署执行仓只消费业务仓的发布 payload 和运行时 secrets，负责 deploy / rollback / smoke / runtime facts。它可以复用模板定义的契约，但不能成为 API、权限、镜像规则或发布决策的事实源。

## 自动化校验

模板仓通过以下命令检查是否引入了业务事实污染：

```bash
pnpm run check:template-neutrality
```

该检查会扫描模板源码中的具体业务仓名、真实域名、具体 GHCR owner 和服务器路径。派生后的业务仓因为拥有自己的 `.rtnn/project.json`，不会把自身业务事实误判为模板污染。
