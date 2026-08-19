# TODO web service

This is the Vite frontend for the Docker TODO demo. In development it runs with Vite and hot reload; in production-like mode it is built into static files served by Caddy, which also proxies `/api` requests to the API service.

For the complete beginner-focused Docker explanation—including Compose Watch, development vs production images, databases, networks, Caddy, environment variables, and deployment limitations—read:

[`../../docs/docker-guide.md`](../../docs/docker-guide.md)

## Configuration

For a standalone local run, create a local environment file:

```sh
cp .env.example .env
```

`VITE_API_URL` is for local Vite development and `WEB_PORT` is used by `docker-compose.prod.yml`. For the separate Coolify deployment, use [`.env.coolify.example`](.env.coolify.example) as the values to enter in Coolify. API is reached at the stable `todo-api` alias on the external `coolify` Docker network.

## Useful local commands

```sh
pnpm build
docker compose up --build
pnpm docker:watch
pnpm docker:logs
```

Run the root platform Compose wrapper to use the frontend with the API and auth services together.
