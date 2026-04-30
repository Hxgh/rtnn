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
