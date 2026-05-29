import type {
  DueMode,
  Heaviness,
  WorkspaceType,
  Priority,
  Todo,
  TodoStatus,
} from "../types";

interface CreateTodoInput {
  parentId: string;
  parentType: WorkspaceType;
  title: string;
  description?: string;
  priority?: Priority;
  heaviness?: Heaviness;
  dueMode?: DueMode;
  dueTime?: string;
  x?: number;
  y?: number;
}

export function createTodo(input: CreateTodoInput): Todo {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    parentId: input.parentId,
    parentType: input.parentType,
    title: input.title,
    description: input.description ?? "",
    status: "not_started",
    x: input.x ?? 120,
    y: input.y ?? 120,
    priority: input.priority,
    heaviness: input.heaviness,
    dueMode: input.dueMode,
    dueTime: input.dueTime,
    dependencyIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function updateTodoStatus(todo: Todo, status: TodoStatus): Todo {
  const now = new Date().toISOString();

  return {
    ...todo,
    status,
    startedAt: status === "in_progress" ? now : todo.startedAt,
    completedAt: status === "done" ? now : todo.completedAt,
    updatedAt: now,
  };
}

export function moveTodo(todo: Todo, x: number, y: number): Todo {
  return {
    ...todo,
    x,
    y,
    updatedAt: new Date().toISOString(),
  };
}

export function addTodoDependency(todo: Todo, dependencyId: string): Todo {
  if (todo.dependencyIds.includes(dependencyId)) return todo;

  return {
    ...todo,
    dependencyIds: [...todo.dependencyIds, dependencyId],
    updatedAt: new Date().toISOString(),
  };
}

export function removeTodoDependency(todo: Todo, dependencyId: string): Todo {
  return {
    ...todo,
    dependencyIds: todo.dependencyIds.filter((id) => id !== dependencyId),
    updatedAt: new Date().toISOString(),
  };
}

export function isTodoBlocked(todo: Todo, allTodos: Todo[]): boolean {
  return todo.dependencyIds.some((dependencyId) => {
    const dependency = allTodos.find((item) => item.id === dependencyId);
    return dependency && dependency.status !== "done";
  });
}