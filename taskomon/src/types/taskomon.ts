export type TodoStatus = "not_started" | "in_progress" | "done";

export type Priority = "low" | "medium" | "high";

export type Heaviness = "light" | "medium" | "heavy";

export type ParentType = "workflow" | "habit";

export type DueMode = "anytime" | "by_time" | "at_time";

export interface Todo {
  id: string;
  parentType: ParentType;
  parentId: string;
  title: string;
  status: TodoStatus;
  priority: Priority;
  heaviness: Heaviness;
  blockedByTodoId?: string;
  dueMode?: DueMode;
  dueTime?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Workflow {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  focusMinutes: number;
  restMinutes: number;
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  resetFrequency: "daily" | "weekly";
  createdAt: string;
}

export interface TaskomonMessage {
  mood: "happy" | "focused" | "tired" | "worried" | "proud";
  text: string;
}