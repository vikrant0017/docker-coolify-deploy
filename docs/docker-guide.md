# Docker learning guide: the complete setup

This repository is intentionally a **Docker learning demo**, not a template to expose directly to the public internet. It has enough moving parts to demonstrate real Docker ideas—images, containers, Compose, volumes, networks, health checks, source sync, multi-stage builds, secrets, and a reverse proxy—without adding unrelated application complexity.

The most important idea is this:

> **Development containers are optimized for changing code. Production containers are optimized for running unchanged code.**

---

## 1. What starts when the application runs?

The complete platform has five services:

```text
Browser
  │
  ├─ development: Vite web server on :5173
  └─ production-like: Caddy web server on :8080
                         │
                         ▼
                    API (Bun)
                         │
                         ▼
                   Auth (Bun)

API  ─────────────── API PostgreSQL database
Auth ─────────────── Auth PostgreSQL database
```

| Service | Job | Development host port | Production-like host port |
| --- | --- | --- | --- |
| `web` | Shows the TODO UI | `5173` | `8080` |
| `api` | Stores and returns TODOs | `4000` | none |
| `auth` | Validates the demo login | `4001` | none |
| `api-db` | Stores TODO records | none | none |
| `auth-db` | Stores the seeded demo user | none | none |

In production-like mode, only the web service is published to the host. Caddy forwards browser API requests to the API over Docker’s internal network.

---

## 2. Docker vocabulary used in this project

| Term | Meaning in simple words | Example here |
| --- | --- | --- |
| **Dockerfile** | Recipe for creating an image. | `apps/api/Dockerfile` |
| **Image** | A packaged filesystem and command ready to run. | `todo-platform-api` |
| **Container** | A running copy of an image. | `todo-platform-api-1` |
| **Compose** | YAML that describes multiple containers working together. | `docker-compose.yml` |
| **Service** | A named container definition in Compose. | `api`, `auth-db` |
| **Volume** | Docker-managed persistent storage. | `api_pgdata` |
| **Network** | A private virtual network for containers. | `api-private` |
| **Build stage** | A named phase inside a Dockerfile. | `dev`, `build`, `prod` |
| **Health check** | A periodic test that says whether a service is ready. | `pg_isready` |

A container is disposable. Deleting and recreating an API container should be safe; the database volume, not the container filesystem, holds the important data.

---

## 3. File map: where every Docker decision lives

```text
.
├── docker-compose.yml                 Development platform wrapper
├── docker-compose.prod.yml            Production-like platform wrapper
├── .env.production.example            Safe-to-commit example production variables
├── .gitignore                         Prevents the real .env being committed
├── docs/docker-guide.md               This guide
│
├── apps/web/
│   ├── Dockerfile                     Node/Vite dev stage and Caddy production stage
│   ├── docker-compose.yml             Web development Compose Watch settings
│   ├── docker-compose.prod.yml        Static Caddy production service
│   ├── .docker/Caddyfile              Static-file and /api reverse-proxy rules
│   └── .dockerignore                  Excludes host-only files from image builds
│
├── apps/api/
│   ├── Dockerfile                     Bun dev stage and bundled production stage
│   ├── docker-compose.yml             API + Postgres development stack
│   ├── docker-compose.prod.yml        API + Postgres production-like stack
│   └── .dockerignore
│
└── apps/auth/
    ├── Dockerfile                     Bun dev stage and bundled production stage
    ├── docker-compose.yml             Auth + Postgres development stack
    ├── docker-compose.prod.yml        Auth + Postgres production-like stack
    └── .dockerignore
```

The `apps` folders are structured as though they could become independent repositories. Each has its own Compose files. The root files are optional **platform wrappers** that include all three service stacks for the convenient “run everything” workflow.

---

## 4. Development mode: edit code quickly

### Start every service

From the repository root:

```sh
docker compose up --build
```

- `--build` asks Docker to build images before starting containers.
- The first run takes longer because images and dependencies must be downloaded.
- Later runs reuse cached build layers when possible.

Open <http://localhost:5173> and use:

```text
username: demo
password: demo123
```

### What the development platform wrapper does

The root `docker-compose.yml` uses Compose `include:` to load each child development stack. It then attaches `web`, `api`, and `auth` to one automatically-created shared network.

```text
web ───┐
api ───┼── todo-platform_devnet
 auth ─┘
```

Docker gives each service a DNS name matching its service name. That is why API can call:

```text
http://auth:4001
```

It does **not** use `localhost`: inside the API container, `localhost` means the API container itself.

### Why database networks are private

The API and its database share `api-private`. Auth and its database share `auth-private`.

```text
api  ↔ api-db
 auth ↔ auth-db
```

The databases do not join the shared platform network.

**Why:** web needs API, and API needs auth, but web does not need database access. This is the basic security idea of *least privilege*: only allow each service to communicate with what it truly needs.

### Start one stack only

Each app Compose file can still run on its own:

```sh
cd apps/api && docker compose up --build
cd apps/auth && docker compose up --build
cd apps/web && docker compose up --build
```

This is useful while focusing on one service. A standalone API stack can create TODOs in its own database, but login will not work unless auth is also reachable. Use the root platform wrapper for the full browser flow.

---

## 5. Development mode: Compose Watch and source synchronization

Run:

```sh
docker compose watch
```

Compose Watch observes files on your computer and copies changes into the appropriate running container.

### Watch actions in this project

| Changed file type | Compose Watch action | Why |
| --- | --- | --- |
| Application source | `sync` into `/app` | Fast iteration; no image rebuild required. |
| `package.json` | `rebuild` | Dependencies may have changed. |
| `bun.lock` / `pnpm-lock.yaml` | `rebuild` | The exact dependency set may have changed. |
| `node_modules`, `dist`, `.git` | ignored | They are host-only/generated files and should not be synced. |

### UI: Vite hot reload

The web development image runs Vite. When Watch syncs `src/main.ts` or `src/style.css`, Vite detects the change and updates the browser.

```text
edit web source → Compose sync → Vite notices → browser updates
```

`CHOKIDAR_USEPOLLING=true` is set for the web service. It makes file detection more reliable in containerized environments where filesystem events can be inconsistent.

### API/auth: sync, then manually restart

API and auth deliberately run plain Bun commands:

```text
bun src/server.ts
```

They do **not** use `bun --hot`.

```text
edit backend source → Compose sync → running server keeps old code
                                     ↓
                           manually restart when ready
```

Use:

```sh
bun run --cwd apps/api docker:restart
bun run --cwd apps/auth docker:restart
```

**Why not hot reload the backend?** A backend change often touches several files. While those changes are incomplete, a watcher can restart the service into a broken state. Manual restart gives you control: finish a logical change, check it, then restart once.

### Development aliases

API/auth use Bun aliases; web uses pnpm aliases.

| Alias | What it does |
| --- | --- |
| `docker:up` | Build and start that app’s Compose stack. |
| `docker:watch` | Run Compose Watch for that app. |
| `docker:restart` | Restart API or auth after synced code changes. |
| `docker:stop` / `docker:start` | Stop/start one application container. |
| `docker:logs` | Follow logs for one application container. |
| `docker:prod:up` / `docker:prod:down` | Start/stop that app’s production-like Compose stack. |

Examples:

```sh
bun run --cwd apps/api docker:logs
bun run --cwd apps/auth docker:restart
pnpm --dir apps/web docker:watch
```

---

## 6. Dockerfiles: why they have multiple stages

All three Dockerfiles use the same broad pattern:

```text
base → dependencies → dev
                    → build → prod
```

A Dockerfile can contain more than one image recipe. Compose selects the one it needs with `target: dev` or `target: prod`.

### `base`

Sets the runtime image and working folder.

- Web begins with `node:22-alpine` because Vite/pnpm run on Node.
- API/auth begin with `oven/bun:1-alpine` because their source uses Bun APIs.

`alpine` images are relatively small, which makes image transfers and rebuilds faster.

### `dependencies`

Copies only dependency manifests first, then installs dependencies:

```dockerfile
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
```

**Why copy manifests before source?** Docker caches layers. Editing `src/server.ts` does not change `package.json` or `bun.lock`, so Docker can reuse the dependency-install layer instead of downloading everything again.

`--frozen-lockfile` means “install exactly what the lockfile says.” This makes builds repeatable.

### `dev`

The development Compose files specify `target: dev`.

- Web runs the Vite server on port `5173`.
- API/auth run TypeScript source directly with Bun.
- Source is present in the image so ordinary `docker compose up` works before Watch starts.

### `build` and `prod`

Production is a two-step process:

1. A `build` stage produces artifacts.
2. A smaller `prod` stage copies only those artifacts.

For Bun services:

```dockerfile
RUN bun build src/server.ts --outdir dist --target bun
```

For the web service:

```dockerfile
RUN pnpm build
```

The final production images do not contain TypeScript source, Vite, pnpm, or source watchers.

**Why:** production containers should be immutable. If code changes, build and deploy a new image instead of editing the running container.

---

## 7. Production-like mode: test deployment behavior locally

The production-like files are for learning how a deployment differs from development. They are not a complete public-internet deployment.

### Create local environment values

```sh
cp .env.production.example .env
```

Edit `.env` and replace both example passwords. Do not commit it.

| Variable | Used by | Why it exists |
| --- | --- | --- |
| `API_DB_PASSWORD` | API and `api-db` | Keeps the API database password out of Git. |
| `AUTH_DB_PASSWORD` | Auth and `auth-db` | Keeps the auth database password out of Git. |
| `WEB_PORT` | Caddy Compose port mapping | Lets you choose the host port; default is `8080`. |
| `WEB_ORIGIN` | API CORS setting | Identifies the browser origin permitted to call API. |

`.gitignore` excludes `.env`, while `.env.production.example` stays committed as documentation.

### Start the production-like platform

```sh
docker compose -f docker-compose.prod.yml up --build -d
```

- `-d` means detached/background mode.
- Open <http://localhost:8080>.
- Only Caddy is published to the host.

### Stop it

```sh
docker compose -f docker-compose.prod.yml down
```

To intentionally remove database data too:

```sh
docker compose -f docker-compose.prod.yml down -v
```

`-v` is destructive for this demo: it deletes named PostgreSQL volumes and therefore all saved TODOs and the seeded auth database.

---

## 8. Caddy: the production web entry point

In development, Vite serves the UI. In production-like mode, Caddy serves the static files built by Vite.

The Caddyfile has two jobs:

```caddyfile
handle_path /api/* {
  reverse_proxy {$API_UPSTREAM:http://api:4000}
}

handle {
  try_files {path} /index.html
  file_server
}
```

### Serve the single-page app

`file_server` serves files from `/usr/share/caddy`. `try_files {path} /index.html` ensures that an unknown frontend route returns the app’s `index.html` instead of a 404. This is the normal behavior needed by single-page applications.

### Reverse proxy `/api`

The production frontend is built with:

```text
VITE_API_URL=/api
```

When the browser calls `/api/login`:

```text
browser → Caddy :8080 → API :4000 → auth :4001
```

`handle_path` removes the `/api` prefix, so API receives `/login`, which matches its routes. `API_UPSTREAM` defaults to `http://api:4000` for the local platform wrapper. The standalone Coolify web deployment sets it to the separately deployed API resource’s hostname instead.

**Why proxy instead of exposing API port 4000?** The browser sees one public origin. API/auth/database traffic stays internal. This reduces exposed ports and makes a future HTTPS/domain setup simpler.

### Caddy and HTTPS

Caddy can automatically obtain and renew HTTPS certificates when configured with a real public domain and reachable ports `80` and `443`.

This demo deliberately uses `:80` inside the container and maps it to local host port `8080`, so it stays plain HTTP. Local development does not need real certificates. Before public deployment, configure a domain, firewall rules, and TLS intentionally.

---

## 9. Databases, health checks, and persistence

### Two Postgres containers

The demo uses two databases to make service ownership visible:

| Database | Owned by | Stores |
| --- | --- | --- |
| `api-db` | API service | TODO records |
| `auth-db` | Auth service | The seeded `demo` user |

The auth service creates its `users` table and inserts the demo account if it does not already exist. API creates its `todos` table on startup.

### Named volumes

Each Postgres service mounts a named volume at:

```text
/var/lib/postgresql/data
```

This is where Postgres keeps database files.

**Why use a volume?** Containers can be replaced during rebuilds. Without a volume, replacing the database container would delete its filesystem and your data. A named volume survives `docker compose down` unless you add `-v`.

### Health checks and `depends_on`

Postgres can take a few seconds to become ready after its container starts. The Compose files use:

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U apiuser -d apidb"]
```

API/auth use:

```yaml
depends_on:
  api-db:
    condition: service_healthy
```

**Why:** “container started” does not mean “database accepts connections.” Health checks prevent a common first-start failure where the application attempts a database connection too early.

API and auth also have HTTP health checks at `/health`, so Compose can show whether their processes are serving requests.

---

## 10. Development vs production comparison

| Topic | Development configuration | Production-like configuration |
| --- | --- | --- |
| Root file | `docker-compose.yml` | `docker-compose.prod.yml` |
| Docker target | `dev` | `prod` |
| Web server | Vite | Caddy |
| Browser port | `5173` | `8080` |
| Source updates | Compose Watch sync | None |
| Backend reload | Manual restart | Replace container/image on deploy |
| API/auth host ports | Exposed for debugging | Not published |
| Database passwords | Demo values in YAML | Required from `.env` |
| Restart policy | Default | `unless-stopped` |
| UI API URL | `http://localhost:4000` | `/api` via Caddy |

---

## 11. Inspecting and debugging Docker

### See running containers

```sh
docker compose ps
docker compose -f docker-compose.prod.yml ps
```

### Read logs

```sh
docker compose logs -f
docker compose logs -f api
docker compose logs -f auth
docker compose logs -f web
```

### Verify the final Compose configuration

Compose combines includes, defaults, and environment variables. This command prints the final result Docker will use:

```sh
docker compose config
docker compose -f docker-compose.prod.yml config
```

### Open a shell in a running service

```sh
docker compose exec api sh
docker compose exec auth sh
```

This is useful for learning, but avoid fixing production containers by hand. A production fix should become source code and a newly built image.

### Common problems

| Symptom | Likely cause | First thing to check |
| --- | --- | --- |
| Browser cannot load UI | Web container is not running or port is occupied | `docker compose ps`, then `docker compose logs web` |
| Login returns unavailable | API cannot reach auth | `docker compose logs api auth` |
| API exits on startup | Database is unavailable or credentials are wrong | `docker compose logs api api-db` |
| TODOs disappeared | Volumes were removed with `down -v` | Check the command history; restart normally without `-v` next time |
| UI edit does not appear | Watch is not running | Run `docker compose watch` and check web logs |
| Backend edit has no effect | This is intentional | Run `bun run --cwd apps/api docker:restart` or auth equivalent |

---

## 12. Security and deployment limits

This project is educational. Do **not** deploy it unchanged to a public server.

1. **Authentication is intentionally insecure.** Passwords are stored as plain text and the bearer token is fixed. A real app needs password hashing, signed/expiring tokens or sessions, rate limiting, and HTTPS.
2. **The production-like Compose stack is local infrastructure.** Use a hosting platform secret store, Docker secrets, or a dedicated secret manager for real credentials.
3. **Postgres volumes are not backups.** They survive normal container replacement but not disk loss, accidental volume removal, or corruption. Use backup and recovery plans.
4. **Caddy is configured for local HTTP.** Configure a real domain, TLS, firewall rules, and trusted reverse-proxy settings for public deployment.
5. **No monitoring or alerting is configured.** Production systems need logs, metrics, alerts, and update policies.
6. **A managed database is often better.** Managed PostgreSQL commonly provides backups, patching, replication, and recovery tooling.

---

## 13. Command cheat sheet

| Goal | Command |
| --- | --- |
| Start full development platform | `docker compose up --build` |
| Work with synced files/HMR | `docker compose watch` |
| Stop development platform | `docker compose down` |
| View development status | `docker compose ps` |
| Restart API after edits | `bun run --cwd apps/api docker:restart` |
| Restart auth after edits | `bun run --cwd apps/auth docker:restart` |
| Start production-like platform | `docker compose -f docker-compose.prod.yml up --build -d` |
| Stop production-like platform | `docker compose -f docker-compose.prod.yml down` |
| Reset production-like databases | `docker compose -f docker-compose.prod.yml down -v` |
| Inspect merged Compose config | `docker compose config` |

## 14. The takeaway

Use the development setup when you are learning or writing code: it favors visibility, source sync, and quick feedback.

Use the production-like setup when you want to test how deployment should behave: it favors immutable images, fewer exposed ports, environment-based secrets, automatic restarts, static asset serving, and internal service-to-service networking.

That distinction—**editable containers for development, immutable images for deployment**—is the main Docker lesson this project demonstrates.
