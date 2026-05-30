import {
  GUEST_USER_ID,
  SHOWCASE_USER_ID,
  localUsers,
  type LocalUser,
} from "../data/localUsers";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import {
  loadFromStorage,
  removeFromStorage,
  saveToStorage,
} from "./storageServices";

export const LOCAL_USERS_STORAGE_KEY = "taskomon:local-users";
export const AUTH_SESSION_STORAGE_KEY = "taskomon:auth-session";

export type BackendMode = "supabase" | "local";

export type AppSession =
  | {
      mode: "local";
      userId: string;
      name: string;
      email: string;
    }
  | {
      mode: "guest";
      userId: string;
      name: "Guest";
    };

export function getBackendMode(): BackendMode {
  return isSupabaseConfigured ? "supabase" : "local";
}

export function getLocalUsers(): LocalUser[] {
  return loadFromStorage(LOCAL_USERS_STORAGE_KEY, localUsers);
}

export function saveLocalUsers(users: LocalUser[]): void {
  saveToStorage(LOCAL_USERS_STORAGE_KEY, users);
}

export function getCurrentSession(): AppSession | null {
  return loadFromStorage<AppSession | null>(AUTH_SESSION_STORAGE_KEY, null);
}

export function getSessionDisplayName(session = getCurrentSession()): string {
  return session?.name ?? "Syamil";
}

export function isGuestSession(session = getCurrentSession()): boolean {
  return session?.mode === "guest";
}

export function getActiveUserId(session = getCurrentSession()): string {
  return session?.userId ?? SHOWCASE_USER_ID;
}

export function loginLocal(email: string, password: string): AppSession {
  const normalizedEmail = email.trim().toLowerCase();
  const user = getLocalUsers().find(
    (localUser) => localUser.email.toLowerCase() === normalizedEmail
  );

  if (!user || user.password !== password) {
    throw new Error("Email/password is not right.");
  }

  const session: AppSession = {
    mode: "local",
    userId: user.id,
    name: user.name,
    email: user.email,
  };

  saveToStorage(AUTH_SESSION_STORAGE_KEY, session);

  return session;
}

export function registerLocal(input: {
  name: string;
  email: string;
  password: string;
}): AppSession {
  const name = input.name.trim() || "Taskomon User";
  const email = input.email.trim().toLowerCase();
  const password = input.password.trim();

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const users = getLocalUsers();

  if (users.some((user) => user.email.toLowerCase() === email)) {
    throw new Error("That email is already registered locally.");
  }

  const user: LocalUser = {
    id: crypto.randomUUID(),
    name,
    email,
    password,
    createdAt: new Date().toISOString(),
  };

  saveLocalUsers([...users, user]);

  const session: AppSession = {
    mode: "local",
    userId: user.id,
    name: user.name,
    email: user.email,
  };

  saveToStorage(AUTH_SESSION_STORAGE_KEY, session);

  return session;
}

export function startGuestSession(): AppSession {
  const session: AppSession = {
    mode: "guest",
    userId: GUEST_USER_ID,
    name: "Guest",
  };

  saveToStorage(AUTH_SESSION_STORAGE_KEY, session);

  return session;
}

export function logout(): void {
  removeFromStorage(AUTH_SESSION_STORAGE_KEY);
}
