import { sql } from "bun";

type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

type TodoRequest = {
  text?: unknown;
  completed?: unknown;
};

const port = Number(Bun.env.PORT ?? 4000);
const authServiceUrl = Bun.env.AUTH_SERVICE_URL ?? "http://localhost:4001";
const validToken = "demo-token";
const corsHeaders = {
  "Access-Control-Allow-Origin": Bun.env.WEB_ORIGIN ?? "http://localhost:5173",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

async function initializeDatabase(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE
    )
  `;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders });
}

function noContent(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function isAuthenticated(request: Request): boolean {
  return request.headers.get("Authorization") === `Bearer ${validToken}`;
}

async function requestBody(request: Request): Promise<TodoRequest | null> {
  try {
    return (await request.json()) as TodoRequest;
  } catch {
    return null;
  }
}

function todoId(pathname: string): number | null {
  const id = Number(pathname.slice("/todos/".length));
  return Number.isInteger(id) && id > 0 ? id : null;
}

await initializeDatabase();

const server = Bun.serve({
  port,
  hostname: "0.0.0.0",
  async fetch(request) {
    const { pathname } = new URL(request.url);

    if (request.method === "OPTIONS") {
      return noContent();
    }

    if (request.method === "GET" && pathname === "/health") {
      return json({ status: "ok" });
    }

    if (request.method === "POST" && pathname === "/login") {
      try {
        const authResponse = await fetch(`${authServiceUrl}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: await request.text(),
        });
        const authBody = await authResponse.json();
        return json(authBody, authResponse.status);
      } catch {
        return json({ message: "Authentication service is unavailable." }, 503);
      }
    }

    if (!isAuthenticated(request)) {
      return json({ message: "Please log in to manage TODOs." }, 401);
    }

    if (request.method === "GET" && pathname === "/todos") {
      const todos = await sql<Todo[]>`
        SELECT id, text, completed
        FROM todos
        ORDER BY id
      `;
      return json(todos);
    }

    if (request.method === "POST" && pathname === "/todos") {
      const body = await requestBody(request);
      const text = typeof body?.text === "string" ? body.text.trim() : "";

      if (!text) {
        return json({ message: "A TODO needs some text." }, 400);
      }

      const [todo] = await sql<Todo[]>`
        INSERT INTO todos (text)
        VALUES (${text})
        RETURNING id, text, completed
      `;
      return json(todo, 201);
    }

    const id = todoId(pathname);
    if (id === null) {
      return json({ message: "Not found." }, 404);
    }

    if (request.method === "PATCH") {
      const body = await requestBody(request);
      if (typeof body?.completed !== "boolean") {
        return json({ message: "completed must be true or false." }, 400);
      }

      const [todo] = await sql<Todo[]>`
        UPDATE todos
        SET completed = ${body.completed}
        WHERE id = ${id}
        RETURNING id, text, completed
      `;

      return todo ? json(todo) : json({ message: "TODO not found." }, 404);
    }

    if (request.method === "DELETE") {
      const deleted = await sql<{ id: number }[]>`
        DELETE FROM todos
        WHERE id = ${id}
        RETURNING id
      `;

      return deleted.length > 0 ? noContent() : json({ message: "TODO not found." }, 404);
    }

    return json({ message: "Not found." }, 404);
  },
});

console.log(`TODO API listening on ${server.url}`);
