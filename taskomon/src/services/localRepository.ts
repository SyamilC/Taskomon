import { DEMO_USER_ID } from "../data/demoData";
import { localSeed } from "../data/localSeed";
import type { BehaviourEvent } from "../types";
import { LOCAL_USERS_STORAGE_KEY } from "./authService";
import { getBehaviourStorageKey, saveBehaviourEvents } from "./behaviourService";
import { saveToStorage } from "./storageServices";
import {
  HABITS_STORAGE_KEY,
  WORKFLOWS_STORAGE_KEY,
  getDefaultWorkflowRuntime,
  getHabitTodoStorageKey,
  getWorkflowRuntimeStorageKey,
  getWorkflowTodoStorageKey,
} from "./workspaceStorage";

const LOCAL_SEED_VERSION_KEY = "taskomon:local-seeded:v1";

function hasStorageValue(key: string): boolean {
  return localStorage.getItem(key) !== null;
}

function saveIfMissing<T>(key: string, value: T): void {
  if (!hasStorageValue(key)) {
    saveToStorage(key, value);
  }
}

function seedBehaviourEvents(events: BehaviourEvent[]): void {
  const eventsByWorkspace = new Map<string | undefined, BehaviourEvent[]>();

  events.forEach((event) => {
    const currentEvents = eventsByWorkspace.get(event.workspaceId) ?? [];
    eventsByWorkspace.set(event.workspaceId, [...currentEvents, event]);
  });

  eventsByWorkspace.forEach((workspaceEvents, workspaceId) => {
    const key = getBehaviourStorageKey(DEMO_USER_ID, workspaceId);

    if (!hasStorageValue(key)) {
      saveBehaviourEvents(DEMO_USER_ID, workspaceEvents, workspaceId);
    }
  });
}

export function seedLocalStorageIfNeeded(): void {
  if (typeof localStorage === "undefined") return;

  saveIfMissing(LOCAL_USERS_STORAGE_KEY, localSeed.users);
  saveIfMissing(HABITS_STORAGE_KEY, localSeed.habits);
  saveIfMissing(WORKFLOWS_STORAGE_KEY, localSeed.workflows);

  localSeed.habits.forEach((habit) => {
    saveIfMissing(
      getHabitTodoStorageKey(habit.id),
      localSeed.todos.filter(
        (todo) => todo.parentType === "habit" && todo.parentId === habit.id
      )
    );
  });

  localSeed.workflows.forEach((workflow) => {
    saveIfMissing(
      getWorkflowTodoStorageKey(workflow.id),
      localSeed.todos.filter(
        (todo) =>
          todo.parentType === "workflow" && todo.parentId === workflow.id
      )
    );
    saveIfMissing(
      getWorkflowRuntimeStorageKey(workflow.id),
      getDefaultWorkflowRuntime(workflow)
    );
  });

  seedBehaviourEvents(localSeed.behaviourEvents);
  saveIfMissing("taskomon:taskomon-state", localSeed.taskomonState);
  saveIfMissing("taskomon:taskomon-comments", localSeed.taskomonComments);
  saveIfMissing(LOCAL_SEED_VERSION_KEY, new Date().toISOString());
}
