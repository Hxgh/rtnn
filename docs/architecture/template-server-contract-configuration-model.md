# 模板服务器契约与配置分层模型

本文档定义当前三仓模型下，服务器契约、环境映射与配置分层应该如何归位。

## 四层分工

- 上游模板仓 `rtnn`
  - 定义代码结构、契约和通用 workflow
- 业务源码仓
  - 承接项目源码与非敏感环境映射
- 部署引擎 `rtnn-deploy`
  - 渲染 runtime env、执行 deploy / rollback / smoke
- 真实运行环境
  - 服务器、Docker、数据库、Redis、证书和受限 secrets

## 非敏感机器配置入口

来自业务源码仓：

- `.rtnn/project.json`

这份文件负责：

- repo 身份
- 上游模板 repo
- deploy repo
- `testing / production` 域名
- 服务器运行根目录
- compose project 名
- 当前 live state

## 真实敏感值归属

以下内容不进入公开源码仓：

- 数据库密码
- JWT secrets
- deploy dispatch token
- 服务器 SSH 凭据

它们应进入：

- GitHub Environment secrets
- 服务器本地受限 env 文件

## 部署仓消费方式

部署仓通过两层信息工作：

1. 业务源码仓提供的非敏感事实
2. deploy repo 环境 secret 注入的真实 runtime env

这样可以保证：

- 公开仓不泄露 secrets
- 配置归属清晰
- AI 与维护者有稳定的单一入口
