export type WorkspaceRow = {
  id: string;
  user_id: string;
  type: "habit" | "workflow";
  title: string;
  description: string | null;

  mode: "one_time" | "build_habit" | null;
  reset_frequency: "daily" | "weekly" | "monthly" | null;
  reset_time: string | null;
  notice_enabled: boolean | null;

  focus_minutes: number | null;
  rest_minutes: number | null;
  status: "active" | "held" | "completed" | "destroyed" | "archived" | null;
  archived_at: string | null;

  created_at: string;
  updated_at: string;
};

export type TodoRow = {
  id: string;
  workspace_id: string;
  workspace_type: "habit" | "workflow";

  title: string;
  description: string | null;
  status: "not_started" | "in_progress" | "done";

  x: number | string;
  y: number | string;

  priority: "low" | "medium" | "high" | null;
  heaviness: "light" | "medium" | "heavy" | null;

  due_mode: "anytime" | "by_time" | "at_time" | null;
  due_time: string | null;

  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TodoDependencyRow = {
  id: string;
  todo_id: string;
  depends_on_todo_id: string;
  created_at: string;
};