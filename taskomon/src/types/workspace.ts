import type { Todo, WorkspaceType } from "./todo";

export interface Workspace {
  id: string;
  userId: string;
  type: WorkspaceType;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  todos: Todo[];
}

export interface Workflow extends Workspace {
  type: "workflow";
  focusMinutes: number;
  restMinutes: number;
  status: "active" | "held" | "completed" | "destroyed";
}

export interface Habit extends Workspace {
  type: "habit";
  mode: "one_time" | "build_habit";
  resetFrequency: "daily" | "weekly";
  resetTime?: string;
  noticeEnabled: boolean;
}