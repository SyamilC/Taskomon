import { loadFromStorage, saveToStorage } from "./storageServices";
import type {
  BehaviourEvent,
  BehaviourEventType,
  BehaviourPattern,
  BehaviourSnapshot,
  DueMode,
  Heaviness,
  Priority,
  TaskomonMood,
  Todo,
  TodoStatus,
  WorkspaceType,
} from "../types";

const MAX_STORED_EVENTS = 500;
const RECENT_WINDOW_MINUTES = 60;

type BehaviourEventMetadata = {
  timeSpentSeconds?: number;
  previousStatus?: TodoStatus;
  newStatus?: TodoStatus;
  priority?: Priority;
  heaviness?: Heaviness;
  dueMode?: DueMode;
  note?: string;
};

export interface CreateBehaviourEventInput {
  userId: string;
  workspaceId?: string;
  workspaceType?: WorkspaceType;
  todoId?: string;
  type: BehaviourEventType;
  metadata?: BehaviourEventMetadata;
}

interface CreateBehaviourSnapshotInput {
  todos: Todo[];
  events: BehaviourEvent[];
  now?: Date;
}

export type TaskomonMoodStyle = {
  panel: string;
  label: string;
  pointer: string;
};

export function getBehaviourStorageKey(
  userId: string,
  workspaceId = "global"
): string {
  return `taskomon.behaviour.${userId}.${workspaceId}`;
}

export function loadBehaviourEvents(
  userId: string,
  workspaceId?: string
): BehaviourEvent[] {
  return loadFromStorage(getBehaviourStorageKey(userId, workspaceId), []);
}

export function saveBehaviourEvents(
  userId: string,
  events: BehaviourEvent[],
  workspaceId?: string
): void {
  saveToStorage(
    getBehaviourStorageKey(userId, workspaceId),
    events.slice(-MAX_STORED_EVENTS)
  );
}

export function createBehaviourEvent(
  input: CreateBehaviourEventInput
): BehaviourEvent {
  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    workspaceId: input.workspaceId,
    workspaceType: input.workspaceType,
    todoId: input.todoId,
    type: input.type,
    timestamp: new Date().toISOString(),
    metadata: input.metadata,
  };
}

export function appendBehaviourEvent(
  input: CreateBehaviourEventInput
): BehaviourEvent {
  const event = createBehaviourEvent(input);
  const events = loadBehaviourEvents(input.userId, input.workspaceId);

  saveBehaviourEvents(input.userId, [...events, event], input.workspaceId);

  return event;
}

export function createBehaviourSnapshot({
  todos,
  events,
  now = new Date(),
}: CreateBehaviourSnapshotInput): BehaviourSnapshot {
  const completedTodos = todos.filter((todo) => todo.status === "done");
  const inProgressTodos = todos.filter((todo) => todo.status === "in_progress");
  const notStartedTodos = todos.filter((todo) => todo.status === "not_started");
  const highPriorityUnfinished = todos.filter(
    (todo) => todo.priority === "high" && todo.status !== "done"
  );
  const highPriorityNotStarted = todos.filter(
    (todo) => todo.priority === "high" && todo.status === "not_started"
  );
  const lowOrMediumCompleted = todos.filter(
    (todo) => todo.status === "done" && todo.priority !== "high"
  );
  const heavyTasks = todos.filter((todo) => todo.heaviness === "heavy");
  const heavyInProgress = inProgressTodos.filter(
    (todo) => todo.heaviness === "heavy"
  );
  const overdueTodoCount = todos.filter((todo) => isTodoOverdue(todo, now)).length;
  const recentEvents = getRecentEvents(events, now, RECENT_WINDOW_MINUTES);
  const meaningfulEvents = events.filter(
    (event) =>
      event.type !== "workspace_opened" && event.type !== "workspace_closed"
  );
  const recentCompletions = recentEvents.filter(
    (event) => event.type === "todo_completed"
  );
  const recentStarts = recentEvents.filter((event) => event.type === "todo_started");
  const recentRestEvents = recentEvents.filter((event) => event.type === "rest_taken");
  const recentSlowdowns = recentEvents.filter(
    (event) => event.type === "slowdown_detected"
  );
  const completionRate =
    todos.length === 0
      ? 0
      : Math.round((completedTodos.length / todos.length) * 100);
  const currentTaskMinutes = getCurrentTaskMinutes(inProgressTodos, events, now);
  const averageCompletionMinutes = getAverageCompletionMinutes(
    completedTodos,
    events
  );
  const heavyTaskBottleneck =
    heavyInProgress.length > 0 &&
    (currentTaskMinutes ?? 0) >= 25;
  const tooManyTasksStarted = inProgressTodos.length >= 2;
  const avoidingHighPriority =
    highPriorityNotStarted.length > 0 && lowOrMediumCompleted.length > 0;

  const momentumScore = clampScore(
    completionRate * 0.55 +
      recentCompletions.length * 12 +
      recentStarts.length * 4 -
      overdueTodoCount * 8 -
      (tooManyTasksStarted ? 8 : 0)
  );
  const fatigueScore = clampScore(
    heavyInProgress.length * 20 +
      recentSlowdowns.length * 18 +
      Math.max(0, (currentTaskMinutes ?? 0) - 20) * 1.2 +
      (tooManyTasksStarted ? 12 : 0) +
      (completionRate < 35 && inProgressTodos.length > 0 ? 18 : 0) -
      recentRestEvents.length * 15
  );
  const avoidanceScore = clampScore(
    highPriorityUnfinished.length * 18 +
      highPriorityNotStarted.length * 12 +
      lowOrMediumCompleted.length * 6 +
      overdueTodoCount * 10 +
      (avoidingHighPriority ? 22 : 0)
  );
  const consistencyScore = clampScore(
    completionRate * 0.7 +
      recentCompletions.length * 8 +
      recentStarts.length * 3 -
      overdueTodoCount * 10 -
      (recentSlowdowns.length > recentRestEvents.length ? 8 : 0)
  );
  const detectedPatterns = getDetectedPatterns({
    totalTodos: todos.length,
    completionRate,
    completedTodos: completedTodos.length,
    inProgressTodos: inProgressTodos.length,
    highPriorityUnfinishedCount: highPriorityUnfinished.length,
    overdueTodoCount,
    momentumScore,
    fatigueScore,
    consistencyScore,
    avoidanceScore,
    recentCompletionCount: recentCompletions.length,
    recentStartCount: recentStarts.length,
    hasActivity:
      meaningfulEvents.length > 0 ||
      completedTodos.length > 0 ||
      inProgressTodos.length > 0,
    hasHabitEvents: events.some((event) => event.workspaceType === "habit"),
    hasHabitReset: recentEvents.some((event) => event.type === "habit_reset"),
    heavyTaskBottleneck,
    avoidingHighPriority,
    tooManyTasksStarted,
  });

  return {
    totalTodos: todos.length,
    completedTodos: completedTodos.length,
    inProgressTodos: inProgressTodos.length,
    notStartedTodos: notStartedTodos.length,
    completionRate,
    heavyTaskCount: heavyTasks.length,
    heavyCompletedCount: heavyTasks.filter((todo) => todo.status === "done").length,
    highPriorityUnfinishedCount: highPriorityUnfinished.length,
    overdueTodoCount,
    averageCompletionMinutes,
    currentTaskMinutes,
    momentumScore,
    fatigueScore,
    consistencyScore,
    avoidanceScore,
    detectedPatterns,
  };
}

export function getTaskomonMood(snapshot: BehaviourSnapshot): TaskomonMood {
  if (snapshot.detectedPatterns.includes("no_activity_yet")) return "neutral";
  if (snapshot.fatigueScore >= 68) return "tired";
  if (snapshot.avoidanceScore >= 68) return "worried";
  if (snapshot.momentumScore >= 75 && snapshot.fatigueScore < 45) return "proud";
  if (snapshot.momentumScore >= 48) return "focused";
  if (snapshot.completedTodos > 0 || snapshot.inProgressTodos > 0) return "happy";

  return "neutral";
}

export function getTaskomonComment(snapshot: BehaviourSnapshot): string {
  if (snapshot.detectedPatterns.includes("no_activity_yet")) {
    return "Pick one small bubble. Starting light still counts.";
  }

  if (snapshot.detectedPatterns.includes("heavy_task_bottleneck")) {
    return "This bubble looks heavier than expected. Want to split it into a smaller step?";
  }

  if (snapshot.detectedPatterns.includes("avoiding_high_priority")) {
    return "You cleared smaller bubbles, but the important one is still waiting. Want to start with just the first tiny step?";
  }

  if (snapshot.detectedPatterns.includes("too_many_tasks_started")) {
    return "A few bubbles are active at once. Pick one to finish so the workspace feels lighter.";
  }

  if (snapshot.detectedPatterns.includes("good_completion_burst")) {
    return "Nice rhythm. You're clearing bubbles cleanly today.";
  }

  if (snapshot.detectedPatterns.includes("possible_fatigue")) {
    return "Your pace is dipping. A short rest might keep this from turning messy.";
  }

  if (snapshot.detectedPatterns.includes("habit_slipping")) {
    return "This habit is starting to slip. Choose the smallest overdue bubble and reset the rhythm.";
  }

  if (snapshot.detectedPatterns.includes("habit_consistency_improving")) {
    return "The habit rhythm is getting steadier. Keep the next bubble easy to reach.";
  }

  if (snapshot.detectedPatterns.includes("steady_progress")) {
    return "Steady progress. Keep one clean bubble moving at a time.";
  }

  return "I am watching the rhythm now. Start with the bubble that feels clearest.";
}

export function getTaskomonMoodStyle(mood: TaskomonMood): TaskomonMoodStyle {
  const styles: Record<TaskomonMood, TaskomonMoodStyle> = {
    neutral: {
      panel:
        "border-stone-300/20 bg-gradient-to-br from-[#261d19]/95 via-[#191412]/95 to-[#100c0b]/95",
      label: "text-stone-300",
      pointer: "border-stone-300/20 bg-[#191412]",
    },
    happy: {
      panel:
        "border-emerald-300/25 bg-gradient-to-br from-[#123329]/95 via-[#18251c]/95 to-[#120f0c]/95",
      label: "text-emerald-200",
      pointer: "border-emerald-300/25 bg-[#18251c]",
    },
    focused: {
      panel:
        "border-orange-300/25 bg-gradient-to-br from-[#3b180f]/95 via-[#28130e]/95 to-[#1b100d]/95",
      label: "text-amber-300",
      pointer: "border-orange-300/25 bg-[#22110d]",
    },
    worried: {
      panel:
        "border-red-300/30 bg-gradient-to-br from-[#451510]/95 via-[#2c120f]/95 to-[#160d0b]/95",
      label: "text-red-200",
      pointer: "border-red-300/30 bg-[#2c120f]",
    },
    tired: {
      panel:
        "border-orange-400/30 bg-gradient-to-br from-[#4a2010]/95 via-[#2e160f]/95 to-[#160d0b]/95",
      label: "text-orange-200",
      pointer: "border-orange-400/30 bg-[#2e160f]",
    },
    proud: {
      panel:
        "border-amber-200/30 bg-gradient-to-br from-[#3a2a0d]/95 via-[#213019]/95 to-[#11110b]/95",
      label: "text-amber-200",
      pointer: "border-amber-200/30 bg-[#213019]",
    },
  };

  return styles[mood];
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

  return clampScore(50 + completed * 10 + started * 3 - slowdowns * 8);
}

export function calculateFatigueScore(events: BehaviourEvent[]): number {
  const heavyTasks = events.filter(
    (event) => event.metadata?.heaviness === "heavy"
  ).length;
  const slowdowns = getSlowdownCount(events);

  return clampScore(10 + heavyTasks * 8 + slowdowns * 12);
}

function getDetectedPatterns(input: {
  totalTodos: number;
  completionRate: number;
  completedTodos: number;
  inProgressTodos: number;
  highPriorityUnfinishedCount: number;
  overdueTodoCount: number;
  momentumScore: number;
  fatigueScore: number;
  consistencyScore: number;
  avoidanceScore: number;
  recentCompletionCount: number;
  recentStartCount: number;
  hasActivity: boolean;
  hasHabitEvents: boolean;
  hasHabitReset: boolean;
  heavyTaskBottleneck: boolean;
  avoidingHighPriority: boolean;
  tooManyTasksStarted: boolean;
}): BehaviourPattern[] {
  const patterns = new Set<BehaviourPattern>();

  if (!input.hasActivity) patterns.add("no_activity_yet");
  if (input.recentCompletionCount >= 3) patterns.add("good_completion_burst");
  if (input.heavyTaskBottleneck) patterns.add("heavy_task_bottleneck");
  if (input.avoidingHighPriority) patterns.add("avoiding_high_priority");
  if (input.tooManyTasksStarted) patterns.add("too_many_tasks_started");
  if (
    input.fatigueScore >= 62 ||
    (input.completionRate < 35 &&
      input.inProgressTodos > 0 &&
      input.totalTodos >= 3)
  ) {
    patterns.add("possible_fatigue");
  }
  if (
    input.momentumScore >= 45 &&
    input.fatigueScore < 68 &&
    input.completedTodos > 0
  ) {
    patterns.add("steady_progress");
  }
  if (
    input.hasHabitEvents &&
    (input.hasHabitReset || input.consistencyScore >= 68) &&
    input.completedTodos > 0
  ) {
    patterns.add("habit_consistency_improving");
  }
  if (
    input.hasHabitEvents &&
    (input.overdueTodoCount > 0 ||
      (input.totalTodos >= 2 && input.completionRate < 30))
  ) {
    patterns.add("habit_slipping");
  }

  return [...patterns];
}

function getRecentEvents(
  events: BehaviourEvent[],
  now: Date,
  windowMinutes: number
): BehaviourEvent[] {
  const earliest = now.getTime() - windowMinutes * 60 * 1000;

  return events.filter((event) => {
    const time = new Date(event.timestamp).getTime();

    return Number.isFinite(time) && time >= earliest;
  });
}

function getAverageCompletionMinutes(
  completedTodos: Todo[],
  events: BehaviourEvent[]
): number | undefined {
  const eventDurations = events
    .filter((event) => event.type === "todo_completed")
    .map((event) => event.metadata?.timeSpentSeconds)
    .filter((seconds): seconds is number => typeof seconds === "number" && seconds > 0);

  if (eventDurations.length > 0) {
    return roundToTenth(
      eventDurations.reduce((sum, seconds) => sum + seconds, 0) /
        eventDurations.length /
        60
    );
  }

  const todoDurations = completedTodos
    .map((todo) => {
      if (!todo.startedAt || !todo.completedAt) return undefined;

      return minutesBetween(todo.startedAt, todo.completedAt);
    })
    .filter(
      (minutes): minutes is number => typeof minutes === "number" && minutes >= 0
    );

  if (todoDurations.length === 0) return undefined;

  return roundToTenth(
    todoDurations.reduce((sum, minutes) => sum + minutes, 0) / todoDurations.length
  );
}

function getCurrentTaskMinutes(
  inProgressTodos: Todo[],
  events: BehaviourEvent[],
  now: Date
): number | undefined {
  const activeTodo = inProgressTodos[0];

  if (activeTodo?.startedAt) {
    const startedAt = new Date(activeTodo.startedAt).getTime();

    if (Number.isFinite(startedAt)) {
      return roundToTenth((now.getTime() - startedAt) / 60000);
    }
  }

  const latestStarted = [...events]
    .reverse()
    .find((event) => event.type === "todo_started");

  if (!latestStarted) return undefined;

  const startedAt = new Date(latestStarted.timestamp).getTime();
  if (!Number.isFinite(startedAt)) return undefined;

  return roundToTenth(
    (now.getTime() - startedAt) / 60000
  );
}

function isTodoOverdue(todo: Todo, now: Date): boolean {
  if (todo.status === "done") return false;
  if (!todo.dueMode || todo.dueMode === "anytime" || !todo.dueTime) return false;

  const dueMinutes = parseTimeToMinutes(todo.dueTime);
  if (dueMinutes === undefined) return false;

  return now.getHours() * 60 + now.getMinutes() > dueMinutes;
}

function parseTimeToMinutes(time: string): number | undefined {
  const [hourText, minuteText] = time.split(":");
  const hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return undefined;

  return hour * 60 + minute;
}

function minutesBetween(start: string, end: string): number | undefined {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return undefined;

  return roundToTenth((endTime - startTime) / 60000);
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
