import type { Workflow, Habit, Todo } from "../types/taskomon";

export const demoWorkflows: Workflow[] = [
  {
    id: "wf-1",
    title: "Finish Internship Challenge",
    description: "Build Taskomon MVP for Shortcut Asia.",
    createdAt: new Date().toISOString(),
    focusMinutes: 25,
    restMinutes: 5,
  },
];

export const demoHabits: Habit[] = [
  {
    id: "hb-1",
    title: "Healthy Daily Routine",
    description: "Track water, meals, and movement.",
    resetFrequency: "daily",
    createdAt: new Date().toISOString(),
  },
];

export const demoTodos: Todo[] = [
  {
    id: "td-1",
    parentType: "workflow",
    parentId: "wf-1",
    title: "Create Taskomon design assets",
    status: "done",
    priority: "medium",
    heaviness: "medium",
    createdAt: new Date().toISOString(),
  },
  {
    id: "td-2",
    parentType: "workflow",
    parentId: "wf-1",
    title: "Build workflow bubble board",
    status: "in_progress",
    priority: "high",
    heaviness: "heavy",
    createdAt: new Date().toISOString(),
  },
  {
    id: "td-3",
    parentType: "workflow",
    parentId: "wf-1",
    title: "Record demo video",
    status: "not_started",
    priority: "high",
    heaviness: "light",
    blockedByTodoId: "td-2",
    createdAt: new Date().toISOString(),
  },
];