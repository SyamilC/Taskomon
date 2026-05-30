import { DEMO_USER_ID } from "./demoData";

export type LocalUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
};

const seedCreatedAt = new Date("2026-05-30T00:00:00.000Z").toISOString();

export const SHOWCASE_USER_ID = DEMO_USER_ID;
export const PERSONAL_USER_ID = "personal-user-1";
export const GUEST_USER_ID = "guest-user";

export const localUsers: LocalUser[] = [
  {
    id: SHOWCASE_USER_ID,
    name: "Taskomon Showcase",
    email: "demo@taskomon.local",
    password: "taskomon",
    createdAt: seedCreatedAt,
  },
  {
    id: PERSONAL_USER_ID,
    name: "Personal Usage",
    email: "personalusage@taskomon.com",
    password: "12345a",
    createdAt: seedCreatedAt,
  },
];
