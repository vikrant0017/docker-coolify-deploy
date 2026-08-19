# TODO auth service

This is the Bun authentication service for the Docker TODO demo. It seeds and validates the demo user in its PostgreSQL database.

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

Run the root platform Compose wrapper when you want API and auth to communicate as part of the full application.
