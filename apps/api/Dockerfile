FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS dev
COPY . .
EXPOSE 4000
CMD ["bun", "src/server.ts"]

FROM dependencies AS build
COPY . .
RUN bun build src/server.ts --outdir dist --target bun

FROM oven/bun:1-alpine AS prod
WORKDIR /app
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["bun", "dist/server.js"]
