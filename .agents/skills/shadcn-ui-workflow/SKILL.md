---
name: shadcn-ui-workflow
description: shadcn/ui 的项目内落地工作流。用于 admin React 项目中评估与接入 shadcn、维护 components.json、按需添加组件并控制与现有 UI 栈的边界。仅在明确提及 shadcn/ui、components.json、registry 或 npx shadcn 时触发。ONLY use this for admin/ directory unless explicitly requested.
metadata:
  author: jisen
  version: "1.0.0"
---

# shadcn UI Workflow

**SCOPE WARNING:** 默认仅用于 `admin/`。禁止用于 `backend/`。`express/` 为 Vue 项目，默认不适用。

## 何时启用

当任务明确涉及以下内容时启用：

- `shadcn/ui` 组件初始化或迁移评估
- `components.json` 配置调整
- `npx shadcn` / registry / add component
- 需要复用 shadcn 风格自定义业务组件

## 项目约束（必须先判断）

1. `admin/` 当前默认 UI 主栈为 Ant Design，不做全量替换
2. shadcn 仅用于明确需求或新模块试点
3. 新增 shadcn 组件时，优先模块内隔离，避免污染现有全局样式

## 推荐执行流程

1. 确认任务是否真的需要 shadcn，而非 Antd 即可满足
2. 评估落地点（新页面/新模块优先），避免改动旧主流程
3. 设计 `components.json` 的路径别名与组织方式，确保可维护
4. 增量添加组件并做业务封装，不直接散落使用基础组件
5. 验证与现有样式体系共存（token、间距、色彩、暗色模式策略）

## 与其他 Skills 的协同顺序

1. 先用本 skill 决策是否接入 shadcn 及接入边界
2. 再用 `vercel-composition-patterns` 设计组合式组件 API
3. 再用 `vercel-react-best-practices` 做性能与渲染优化
4. 最后用 `web-design-guidelines` 做可访问性与 UI 质量检查
