# Client Distribution Model

RTNN supports optional client shell releases for desktop and mobile shells. These releases are low-frequency shell/package updates and should be decoupled from normal web/backend deploys.

## Source And Distribution

RTNN distinguishes two URLs:

- `sourceUrl`: the source package location, usually GitHub Release.
- `distributionUrl`: the user-facing download location, usually self-hosted static files or object storage.

The backend stores metadata and URLs. It must not proxy large installer files.

## Supported Providers

The model supports:

- GitHub Release as source package storage;
- self-hosted static distribution;
- object storage/CDN distribution;
- external URLs;
- store distribution for mobile platforms when a project chooses it.

## Retention

Retention applies to user-facing distribution storage, not source releases:

- testing can keep a small number of versions;
- production can keep more rollback-safe versions;
- pruned packages should remain as metadata but must not be returned as downloadable packages.

## User Download Flow

Recommended user flow:

1. User opens the app download page.
2. The page requests backend download metadata.
3. Backend resolves policy, recommended release, fallback rules, and package status.
4. The page links directly to the static or object-storage URL.

## Admin Flow

Recommended admin flow:

- view client shell releases and platform packages;
- inspect source and distribution URLs;
- manage update/download policy;
- avoid triggering builds from the release center unless a project explicitly adds that capability.

The release center should reflect runtime facts rather than invent a parallel
release truth. When a deploy executor syncs client release facts, the backend
stores accepted package metadata and the business repository can mirror
non-sensitive client state into `.rtnn/project.json liveState.<env>.clients`.
Use `release:sync-client-live-state` for the write-back/check flow and
`release:check-runtime-freshness` for environment freshness.

## Build Operations

Client package builds should not share the default runtime server unless the
operator explicitly accepts that cost.

Recommended defaults:

- use local builds for quick Android device validation;
- use GitHub-hosted runners for release package builds;
- keep `server-local` only as an explicit fallback with a confirmation flag and
  free-disk gate;
- never trigger client package builds from ordinary business deployments.

The deploy repository may still distribute finished package artifacts to
self-hosted storage. Distribution is a file sync operation; compiling Android,
iOS, macOS, or Windows packages is a separate build workload.
