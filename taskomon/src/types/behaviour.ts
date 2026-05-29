import type { Heaviness, Priority, TodoStatus } from "./todo";

export type BehaviourEventType =
  | "todo_created"
  | "todo_started"
  | "todo_completed"
  | "todo_moved"
  | "workflow_started"
  | "workflow_held"
  | "habit_checked"
  | "timer_started"
  | "timer_paused"
  | "rest_taken"
  | "slowdown_detected";

export interface BehaviourEvent {
  id: string;
  userId: string;
  workspaceId?: string;
  todoId?: string;

  type: BehaviourEventType;
  timestamp: string;

  metadata?: {
    timeSpentSeconds?: number;
    previousStatus?: TodoStatus;
    newStatus?: TodoStatus;
    priority?: Priority;
    heaviness?: Heaviness;
    note?: string;
  };
}