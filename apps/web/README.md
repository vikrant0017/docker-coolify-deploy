# TODO web service

This is the Vite frontend for the Docker TODO demo. In development it runs with Vite and hot reload; in production-like mode it is built into static files served by Caddy, which also proxies `/api` requests to the API service.

For the complete beginner-focused Docker explanation—including Compose Watch, development vs production images, databases, networks, Caddy, environment variables, and deployment limitations—read:

[`../../docs/docker-guide.md`](../../docs/docker-guide.md)

## Useful local commands

```sh
pnpm build
docker compose up --build
pnpm docker:watch
pnpm docker:logs
```

Run the root platform Compose wrapper to use the frontend with the API and auth services together.
