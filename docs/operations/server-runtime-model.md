# Server Runtime Model

`rtnn` does not own, describe, or assume any real production server. This document defines the reusable RTNN server runtime model that a private business project can implement.

## Positioning

- `rtnn` provides operational models, contracts, scripts, and best-practice scaffolding.
- A business project, such as a private project derived from `rtnn`, maps this model to real domains, ports, directories, and deployment decisions.
- A deploy executor project performs deployment, rollback, smoke checks, runtime env injection, and runtime fact collection.

## Recommended Layers

An RTNN runtime is organized into these layers:

- Ingress: Nginx, Caddy, cloud load balancer, or another edge gateway.
- Deploy executor: the repository or runner that performs deploy, rollback, smoke, and facts collection.
- Runtime services: backend, admin, app, and optional weapp containers or processes.
- Shared infrastructure: database, cache, object storage, static distribution, monitoring.
- Runtime facts: generated non-sensitive facts about active versions, images, URLs, and health status.

## Baseline Topology

The baseline topology is a single-host Docker Compose deployment:

- one compose project per environment;
- one internal network for runtime services;
- one ingress-facing network or host-level reverse proxy;
- environment-specific bind ports for health checks and reverse proxy targets;
- runtime env files or CI secrets for secrets and per-environment values.

This baseline is intentionally simple. It can later be replaced by multi-host, Kubernetes, or managed platforms without changing the application contract.

## Non-Goals

`rtnn` must not contain:

- real server IPs or SSH details;
- real domains owned by a specific operator;
- real runtime roots or static directories;
- database connection strings;
- JWT, Redis, GitHub, or deploy tokens;
- production-only operational notes for one private server.
