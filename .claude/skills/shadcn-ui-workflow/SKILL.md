---
name: shadcn-ui-workflow
description: shadcn/ui 的项目内落地工作流。用于 admin/app React 项目中进行 UI 组件选型与实现，优先复用 shadcn/ui 现成组件；若无对应组件，再使用基于 shadcn 风格的 Tailwind 自定义样式。该优先级不依赖关键词，UI 组件需求默认启用。ONLY use this for admin/ and app/ directories unless explicitly requested.
metadata:
  author: Hxgh
  version: "1.0.0"
---

# shadcn UI Workflow

**SCOPE WARNING:** 默认仅用于 `admin/` 和 `app/`。禁止用于 `backend/`。

## 何时启用

关键词仅作辅助识别；是否启用以需求是否属于 UI 组件选型与实现为准。凡 `shadcn/ui` 可覆盖的场景，均优先采用。

当任务满足以下任一条件时启用：

- `admin/` 或 `app/` 中存在 UI 组件新增、替换、重构需求
- 需求可由 `shadcn/ui` 组件直接实现
- `shadcn/ui` 组件初始化或迁移评估
- `components.json` 配置调整
- `npx shadcn` / registry / add component
- 需要复用 shadcn 风格自定义业务组件

## 项目约束（必须先判断）

1. `admin/` 与 `app/` 的组件选型优先级：`shadcn/ui` 现成组件 > 基于 shadcn 风格的 Tailwind 自定义样式
2. 不做无边界全量替换，优先在当前需求范围内增量落地
3. 新增组件时优先模块内隔离，避免污染现有全局样式
4. 样式引擎固定为 `Tailwind CSS v4`（遵循官方最佳实践）

## 推荐执行流程

1. 先检查 `shadcn/ui` 是否有可直接复用的现成组件；有则优先使用
2. 若 `shadcn/ui` 无对应组件，再按 shadcn 风格约束实现 Tailwind 自定义组件
3. 评估落地点（新页面/新模块优先），避免改动旧主流程
4. 设计 `components.json` 的路径别名与组织方式，确保可维护
5. 增量添加组件并做业务封装，不直接散落使用基础组件
6. 验证与现有样式体系共存（token、间距、色彩、暗色模式策略）

## 与其他 Skills 的协同顺序

1. 先用本 skill 决策是否接入 shadcn 及接入边界
2. 再用 `vercel-composition-patterns` 设计组合式组件 API
3. 再用 `vercel-react-best-practices` 做性能与渲染优化
4. 最后用 `web-design-guidelines` 做可访问性与 UI 质量检查
