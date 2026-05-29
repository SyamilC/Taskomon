export type TodoStatus = "not_started" | "in_progress" | "done";
export type Priority = "low" | "medium" | "high";
export type Heaviness = "light" | "medium" | "heavy";
export type DueMode = "anytime" | "by_time" | "at_time";
export type WorkspaceType = "workflow" | "habit";

export interface Todo {
  id: string;
  parentId: string;
  parentType: WorkspaceType;

  title: string;
  description?: string;
  status: TodoStatus;

  x: number;
  y: number;

  priority?: Priority;
  heaviness?: Heaviness;

  dueMode?: DueMode;
  dueTime?: string;

  dependencyIds: string[];

  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}