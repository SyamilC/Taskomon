export type PomodoroPhase = "focus" | "rest";

export interface PomodoroSettings {
  focusMinutes: number;
  restMinutes: number;
}

export interface PomodoroTimerState extends PomodoroSettings {
  phase: PomodoroPhase;
  remainingSeconds: number;
  running: boolean;
}
