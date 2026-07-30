本文件用于定义 AI agent 在本仓库中的工作方式、职责边界与工程规则。

# 基本

请用中文与我交流

# 项目概述

- **backend**: NestJS 后端 API (端口 5100)
- **admin**: NextJS 后台前端 (端口 5101)
- **app**: NextJS 移动端前台 (端口 5102)

## Skills 维护规则

- 唯一维护路径：`.agents/skills/`
- Claude 入口路径：`.claude/skills/`（仅用于软链接，不直接编辑）
- 新增或修改 Skill：只改 `.agents/skills/`，并保持 `.claude/skills` 指向 `.agents/skills/`

## 前端样式栈基线

- `admin` 使用 `Tailwind CSS v4 + shadcn/ui + CSS Variables`
- `app` 使用 `Tailwind CSS v4 + CSS Variables`，暂不使用 `shadcn/ui`
- `admin` 的 UI 实现优先级固定为：`shadcn/ui` 官方组件 / 官方 block / 官方组合方式 > 基于 `shadcn/ui` 的 Tailwind CSS 补充 > 其他方式
- `admin` 只要 `shadcn/ui` 官方做法可覆盖，就优先复用；Tailwind CSS 是补充层，不与其平级竞争
- 模板工程的多语言基线默认支持：`zh-CN`、`en-US`

## 模板工程收敛规则

- `rtnn` 是标准化模板工程，不是演示型 demo 仓库
- 默认做减法：没有明确设计、明确需求、明确职责的页面/路由/模块，不要创建
- 禁止为了“展示模板能力”额外添加无业务承接的示例页、占位页、装饰性页面、假入口、假导航
- 禁止默认加入 mock 登录、mock 权限、mock 会话、fallback demo 数据；若确有研发调试需求，必须由明确需求驱动，并与正式链路严格隔离
- 未开发完成的功能，不要先放半成品页面、占位卡片、占位菜单、占位按钮；未准备交付则宁可不出现
- 用户可见文案默认只描述当前真实能力，不写“模板演示”“示例模块”“后续这里会接入”这类无实际价值的话术
- 新增页面前先判断是否属于模板首发必需骨架；若不是必需骨架，则需要先有设计或需求再落地
- 新增导航项、dashboard 卡片、快捷入口、空态引导前，必须确认其背后有真实可访问页面或真实可执行动作
- 若某能力当前仅保留为后端契约、SDK 能力或后续扩展点，可以只保留代码层能力，不自动生成前端页面和菜单
- 模板工程优先保留“登录、权限、布局、基础管理、设置、个人中心”等标准基建，不主动扩展无必要的业务示例内容

## 部署事实规则

- 业务源码仓的 `.rtnn/project.json liveState` 应由部署仓运行事实报告校验或写回，不在 README、对话记录或临时文档中维护平行版本事实
- 运行事实报告只允许输出版本、镜像、URL、探活状态等非敏感信息，不输出 secrets、数据库连接串、token 或服务器凭据
- 本地 Docker 默认视为受保护资源；非必要不要调用本机 Docker / docker compose，确需使用前必须先说明目的、命令范围与风险，并取得确认

## 规则抽象层级

- 项目规则默认只定义边界、职责、约束、优先级与唯一来源，不承担阶段性页面编排或临时实现说明
- 规则默认写“什么可以做 / 什么不可以做 / 以什么为准”，少写“当前这一版具体有哪些页面、组件、模块”
- 具体页面方案、阶段性路由组织、临时实现细节、联调说明优先放在 README、设计文档或任务文档，不上升为长期规则
- 只有当某个文件、组件或脚本承担“唯一入口”“唯一来源”“唯一通用容器”职责时，才应在规则中点名

# 开发规则

涉及 Backend/admin/app 共享的类型、常量、权限改动时，遵循下文《类型同步机制》的执行细则。

## 多语言基线规则

- `packages/config` 是 locale / theme / 偏好 cookie key 的唯一基础来源
- `admin`、`app` 不重复维护支持语言集合、默认语言、主题模式常量
- `admin`、`app` 的服务端入口默认都要做请求级偏好解析：
  - 先读本端 locale cookie
  - 再回退 `Accept-Language`
  - 最后回退默认语言
- `admin`、`app` 的用户可见文案默认进入各自 dictionary/messages，不在页面和业务组件内散落硬编码文案
- `admin`、`app` 在服务端请求 backend 时，默认透传当前 locale 到 backend
- `backend` 至少具备请求级 locale 识别能力，并输出 `Content-Language`
- `backend` 的通用错误响应允许保留稳定错误码，但返回给前端的 message 应具备 locale 感知能力
- 模板工程后续新增端（如 `weapp`）时，沿用同一套 locale 常量、cookie/存储 key 命名和回退策略

## 品牌、客户端命名与图标规则

- 用户可见主品牌、客户端展示名、安装名与图标文字统一来自 `packages/config`，默认主品牌为 `RTNN`
- 端类型只作为上下文标签，例如 `移动端`、`管理端`、`Android`、`macOS`；不要把端类型散落硬拼进主品牌文案
- 内部 client key 必须保持稳定，例如 `appMobile`、`adminDesktop`；不得用展示名称替代内部 key
- 图标只维护一个品牌源；Web brand mark、favicon、Tauri icon、Android launcher icon 必须通过 `scripts/client/sync-client-branding.mjs` 同步生成
- 禁止在 `app`、`admin`、`clients`、脚本中手写分散的品牌名、安装名、图标 SVG 或默认框架图标
- 更新品牌、名称或图标时，必须先改统一配置，再运行客户端品牌同步脚本和客户端检查脚本，确保各端一次性一致

## 前端 Skills 编排（统一入口）

前端任务按需使用以下 skill 组合：

1. `admin-shadcn-workflow`（统一 admin 后台 UI 体系与落地约束，仅用于后台 UI 组件任务）
2. `vercel-composition-patterns`（React 组件架构与组合模式，仅用于相关架构场景）
3. `vercel-react-best-practices`（React 性能与数据获取）
4. `web-design-guidelines`（UI/可访问性审查，仅在评审类任务启用）

### 目录范围与互斥

- `backend/` 禁止套用前端 skill
- `admin-shadcn-workflow` 仅适用于 `admin/`，涉及后台 UI 组件选型与实现时默认启用
- `admin` 与 `app` 的 UI 落地规则分开定义：后台看《Admin 前端规则》，移动端前台看《App 前端规则》

### 协同顺序（按需）

1. 先做组件选型与 UI 设计（`admin-shadcn-workflow`）
2. 再做组件分层与 API 设计（`vercel-composition-patterns`）
3. 再做性能优化（`vercel-react-best-practices`）
4. 最后做 UI/可访问性检查（`web-design-guidelines`）

### 启用判定原则

- 是否启用以需求类型判定：凡属于 `admin` UI 组件选型与实现任务，默认进入 `admin-shadcn-workflow`
- `shadcn/ui` 当前是 `admin` 专属，不默认用于 `app`
- 关键词仅用于辅助识别，不是触发前提：`shadcn`、`ui.shadcn.com`、`components.json`、`npx shadcn`、`registry`

### 前端技能路由补充

- 涉及 `admin` UI 组件开发或改造时，默认先检查并优先复用 `shadcn/ui` 官方组件或官方 block
- 涉及 `app` UI 组件开发或改造时，默认使用移动端前台方案与 Tailwind CSS，不引入 `shadcn/ui`
- React/Next 常规开发默认使用 `vercel-react-best-practices`（组件、页面、数据获取、性能优化）
- 仅当涉及组件架构设计、可复用组件 API、compound components、context/provider、boolean props 泛滥治理时，启用 `vercel-composition-patterns`
- 仅当用户要求 UI 评审、可访问性审查、UX 审计时，追加 `web-design-guidelines`
- 当前仓库无 React Native / Expo 工程，默认不启用 `vercel-react-native-skills`

## Admin 前端规则（仅适用于 `admin/`）

- 以下规则只作用于 `admin/`，不作用于 `app/`、`weapp/`、`backend/`
- `admin` 的 UI 实现优先级固定为：`shadcn/ui` 官方组件 / 官方 block / 官方组合方式 > 基于 `shadcn/ui` 的 Tailwind CSS 补充 > 其他方式
- `admin` 的表格、表单、toolbar、dialog、sidebar、empty state 默认对齐 `shadcn/ui` 官方后台块的结构、密度和交互
- `admin` 非必要不使用 CSS Modules、额外组件库、额外样式体系或脱离 `shadcn/ui` 语义的自定义大壳层
- `admin` 专用组件目录为 `admin/src/components/admin/*`
- `admin` 后台壳层组件统一收敛在 `admin/src/components/admin/shell/*`
- 非 `admin/` 端禁止复用后台专用组件、后台专用布局词汇、后台专用页面骨架
- `app/` 不继承后台的 sidebar、topbar、dashboard、table-page 规则；`app/` 若有列表页，按前台信息架构单独设计
- 任何“管理后台”“权限矩阵”“审计日志”“表格管理页”“后台工具栏”类规则，默认都只解释到 `admin/`

### Admin 壳层规则

- `admin` 使用 `Next.js App Router`
- `admin` 路由、菜单、面包屑、重定向的统一来源为 `admin/src/lib/admin-routes.ts`
- `admin` 后续新增后台页面时，优先补充 `admin-routes.ts`，再接入 sidebar、breadcrumb、页面跳转；不要直接在多个文件散落硬编码路由字符串
- `admin` 的后台壳层统一基于 `shadcn/ui` 官方 Sidebar 模式，不并行维护第二套后台壳层、折叠逻辑或内容区偏移方案
- `admin` 的用户入口、导航入口、工具入口各自保持单一位置，不在侧栏、顶部栏、页面内容区重复出现平行入口
- `admin/app/layout.tsx` 与各路由段 `layout.tsx` 默认保持为 Server Component，除非必须使用浏览器交互能力
- `admin` 默认采用 server-first 组织方式：
  - 布局、路由段、数据入口优先服务端
  - 仅把主题切换、菜单交互、下拉菜单、弹窗等交互密集区域下沉为 Client Component
- `admin` 侧栏、顶部工具区、内容区容器应保持统一布局与统一滚动策略，不在页面内临时拼装平行壳层
- `admin` 顶部栏中的 breadcrumb、主题、多语言、用户工具等区域必须与 `shadcn/ui` 体系一致
- `admin` 不要为了局部页面方便，把整页或整段后台壳层提升为 `"use client"`
- `admin` 的暗色与亮色主题基于全局 tokens 与 CSS Variables 管理，不在页面内临时写死颜色
- `admin` 后台导航、页头、内容容器、表格容器、表单容器的排布优先复用官方模式或其轻量封装，不保留历史手搓壳层作为并行方案
- `admin` 不保留与顶部工具栏重复的设置页；例如主题/语言若已在顶部工具栏稳定提供，则不额外保留仅用于重复展示的独立页面
- `admin` 页面内容优先展示“当前阶段真实可操作信息”，不要把权限明细、偏好摘要、模板说明等无必要信息堆在页面里凑内容
- `admin` 页面标题下的说明文案、卡片描述、空态引导默认做减法；如果文案不承载真实状态、真实约束或真实操作结果，就不要出现
- `admin` 后台导航只保留当前阶段真实可操作的核心管理面，不为未落地能力预留菜单、页面或只读展示页
- `admin` 权限查看与维护优先收敛到现有管理流程中，不默认拆出独立只读页或矩阵页
- `admin` 对真实关联数据的维护优先使用“可选数据源 + 明确选择控件”方案；不要把 `roleIds`、`permissionKeys`、实体 ID 列表直接暴露成逗号输入框
- `admin` 详情页与编辑页可以保留用于标识当前实体的副标题（如邮箱、角色名），但列表页、设置页、个人页默认不写泛化副标题

### Admin 表格管理页规则

- `admin` 凡是表格型管理页，统一优先复用 `admin/src/components/admin/table-page.tsx`
- `admin/src/components/admin/table-page.tsx` 是后台表格管理页唯一通用入口，后续同类页面默认从这里扩展
- 以下“列表页新增/编辑弹窗”规则只适用于 `admin` 后台管理场景，不解释到 `app/`、`weapp/` 或其他前台端
- `admin` 的表格管理页原则上在列表上下文内完成新增、编辑和轻量配置；只有多步骤或高密度场景才拆到独立页面
- `admin` 列表页中的新增、编辑、配置入口应保持单一路径，不并行维护弹窗与跳转两套入口
- 表格管理页中的页面框架、表格容器、空态、行操作样式必须走共享组件，不要在页面里重复手写一套 `PageFrame + DataPanel + Table`
- `admin` 的表格、筛选栏、行操作、弹窗表单默认采用 `shadcn/ui` 官方后台块常见的紧凑密度，不做为“模板感”而放大控件、留白和标题区
- 页面本身只负责：权限校验、数据获取、列定义、业务表单/过滤器插槽，不负责重复维护通用表格壳层
- 若页面是详情页、表单页、设置页，不强行套用 `table-page.tsx`；`table-page.tsx` 只服务“列表/管理/表格”场景
- 若未来 `app/` 或其他端需要列表容器，应在各自目录单独抽象，不得直接拿 `admin` 的表格页组件跨端复用

## App 前端规则（仅适用于 `app/`）

- 以下规则只作用于 `app/`，不作用于 `admin/`、`weapp/`、`backend/`
- `app` 是移动端前台，不是后台；页面目标、信息架构、交互密度、文案语气都按移动端用户场景设计
- `app` 不继承 `admin` 的 sidebar、topbar、dashboard、table-page、后台工具栏、权限矩阵、审计日志等后台规则
- `app` 当前不使用 `shadcn/ui`；移动端页面默认使用 Tailwind CSS、项目自身 tokens 与前台组件抽象实现
- `app` 默认优先考虑单手操作、触控命中、滚动连续性、底部安全区、首屏信息密度和移动网络下的加载体验
- `app` 的列表、详情、表单、空态、导航若需要共享能力，应在 `app/` 目录内单独抽象，不直接复用 `admin` 专用组件
- `app` 的正式视觉方向固定为“简约、克制、接近 shadcn 的秩序感”，但只借鉴其信息密度、边框层级、留白和排版语言，不直接引入 `shadcn/ui`
- `app` 默认采用黑白灰中性基线与深浅色主题，强调色仅用于必要语义与少量交互
- `app` 默认左对齐，使用标题、分组标题、列表行和底部操作区建立层次；避免居中状态页、横向信息对齐和桌面化卡片排布
- `app` 首发页面保持移动端单列主结构，不堆叠后台化统计卡片、复杂宫格或展示型大块内容
- `app` 信息架构与导航做减法：一级入口克制，未落地能力不预留导航位
- `app` 若使用顶部栏与底部导航，它们只服务主流程页面；底部导航仅承载高频一级入口，状态指示轻量
- `app` 个人中心类页面优先承载账户概览、设置入口与状态汇总；具体功能表单优先下沉到二级页
- `app` 若提供默认测试账号，仅作为本地模板验证辅助手段，表现形式保持克制
- `app` 的组件抽象应优先沉淀为前台基础原子，如 `section`、`mobile-page-shell`、`form-section`、`action-bar`、`empty-state`，不沿用后台组件命名

## Backend 模板规则（仅适用于 `backend/`）

- 以下规则只作用于 `backend/`，不作用于 `admin/`、`app/`、`weapp/`
- `backend` 是模板工程的唯一后端契约源；接口、权限、错误语义、OpenAPI、shared-types、shared-schemas、SDK 以 `backend` 为准
- `backend` 默认优先沉淀可复用的核心基础能力，不主动保留 demo 行为、示例模块、默认不安全行为或无消费端承接的功能面
- `backend` 的改动默认遵循“契约优先、边界清晰、同步输出”的原则；涉及接口、权限或共享类型变更时，必须同步对应契约产物与校验链路
- `backend` 架构默认保持 `Controller -> Service -> Persistence` 分层；控制器负责协议入口与鉴权边界，不直接承担数据访问与业务编排
- `backend` 不引入平行契约源；`admin/app` 不应维护独立于 `backend` 的后端接口定义、权限定义或错误语义定义
- `backend` 核心基础能力必须带自动化测试，尤其是鉴权、权限、错误语义、契约生成链路、关键脚本与基础设施封装
- `backend` 的模板边界默认做减法：没有稳定职责、稳定契约或稳定消费面的模块，不进入首发主线

## 后端 Skills 编排（统一入口）

后端任务按以下 skill 组合执行：

1. `nestjs-best-practices`（NestJS 架构与最佳实践）

### 目录范围

- `backend/` 使用 `nestjs-best-practices`
- `admin/app` 禁止套用后端 skill

### 推荐触发顺序

1. 架构设计（模块划分、依赖注入）
2. 安全与验证（DTO、Guards、异常处理）
3. 性能优化（缓存、数据库优化）
4. 测试与部署

### 触发关键词（显式）

- `nestjs-best-practices`：`backend`、`NestJS`、`Controller`、`Service`、`Module`、`DTO`、`Prisma`、`权限`

# 架构要点

## 类型同步机制

项目使用三轨制类型同步策略：

1. **枚举** (35个) - 自动从 Prisma Schema 生成
   - 导入：`import { OrderStatus } from '@/types/enums-generated'`
   - 同步：`pnpm -C backend generate:enums` 或 `npx -C backend prisma generate`

2. **权限常量** (271个) - 自动从 Backend 生成
   - 导入：`import { API_PERMISSIONS } from '@/types/permissions-generated'`
   - 同步：`pnpm -C backend generate:permissions`

3. **业务标签** (8个) - 自动从 Backend 生成
   - 导入：`import { BUSINESS_TAGS } from '@/types/business-tags-generated'`

4. **模型/DTO** (50+) - 手动维护的 shared-types 包
   - 导入：`import { Order, Customer } from 'shared-types'`

### 类型导入规范

```typescript
// ✅ 正确
import { Order, Customer } from 'shared-types'
import { API_PERMISSIONS } from '@/types/permissions-generated'
import { BUSINESS_TAGS } from '@/types/business-tags-generated'
import { OrderStatus } from '@/types/enums-generated'

// 路由配置示例
meta: {
  permission: API_PERMISSIONS.DELIVERY_VIEW,
  businessTag: BUSINESS_TAGS.STORE_INSPECTOR
}

// ❌ 错误
import { OrderStatus } from 'shared-types'      // 枚举不在 shared-types
import { API_PERMISSIONS } from 'shared-types'  // 权限也不在 shared-types
import 'api:delivery:view'                      // 不要用魔法字符串
```

**重要**:

- 不要修改 `*.generated.ts` 文件，它们会被自动覆盖
- Backend 是权限常量的数据源，不要在 Backend 导入 `permissions-generated`

### 类型同步执行细则（必遵守）

1. **禁止手改生成文件**
   - 不要手动修改任意 `*.generated.ts`
   - 生成文件必须由脚本产出并提交

2. **权限与业务标签同步（Backend -> 前端）**
   - 数据源：
     - `backend/prisma/seeds/permissions.seed.ts`
     - `backend/src/common/constants/business-tags.ts`
     - `backend/src/common/constants/business-tag-permissions.const.ts`
   - 执行命令：`pnpm -C backend generate:permissions`

3. **枚举同步（Prisma -> 前端）**
   - 数据源：`backend/prisma/schema.prisma`
   - 执行命令：
     - `pnpm -C backend generate:enums`
     - 或 `npx -C backend prisma generate`（会触发相关生成流程）

4. **提交前校验**
   - 确认生成文件的时间戳与当前改动一致
   - 至少进行一次与本次改动相关的类型检查/编译检查

5. **提交说明要求**
   - 明确写出本次是否执行了：
     - `generate:permissions`
     - `generate:enums`
     - `prisma generate`
   - 若未执行，必须说明原因

## NestJS 关键规则

### 禁止 import type 用于 DI 和 DTO

```typescript
// ❌ 错误
import type { PrismaService } from "../prisma/prisma.service";
import type { CreateUserDto } from "./dto";

// ✅ 正确
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto";
```

原因：`import type` 会丢失运行时元数据，导致 DI 失败和 ValidationPipe 无法工作。

### DTO 类型转换规则

- 数字：必须 `@Type(() => Number)`
- 布尔：用 `@Transform(({ value }) => value === 'true' || value === true)`
- 模糊搜索：使用 Prisma 的 `{ contains: query.search }`

### Controller 参数验证

```typescript
// ❌ 错误：直接解构参数
@Post()
async create(@Body('name') name: string, @Body('age') age: number) {}

// ✅ 正确：使用 DTO 类
@Post()
async create(@Body() dto: CreateUserDto) {}
```

### 架构分层

- Controller → Service → Prisma
- 禁止 Controller 直接注入 `PrismaService`
- 静态路由写在动态路由前面

```typescript
// ✅ 正确：静态路由在前
@Get('statistics')  // 静态路由
getStatistics() {}

@Get(':id')         // 动态路由
findOne(@Param('id') id: string) {}
```

## 业务规则

### React 规则

#### 样式规范

**通用优先级：Tailwind CSS > CSS Modules**

- 优先使用 Tailwind CSS 原子类
- `admin` 的样式与组件选型优先级统一遵循上文《Admin 前端规则》，不在这里重复维护一套平行规则
- 仅在 Tailwind CSS 无法实现或实现难度极大的情况下使用 CSS Modules，如以下场景：
  - 复杂的伪类/伪元素组合
  - 特殊的动画关键帧

```less
// ❌ 错误：平铺样式
.container {
}
.containerTitle {
}

// ✅ 正确：CSS Modules + LESS 嵌套
.container {
  .title {
  }
  .content {
  }
}
```
