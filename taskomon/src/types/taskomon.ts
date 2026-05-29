export type TaskomonMood =
  | "neutral"
  | "happy"
  | "focused"
  | "worried"
  | "tired"
  | "proud";

export interface TaskomonState {
  id: string;
  userId: string;

  mood: TaskomonMood;
  thought: string;

  focusScore: number;
  fatigueScore: number;
  consistencyScore: number;

  lastCommentAt?: string;
  updatedAt: string;
}

export interface TaskomonComment {
  id: string;
  userId: string;
  workspaceId?: string;
  todoId?: string;

  mood: TaskomonMood;
  message: string;

  createdAt: string;
}