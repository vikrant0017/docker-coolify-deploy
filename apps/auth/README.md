# TODO auth service

This is the Bun authentication service for the Docker TODO demo. It seeds and validates the demo user in its PostgreSQL database.

For the complete beginner-focused Docker explanation—including development Watch mode, manual backend restarts, production image stages, databases, networks, Caddy, and deployment limitations—read the repository guide:

[`../../docs/docker-guide.md`](../../docs/docker-guide.md)

## Configuration

For a standalone local run, create a local environment file:

```sh
cp .env.example .env
```

Replace `AUTH_DB_PASSWORD` with a strong, unique value before using `docker-compose.prod.yml`. For Coolify, use [`.env.coolify.example`](.env.coolify.example) as the values to enter in Coolify; its `AUTH_DB_PASSWORD` is required.

## Useful local commands

```sh
bun run check
docker compose up --build
bun run docker:watch
bun run docker:restart
bun run docker:logs
```

Run the root platform Compose wrapper when you want API and auth to communicate as part of the full application.
