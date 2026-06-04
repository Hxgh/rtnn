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

Use the read-only status gate when answering whether an environment is actually
on the expected release:

```bash
pnpm run release:status -- --facts-file /tmp/rtnn-runtime-facts.json
pnpm run release:status -- --facts-file /tmp/rtnn-runtime-facts.json --environment testing
pnpm run release:status -- --facts-file /tmp/rtnn-runtime-facts.json --environment testing --client-artifacts-dir /tmp/client-release
pnpm run release:status -- --skip-runtime --environment testing --client-facts-file /tmp/client-release-facts.json
pnpm run release:status -- --facts-file /tmp/rtnn-runtime-facts.json --summary-md --output /tmp/rtnn-release-status.json
pnpm run release:status:ci -- --facts-file /tmp/rtnn-runtime-facts.json --output-dir /tmp/rtnn-release-status
```

`release:status` combines the project profile preflight, runtime freshness, and
optional client release liveState checks. It never writes project metadata. Its
JSON output uses stable top-level `status`, `code`, `summary`, `checks`, and
`findings` fields. Valid status values are `fresh`, `stale`, `blocked`, and
`skipped`; CI should make decisions from `status` / `code`, not from human text.

If the status gate reports stale runtime state, either the environment is not
running the expected release or `liveState` has not been refreshed from the
deploy executor. After verifying the deploy facts, update the derived snapshot
with:

```bash
pnpm run release:sync-live-state -- --facts-file /tmp/rtnn-runtime-facts.json --write
```

If the status gate reports stale client liveState, verify the client release
artifacts or deploy client facts and then update the derived snapshot with:

```bash
pnpm run release:sync-client-live-state -- --artifacts-dir /tmp/client-release --environment testing --write
```

For CI-driven write-back, prepare a liveState-only PR working tree instead of
silently writing to the main branch:

```bash
pnpm run release:prepare-live-state-pr -- --facts-file /tmp/rtnn-runtime-facts.json --environment testing --client-artifacts-dir /tmp/client-release --summary-md /tmp/live-state-pr.md --json
pnpm run release:prepare-live-state-pr -- --skip-runtime --environment testing --client-facts-file /tmp/client-release-facts.json --summary-md /tmp/live-state-pr.md --json
```

`release:prepare-live-state-pr` only writes `.rtnn/project.json liveState`. It
does not commit, push, or create a PR. The caller is responsible for running a
liveState-only change check before opening a PR.

`release:check-runtime-freshness` remains the lower-level runtime-only gate for
CI jobs that do not need the profile or client release checks.

## Production Readiness

Production promote is a business repository decision. Before dispatching the
deploy executor, run the read-only readiness gate:

```bash
pnpm run release:production-readiness -- --deploy-version v1.0.0 --source-sha <sha>
pnpm run release:production-readiness -- --deploy-version v1.0.0 --source-sha <sha> --facts-file /tmp/rtnn-runtime-facts.json --summary-md --output /tmp/rtnn-production-readiness.json
```

The gate validates business metadata, the project profile, the `v*` release tag,
the optional source SHA, and the production trigger policy. When a testing
runtime facts file is provided, it also requires testing `liveState` to be fresh.
The script does not write project metadata and does not trigger deployment.

## Admin Runtime View

The admin release center can surface the latest release status JSON without
calling GitHub or deploy APIs. Configure one of:

```bash
RTNN_RELEASE_STATUS_FILE=/path/to/release-status.json
RELEASE_STATUS_FILE=/path/to/release-status.json
```

Only the stable `status`, `code`, and finding counts are shown. Admin UI should
map status/code to its local dictionary instead of matching human messages.

## CI Artifact Flow

Deploy repositories should upload runtime facts as workflow artifacts and then
trigger the business repository `sync-live-state` workflow. The business
repository never invents runtime facts. It only downloads the deploy artifact and
runs the same local release status contracts.

Manual workflow dispatch and repository dispatch both support:

- `source_run_id`: deploy workflow run id that uploaded facts;
- `source_repository`: repository that uploaded facts, for example
  `owner/rtnn-deploy`;
- `runtime_facts_artifact`: runtime facts artifact name, default
  `rtnn-runtime-facts`;
- `runtime_facts_file`: JSON file inside the artifact, default
  `runtime-facts.json`;
- `client_artifacts_artifact`: optional client release artifact name;
- `client_facts_artifact`: optional deploy-generated
  `rtnn.deploy.client-release-facts.v1` artifact name;
- `client_facts_file`: JSON file inside the client facts artifact;
- `environment`: optional environment filter;
- `mode`: `status` or `prepare-pr`.

`mode=status` runs `release:status:ci` and uploads `rtnn-release-status`
containing:

- `release-status.json`;
- `release-status.md`.

`mode=prepare-pr` first runs the same status check, then runs
`release:prepare-live-state-pr:ci`. If liveState changed, the CI helper creates a
branch, commits only `.rtnn/project.json`, optionally pushes it, and can create a
PR with the generated summary. If nothing changed, it emits `changed=false` and
does not commit.

Runtime facts and deploy client facts may arrive together or separately. When a
deploy executor only dispatches `client_facts_artifact`, the business workflow
runs the status and PR helpers with `--skip-runtime`, so client package state can
be refreshed without fabricating runtime facts.

The generated PR must remain liveState-only. CI should still run
`detect-live-state-only-change` or equivalent branch policy before merging. Code
semantics are documented in `docs/operations/release-status-codes.md`.

## Verification Layers

Local and CI verification are intentionally separated:

- static gates (`check:quick`) do not require PostgreSQL, Docker, or browsers;
- backend release gates require PostgreSQL and test schemas;
- Playwright UI smoke is a CI/browser-binary gate;
- Codex App local page verification should use the built-in Browser plugin.
- `profile:doctor` is the business-repository entry point for checking which
  services, client targets, and release modes are actually enabled before any
  deploy or smoke work starts.
- `release:status` is the operator entry point for answering whether the live
  environment and optional client release facts are fresh.
- `check:client-release` is a JS orchestrator so release checks keep labeled
  steps rather than a long package-script command chain.

The local Playwright wrapper fails in CI or when `RTNN_RUN_UI_SMOKE=true` and
Chromium is missing. Ordinary local smoke commands skip early with a message that
points operators to Codex Browser instead of asking them to install Chromium.

## Rollback

Rollback should operate on known image tags or deploy snapshots. Database schema rollback should not be automatic unless a project explicitly implements and verifies that strategy.
