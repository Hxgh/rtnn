# Client Shell Release And Distribution

RTNN treats client packages as low-frequency shell releases, not as part of
every business deployment.

## Core Decisions

- Normal backend/admin/app/weapp deployments do not build client packages.
- Client packages are built only when the shell changes: Tauri config, native
bridge capability, platform permission, signing, updater, bundle id, icon, or
installer configuration.
- GitHub Release can be used as the source asset repository.
- User downloads must resolve through a distribution asset URL.
- Backend stores metadata, URLs, policies, and status only. It must not stream
large installer files.
- The app `/download` page is the user-facing download entry.
- Admin "Release Center" shows real release facts, package distribution status,
  blockers, and update policy.
- Client package builds default to GitHub-hosted runners or local developer
  machines. `server-local` is reserved for explicit, confirmed low-frequency
  builds because it can compete with the runtime server.

## Distribution Providers

The backend and clients should depend on these normalized fields instead of a
specific storage product:

- `sourceUrl`: source package URL, usually GitHub Release.
- `distributionProvider`: current user distribution provider.
- `distributionUrl`: user-facing download URL.
- `distributionStatus`: `pending`, `synced`, `failed`, `pruned`, or `disabled`.

V1 supports:

- `github-release`: fallback or simple distribution mode.
- `self-hosted-static`: deploy copies packages to a configured static download
  root and exposes them via Nginx/Caddy/Apache or another static server.

Future providers can include `external-url` and `object-storage` without
changing backend/admin/app contracts.

## Self-Hosted Static Distribution

`self-hosted-static` is intentionally path-configured. The template must not
hard-code a server path.

Recommended runtime configuration shape:

```env
CLIENT_DISTRIBUTION_PROVIDER=self-hosted-static
CLIENT_DISTRIBUTION_ROOT=/path/to/downloads
CLIENT_DISTRIBUTION_PUBLIC_BASE_URL=https://download.example.com
CLIENT_DISTRIBUTION_KEEP_TESTING=1
CLIENT_DISTRIBUTION_KEEP_PRODUCTION=2
CLIENT_DISTRIBUTION_ALLOW_GITHUB_FALLBACK=true
```

The static server maps:

```text
{CLIENT_DISTRIBUTION_PUBLIC_BASE_URL}/releases/...
  -> {CLIENT_DISTRIBUTION_ROOT}/releases/...
```

Installer files should live outside the deploy repository and outside git.

## Build Execution

Client package builds are heavier than normal web/backend releases. The
recommended execution model is:

- Normal `main` pushes and `v*` tags do not build client packages.
- Manual `release-clients` and `client-*` tags are the only package release
  entries.
- The default client package execution mode is `github-hosted`.
- Local Android builds are preferred for fast real-device validation.
- `server-local` must be explicitly selected and confirmed for non-dry-run
  builds. The workflow also checks free disk before entering Android build
  steps.

This keeps RTNN's business runtime and any server-side relay services from
competing with Gradle, Rust, Android SDK, or Tauri build workloads.

## Icon System

图标体系由同一组 shell brand assets 统一维护。用户可见品牌名、
安装名、图标文字和端类型标签以 `packages/config` 为唯一来源。
端类型只作为上下文标签，不写进主品牌。

RTNN treats the brand mark as one client-shell asset set, not as separate
per-platform decorations.

The canonical shell icon files are:

- `clients/app-tauri/src-tauri/icons/icon.png`
- `clients/app-tauri/src-tauri/icons/icon.ico`
- `clients/admin-tauri/src-tauri/icons/icon.png`
- `clients/admin-tauri/src-tauri/icons/icon.ico`

The web favicon files must stay aligned with the shell ICO:

- `apps/app/app/favicon.ico`
- `apps/admin/app/favicon.ico`

The browser/PWA brand mark files must stay aligned across web apps:

- `apps/app/public/brand/brand-mark.svg`
- `apps/admin/public/brand/brand-mark.svg`

For Android, `scripts/client/prepare-app-tauri-android.mjs` writes the checked-in
shell PNG into generated launcher resources, uses it as the adaptive foreground,
and sets the manifest icon to `rtnn_launcher_icon`. The generated adaptive icon
uses a neutral background so the visible launcher shape is a normal app icon
surface with the RTNN round mark centered inside it. The Android generated
project is disposable; do not edit its generated icon files by hand.

When a business project changes branding, update the shared branding config,
run the branding sync script, then run the client checks:

```bash
node scripts/client/sync-client-branding.mjs
pnpm run check:clients
```

For a built APK, verify the final package with `aapt dump badging` and confirm
that `application-icon-*` resolves to the RTNN launcher resource. On Android
devices, uninstall the old package before reinstalling if the launcher still
shows a stale cached icon.

## Retention

Self-hosted distribution files are pruned per `client + target + channel`.

- testing keeps the latest 1 package by default.
- production keeps the latest 2 packages by default.
- pruning affects only distribution files, not GitHub Release source assets or
  database release history.
- pruned packages remain visible in admin as historical records with
  `distributionStatus = pruned`.

## Boundaries

- `rtnn` defines the generic models, APIs, scripts, and UI patterns.
- A business repository chooses whether to enable client distribution and which
  provider to use.
- A deploy repository executes synchronization and retention.
- Private server paths, real domains, and runtime secrets belong to the
  business/deploy configuration, not the open-source template.
