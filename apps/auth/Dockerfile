FROM oven/bun:1-alpine

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
EXPOSE 4001
CMD ["bun", "--hot", "src/server.ts"]
