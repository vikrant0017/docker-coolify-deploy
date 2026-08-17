import "./style.css";

type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

type LoginResponse = {
  token: string;
  username: string;
};

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
let token = "";
let todos: Todo[] = [];

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Request failed.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function showLogin(errorMessage = ""): void {
  document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
    <main class="page">
      <section class="card login-card" aria-labelledby="login-title">
        <p class="eyebrow">Docker TODO demo</p>
        <h1 id="login-title">Welcome back</h1>
        <p class="intro">Log in to manage a small PostgreSQL-backed TODO list.</p>
        <form id="login-form">
          <label for="username">Username</label>
          <input id="username" name="username" autocomplete="username" required autofocus>

          <label for="password">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required>

          <p id="login-error" class="error" role="alert">${errorMessage}</p>
          <button type="submit">Log in</button>
        </form>
        <p class="credentials"><strong>Demo login</strong><br>Username: <code>demo</code> &middot; Password: <code>demo123</code></p>
      </section>
    </main>
  `;

  document.querySelector<HTMLFormElement>("#login-form")!.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const error = document.querySelector<HTMLParagraphElement>("#login-error")!;
    const credentials = Object.fromEntries(new FormData(form));

    submitButton.disabled = true;
    error.textContent = "";

    try {
      const login = await request<LoginResponse>("/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      token = login.token;
      await loadTodos();
      showTodos(login.username);
    } catch (loginError) {
      error.textContent = messageFrom(loginError);
    } finally {
      submitButton.disabled = false;
    }
  });
}

async function loadTodos(): Promise<void> {
  todos = await request<Todo[]>("/todos");
}

function renderTodoList(): void {
  const list = document.querySelector<HTMLUListElement>("#todo-list")!;
  list.replaceChildren();

  if (todos.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No TODOs yet. Add your first one above.";
    list.append(empty);
    return;
  }

  for (const todo of todos) {
    const item = document.createElement("li");
    item.className = "todo-item";

    const label = document.createElement("label");
    label.className = "todo-label";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.setAttribute("aria-label", `Mark ${todo.text} as ${todo.completed ? "incomplete" : "complete"}`);
    checkbox.addEventListener("change", () => updateTodo(todo.id, checkbox.checked));

    const text = document.createElement("span");
    text.textContent = todo.text;
    if (todo.completed) text.classList.add("completed");

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", `Delete ${todo.text}`);
    remove.addEventListener("click", () => deleteTodo(todo.id));

    label.append(checkbox, text);
    item.append(label, remove);
    list.append(item);
  }
}

function showTodos(username: string): void {
  document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
    <main class="page">
      <section class="card" aria-labelledby="todos-title">
        <header class="app-header">
          <div>
            <p class="eyebrow">Signed in as ${username}</p>
            <h1 id="todos-title">My TODOs</h1>
          </div>
          <button id="logout" type="button" class="secondary-button">Log out</button>
        </header>

        <form id="todo-form" class="todo-form">
          <label class="visually-hidden" for="todo-text">New TODO</label>
          <input id="todo-text" name="text" placeholder="What needs doing?" required maxlength="200">
          <button type="submit">Add TODO</button>
        </form>
        <p id="todo-error" class="error" role="alert"></p>
        <ul id="todo-list" class="todo-list" aria-live="polite"></ul>
      </section>
    </main>
  `;

  document.querySelector<HTMLButtonElement>("#logout")!.addEventListener("click", () => {
    token = "";
    todos = [];
    showLogin();
  });

  document.querySelector<HTMLFormElement>("#todo-form")!.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const input = form.querySelector<HTMLInputElement>("#todo-text")!;
    const error = document.querySelector<HTMLParagraphElement>("#todo-error")!;

    try {
      const todo = await request<Todo>("/todos", {
        method: "POST",
        body: JSON.stringify({ text: input.value }),
      });
      todos.push(todo);
      input.value = "";
      error.textContent = "";
      renderTodoList();
      input.focus();
    } catch (todoError) {
      error.textContent = messageFrom(todoError);
    }
  });

  renderTodoList();
}

async function updateTodo(id: number, completed: boolean): Promise<void> {
  const error = document.querySelector<HTMLParagraphElement>("#todo-error")!;

  try {
    const updated = await request<Todo>(`/todos/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    });
    todos = todos.map((todo) => (todo.id === id ? updated : todo));
    error.textContent = "";
    renderTodoList();
  } catch (updateError) {
    error.textContent = messageFrom(updateError);
    renderTodoList();
  }
}

async function deleteTodo(id: number): Promise<void> {
  const error = document.querySelector<HTMLParagraphElement>("#todo-error")!;

  try {
    await request<void>(`/todos/${id}`, { method: "DELETE" });
    todos = todos.filter((todo) => todo.id !== id);
    error.textContent = "";
    renderTodoList();
  } catch (deleteError) {
    error.textContent = messageFrom(deleteError);
  }
}

showLogin();
