# Agent Operation Model

This document defines how future agents should work with an RTNN ecosystem.

## Reading Order

An agent should start from the concrete business repository, not from the template repository:

1. business repository `CLAUDE.md`;
2. business repository project metadata, such as `.rtnn/project.json`;
3. business repository `docs/operations/*`;
4. template repository `docs/operations/*` for reusable models;
5. deploy executor facts for actual runtime state.

## Boundary

- Use `rtnn` to understand generic operational models.
- Use the business repository to understand the current private practice.
- Use the deploy executor to query and change runtime state.
- Use GitHub Environments and runtime env files for secrets and environment-specific values.

## Runtime Fact Query

Agents should prefer executable runtime fact reports over stale notes. A deploy executor should provide a command that returns non-sensitive facts about versions, images, URLs, and health.

## Write Policy

Agents may write:

- generic operational models to `rtnn`;
- sanitized private practice notes to a private business repository;
- deploy scripts and runbooks to the deploy executor.

Agents must not write:

- secrets;
- private SSH material;
- database credentials;
- full copies of sensitive local server notes;
- one operator's real server facts into the open template repository.
