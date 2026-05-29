import type {
  BehaviourEvent,
  BehaviourEventType,
  Heaviness,
  Priority,
  TodoStatus,
} from "../types";

interface CreateBehaviourEventInput {
  userId: string;
  workspaceId?: string;
  todoId?: string;
  type: BehaviourEventType;
  metadata?: {
    timeSpentSeconds?: number;
    previousStatus?: TodoStatus;
    newStatus?: TodoStatus;
    priority?: Priority;
    heaviness?: Heaviness;
    note?: string;
  };
}

export function createBehaviourEvent(
  input: CreateBehaviourEventInput
): BehaviourEvent {
  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    workspaceId: input.workspaceId,
    todoId: input.todoId,
    type: input.type,
    timestamp: new Date().toISOString(),
    metadata: input.metadata,
  };
}

export function getCompletedTaskCount(events: BehaviourEvent[]): number {
  return events.filter((event) => event.type === "todo_completed").length;
}

export function getStartedTaskCount(events: BehaviourEvent[]): number {
  return events.filter((event) => event.type === "todo_started").length;
}

export function getSlowdownCount(events: BehaviourEvent[]): number {
  return events.filter((event) => event.type === "slowdown_detected").length;
}

export function calculateFocusScore(events: BehaviourEvent[]): number {
  const completed = getCompletedTaskCount(events);
  const started = getStartedTaskCount(events);
  const slowdowns = getSlowdownCount(events);

  let score = 50;

  score += completed * 10;
  score += started * 3;
  score -= slowdowns * 8;

  return Math.max(0, Math.min(100, score));
}

export function calculateFatigueScore(events: BehaviourEvent[]): number {
  const heavyTasks = events.filter(
    (event) => event.metadata?.heaviness === "heavy"
  ).length;

  const slowdowns = getSlowdownCount(events);

  let score = 10;

  score += heavyTasks * 8;
  score += slowdowns * 12;

  return Math.max(0, Math.min(100, score));
}