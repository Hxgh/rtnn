# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 基本

请用中文与我交流

# 项目概述

- **backend**: NestJS 后端 API (端口 3000)
- **admin**: NextJS 后台前端 (端口 3100)
- **app**: NextJS 前台前端 (端口 3200)

# 开发规则

涉及 Backend/admin/app 共享的类型、常量、权限改动时，遵循下文《类型同步机制》的执行细则。

## 前端 Skills 编排（统一入口）

前端任务按以下 skill 组合执行：

1. `shadcn-ui-workflow`（统一 UI 体系与落地约束）
2. `vercel-composition-patterns`（React 组件架构与组合模式）
3. `vercel-react-best-practices`（React 性能与数据获取）
4. `web-design-guidelines`（UI/可访问性审查）

### 目录范围与互斥

- `backend/` 禁止套用前端 skill
- `shadcn-ui-workflow` 适用于 `admin/app`（仅在显式提及 shadcn 时启用）
- `admin/app` 默认 UI 主栈为 `Tailwind CSS`
- `shadcn/ui` 属于可选组件层，需按任务显式引入，禁止隐式全量迁移

### 推荐触发顺序

1. 若任务明确涉及 shadcn，再先做 UI 组件设计（`shadcn-ui-workflow`）
2. 再做组件分层与 API 设计（`vercel-composition-patterns`）
3. 再做性能优化（`vercel-react-best-practices`）
4. 最后做 UI/可访问性检查（`web-design-guidelines`）

### 触发关键词（显式）

- `shadcn-ui-workflow`：`shadcn`、`ui.shadcn.com`、`components.json`、`npx shadcn`、`registry`

### 前端技能路由补充

- 常规 React/Next 需求（未出现 shadcn 关键词）默认使用：
  - `vercel-composition-patterns` + `vercel-react-best-practices`
- 仅当用户要求 UI 评审、可访问性审查、UX 审计时，追加 `web-design-guidelines`
- 当前仓库无 React Native / Expo 工程，默认不启用 `vercel-react-native-skills`

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

**优先级：Tailwind CSS > CSS Modules**

- 优先使用 Tailwind CSS 原子类
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
