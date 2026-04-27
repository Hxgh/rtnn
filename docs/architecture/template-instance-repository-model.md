# 旧实例目录模型已下线

旧的“私有实例目录 + 薄实例资产刷新”模型已经停止作为当前主线。

当前正式模型改为：

- `rtnn`
  - 上游模板源码仓
- 派生后的业务源码仓
- 独立部署执行仓
  - 可采用 `rtnn-deploy` 这类实现

请改读：

- [业务源码仓模型](./template-business-repository-model.md)
- [仓库关系与触发拓扑](./template-repository-topology.md)
