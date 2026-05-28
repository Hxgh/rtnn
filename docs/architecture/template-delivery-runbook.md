# 模板交付执行手册

本文档用于串起上游模板仓、业务源码仓与部署仓库的实际交付步骤。

## 推荐顺序

1. 在 `rtnn` 完成能力收敛与回归
2. 在业务源码仓同步 `rtnn` 并完成项目级身份改写
3. 在业务源码仓补齐 `.rtnn/project.json` 的真实仓库、部署仓、域名与环境映射
4. 在独立部署执行仓准备 runtime env 与 environment secrets
5. 走通 `testing` 自动发布
6. 再走通 `production` 手动 promote

## 最小检查项

- `template:init` 能完成项目身份改写
- `check:release-candidate` 通过
- 业务源码仓 `main` 能自动触发 testing
- 业务源码仓 `promote-production` 能触发 production
- 部署仓 smoke 可验证 `backend / admin / app / weapp`

## 契约与客户端发布检查

当交付改动触碰 backend API、权限、SDK、client release facts、下载策略或
Release Center，必须先在源码仓完成：

```bash
pnpm run contracts:permissions
pnpm run contracts:sync
pnpm run check:contracts
pnpm --filter backend test --runInBand
pnpm --filter @rtnn/api-sdk build
```

`CLIENT_RELEASE_FACTS_TOKEN` 属于部署 secret。部署仓只传递和校验 token，
不得把 token、数据库连接串、签名密钥或商店凭据写入运行事实报告。
