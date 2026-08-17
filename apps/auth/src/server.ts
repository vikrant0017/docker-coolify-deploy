import { sql } from "bun";

type LoginRequest = {
  username?: unknown;
  password?: unknown;
};

type User = {
  username: string;
};

const port = Number(Bun.env.PORT ?? 4001);
const demoUser = {
  username: "demo",
  password: "demo123",
  token: "demo-token",
};

async function initializeDatabase(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `;

  await sql`
    INSERT INTO users (username, password)
    VALUES (${demoUser.username}, ${demoUser.password})
    ON CONFLICT (username) DO NOTHING
  `;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

async function requestBody(request: Request): Promise<LoginRequest | null> {
  try {
    return (await request.json()) as LoginRequest;
  } catch {
    return null;
  }
}

await initializeDatabase();

const server = Bun.serve({
  port,
  hostname: "0.0.0.0",
  async fetch(request) {
    const { pathname } = new URL(request.url);

    if (request.method === "GET" && pathname === "/health") {
      return json({ status: "ok" });
    }

    if (request.method === "POST" && pathname === "/login") {
      const body = await requestBody(request);
      const username = typeof body?.username === "string" ? body.username : "";
      const password = typeof body?.password === "string" ? body.password : "";
      const users = await sql<User[]>`
        SELECT username
        FROM users
        WHERE username = ${username} AND password = ${password}
        LIMIT 1
      `;

      if (users.length > 0) {
        return json({ token: demoUser.token, username: users[0]!.username });
      }

      return json({ message: "Invalid username or password." }, 401);
    }

    return json({ message: "Not found." }, 404);
  },
});

console.log(`Auth service listening on ${server.url}`);
