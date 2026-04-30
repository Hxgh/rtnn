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

## Live State

Business project metadata may include a `liveState` section, but it should be treated as a derived non-sensitive snapshot. It should be validated or refreshed from deploy executor facts.

Do not maintain live state manually in README files, chat notes, or ad hoc documents.

## Rollback

Rollback should operate on known image tags or deploy snapshots. Database schema rollback should not be automatic unless a project explicitly implements and verifies that strategy.
