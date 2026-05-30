import type { DueMode, Heaviness, Priority, TodoStatus, WorkspaceType } from "./todo";

export type BehaviourEventType =
  | "workspace_opened"
  | "workspace_closed"
  | "todo_created"
  | "todo_updated"
  | "todo_deleted"
  | "todo_started"
  | "todo_completed"
  | "todo_reopened"
  | "todo_moved"
  | "dependency_added"
  | "dependency_removed"
  | "workflow_started"
  | "workflow_held"
  | "workflow_resumed"
  | "workflow_completed"
  | "habit_checked"
  | "habit_completed"
  | "timer_started"
  | "timer_paused"
  | "timer_completed"
  | "rest_taken"
  | "habit_reset"
  | "advice_requested"
  | "suggestion_added"
  | "slowdown_detected";

export type BehaviourPattern =
  | "steady_progress"
  | "heavy_task_bottleneck"
  | "avoiding_high_priority"
  | "too_many_tasks_started"
  | "good_completion_burst"
  | "possible_fatigue"
  | "habit_consistency_improving"
  | "habit_slipping"
  | "no_activity_yet";

export interface BehaviourEvent {
  id: string;
  userId: string;
  workspaceId?: string;
  workspaceType?: WorkspaceType;
  todoId?: string;

  type: BehaviourEventType;
  timestamp: string;

  metadata?: {
    timeSpentSeconds?: number;
    previousStatus?: TodoStatus;
    newStatus?: TodoStatus;
    priority?: Priority;
    heaviness?: Heaviness;
    dueMode?: DueMode;
    note?: string;
  };
}

export interface BehaviourSnapshot {
  totalTodos: number;
  completedTodos: number;
  inProgressTodos: number;
  notStartedTodos: number;
  completionRate: number;
  heavyTaskCount: number;
  heavyCompletedCount: number;
  highPriorityUnfinishedCount: number;
  overdueTodoCount: number;
  averageCompletionMinutes?: number;
  currentTaskMinutes?: number;
  momentumScore: number;
  fatigueScore: number;
  consistencyScore: number;
  avoidanceScore: number;
  detectedPatterns: BehaviourPattern[];
}
