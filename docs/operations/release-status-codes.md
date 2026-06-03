# Release Status Codes

`release:status` and `release:status:ci` expose stable `status` and `code`
fields. CI and deploy integrations should branch on these fields instead of
parsing human-readable messages.

| Code | Status | Meaning | Next action |
| --- | --- | --- | --- |
| `OK` | `fresh` | All enabled checks passed. | No liveState write-back is needed. |
| `PROFILE_SKIPPED` | `skipped` | The caller explicitly skipped profile preflight. | Use only when an equivalent profile gate already ran. |
| `PROFILE_WARNING` | `blocked` | Project profile warnings are blocking under strict profile mode. | Fix delivery/profile metadata and rerun. |
| `PROFILE_ERROR` | `blocked` | Project profile cannot be resolved. | Fix `.rtnn/project.json` or template environment. |
| `MISSING_PROJECT_METADATA` | `blocked` | `.rtnn/project.json` is missing. | Run template initialization or sync project metadata. |
| `INVALID_PROJECT_METADATA` | `blocked` | Project metadata violates the business repository contract. | Fix repository, deployment, environment, or release execution metadata. |
| `RUNTIME_FACTS_MISSING` | `blocked` | No runtime facts file was provided. | Download or pass the deploy runtime facts artifact. |
| `RUNTIME_FACTS_INVALID` | `blocked` | Runtime facts JSON, schema, or environment data cannot be parsed. | Fix deploy facts generation or pass the expected environment. |
| `RUNTIME_FACTS_UNSAFE` | `blocked` | Runtime facts contain suspected secrets, tokens, or connection strings. | Stop write-back, clean artifacts, and fix deploy output boundaries. |
| `RUNTIME_BINDING_MISMATCH` | `blocked` | Runtime facts binding does not match the business repository. | Check source repository, application, image prefix, and event configuration. |
| `RUNTIME_FACTS_STALE` | `stale` | Runtime facts and `.rtnn/project.json liveState` differ. | Confirm the live runtime, then prepare a liveState-only PR or debug deployment. |
| `PRODUCTION_READINESS_SKIPPED` | `skipped` | The optional testing freshness check was skipped during production readiness. | Pass deploy runtime facts when promotion should require fresh testing state. |
| `PRODUCTION_READINESS_INVALID` | `blocked` | Production promote prerequisites are not satisfied. | Fix tag, source SHA, production policy, or testing freshness and rerun. |
| `CLIENT_ARTIFACTS_MISSING` | `blocked` | Client release checking was requested without artifacts. | Download release-clients artifacts. |
| `CLIENT_ARTIFACTS_INVALID` | `blocked` | Client release artifacts cannot be parsed or have no valid manifest. | Regenerate client release artifacts. |
| `CLIENT_LIVE_STATE_STALE` | `stale` | Client release facts and `liveState.<env>.clients` differ. | Confirm client facts, then prepare a liveState-only PR. |
| `CLIENT_LIVE_STATE_SKIPPED` | `skipped` | Client release checking was skipped because no artifacts were provided. | Keep skipped for runtime-only checks, or pass client artifacts. |

Status semantics:

- `fresh`: the checked runtime/client facts match the business repository.
- `stale`: the facts are valid but differ from the derived `liveState`.
- `blocked`: a contract, safety, or input problem prevents a trustworthy answer.
- `skipped`: an optional check was explicitly or implicitly skipped.

`stale` is not automatically safe to write back. It means the facts and
business repository disagree. Write-back should happen only through
`release:prepare-live-state-pr` or `release:prepare-live-state-pr:ci`, and the
resulting PR must remain liveState-only.
