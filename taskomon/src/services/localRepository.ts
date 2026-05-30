import { DEMO_USER_ID } from "../data/demoData";
import {
  getLocalSeedForUser,
  localAccountSeeds,
  localSeed,
  type LocalWorkspaceSeed,
} from "../data/localSeed";
import {
  PERSONAL_USER_ID,
  localUsers,
  type LocalUser,
} from "../data/localUsers";
import type { BehaviourEvent, Habit, Todo, Workflow } from "../types";
import {
  AUTH_SESSION_STORAGE_KEY,
  LOCAL_USERS_STORAGE_KEY,
  type AppSession,
} from "./authService";
import { getBehaviourStorageKey, saveBehaviourEvents } from "./behaviourService";
import { loadFromStorage, saveToStorage } from "./storageServices";
import {
  HABITS_STORAGE_KEY,
  HABIT_STORAGE_PREFIX,
  WORKFLOWS_STORAGE_KEY,
  WORKFLOW_STORAGE_PREFIX,
  getDefaultWorkflowRuntime,
  getHabitTodoStorageKey,
  getHabitsStorageKey,
  getWorkflowRuntimeStorageKey,
  getWorkflowTodoStorageKey,
  getWorkflowsStorageKey,
} from "./workspaceStorage";

const LOCAL_SEED_VERSION_KEY = "taskomon:local-seeded:v2";
const LEGACY_PERSONAL_MIGRATION_KEY = "taskomon:legacy-personal-migrated:v1";

function hasStorageValue(key: string): boolean {
  return localStorage.getItem(key) !== null;
}

function saveIfMissing<T>(key: string, value: T): void {
  if (!hasStorageValue(key)) {
    saveToStorage(key, value);
  }
}

function rewriteWorkspaceUsers<T extends Habit | Workflow>(
  workspaces: T[],
  userId: string
): T[] {
  return workspaces.map((workspace) => ({
    ...workspace,
    userId,
  }));
}

function rewriteBehaviourUsers(
  events: BehaviourEvent[],
  userId: string
): BehaviourEvent[] {
  return events.map((event) => ({
    ...event,
    userId,
  }));
}

function mergeLocalUsers(): void {
  const existingUsers = loadFromStorage<LocalUser[]>(LOCAL_USERS_STORAGE_KEY, []);
  const mergedUsersByEmail = new Map<string, LocalUser>();

  existingUsers.forEach((user) => {
    mergedUsersByEmail.set(user.email.toLowerCase(), user);
  });

  localUsers.forEach((seedUser) => {
    const email = seedUser.email.toLowerCase();
    const existingUser = mergedUsersByEmail.get(email);

    mergedUsersByEmail.set(email, {
      ...existingUser,
      ...seedUser,
    });
  });

  saveToStorage(LOCAL_USERS_STORAGE_KEY, [...mergedUsersByEmail.values()]);
}

function normalizeCurrentSession(): void {
  const session = loadFromStorage<AppSession | null>(
    AUTH_SESSION_STORAGE_KEY,
    null
  );

  if (session?.mode !== "local") return;

  const matchingUser = localUsers.find(
    (user) =>
      user.id === session.userId ||
      user.email.toLowerCase() === session.email.toLowerCase()
  );

  if (!matchingUser) return;

  saveToStorage(AUTH_SESSION_STORAGE_KEY, {
    mode: "local",
    userId: matchingUser.id,
    name: matchingUser.name,
    email: matchingUser.email,
  });
}

function seedBehaviourEvents(
  userId: string,
  events: BehaviourEvent[],
  rewriteUserId = false
): void {
  const eventsByWorkspace = new Map<string | undefined, BehaviourEvent[]>();
  const normalizedEvents = rewriteUserId
    ? rewriteBehaviourUsers(events, userId)
    : events;

  normalizedEvents.forEach((event) => {
    const currentEvents = eventsByWorkspace.get(event.workspaceId) ?? [];
    eventsByWorkspace.set(event.workspaceId, [...currentEvents, event]);
  });

  eventsByWorkspace.forEach((workspaceEvents, workspaceId) => {
    const key = getBehaviourStorageKey(userId, workspaceId);

    if (!hasStorageValue(key)) {
      saveBehaviourEvents(userId, workspaceEvents, workspaceId);
    }
  });
}

function seedWorkspaceData(
  userId: string,
  seed: LocalWorkspaceSeed,
  options: { rewriteUserId?: boolean } = {}
): void {
  const habits = options.rewriteUserId
    ? rewriteWorkspaceUsers(seed.habits, userId)
    : seed.habits;
  const workflows = options.rewriteUserId
    ? rewriteWorkspaceUsers(seed.workflows, userId)
    : seed.workflows;

  saveIfMissing(getHabitsStorageKey(userId), habits);
  saveIfMissing(getWorkflowsStorageKey(userId), workflows);

  habits.forEach((habit) => {
    saveIfMissing(
      getHabitTodoStorageKey(habit.id, userId),
      seed.todos.filter(
        (todo) => todo.parentType === "habit" && todo.parentId === habit.id
      )
    );
  });

  workflows.forEach((workflow) => {
    saveIfMissing(
      getWorkflowTodoStorageKey(workflow.id, userId),
      seed.todos.filter(
        (todo) =>
          todo.parentType === "workflow" && todo.parentId === workflow.id
      )
    );
    saveIfMissing(
      getWorkflowRuntimeStorageKey(workflow.id, userId),
      getDefaultWorkflowRuntime(workflow)
    );
  });

  seedBehaviourEvents(userId, seed.behaviourEvents, options.rewriteUserId);
  saveIfMissing(`taskomon:user:${userId}:taskomon-state`, {
    ...seed.taskomonState,
    userId,
  });
  saveIfMissing(`taskomon:user:${userId}:taskomon-comments`, seed.taskomonComments);
}

function copyLegacyHabitArtifacts(habits: Habit[], userId: string): void {
  habits.forEach((habit) => {
    const legacyTodoKey = `${HABIT_STORAGE_PREFIX}:${habit.id}:todos`;
    const legacyResetKey = `${HABIT_STORAGE_PREFIX}:${habit.id}:reset-period`;
    const scopedTodoKey = getHabitTodoStorageKey(habit.id, userId);
    const scopedResetKey = `taskomon:user:${userId}:habit:${habit.id}:reset-period`;

    if (hasStorageValue(legacyTodoKey)) {
      saveIfMissing(scopedTodoKey, loadFromStorage<Todo[]>(legacyTodoKey, []));
    }

    const legacyResetValue = localStorage.getItem(legacyResetKey);
    if (legacyResetValue && !hasStorageValue(scopedResetKey)) {
      localStorage.setItem(scopedResetKey, legacyResetValue);
    }
  });
}

function copyLegacyWorkflowArtifacts(workflows: Workflow[], userId: string): void {
  workflows.forEach((workflow) => {
    const legacyTodoKey = `${WORKFLOW_STORAGE_PREFIX}:${workflow.id}:todos`;
    const legacyRuntimeKey = `${WORKFLOW_STORAGE_PREFIX}:${workflow.id}:runtime`;

    if (hasStorageValue(legacyTodoKey)) {
      saveIfMissing(
        getWorkflowTodoStorageKey(workflow.id, userId),
        loadFromStorage<Todo[]>(legacyTodoKey, [])
      );
    }

    if (hasStorageValue(legacyRuntimeKey)) {
      saveIfMissing(
        getWorkflowRuntimeStorageKey(workflow.id, userId),
        loadFromStorage(
          legacyRuntimeKey,
          getDefaultWorkflowRuntime(workflow)
        )
      );
    }
  });
}

function copyLegacyBehaviour(workspaces: Array<Habit | Workflow>, userId: string) {
  workspaces.forEach((workspace) => {
    const legacyKey = getBehaviourStorageKey(DEMO_USER_ID, workspace.id);

    if (hasStorageValue(legacyKey)) {
      saveIfMissing(
        getBehaviourStorageKey(userId, workspace.id),
        rewriteBehaviourUsers(
          loadFromStorage<BehaviourEvent[]>(legacyKey, []),
          userId
        )
      );
    }
  });
}

function migrateLegacyWorkspaceDataToPersonal(): void {
  if (hasStorageValue(LEGACY_PERSONAL_MIGRATION_KEY)) return;

  const hasLegacyHabits = hasStorageValue(HABITS_STORAGE_KEY);
  const hasLegacyWorkflows = hasStorageValue(WORKFLOWS_STORAGE_KEY);

  if (!hasLegacyHabits && !hasLegacyWorkflows) {
    seedWorkspaceData(PERSONAL_USER_ID, getLocalSeedForUser(PERSONAL_USER_ID));
    saveToStorage(LEGACY_PERSONAL_MIGRATION_KEY, new Date().toISOString());
    return;
  }

  const legacyHabits = rewriteWorkspaceUsers(
    loadFromStorage<Habit[]>(HABITS_STORAGE_KEY, localSeed.habits),
    PERSONAL_USER_ID
  );
  const legacyWorkflows = rewriteWorkspaceUsers(
    loadFromStorage<Workflow[]>(WORKFLOWS_STORAGE_KEY, localSeed.workflows),
    PERSONAL_USER_ID
  );

  saveIfMissing(getHabitsStorageKey(PERSONAL_USER_ID), legacyHabits);
  saveIfMissing(getWorkflowsStorageKey(PERSONAL_USER_ID), legacyWorkflows);
  copyLegacyHabitArtifacts(legacyHabits, PERSONAL_USER_ID);
  copyLegacyWorkflowArtifacts(legacyWorkflows, PERSONAL_USER_ID);
  copyLegacyBehaviour([...legacyHabits, ...legacyWorkflows], PERSONAL_USER_ID);
  saveToStorage(LEGACY_PERSONAL_MIGRATION_KEY, new Date().toISOString());
}

export function seedLocalStorageIfNeeded(): void {
  if (typeof localStorage === "undefined") return;

  mergeLocalUsers();
  normalizeCurrentSession();
  migrateLegacyWorkspaceDataToPersonal();

  Object.entries(localAccountSeeds).forEach(([userId, seed]) => {
    if (userId === PERSONAL_USER_ID) {
      seedWorkspaceData(userId, seed);
      return;
    }

    seedWorkspaceData(userId, seed);
  });

  saveIfMissing(LOCAL_SEED_VERSION_KEY, new Date().toISOString());
}
