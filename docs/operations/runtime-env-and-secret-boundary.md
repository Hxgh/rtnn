# Runtime Env And Secret Boundary

RTNN treats runtime env and secrets as deployment concerns. The template defines expected keys and validation behavior, but real values belong to private runtime env files, GitHub Environments, or secret managers.

## Public Configuration

Public or non-sensitive configuration can live in project metadata or documentation:

- repository names;
- application name;
- image name prefix;
- enabled services;
- environment names;
- public domains;
- non-sensitive bind port conventions;
- client distribution provider and retention policy.

## Secret Configuration

Secrets must not be committed:

- database URLs with credentials;
- JWT secrets;
- Redis passwords;
- GitHub tokens;
- SSH keys;
- signing keys;
- client release facts tokens;
- cloud storage credentials.

## Production Validation Gates

The backend keeps local template defaults usable in development and test, but
release-like runtimes are stricter.

The runtime is treated as protected when either condition is true:

- `NODE_ENV=production`;
- `DEPLOY_ENVIRONMENT` is not empty, `local`, `test`, or `development`.

Protected runtimes fail startup when:

- `JWT_ACCESS_SECRET` still equals the template default;
- `JWT_REFRESH_SECRET` still equals the template default;
- `CLIENT_RELEASE_FACTS_TOKEN` is empty.

This keeps local onboarding simple while preventing a release candidate from
silently using template secrets or accepting unauthenticated release facts.

## Recommended Sources

| Source                     | Use                                                            |
| -------------------------- | -------------------------------------------------------------- |
| Business project metadata  | Non-sensitive project identity and delivery choices.           |
| Deploy runtime env file    | Real runtime values used by Docker Compose or platform deploy. |
| GitHub Environment vars    | Non-secret deploy workflow configuration.                      |
| GitHub Environment secrets | Tokens and secret values used by CI.                           |
| External secret manager    | Optional production-grade secret source.                       |

## Agent Rule

Agents may read private local operational notes to understand context, but must only write sanitized, non-sensitive facts back to repositories.
