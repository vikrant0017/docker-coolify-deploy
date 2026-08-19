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
