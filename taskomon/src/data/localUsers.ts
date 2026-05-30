import { DEMO_USER_ID } from "./demoData";

export type LocalUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
};

const seedCreatedAt = new Date("2026-05-30T00:00:00.000Z").toISOString();

export const GUEST_USER_ID = "guest-user";

export const localUsers: LocalUser[] = [
  {
    id: DEMO_USER_ID,
    name: "Syamil",
    email: "demo@taskomon.local",
    password: "taskomon",
    createdAt: seedCreatedAt,
  },
];
