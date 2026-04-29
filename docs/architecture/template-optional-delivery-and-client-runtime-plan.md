# 模板可选交付面与客户端运行时规划

## 目标

本计划用于把 `rtnn` 后续的可选交付面、客户端壳能力、版本标准化与发布链路统一成一条可推进、可验收、可持续更新的工程主线。

完成后应满足：

- `rtnn` 继续作为开源模板底座，提供通用 backend/admin/app/weapp 能力、工程规则、契约生成与最佳实践。
- 派生业务仓可以声明自己实际启用的服务端、消费端与客户端壳，不启用的目标不参与 CI、release、deploy、smoke。
- `rtnn-deploy` 只消费业务仓发布 payload 中声明的交付目标，负责 Docker 编排、环境变量注入、部署、回滚、smoke 与运行事实回写。
- `admin` 与 `app` 可以在保持 Next.js 在线服务模式的前提下，通过可选 Tauri 壳获得原生能力。
- 客户端壳版本、Web 版本、镜像版本、运行事实与 bridge 能力版本边界清晰，不混成一个隐式版本源。

## 第一阶段边界

本阶段正式纳入：

- 可选交付面总体模型。
- `.rtnn/project.json` 后续扩展方向。
- `native bridge` 契约与客户端壳能力边界。
- 客户端版本、自更新与发布事实的分层模型。
- 分阶段推进清单与状态更新规则。

本阶段明确不纳入：

- 直接新增 Tauri 客户端目录。
- 修改 `admin` 或 `app` 的 Next.js 架构。
- 改造现有 GitHub Actions、发布脚本或部署 payload。
- 在 `CLAUDE.md` 中提前固化尚未实现的阶段性细节。
- 为未落地能力新增前端入口、菜单、页面或占位 UI。

## 生态职责

当前三仓关系固定为：

- `rtnn`
  - 开源全栈模板工程。
  - 负责沉淀通用 backend/admin/app/weapp 基础能力、工程规则、契约生成、workflow 与最佳实践。
- 派生业务源码仓
  - 基于 `rtnn` 派生的真实业务项目或模拟生产业务仓。
  - 负责承载具体业务代码、环境配置、testing/production 发布决策，并按需从 `rtnn` 同步模板能力。
- `rtnn-deploy`
  - 独立部署执行工程。
  - 负责根据业务项目发布指令完成 Docker 编排、环境变量注入、部署、回滚、smoke 与运行事实回写。

固定原则：

- `rtnn` 提供能力，不替业务仓做发布决策。
- 业务仓通过 `.rtnn/project.json` 声明启用哪些交付面。
- deploy 仓只执行 payload 中声明的目标，不自行推断业务仓应发布哪些端。

## 可选交付面模型

交付面分为两类：

| 类型 | 目标 | 说明 |
| --- | --- | --- |
| 服务交付面 | `backend`、`admin`、`app`、`weapp` | 现有 Docker 镜像、Web/H5、小程序相关发布面 |
| 客户端交付面 | `adminDesktop`、`appMobile` | 后续可选 Tauri 壳，负责桌面或移动原生能力 |

第一阶段采用软禁用模型：

- 未启用的目标仍可保留源码，方便模板同步。
- 未启用的目标不参与业务仓 CI、release、deploy、smoke。
- 未启用的目标不要求配置 secrets、镜像变量、客户端签名信息或商店凭据。
- 模板仓 `rtnn` 保持全量能力校验，防止模板能力腐化。

后续 `.rtnn/project.json` 可扩展为：

```json
{
  "delivery": {
    "services": {
      "backend": { "enabled": true },
      "admin": { "enabled": true },
      "app": { "enabled": false },
      "weapp": { "enabled": false }
    },
    "clients": {
      "adminDesktop": {
        "enabled": true,
        "targets": ["macos", "windows"],
        "webUrl": "https://admin.example.com",
        "channel": "production"
      },
      "appMobile": {
        "enabled": false,
        "targets": ["android", "ios"],
        "webUrl": "https://app.example.com",
        "channel": "production"
      }
    }
  }
}
```

## Project Profile

后续应新增统一 profile 解析层，例如：

```txt
scripts/lib/project-profile.mjs
```

它负责读取 `.rtnn/project.json`，输出以下事实：

- `enabledServices`
- `enabledClients`
- `enabledImageTargets`
- `enabledSmokeTargets`
- `enabledClientBuildTargets`
- `disabledReasons`

所有 CI、release、promote、smoke 与 deploy payload 生成逻辑都应消费同一个 profile，避免各脚本各自实现启用判断。

初始规则：

- `rtnn` 模板仓默认使用 full profile。
- 业务仓若未提供 `delivery` 配置，先按当前兼容规则处理四个服务交付面。
- 业务仓提供 `delivery` 配置后，以配置为准。
- `backend` 默认是核心契约源，业务仓禁用它需要单独设计，不作为首轮目标。

## 客户端壳能力

`admin` 与 `app` 的客户端壳采用远程 URL 模式：

```txt
Next.js 在线服务
  -> native bridge
  -> Tauri 壳
  -> Rust command / plugin / Android / iOS 原生能力
```

固定原则：

- 不要求 `admin` 或 `app` 静态化。
- `admin` 与 `app` 可以继续使用当前 Next.js server-first、cookie、headers、redirect、Server Actions、服务端 session 与 i18n 能力。
- Tauri 能力只能在 Client Component 或浏览器侧 hook 中调用。
- Web 层不直接散落 `@tauri-apps/*` 调用，应通过项目统一 `native bridge`。
- 普通浏览器环境必须有 fallback 或能力缺失处理。

建议目录：

```txt
packages/native-bridge
clients/admin-tauri
clients/app-tauri
```

能力分层：

| 能力 | adminDesktop | appMobile | 说明 |
| --- | --- | --- | --- |
| `getClientInfo` | 必需 | 必需 | 版本、平台、能力协商 |
| `openExternal` | 必需 | 必需 | 打开外部链接或系统应用 |
| `openMapNavigation` | 可选 | 优先 | 原生地图跳转 |
| `pickFile` / `saveFile` | 优先 | 可选 | 导入导出、文件选择 |
| `notification` | 优先 | 优先 | 系统通知 |
| `clipboard` | 优先 | 可选 | 后台管理高频能力 |
| `scanBarcode` | 不默认 | 优先 | 移动端扫码 |
| `safeArea` / `keyboard` | 不默认 | 优先 | 移动端布局增强 |
| `checkUpdate` / `installUpdate` | 优先 | 分平台 | 客户端自更新 |

## Native Bridge 版本契约

Web 发布快，客户端壳升级慢，因此 bridge 必须版本化。

建议基础类型：

```ts
type NativeClientInfo = {
  runtime: "browser" | "tauri";
  shell: "admin-desktop" | "app-mobile" | null;
  platform: "macos" | "windows" | "android" | "ios" | "web";
  appVersion: string | null;
  bridgeVersion: string;
  channel: "dev" | "testing" | "production";
  sourceSha?: string;
  features: string[];
};
```

Web 层规则：

- 使用原生能力前先读取 `getClientInfo()`。
- 根据 `features` 判断是否展示入口或执行能力。
- 新能力必须可降级，不假设客户端壳已升级。
- bridge 兼容性问题由 Web 层降级和客户端壳版本策略共同处理。

## 版本与发布事实

版本事实分层如下：

| 版本类型 | 事实来源 | 是否以数据库为主 |
| --- | --- | --- |
| 模板版本 | `rtnn` git tag / release | 否 |
| 业务源码版本 | 业务仓 git sha / tag | 否 |
| 服务镜像版本 | GHCR tag、image label、deploy payload | 否 |
| 运行事实版本 | deploy 仓 facts + `.rtnn/project.json liveState` | 否 |
| 客户端壳版本 | GitHub Release、updater manifest、商店版本 | 否 |
| bridge 能力版本 | 客户端 `getClientInfo()` 返回值 | 否 |
| 业务展示或升级策略 | 后台配置、升级策略表 | 可以进入数据库 |

固定原则：

- 数据库不作为发布事实的唯一来源。
- 服务端 `/version` 优先来自运行时环境变量和镜像标签。
- deploy 仓负责生成非敏感运行事实报告。
- 业务仓可通过 `release:sync-live-state` 校验或写回 `.rtnn/project.json liveState`。
- 客户端更新优先通过 GitHub Release、Tauri updater manifest、对象存储 manifest 或应用商店渠道管理。
- 数据库只用于业务需要的发布历史展示、客户端升级策略或强制升级策略。

## 发布与自更新

现有镜像发布主线保持：

```txt
main -> testing
v* tag -> production candidate
manual promote -> production
```

客户端发布应使用独立 workflow，例如：

```txt
.github/workflows/release-clients.yml
```

职责：

- 读取 project profile。
- 判断哪些客户端启用。
- 按 `adminDesktop` / `appMobile` 和平台生成 matrix。
- 执行打包、签名、artifact 上传。
- 可选生成 Tauri updater manifest。
- 可选上传 Google Play、TestFlight、App Store 或其他商店。

平台策略：

| 平台 | 推荐策略 |
| --- | --- |
| macOS / Windows | 优先接 Tauri updater 与 GitHub Release |
| Android | 可支持 APK/AAB artifact，是否上架由业务仓控制 |
| iOS | 优先 TestFlight / App Store，不默认自建二进制更新 |

## 推进清单

状态约定：

- `未开始`：尚未进入实现。
- `进行中`：当前阶段正在推进。
- `已完成`：阶段目标已实现并完成对应验收。
- `阻塞`：需要外部决策或前置条件。

| 阶段 | 状态 | 目标 | 主要产出 | 验收入口 |
| --- | --- | --- | --- | --- |
| 1. 规划与边界冻结 | 已完成 | 建立总体改造计划与持续更新清单 | 本文档 | `git diff --check`、README/规则文件 diff 检查 |
| 2. Project Profile | 已完成 | 统一可选交付面解析 | `scripts/lib/project-profile.mjs`、profile 测试 | 脚本单测、业务仓样例校验 |
| 3. CI / release / deploy 目标感知 | 已完成 | 未启用目标不参与构建发布 | workflow、release payload、deploy 消费调整 | 启用/禁用矩阵验证 |
| 4. Native Bridge 基础契约 | 已完成 | Web 与客户端壳能力解耦 | `packages/native-bridge`、browser adapter、tauri adapter | typecheck、最小调用验证 |
| 5. 客户端壳 MVP | 已完成 | 跑通 admin/app 的最小壳能力 | `clients/admin-tauri`、`clients/app-tauri` | `check:clients`、`cargo check` |
| 6. 客户端发版与自更新 | 已完成 | 标准化客户端版本与发布链路 | `release-clients.yml`、client release context、manifest | artifact、manifest、liveState 校验 |
| 7. 真实签名与商店发布集成 | 已完成 | 接入业务仓实际签名、商店上传与发布事实回写 | 签名 secrets、store upload、deploy facts | testing/production 发布演练 |
| 8. 业务仓演练与 deploy 可选服务闭环 | 已完成 | 在 `rtnn-demo` 与 `rtnn-deploy` 验证可选 profile、镜像发布矩阵与可选服务部署执行 | `rtnn-demo` delivery profile、`rtnn-deploy` enabledServices、promote/rollback/smoke dry-run | 跨仓 profile、deploy dry-run、自检 |
| 9. Deploy 客户端 release facts 接收 | 已完成 | `rtnn-deploy` 接收、校验、归档客户端 release facts | `sync-client-release-facts.yml`、facts 聚合脚本、client release state | artifact fixture 测试、deploy 自检 |
| 10. 业务仓客户端 facts 自动 dispatch | 已完成 | `rtnn-demo` / 模板 `release-clients` 自动通知 deploy 仓同步客户端 facts | release-clients dispatch job、跨仓 token 边界 | testing context、模板与业务仓校验 |
| 11. 客户端真实发布演练 | 阻塞 | 配置 secrets 后执行 testing dry-run / 非 dry-run 与 deploy facts 写入演练 | GitHub 前置条件预检、desktop updater、Android/iOS 签名与商店 facts | `gh` 登录、跨仓 secrets、GitHub Actions 实跑结果 |

## 主线收口清单

第 11 阶段之后不再默认扩展新能力，后续只围绕“真实演练、验收、收口”推进。

| 收口项 | 状态 | 完成条件 |
| --- | --- | --- |
| 本地工程收口 | 已完成 | 模板仓、业务仓、deploy 仓的脚本、workflow、测试、dry-run 与 README/规则文件 diff 检查通过 |
| GitHub 前置条件收口 | 阻塞 | `gh auth status` 通过，业务仓与 deploy 仓 workflow 可见，必需 secrets 名称齐全 |
| testing dry-run 实跑 | 阻塞 | `rtnn-demo` 触发 `release-clients.yml dry_run=true sync_deploy_facts=true`，deploy 仓 `sync-client-release-facts.yml --check` 成功 |
| testing 非 dry-run 实跑 | 未开始 | 配置实际或测试签名 secrets 后产出客户端 artifacts，并由 deploy 仓写入非敏感 client release facts |
| production 候选验收 | 未开始 | 使用 tag 或手动输入完成 production release context 验证，确认 GitHub Release / updater / store 边界行为符合预期 |
| 最终收口报告 | 未开始 | 汇总三仓变更、验收命令、阻塞解除记录、真实 run id / URL 与剩余业务策略项 |

### 不继续扩展的内容

为避免越做越偏，主线收口阶段不默认纳入以下内容：

- 不新增 admin / app 可见 UI、菜单、页面或占位入口。
- 不改造 Next.js 架构，不强制静态化。
- 不把商店审核、灰度策略、强制升级策略默认写进模板。
- 不把客户端发布事实改为数据库唯一来源。
- 不引入 K8s、Terraform、Preview 环境、平台化告警等部署平台扩展。
- 不维护 README、`CLAUDE.md`、`AGENTS.md` 的阶段性说明，除非出现明确必要性。

### 解除阻塞后的执行顺序

在 `rtnn-demo` 执行：

```bash
node scripts/release/check-client-release-github-prereqs.mjs --strict
pnpm run release:clients:github-dry-run
```

若 dry-run 成功，再执行 testing 非 dry-run。非 dry-run 前必须先确认签名与发布目标：

- desktop：`TAURI_SIGNING_PRIVATE_KEY`、`TAURI_UPDATER_PUBLIC_KEY`、可选 `TAURI_UPDATER_ENDPOINT`。
- Android：`ANDROID_KEYSTORE_BASE64`、`ANDROID_KEYSTORE_PASSWORD`、`ANDROID_KEY_ALIAS`、`ANDROID_KEY_PASSWORD`。
- Google Play：可选 `ANDROID_PLAY_SERVICE_ACCOUNT_JSON` 与 track / status variables。
- iOS：`IOS_CERTIFICATE_P12_BASE64`、`IOS_CERTIFICATE_PASSWORD`、`IOS_PROVISIONING_PROFILE_BASE64`、`IOS_KEYCHAIN_PASSWORD`。
- App Store Connect：可选 `APP_STORE_CONNECT_KEY_ID`、`APP_STORE_CONNECT_ISSUER_ID`、`APP_STORE_CONNECT_API_KEY_BASE64`。

## 状态更新规则

后续每进入一个阶段，必须同步更新本文件：

- 更新推进清单中的阶段状态。
- 补充该阶段实际落地的文件、脚本或 workflow。
- 记录该阶段验收入口和结果。
- 若发现原计划不适配实际工程，应在本文档中收敛新决策，不在对话记录中维护平行版本。

## 第一阶段验收标准

第一阶段完成条件：

- 本文档进入 `docs/architecture/`。
- 文档没有把阶段性实现细节提前上升为 `CLAUDE.md` 规则。
- 不更新根 README、`docs/README.md` 或规则文件，除非后续阶段出现明确必要性。
- 工作区只包含本规划文档改动。
- `git diff --check` 通过。

## 第一阶段验收记录

验收日期：2026-04-29

- `git diff --check`：通过。
- `git diff -- README.md docs/README.md CLAUDE.md AGENTS.md`：无输出，README 与规则文件未改动。
- `git status --short`：仅包含本规划文档新增。

## 第二阶段验收记录

验收日期：2026-04-29

实际产出：

- 新增 `scripts/lib/project-profile.mjs`，统一解析服务交付面与客户端交付面启用状态。
- 新增 `tests/project-profile.test.mjs`，覆盖模板仓默认 profile、业务仓兼容 profile、可选服务禁用、客户端目标展开与 backend 核心契约源保护。
- 更新 `scripts/lib/project-metadata.mjs`，保留既有 `delivery` 配置，避免同步项目事实文件时抹掉业务仓可选交付面声明。

验收结果：

- `node --test tests/project-profile.test.mjs`：通过，5 个测试全部通过。
- `node --check scripts/lib/project-profile.mjs`：通过。
- `node --check scripts/lib/project-metadata.mjs`：通过。
- `pnpm run check:template-derivation`：通过。
- `git diff --check`：通过。

## 第三阶段验收记录

验收日期：2026-04-29

实际产出：

- 新增 `scripts/runtime/run-profiled-task.mjs`，让根级 `lint`、`typecheck`、`build`、`check:template-delivery` 按 project profile 执行。
- 新增 `scripts/release/resolve-release-context.mjs`，统一输出业务仓发布上下文、启用服务 matrix 与启用服务 JSON。
- 更新 `.github/workflows/release-images.yml`，镜像构建 matrix 改为 profile 驱动，testing deploy payload 只包含启用服务的镜像。
- 更新 `.github/workflows/promote-production.yml`，production promote payload 只包含启用服务的镜像。
- 更新 `scripts/template/check-template-derivation.mjs`，将 profile 测试和新增脚本语法检查纳入模板派生验收。
- 更新根 `package.json`，把固定四端的 `lint`、`typecheck`、`build`、`check:template-delivery` 改为 profile 感知入口。

验收结果：

- `node --test tests/project-profile.test.mjs`：通过，6 个测试全部通过。
- `node scripts/release/resolve-release-context.mjs`：模板仓无 `.rtnn/project.json` 时输出 skip 上下文。
- `ruby -e 'require "yaml"; ...'`：`release-images.yml` 与 `promote-production.yml` YAML 解析通过。
- `pnpm run check:template-derivation`：通过。
- `pnpm run typecheck`：通过。
- `pnpm run lint`：通过。
- `pnpm run build`：通过。
- `git diff --check`：通过。
- `git diff -- README.md docs/README.md CLAUDE.md AGENTS.md`：无输出，README 与规则文件未改动。

## 第四阶段验收记录

验收日期：2026-04-29

实际产出：

- 新增 `packages/native-bridge` workspace 包，提供 `@rtnn/native-bridge` 基础契约。
- 定义 `NativeClientInfo`、`NativeBridge`、`NativeFeature`、`MapNavigationInput`、`NativeBridgeActionResult` 等稳定类型。
- 提供 `createBrowserNativeBridge()`，普通浏览器环境默认支持 `getClientInfo`、`openExternal` 与网页版地图 fallback。
- 提供 `createTauriNativeBridge()`，通过外部注入 `invoke` 的方式建立 Tauri adapter 边界，不直接依赖 Tauri 包。
- 将 `@rtnn/native-bridge` 纳入 `build:packages`、根级 `lint` 与根级 `typecheck`。

验收结果：

- `pnpm --filter @rtnn/native-bridge typecheck`：通过。
- `pnpm --filter @rtnn/native-bridge build`：通过。
- `pnpm run typecheck`：通过。
- `pnpm run lint`：通过。
- `pnpm run build:packages`：通过。
- `git diff --check`：通过。

## 第五阶段验收记录

验收日期：2026-04-29

实际产出：

- 新增 `clients/admin-tauri` workspace 包，作为 `admin` 的 Tauri 桌面壳 MVP，默认使用远程 `https://admin.example.com`，本地开发使用 `http://localhost:5101`。
- 新增 `clients/app-tauri` workspace 包，作为 `app` 的 Tauri 移动壳 MVP，默认使用远程 `https://app.example.com`，本地开发使用 `http://localhost:5102`。
- 两个壳均提供 `get_client_info`、`open_external`、`open_map_navigation` command，并通过 `opener` 插件承接最小原生能力。
- 新增客户端 capability，限定远程 URL 与最小权限集合：`core:default`、`opener:default`。
- 新增 `scripts/client/check-tauri-clients.mjs` 与根级 `check:clients`，验证壳 package、Tauri 配置、远程 URL、capability、Rust 入口文件与 RGBA PNG 图标。
- 将 `clients/*` 纳入 workspace，并让模板派生检查覆盖 Tauri client 壳骨架。
- 更新 `.gitignore` 忽略 Cargo/Tauri 构建产物，保留 Tauri 应用 `Cargo.lock` 作为可重复构建输入。

验收结果：

- `pnpm run check:clients`：通过。
- `pnpm --filter @rtnn/admin-tauri validate && pnpm --filter @rtnn/app-tauri validate`：通过。
- `pnpm run check:template-derivation`：通过。
- `cargo fmt --manifest-path clients/admin-tauri/src-tauri/Cargo.toml -- --check`：通过。
- `cargo fmt --manifest-path clients/app-tauri/src-tauri/Cargo.toml -- --check`：通过。
- `CARGO_TARGET_DIR=/tmp/rtnn-admin-tauri-target cargo check --manifest-path clients/admin-tauri/src-tauri/Cargo.toml`：通过。
- `CARGO_TARGET_DIR=/tmp/rtnn-app-tauri-target cargo check --manifest-path clients/app-tauri/src-tauri/Cargo.toml`：通过。
- `pnpm run typecheck`：通过。
- `pnpm run lint`：通过。
- `pnpm run build`：通过。
- `git diff --check`：通过。
- `git diff -- README.md docs/README.md CLAUDE.md AGENTS.md`：无输出，README 与规则文件未改动。

## 第六阶段验收记录

记录日期：2026-04-29

已落地产出：

- 新增 `scripts/release/resolve-client-release-context.mjs`，根据业务仓 `.rtnn/project.json` 与 project profile 输出客户端发布矩阵。
- 新增 `scripts/release/write-client-release-manifest.mjs`，生成标准化客户端 release manifest artifact。
- 新增 `scripts/release/collect-client-artifacts.mjs`，收集 Tauri desktop bundle 输出并生成 artifact 文件清单。
- 新增 `scripts/release/write-tauri-updater-manifest.mjs`，按 Tauri 静态 updater 格式生成已签名 desktop artifact 的 updater fragment；unsigned artifact 只生成 skip report。
- 新增 `scripts/release/merge-tauri-updater-fragments.mjs`，把各平台 updater fragment 合并为可供 Tauri updater 消费的 `*-latest.json` 静态 manifest。
- 新增 `scripts/release/write-mobile-release-boundary.mjs`，输出 Android / iOS artifact、签名、商店渠道边界 report，不输出 secret 值。
- 新增 `scripts/release/sync-client-release-state.mjs`，把客户端 release artifacts 中的非敏感事实校验或写回 `.rtnn/project.json liveState.<env>.clients`。
- 新增 `.github/workflows/release-clients.yml`，提供 profile-gated 的客户端发布 workflow；未启用客户端或模板仓默认跳过，dry-run 时只产 manifest，非 dry-run 的 macOS / Windows 目标会执行 unsigned desktop build、上传 bundle artifact，并聚合已签名 updater fragment；Android / iOS 目标上传 mobile boundary report。
- 新增 `tests/client-release-context.test.mjs`，覆盖缺失项目事实、启用客户端矩阵、未启用客户端跳过、manifest 输出结构、bundle artifact 收集、Tauri updater fragment / skip report、最终 updater manifest 合并与 Android / iOS mobile boundary report。
- 新增 `tests/client-release-state.test.mjs`，覆盖客户端 release facts 与 `liveState` 的 `--check` / `--write` 流程。
- 新增根级 `check:client-release`，并将 client release context 纳入模板派生验收。

当前边界：

- 本阶段当前已落地发布上下文、版本命名、manifest artifact、desktop unsigned artifact 收集、Tauri updater fragment 生成、最终 updater manifest 合并、Android / iOS 发布边界 report、客户端 liveState 同步与基础验证。
- 不默认接入真实签名证书、Android keystore、Apple 证书、商店上传或强制自更新策略。
- `release-clients.yml` 当前只对 macOS / Windows 提供 unsigned desktop artifact；只有产物存在 `.sig` 或显式传入签名时才生成 updater entry。Android / iOS 仍为 manifest-only，但会输出缺失签名与商店配置的机器可读 report。

阶段性验收结果：

- `pnpm run check:client-release`：通过，11 个测试全部通过。
- `pnpm run check:template-derivation`：通过。
- GitHub Actions YAML 解析：通过。

## 第七阶段验收记录

记录日期：2026-04-29

已落地产出：

- 新增 `scripts/release/prepare-tauri-updater-signing.mjs`，在业务仓配置 `TAURI_SIGNING_PRIVATE_KEY` 与 `TAURI_UPDATER_PUBLIC_KEY` 后，为 desktop Tauri 壳临时写入 updater 配置，启用 `bundle.createUpdaterArtifacts`，并输出不含私钥的 desktop signing boundary report。
- 新增 `scripts/release/collect-client-github-release-assets.mjs`，从 workflow 下载的客户端 artifacts 中收集 desktop bundle 与 Tauri updater manifest，生成可上传到 GitHub Release 的资产目录与非敏感资产清单。
- 更新 `packages/native-bridge`，新增 `checkUpdate()` 与 `installUpdate()` 契约；普通浏览器环境返回 `updater-unavailable`，Tauri adapter 通过统一 command 调用。
- 更新 `clients/admin-tauri`，接入 `tauri-plugin-updater`，新增 `check_update` 与 `install_update` command，并在 `get_client_info()` 的 features 中声明 `updater`。
- 更新 `scripts/client/check-tauri-clients.mjs`，把 admin desktop 的 updater capability、Cargo 依赖与 Rust command 纳入壳骨架验收。
- 新增 `scripts/release/prepare-android-signing.mjs`，在业务仓配置 Android keystore secrets 后生成 `keystore.properties`、写出临时 keystore、修补 Tauri 生成的 Android Gradle release 签名配置，并输出不含密钥值的 Android signing boundary report。
- 新增 `scripts/release/prepare-google-play-upload.mjs`，解析 Android signed artifact、package name、Google Play track / release status 与 service account 配置，输出不含 service account 的 Google Play upload boundary report。
- 新增 `scripts/release/write-google-play-release-report.mjs`，记录 Google Play 上传是否执行、track、release status、package name、release file name 与 committed edit id 等非敏感事实。
- 新增 `scripts/release/prepare-ios-signing.mjs`，在业务仓配置 Apple distribution certificate、provisioning profile、临时 keychain password 与 App Store Connect API key 后，写出 CI 临时签名文件、API key 文件和不含证书/profile/API key 内容的 iOS signing boundary report。
- 新增 `scripts/release/prepare-app-store-connect-upload.mjs`，解析 signed IPA、bundle id、TestFlight/App Store 分发模式与 App Store Connect API key 配置，输出不含 private key 内容的 upload boundary report。
- 新增 `scripts/release/write-app-store-connect-release-report.mjs`，记录 App Store Connect 上传是否执行、bundle id、distribution、IPA 文件名与 skip reason 等非敏感事实。
- 更新 `scripts/release/write-mobile-release-boundary.mjs` 与 `scripts/release/sync-client-release-state.mjs`，记录 Android signed build 是否已实际产出、artifact 目录与 build 状态。
- 更新 `.github/workflows/release-clients.yml`：
  - 新增 `publish_github_release` 输入。
  - tag push 默认允许发布 GitHub Release，手动 workflow 可显式开启。
  - desktop 非 dry-run 构建前自动执行签名准备；配置齐全时产出 signed updater artifact，配置不齐时继续产出 blocked boundary report。
  - 可选创建或更新 GitHub Release，并上传客户端 bundle 与 updater manifest asset。
  - Android 非 dry-run 且 keystore secrets 齐全时执行 `tauri android init`、准备签名、运行 `tauri android build --aab|--apk`，并上传 signed Android artifact。
  - Android signed artifact 产出后，若 `ANDROID_PLAY_SERVICE_ACCOUNT_JSON` 已配置，则通过 Google Play Developer API action 上传到指定 track，默认 `internal` + `draft`。
  - iOS 非 dry-run 且 Apple signing secrets 齐全时安装临时 keychain 与 provisioning profile，执行 `tauri ios build --export-method app-store-connect`，收集 signed IPA，并在 App Store Connect API key 齐全时通过 `xcrun altool --upload-app` 上传。
- 更新 `scripts/release/sync-client-release-state.mjs`，把 desktop signing boundary、mobile build boundary、Google Play release report 与 App Store Connect release report 中的非敏感事实同步到 `.rtnn/project.json liveState.<env>.clients`。
- 更新 `tests/client-release-context.test.mjs` 与 `tests/client-release-state.test.mjs`，覆盖 desktop 签名准备、私钥不落盘到 report、GitHub Release asset 收集、Android signing 准备、Google Play upload boundary / release report、iOS signing 准备、App Store Connect upload boundary / release report、mobile build boundary 与 liveState 写回。

当前边界：

- 已支持 desktop Tauri updater 签名准备和 GitHub Release asset 发布闭环，但真实签名是否生效取决于业务仓 secrets。
- 已支持 admin desktop 壳的运行时更新检查与安装 command；Web 层仍需在实际业务页面或 hook 中按 `features` 判断后调用，不新增占位 UI。
- Android 已接入 signed AAB / APK artifact baseline 与 Google Play 上传链路；首次上架、package 初始化、Play App Signing、服务账号授权与审核策略仍需业务仓在 Play Console 完成。
- Google Play 默认上传到 `internal` track 且 `draft` release status，业务仓需要通过 repository variables 显式调整 track 与发布状态。
- iOS 已接入 signed IPA artifact baseline 与 App Store Connect 上传链路；Apple Developer 证书、provisioning profile、bundle id、App Store Connect API key、TestFlight / App Store 审核策略仍需业务仓在 Apple Developer 与 App Store Connect 完成。
- GitHub Release 发布仅上传非敏感 bundle / updater manifest，不上传 secrets、keystore、证书或 provisioning profile。

验收结果：

- `pnpm run check:client-release`：通过，25 个测试全部通过。
- `pnpm --filter @rtnn/native-bridge typecheck`：通过。
- `CARGO_TARGET_DIR=/tmp/rtnn-admin-tauri-target cargo check --manifest-path clients/admin-tauri/src-tauri/Cargo.toml`：通过。
- `pnpm run check:template-derivation`：通过。
- `pnpm run check:clients`：通过。
- `git diff --check`：通过。
- GitHub Actions YAML 解析：通过。
- `git diff -- README.md docs/README.md CLAUDE.md AGENTS.md`：无输出，README 与规则文件未改动。

## 第八阶段阶段性记录

记录日期：2026-04-29

已落地产出：

- 更新 `scripts/lib/project-profile.mjs` 与 `scripts/release/resolve-client-release-context.mjs`，支持 `delivery.clients.*.webUrls` 的 testing / production 分环境 URL，并在未显式配置时从 `.rtnn/project.json domains.<channel>.admin/app` 自动派生客户端壳加载 URL。
- 更新 `tests/project-profile.test.mjs` 与 `tests/client-release-context.test.mjs`，覆盖分环境客户端 URL、domain fallback 与 profile 中 `webUrls` 的优先级。
- 将第 2-7 阶段的模板能力同步到 `rtnn-demo`，包括 profile-aware workflow、`release-clients.yml`、`packages/native-bridge`、`clients/admin-tauri`、`clients/app-tauri`、client release scripts 与对应测试。
- 更新 `rtnn-demo/.rtnn/project.json` 的 `delivery` 配置：
  - 服务交付面启用 `backend`、`admin`、`app`。
  - 服务交付面禁用 `weapp`，验证未启用目标不进入镜像发布矩阵。
  - 客户端交付面启用 `adminDesktop` 的 `macos/windows`。
  - 客户端交付面启用 `appMobile` 的 `android/ios`。
  - `adminDesktop` 与 `appMobile` 均配置 testing / production web URLs。
- 更新 `rtnn-deploy`，让 deploy 执行仓从 `executionBinding.enabledServices` 读取启用服务，支持 `backend/admin/app` 启用、`weapp` 禁用的真实执行闭环。
- 更新 `rtnn-deploy` 的 deploy workflow，把内联 release 请求校验收敛到 `scripts/release/resolve-deploy-request.mjs`，手动 break-glass 与 repository_dispatch 共用同一套来源仓、应用、环境、镜像前缀与启用服务校验。
- 更新 `rtnn-deploy` 的 `promote.sh`、`rollback.sh` 与 `smoke-check.sh`，未启用服务不再要求镜像、runtime env、拉取、compose up 或 smoke。

阶段性验收结果：

- `rtnn-demo` `resolve-release-context`：testing main 发布矩阵只包含 `backend/admin/app`，不包含 `weapp`。
- `rtnn-demo` `resolve-client-release-context` testing：输出 `adminDesktop macos/windows` 与 `appMobile android/ios`，URL 分别指向 testing admin/app 域名。
- `rtnn-demo` `resolve-client-release-context` production：输出同一客户端矩阵，URL 分别指向 production admin/app 域名，tag push 默认 `publish_github_release=true`。
- `rtnn-demo` `pnpm run check:client-release`：通过，26 个 client context 测试与 1 个 liveState 测试全部通过。
- `rtnn-demo` `pnpm run check:template-derivation`：通过。
- `rtnn-demo` `pnpm run check:clients`：通过。
- `rtnn-demo` `pnpm --filter @rtnn/native-bridge typecheck`：通过。
- `rtnn-demo` `cargo check --manifest-path clients/admin-tauri/src-tauri/Cargo.toml`：通过。
- `rtnn-demo` `cargo check --manifest-path clients/app-tauri/src-tauri/Cargo.toml`：通过。
- `rtnn-demo` GitHub Actions YAML 解析：通过。
- `rtnn-demo` `git diff --check` 与新增文件 diff check：通过。
- `rtnn-demo` `git diff -- README.md docs/README.md CLAUDE.md AGENTS.md`：无输出，README 与规则文件未改动。
- `rtnn-deploy` repository_dispatch 请求解析：`enabled_services=backend,admin,app`，`weapp_image=` 为空时通过。
- `rtnn-deploy` `promote.sh --dry-run`：通过，只迁移/更新/smoke `backend/admin/app`，跳过 `weapp`。
- `rtnn-deploy` `rollback.sh --dry-run`：通过，只回滚/smoke `backend/admin/app`，跳过 `weapp`。
- `rtnn-deploy` `./scripts/ci/check-repository.sh`：通过。
- `rtnn-deploy` `git diff --check`：通过。
- `rtnn-deploy` `git diff -- README.md docs/README.md CLAUDE.md AGENTS.md`：无输出，README 与规则文件未改动。

当前边界：

- `rtnn-demo` 已具备客户端 release dry-run 与非 dry-run 的 workflow / script 基线。
- 真实 desktop 签名、Android keystore、Google Play、Apple 证书与 App Store Connect secrets 尚未配置；这些应作为业务仓 GitHub secrets / variables 管理，不进入源码。
- `rtnn-deploy` 已支持可选服务部署执行闭环；下一阶段继续补齐客户端 release facts 的自动跨仓同步入口。

## 第九阶段验收记录

记录日期：2026-04-29

已落地产出：

- 新增 `rtnn-deploy/scripts/release/sync-client-release-facts.mjs`，递归读取 `release-clients` 下载产物中的 `rtnn.client-release.v1` manifest、desktop signing boundary、mobile boundary、Google Play / App Store Connect release report 与 Tauri updater index。
- 新增 `rtnn-deploy/.github/workflows/sync-client-release-facts.yml`，支持手动触发与 `repository_dispatch` 触发，通过 `gh run download` 从业务仓 release-clients run 下载 artifacts，并根据 dry-run 决定 `--check` 或 `--write`。
- 更新 `rtnn-deploy/.rtnn/project.json`，增加 `executionBinding.clientReleaseFactsEventType`，将客户端 facts 同步事件与镜像 promote 事件分离。
- 新增 `rtnn-deploy/state/client-releases/.gitignore`，非敏感客户端 release facts 归档到 deploy 本地 state，不进入源码提交。
- 更新 `rtnn-deploy/scripts/ops/inspect-runtime-facts.mjs`，运行事实报告可展示当前环境已归档的客户端 release facts。
- 新增 `rtnn-deploy/tests/sync-client-release-facts.test.mjs`，覆盖 facts 写入、错误来源仓拒绝、channel/environment 不一致拒绝、dry-run facts 禁止写入 state。

验收结果：

- `rtnn-deploy` `node --test tests/*.test.mjs`：通过，9 个测试全部通过。
- `rtnn-deploy` `./scripts/ci/check-repository.sh`：通过。
- `rtnn-deploy` GitHub Actions YAML 解析：通过。
- `rtnn-deploy` `git diff --check`：通过。
- `rtnn-deploy` `git diff -- README.md docs/README.md CLAUDE.md AGENTS.md`：无输出，README 与规则文件未改动。

当前边界：

- deploy 仓已经能接收并归档客户端 release facts，但业务仓 `release-clients.yml` 尚未自动 dispatch 到 deploy 仓。
- 跨私有仓下载 release artifacts 时需要在 deploy 仓配置 `DEPLOY_SOURCE_REPOSITORY_TOKEN`；若业务仓公开或权限足够，可回退到当前 workflow token。
- dry-run 客户端 release facts 只能校验与上传 report，不能写入 deploy state，避免覆盖真实客户端发布事实。

## 第十阶段验收记录

记录日期：2026-04-29

已落地产出：

- 更新模板仓 `release-clients.yml`，新增可选 `sync_deploy_facts` 输入，并支持通过 repository variable `CLIENT_RELEASE_SYNC_DEPLOY_FACTS` 开启自动 dispatch。
- 新增 `dispatch-client-release-facts` job，在客户端 release artifacts 生成完成后向业务绑定的 deploy 仓发送 `repository_dispatch`，payload 包含 `environment`、`source_repository`、`source_run_id`、`source_sha` 与 `dry_run`。
- 更新 `scripts/release/resolve-client-release-context.mjs`，输出 `sync_deploy_facts` 与 `release_channel`，并在启用 deploy facts 同步时拒绝混合 channel 的客户端发布矩阵。
- 更新 `scripts/lib/project-metadata.mjs`，业务项目事实生成时默认写入 `deployment.clientReleaseFactsEventType=sync-<application>-client-release-facts`。
- 将 dispatch 能力同步到 `rtnn-demo`，并在 `rtnn-demo/.rtnn/project.json` 中显式声明 `clientReleaseFactsEventType=sync-rtnn-client-release-facts`。

验收结果：

- `rtnn` `pnpm run check:client-release`：通过，27 个 client context 测试与 1 个 liveState 测试全部通过。
- `rtnn` `pnpm run check:template-derivation`：通过。
- `rtnn` GitHub Actions YAML 解析：通过。
- `rtnn-demo` `CLIENT_RELEASE_SYNC_DEPLOY_FACTS=true ... resolve-client-release-context`：输出 `sync_deploy_facts=true`、`release_channel=testing`，客户端矩阵包含 `adminDesktop macos/windows` 与 `appMobile android/ios`。
- 本地跨仓契约演练：使用 `rtnn-demo` 生成 testing client release manifest artifacts，再由 `rtnn-deploy/scripts/release/sync-client-release-facts.mjs --check` 聚合通过，输出 `clients=adminDesktop,appMobile`。
- `rtnn-demo` `pnpm run check:client-release`：通过，27 个 client context 测试与 1 个 liveState 测试全部通过。
- `rtnn-demo` `pnpm run check:template-derivation`：通过。
- `rtnn-demo` GitHub Actions YAML 解析：通过。
- `rtnn` 与 `rtnn-demo` `git diff --check`：通过。
- `rtnn` 与 `rtnn-demo` `git diff -- README.md docs/README.md CLAUDE.md AGENTS.md`：无输出，README 与规则文件未改动。

当前边界：

- 自动 dispatch 默认关闭，需要业务仓显式设置 workflow input `sync_deploy_facts=true` 或 repository variable `CLIENT_RELEASE_SYNC_DEPLOY_FACTS=true`。
- 跨私有仓 dispatch 需要业务仓配置 `DEPLOY_REPOSITORY_DISPATCH_TOKEN`；deploy 仓下载业务仓 artifacts 需要 `DEPLOY_SOURCE_REPOSITORY_TOKEN`。
- 当前已完成 context 与 workflow 静态/脚本验收，尚未在 GitHub Actions 中进行真实跨仓 dispatch 和 artifact 下载。

## 第十一阶段阶段性记录

记录日期：2026-04-29

已落地产出：

- 新增 `scripts/release/check-client-release-github-prereqs.mjs`，用于检查真实 GitHub Actions 演练的前置条件。
- 该预检只读取 workflow、secret / variable 名称与 `gh` 登录状态，不读取 secret 值。
- 增强预检输出，新增机器可读 `configuration` 与 `nextActions`，在未登录、缺 secret、缺可选 variable 或已就绪时输出明确下一步动作。
- 预检覆盖：
  - 业务仓 `release-clients.yml` 是否存在。
  - deploy 仓 `sync-client-release-facts.yml` 是否存在。
  - 业务仓是否配置 `DEPLOY_REPOSITORY_DISPATCH_TOKEN`。
  - deploy 仓是否配置 `DEPLOY_SOURCE_REPOSITORY_TOKEN`。
  - 业务仓是否可选配置 `CLIENT_RELEASE_SYNC_DEPLOY_FACTS` repository variable。
- 将预检脚本纳入模板仓与 `rtnn-demo` 的 `check:client-release` 语法校验，并纳入模板派生校验。
- 新增 `tests/client-release-github-prereqs.test.mjs`，覆盖未登录阻塞、ready 状态与 strict 模式失败语义，并同步到 `rtnn-demo`。

阶段性验收结果：

- `rtnn-demo` `node scripts/release/check-client-release-github-prereqs.mjs`：脚本正常运行，当前结果为 `blocked (gh-not-authenticated)`。
- `rtnn-demo` `node scripts/release/check-client-release-github-prereqs.mjs`：输出 `next actions`，当前指向 `gh auth login` 后重新运行预检。
- `rtnn` `node --test tests/client-release-github-prereqs.test.mjs`：通过，3 个测试全部通过。
- `rtnn` `pnpm run check:client-release`：通过。
- `rtnn-demo` `pnpm run check:client-release`：通过。
- `rtnn` `pnpm run check:template-derivation`：通过。
- `rtnn-demo` `pnpm run check:template-derivation`：通过。

当前阻塞：

- 本机 GitHub CLI 已登录为 `Hxgh`，`gh auth status` 通过。
- `rtnn-demo` 已配置 `DEPLOY_REPOSITORY_DISPATCH_TOKEN`。
- 远端 GitHub 默认分支已包含本轮新增 workflow：
  - `rtnn-demo`：`release-clients.yml` 已可见。
  - `rtnn-deploy`：`sync-client-release-facts.yml` 已可见。
- `rtnn-deploy` 尚未配置 `DEPLOY_SOURCE_REPOSITORY_TOKEN`。
- 因此暂不能继续触发带 deploy facts 同步的真实 `release-clients` run。
- 真实跨仓演练仍需配置：
  - `rtnn-deploy`：`DEPLOY_SOURCE_REPOSITORY_TOKEN`，用于下载业务仓 release-clients artifacts。

解除阻塞后的优先级：

1. 在 `rtnn-deploy` 配置 `DEPLOY_SOURCE_REPOSITORY_TOKEN`。
2. 重新执行 `rtnn-demo` GitHub 前置条件 strict 检查。
3. 执行 `rtnn-demo` release-clients testing dry-run，并开启 `sync_deploy_facts=true`，验证 deploy 仓 `sync-client-release-facts.yml --check` 实跑。
4. 在配置真实或测试用客户端签名 secrets / variables 后，执行 release-clients testing 非 dry-run 与 deploy facts `--write` 演练。
5. 根据真实商店审核结果补充 Android / iOS 发布策略变量，例如 track、release status、TestFlight 分发组、审核提交流程。
