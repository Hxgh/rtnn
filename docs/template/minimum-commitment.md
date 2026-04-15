# 模板最小承诺

这份清单描述模板正式承诺什么，以及明确不承诺什么。

## 正式承诺

- `backend` 是唯一后端契约源，负责接口、权限、OpenAPI、shared-types、shared-schemas 和 SDK
- `admin`、`app`、`weapp` 是正式消费端骨架，不维护平行接口定义
- 根级 `.env` 是模板初始化参数唯一来源，各端运行时环境由脚本按目标派生
- 仓库保留 AI 协作元数据，包括 rules、skills、MCP 配置和 agent 入口
- 模板有可重复执行的初始化校验、发布基线校验和消费端烟测入口

## 明确不承诺

- 示例模块、占位页、假入口、平行契约、mock 主线
- 端内散落 env 文件和多套根级 env 体系
- 仓库级 lockfile 提交策略
- 没有明确消费面的展示型功能
- 未定义边界的“顺手扩展”

## 派生后第一时间应该改什么

- 修改 `/.env` 中的模板身份参数，例如 `TEMPLATE_PROJECT_ID`、`TEMPLATE_BRAND_NAME`
- 替换默认管理员和客户账号密码
- 替换 JWT secrets 和其他安全参数
- 如需更严格依赖确定性，在自己的派生仓库恢复 lockfile 策略
- 如需变更 package scope 或源码身份，再执行 `template:rewrite-source`
