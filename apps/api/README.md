# TODO API service

This is the Bun API service for the Docker TODO demo. It owns TODO CRUD operations and its PostgreSQL database.

For the complete beginner-focused Docker explanation—including development Watch mode, manual backend restarts, production image stages, databases, networks, Caddy, and deployment limitations—read the repository guide:

[`../../docs/docker-guide.md`](../../docs/docker-guide.md)

## Useful local commands

```sh
bun run check
docker compose up --build
bun run docker:watch
bun run docker:restart
bun run docker:logs
```

Run the root platform Compose wrapper when you need API to connect to the auth service and want the full browser flow.
