# Release And Live State Model

RTNN separates release intent from runtime truth.

## Release Intent

The business repository owns release intent:

- what source SHA or tag should be released;
- which environment should receive it;
- which services are enabled;
- whether a client shell release should be built.

Normal backend/admin/app/weapp deploys should not automatically rebuild client shell packages.

## Runtime Truth

The deploy executor owns runtime truth:

- what image tag is currently running;
- whether the service is healthy;
- whether smoke checks pass;
- which client release facts were accepted;
- which static client packages were synced or pruned.

Runtime facts must be non-sensitive. They may include versions, source SHAs,
image names, public URLs, probe status, and accepted client release facts. They
must not include database URLs, tokens, cookies, JWT secrets, SSH material, or
authorization headers.

## Live State

Business project metadata may include a `liveState` section, but it should be treated as a derived non-sensitive snapshot. It should be validated or refreshed from deploy executor facts.

Do not maintain live state manually in README files, chat notes, or ad hoc documents.

Use the read-only freshness gate when answering whether an environment is
actually on the expected release:

```bash
pnpm run release:check-runtime-freshness -- --facts-file /tmp/rtnn-runtime-facts.json
pnpm run release:check-runtime-freshness -- --facts-file /tmp/rtnn-runtime-facts.json --environment testing
```

If the freshness gate reports stale state, either the environment is not running
the expected release or `liveState` has not been refreshed from the deploy
executor. After verifying the deploy facts, update the derived snapshot with:

```bash
pnpm run release:sync-live-state -- --facts-file /tmp/rtnn-runtime-facts.json --write
```

`release:check-runtime-freshness` never writes project metadata. It is intended
for CI gates, operator checks, and quick answers to "is production/testing
latest?".

## Verification Layers

Local and CI verification are intentionally separated:

- static gates (`check:quick`) do not require PostgreSQL, Docker, or browsers;
- backend release gates require PostgreSQL and test schemas;
- Playwright UI smoke is a CI/browser-binary gate;
- Codex App local page verification should use the built-in Browser plugin.
- `profile:doctor` is the business-repository entry point for checking which
  services, client targets, and release modes are actually enabled before any
  deploy or smoke work starts.

The local Playwright wrapper fails in CI or when `RTNN_RUN_UI_SMOKE=true` and
Chromium is missing. Ordinary local smoke commands skip early with a message that
points operators to Codex Browser instead of asking them to install Chromium.

## Rollback

Rollback should operate on known image tags or deploy snapshots. Database schema rollback should not be automatic unless a project explicitly implements and verifies that strategy.
