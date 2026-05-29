import type { Habit, Workflow } from "../types";

export function createWorkflow(
  userId: string,
  title: string,
  description = ""
): Workflow {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    userId,
    type: "workflow",
    title,
    description,
    createdAt: now,
    updatedAt: now,
    todos: [],
    focusMinutes: 25,
    restMinutes: 5,
    status: "active",
  };
}

export function createHabit(
  userId: string,
  title: string,
  description = ""
): Habit {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    userId,
    type: "habit",
    title,
    description,
    createdAt: now,
    updatedAt: now,
    todos: [],
    mode: "build_habit",
    resetFrequency: "daily",
    noticeEnabled: true,
  };
}

export function holdWorkflow(workflow: Workflow): Workflow {
  return {
    ...workflow,
    status: "held",
    updatedAt: new Date().toISOString(),
  };
}

export function completeWorkflow(workflow: Workflow): Workflow {
  return {
    ...workflow,
    status: "completed",
    updatedAt: new Date().toISOString(),
  };
}