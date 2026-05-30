import { localSeed } from "../data/localSeed";
import type { Habit, PomodoroPhase, Todo, Workflow } from "../types";
import { loadFromStorage, removeFromStorage, saveToStorage } from "./storageServices";

export const HABITS_STORAGE_KEY = "taskomon:habits";
export const WORKFLOWS_STORAGE_KEY = "taskomon:workflows";
export const HABIT_STORAGE_PREFIX = "taskomon:habit";
export const WORKFLOW_STORAGE_PREFIX = "taskomon:workflow";

export type WorkflowRuntimeSummary = Pick<
  Workflow,
  "status" | "focusMinutes" | "restMinutes" | "updatedAt"
> & {
  timerPhase?: PomodoroPhase;
  timerSeconds?: number;
  timerRunning?: boolean;
  timerUpdatedAt?: string;
};

export function getHabitTodoStorageKey(habitId: string) {
  return `${HABIT_STORAGE_PREFIX}:${habitId}:todos`;
}

export function getWorkflowTodoStorageKey(workflowId: string) {
  return `${WORKFLOW_STORAGE_PREFIX}:${workflowId}:todos`;
}

export function getWorkflowRuntimeStorageKey(workflowId: string) {
  return `${WORKFLOW_STORAGE_PREFIX}:${workflowId}:runtime`;
}

function getHabitResetStorageKey(habitId: string) {
  return `${HABIT_STORAGE_PREFIX}:${habitId}:reset-period`;
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

function normalizeHabit(habit: Habit): Habit {
  return {
    ...habit,
    status: habit.status ?? "active",
    resetFrequency: habit.resetFrequency ?? "daily",
  };
}

export function getStoredHabits() {
  return loadFromStorage<Habit[]>(HABITS_STORAGE_KEY, localSeed.habits).map(
    normalizeHabit
  );
}

export function saveStoredHabits(habits: Habit[]) {
  saveToStorage(HABITS_STORAGE_KEY, habits.map(normalizeHabit));
}

export function getStoredWorkflows() {
  return loadFromStorage<Workflow[]>(WORKFLOWS_STORAGE_KEY, localSeed.workflows);
}

export function saveStoredWorkflows(workflows: Workflow[]) {
  saveToStorage(WORKFLOWS_STORAGE_KEY, workflows);
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
