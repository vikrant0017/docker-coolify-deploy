# Docker TODO demo

A small multi-repository-style TODO platform for learning Docker Compose, Bun, PostgreSQL, and Docker networks.

```text
Browser → web (Vite) → api (Bun) → auth (Bun)
                         ↓            ↓
                    api-db       auth-db
                    PostgreSQL   PostgreSQL
```

Each folder below `apps/` represents an independently runnable repository with its own `docker-compose.yml`:

- `apps/web` — Vite UI
- `apps/api` — TODO API and its private PostgreSQL database
- `apps/auth` — login service and its private PostgreSQL database

The API and auth services share `devnet`, but each PostgreSQL database remains on the private default network of its own stack.

## Run all stacks together

Create the shared Docker network once per machine:

```sh
docker network create devnet
```

Then, from this repository root:

```sh
docker compose up --build
```

The root `docker-compose.yml` is a platform wrapper that includes the three child-stack Compose files; it does not duplicate their service definitions.

Open <http://localhost:5173> and log in with:

```text
Username: demo
Password: demo123
```

The auth service seeds this user into `auth-db` during startup. TODOs are persisted in `api-db`, so they survive API container restarts.

## Run one stack independently

All stacks still require the one-time `devnet` setup above. Start them from their own directories:

```sh
cd apps/auth && docker compose up --build
cd apps/api && docker compose up --build
cd apps/web && docker compose up --build
```

For the normal application flow, run all three stacks. The API reaches the auth service by its `devnet` service name, `http://auth:4001`.

## Ports

| Service | URL |
| --- | --- |
| Web | <http://localhost:5173> |
| API | <http://localhost:4000> |
| Auth | <http://localhost:4001> |

The PostgreSQL containers intentionally do not publish host ports. Cross-stack service traffic uses Docker DNS on `devnet`, never `localhost`.

Stop the full platform with:

```sh
docker compose down
```

Add `-v` to remove the database volumes and reset both the seeded auth database and saved TODOs.
