import {
  demoBehaviourEvents,
  demoHabits,
  demoTaskomonComments,
  demoTaskomonState,
  demoTodos,
  demoWorkflows,
} from "./demoData";
import { localUsers } from "./localUsers";

export const localSeed = {
  users: localUsers,
  habits: demoHabits,
  workflows: demoWorkflows,
  todos: demoTodos,
  behaviourEvents: demoBehaviourEvents,
  taskomonState: demoTaskomonState,
  taskomonComments: demoTaskomonComments,
};
