---
name: admin-shadcn-workflow
description: 基于 shadcn/ui 官方 skill 的项目 wrapper。仅用于 rtnn 的 apps/admin UI 任务，处理 components.json、registry、官方 block/组件接入与后台业务封装。先遵循官方 shadcn workflow，再应用本仓库的 admin 专属边界与 Tailwind CSS v4 约束。
metadata:
  author: Hxgh
  version: "2.0.0"
  upstream: https://skills.sh/shadcn/ui/shadcn
  upstream-source: https://github.com/shadcn-ui/ui/tree/main/skills/shadcn
  wrapper: project-local
---

# Admin Shadcn Workflow

> 本文件不是上游 `shadcn` skill 的镜像，而是 `rtnn` 的项目 wrapper。
>
> `search` / `docs` / `view` / `add` / `--dry-run` / `--diff` / registry / preset 等通用规则，以上游官方 skill 为准；本文件只补充 `rtnn` 的启用边界、目录约束与后台 UI 落地顺序。

## 规则来源

- 官方规则：`metadata.upstream` / `metadata.upstream-source` 指向的 `shadcn` 官方 skill。凡属于 CLI 工作流、组件组合、样式约定、registry 与 preset 的通用规则，默认以上游为准。
- 本地规则：本文件中的“何时启用”“本项目附加约束”“本项目工作流”“与其他 Skills 的协同顺序”。这些内容是为 `rtnn` 编排的 wrapper，不是 shadcn 官方通用规则。

## 何时启用

满足任一条件即启用：

- `apps/admin` 中存在后台 UI 组件新增、替换、重构需求
- 任务涉及 `apps/admin/components.json`、registry、官方 block/组件接入、后台业务封装
- 需要在 `apps/admin/src/components/ui` 基础组件之上构建后台壳层、表格、表单、弹窗、toolbar 等后台组件

以下情况默认不启用：

- `backend/` 任务
- `apps/app` 任务；即使 `apps/app/components.json` 存在，也不视为默认启用许可
- 纯业务逻辑、契约、SDK、工具脚本改动

## 官方规则（引用上游，不在此重复）

1. 组件生命周期规则以上游为准：先 `search` / `docs` / `view`，再 `add` / `update`。
2. 组件更新规则以上游为准：更新已有组件前，先看 `--dry-run` / `--diff`，不要直接覆盖本地改动。
3. 组件组合与样式规则以上游为准：优先官方组件、官方 block、官方组合方式、语义 token、内置 variant、`gap-*`、`size-*`、`sonner`。
4. 如果本地 wrapper 与上游通用规则冲突，先检查是否属于项目特定边界；若不是项目边界问题，以上游规则为准。

## 本项目附加约束

1. 本 skill 只服务 `apps/admin`，不解释到 `apps/app`、`weapp`、`backend`。
2. 后台 UI 实现优先级固定为：`shadcn/ui` 官方组件 / 官方 block / 官方组合方式 > 基于 `shadcn/ui` 的 Tailwind CSS 补充 > 其他方式。
3. shadcn 原子组件统一收敛在 `apps/admin/src/components/ui`；后台业务组件收敛在 `apps/admin/src/components/admin/*`。
4. `apps/admin/components.json` 当前以 `app/globals.css`、`@/src/components`、`@/src/lib/utils` 为准；不要私自引入第二套基础组件目录或路径约定。
5. 样式栈固定为 `Tailwind CSS v4 + CSS Variables`，后台密度、表格、表单、dialog、sidebar 优先贴近官方后台模式。
6. 只做需求范围内增量落地，禁止把整个后台 UI 做无边界统一重写。
7. `apps/app` 当前不默认使用 `shadcn/ui`；不要因为目录里存在配置文件就跨端扩散后台方案。

## 本项目工作流

1. 先确认任务是否属于 `apps/admin` 后台 UI 场景；若不是，停止使用本 skill。
2. 再走上游官方工作流：`docs` / `search` / `view` / `add` / `--dry-run` / `--diff`。
3. 检查 `apps/admin/src/components/ui` 与现有后台组件是否已可复用；缺失时再在 `apps/admin` 目录内引入。
4. 引入基础组件后，在 `apps/admin/src/components/admin/*` 做后台语义化封装；不要在页面里散落大段基础组件拼装。
5. 优先对齐后台壳层、表格管理页、toolbar、dialog、empty state 的官方结构与信息密度，不并行维护第二套后台设计语言。
6. 最后验证与 `admin` 路由、壳层、主题、多语言和权限流程共存。

## 与其他 Skills 的协同顺序

1. `vercel-composition-patterns`：设计后台业务组件 API 与组合边界。
2. `vercel-react-best-practices`：处理性能与数据流。
3. `web-design-guidelines`：仅在明确要求 UI / a11y 评审时启用。
