import { supabase } from "../lib/supabaseClient";
import type {
  Habit,
  Todo,
  TodoDependencyRow,
  TodoRow,
  WorkspaceRow,
  Workflow,
  Workspace,
} from "../types";

export const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";

function mapTodoRow(row: TodoRow, dependencyIds: string[]): Todo {
  return {
    id: row.id,
    parentId: row.workspace_id,
    parentType: row.workspace_type,

    title: row.title,
    description: row.description ?? "",
    status: row.status,

    x: Number(row.x),
    y: Number(row.y),

    priority: row.priority ?? undefined,
    heaviness: row.heaviness ?? undefined,

    dueMode: row.due_mode ?? undefined,
    dueTime: row.due_time ?? undefined,

    dependencyIds,

    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWorkspaceRow(row: WorkspaceRow, todos: Todo[]): Habit | Workflow {
  const base = {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    description: row.description ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    todos,
  };

  if (row.type === "habit") {
    return {
      ...base,
      type: "habit",
      mode: row.mode ?? "build_habit",
      resetFrequency: row.reset_frequency ?? "daily",
      resetTime: row.reset_time ?? undefined,
      noticeEnabled: row.notice_enabled ?? true,
      status: row.status === "archived" ? "archived" : "active",
      archivedAt: row.archived_at ?? undefined,
    };
  }

  return {
    ...base,
    type: "workflow",
    focusMinutes: row.focus_minutes ?? 25,
    restMinutes: row.rest_minutes ?? 5,
    status:
      row.status === "held" ||
      row.status === "completed" ||
      row.status === "destroyed"
        ? row.status
        : "active",
  };
}

export async function getMockUserWorkspaces(): Promise<Array<Habit | Workflow>> {
  const { data: workspaceRows, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", MOCK_USER_ID)
    .order("created_at", { ascending: true });

  if (workspaceError) throw workspaceError;

  const workspaceIds = (workspaceRows ?? []).map((workspace) => workspace.id);

  if (workspaceIds.length === 0) return [];

  const { data: todoRows, error: todoError } = await supabase
    .from("todos")
    .select("*")
    .in("workspace_id", workspaceIds);

  if (todoError) throw todoError;

  const { data: dependencyRows, error: dependencyError } = await supabase
    .from("todo_dependencies")
    .select("*");

  if (dependencyError) throw dependencyError;

  const allTodos = (todoRows ?? []).map((todoRow) => {
    const dependencyIds = ((dependencyRows ?? []) as TodoDependencyRow[])
      .filter((dependency) => dependency.todo_id === todoRow.id)
      .map((dependency) => dependency.depends_on_todo_id);

    return mapTodoRow(todoRow as TodoRow, dependencyIds);
  });

  return (workspaceRows ?? []).map((workspaceRow) => {
    const workspaceTodos = allTodos.filter(
      (todo) => todo.parentId === workspaceRow.id
    );

    return mapWorkspaceRow(workspaceRow as WorkspaceRow, workspaceTodos);
  });
}

export async function getMockUserHabits(): Promise<Habit[]> {
  const workspaces = await getMockUserWorkspaces();

  return workspaces.filter(
    (workspace): workspace is Habit => workspace.type === "habit"
  );
}

export async function getMockUserWorkflows(): Promise<Workflow[]> {
  const workspaces = await getMockUserWorkspaces();

  return workspaces.filter(
    (workspace): workspace is Workflow => workspace.type === "workflow"
  );
}

export async function getWorkspaceById(
  workspaceId: string
): Promise<Workspace | undefined> {
  const workspaces = await getMockUserWorkspaces();

  return workspaces.find((workspace) => workspace.id === workspaceId);
}

export async function updateBackendTodoPosition(
  todoId: string,
  x: number,
  y: number
): Promise<void> {
  const { error } = await supabase
    .from("todos")
    .update({
      x,
      y,
      updated_at: new Date().toISOString(),
    })
    .eq("id", todoId);

  if (error) throw error;
}

export async function updateBackendTodoStatus(
  todoId: string,
  status: "not_started" | "in_progress" | "done"
): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("todos")
    .update({
      status,
      started_at: status === "in_progress" ? now : null,
      completed_at: status === "done" ? now : null,
      updated_at: now,
    })
    .eq("id", todoId);

  if (error) throw error;
}

export async function createBackendTodo(input: {
  workspaceId: string;
  workspaceType: "habit" | "workflow";
  title: string;
  x: number;
  y: number;
}): Promise<Todo> {
  const { data, error } = await supabase
    .from("todos")
    .insert({
      workspace_id: input.workspaceId,
      workspace_type: input.workspaceType,
      title: input.title,
      description: "",
      status: "not_started",
      x: input.x,
      y: input.y,
      due_mode: input.workspaceType === "habit" ? "anytime" : null,
    })
    .select("*")
    .single();

  if (error) throw error;

  return mapTodoRow(data as TodoRow, []);
}