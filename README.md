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

Deploy auth first, then API, then web. The Coolify manifests explicitly attach only `web`, `api`, and `auth` to the external Docker network named `coolify`, which is created by Coolify’s proxy installation. They use stable aliases on that network, so do not rely on the **Connect to Predefined Network** toggle or UUID-suffixed hostnames.

| Resource | Variable | Example value |
| --- | --- | --- |
| Auth | `AUTH_DB_PASSWORD` | A strong, unique database password |
| API | `API_DB_PASSWORD` | A strong, unique database password |
| API | `AUTH_SERVICE_URL` | `http://todo-auth:4001` |
| API | `WEB_ORIGIN` (optional) | `https://todo.example.com`, only when browsers call API directly |
| Web | `API_UPSTREAM` | `http://todo-api:4000` |

Assign a domain to the web resource when you are ready to expose it. Caddy proxies browser `/api` requests to API internally, so they are same-origin and `WEB_ORIGIN` can remain unset. Set it to the exact public web origin only if a browser will call API directly. Coolify’s proxy terminates TLS; the API, auth service, and databases do not receive domains or host-port mappings.

Set the database passwords yourself in Coolify; each value is used both to initialize its PostgreSQL service and to construct the corresponding app’s `DATABASE_URL`. The `api_pgdata` and `auth_pgdata` named volumes preserve data across redeployments.

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
