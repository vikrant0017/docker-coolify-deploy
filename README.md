# Docker TODO demo

A small TODO platform built to learn **Docker development and deployment workflows**.

> Start with the beginner guide: [`docs/docker-guide.md`](docs/docker-guide.md). It explains what each Docker file does and, more importantly, why the project uses separate development and production configurations.

## Quick start: development

```sh
docker compose up --build
```

Open <http://localhost:5173> and sign in with:

```text
Username: demo
Password: demo123
```

For active development with source-file sync:

```sh
docker compose watch
```

- Vite hot-reloads UI changes.
- API/auth changes sync into containers but do not automatically restart. After completing a backend change, restart its container:

```sh
bun run --cwd apps/api docker:restart
bun run --cwd apps/auth docker:restart
```

Stop the development stack:

```sh
docker compose down
```

## Quick start: production-like run

This launches immutable production images locally. It intentionally uses port `8080`, leaving the development stack’s port `5173` distinct.

```sh
cp .env.production.example .env
# Edit .env and replace both database password values.
docker compose -f docker-compose.prod.yml up --build -d
```

Open <http://localhost:8080>. Stop it with:

```sh
docker compose -f docker-compose.prod.yml down
```

`docker-compose.prod.yml` is production-like, not a complete internet-facing production deployment. Review the guide before deploying it to a server.

## Deploy separate services with Coolify

Deploy these three **Docker Compose** applications from the repository. Each resource manages its own database and persistent named volume:

| Coolify resource | Compose file | Public domain |
| --- | --- | --- |
| Auth | `apps/auth/docker-compose.coolify.yml` | None |
| API | `apps/api/docker-compose.coolify.yml` | None |
| Web | `apps/web/docker-compose.coolify.yml` | Your production domain on container port `80` |

Deploy auth first, then API, then web. Enable **Connect to Predefined Network** on all three resources so Coolify can attach them to a shared network. Coolify suffixes service names on that network with each resource UUID; use the displayed resource UUIDs to set these required environment variables:

| Resource | Variable | Example value |
| --- | --- | --- |
| API | `AUTH_SERVICE_URL` | `http://auth-<auth-resource-uuid>:4001` |
| API | `WEB_ORIGIN` | `https://todo.example.com` |
| Web | `API_UPSTREAM` | `http://api-<api-resource-uuid>:4000` |

Assign `https://todo.example.com` to the web resource in its **Domains** setting, then use that exact origin for `WEB_ORIGIN`. Coolify’s proxy terminates TLS; the API, auth service, and databases do not receive domains or host-port mappings.

Coolify generates `SERVICE_PASSWORD_API_DB` and `SERVICE_PASSWORD_AUTH_DB` for the database credentials. The `api_pgdata` and `auth_pgdata` named volumes preserve data across redeployments.

> Coolify magic environment variables in these manifests require Coolify v4.0.0-beta.411 or newer when deploying from a Git source.

## Architecture

```text
Browser → Caddy / Vite UI → API (Bun) → Auth (Bun)
                              ↓           ↓
                           api-db       auth-db
                          PostgreSQL   PostgreSQL
```

Each folder under `apps/` is intentionally shaped like its own repository:

- `apps/web` — Vite UI in development; Caddy static site and API proxy in production
- `apps/api` — TODO API and its PostgreSQL database
- `apps/auth` — login service and its PostgreSQL database

The root Compose files are platform wrappers that include those child stacks. The development and production wrappers each create their own shared network automatically; no manual `docker network create` command is needed.
