import { getLocalSeedForUser } from "../data/localSeed";
import { SHOWCASE_USER_ID } from "../data/localUsers";
import type { Habit, PomodoroPhase, Todo, Workflow } from "../types";
import { getCurrentSession } from "./authService";
import { loadFromStorage, removeFromStorage, saveToStorage } from "./storageServices";

export const HABITS_STORAGE_KEY = "taskomon:habits";
export const WORKFLOWS_STORAGE_KEY = "taskomon:workflows";
export const HABIT_STORAGE_PREFIX = "taskomon:habit";
export const WORKFLOW_STORAGE_PREFIX = "taskomon:workflow";
export const USER_STORAGE_PREFIX = "taskomon:user";

export type WorkflowRuntimeSummary = Pick<
  Workflow,
  "status" | "focusMinutes" | "restMinutes" | "updatedAt"
> & {
  timerPhase?: PomodoroPhase;
  timerSeconds?: number;
  timerRunning?: boolean;
  timerUpdatedAt?: string;
  timerTransitionNextPhase?: PomodoroPhase;
  timerTransitionCompletedPhase?: PomodoroPhase;
  timerTransitionSeconds?: number;
  timerTransitionUpdatedAt?: string;
};

export function getActiveWorkspaceUserId(userId?: string) {
  return userId ?? getCurrentSession()?.userId ?? SHOWCASE_USER_ID;
}

export function getUserStoragePrefix(userId = getActiveWorkspaceUserId()) {
  return `${USER_STORAGE_PREFIX}:${userId}`;
}

export function getHabitsStorageKey(userId = getActiveWorkspaceUserId()) {
  return `${getUserStoragePrefix(userId)}:habits`;
}

export function getWorkflowsStorageKey(userId = getActiveWorkspaceUserId()) {
  return `${getUserStoragePrefix(userId)}:workflows`;
}

export function getHabitTodoStorageKey(
  habitId: string,
  userId = getActiveWorkspaceUserId()
) {
  return `${getUserStoragePrefix(userId)}:habit:${habitId}:todos`;
}

export function getWorkflowTodoStorageKey(
  workflowId: string,
  userId = getActiveWorkspaceUserId()
) {
  return `${getUserStoragePrefix(userId)}:workflow:${workflowId}:todos`;
}

export function getWorkflowRuntimeStorageKey(
  workflowId: string,
  userId = getActiveWorkspaceUserId()
) {
  return `${getUserStoragePrefix(userId)}:workflow:${workflowId}:runtime`;
}

function getHabitResetStorageKey(
  habitId: string,
  userId = getActiveWorkspaceUserId()
) {
  return `${getUserStoragePrefix(userId)}:habit:${habitId}:reset-period`;
}

export function getDefaultWorkflowRuntime(
  workflow: Workflow
): WorkflowRuntimeSummary {
  return {
    status: workflow.status,
    focusMinutes: workflow.focusMinutes,
    restMinutes: workflow.restMinutes,
    timerPhase: "focus",
    timerSeconds: workflow.focusMinutes * 60,
    timerRunning: false,
    updatedAt: workflow.updatedAt,
  };
}

export function getSeedTodosForWorkspace(
  parentId: string,
  parentType: "habit" | "workflow",
  userId = getActiveWorkspaceUserId()
) {
  return getLocalSeedForUser(userId).todos.filter(
    (todo) => todo.parentType === parentType && todo.parentId === parentId
  );
}

function normalizeHabit(habit: Habit): Habit {
  return {
    ...habit,
    status: habit.status ?? "active",
    resetFrequency: habit.resetFrequency ?? "daily",
  };
}

export function getStoredHabits() {
  const userId = getActiveWorkspaceUserId();
  const seed = getLocalSeedForUser(userId);

  return loadFromStorage<Habit[]>(
    getHabitsStorageKey(userId),
    seed.habits
  ).map(normalizeHabit);
}

export function saveStoredHabits(habits: Habit[]) {
  saveToStorage(getHabitsStorageKey(), habits.map(normalizeHabit));
}

export function getStoredWorkflows() {
  const userId = getActiveWorkspaceUserId();
  const seed = getLocalSeedForUser(userId);

  return loadFromStorage<Workflow[]>(
    getWorkflowsStorageKey(userId),
    seed.workflows
  );
}

export function saveStoredWorkflows(workflows: Workflow[]) {
  saveToStorage(getWorkflowsStorageKey(), workflows);
}

export function deleteHabitArtifacts(habitId: string) {
  removeFromStorage(getHabitTodoStorageKey(habitId));
  removeFromStorage(getHabitResetStorageKey(habitId));
}

export function deleteWorkflowArtifacts(workflowId: string) {
  removeFromStorage(getWorkflowTodoStorageKey(workflowId));
  removeFromStorage(getWorkflowRuntimeStorageKey(workflowId));
}

function formatDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function getLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${formatDatePart(date.getMonth() + 1)}-${formatDatePart(
    date.getDate()
  )}`;
}

function getWeeklyPeriodKey(date: Date) {
  const weekStart = new Date(date);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(date.getDate() - daysSinceMonday);

  return getLocalDateKey(weekStart);
}

function getHabitPeriodKey(habit: Habit, date = new Date()) {
  if (habit.resetFrequency === "monthly") {
    return `${date.getFullYear()}-${formatDatePart(date.getMonth() + 1)}`;
  }

  if (habit.resetFrequency === "weekly") {
    return getWeeklyPeriodKey(date);
  }

  return getLocalDateKey(date);
}

export function applyHabitAutoReset(habit: Habit, todos: Todo[]) {
  if (habit.mode !== "build_habit") return todos;

  const resetStorageKey = getHabitResetStorageKey(habit.id);
  const currentPeriodKey = getHabitPeriodKey(habit);
  const lastPeriodKey = localStorage.getItem(resetStorageKey);

  localStorage.setItem(resetStorageKey, currentPeriodKey);

  if (!lastPeriodKey || lastPeriodKey === currentPeriodKey) {
    return todos;
  }

  const now = new Date().toISOString();

  return todos.map((todo) => ({
    ...todo,
    status: "not_started" as const,
    startedAt: undefined,
    completedAt: undefined,
    updatedAt: now,
  }));
}
