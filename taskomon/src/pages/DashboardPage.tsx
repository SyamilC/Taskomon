import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import taskomonImage from "../assets/taskomon/taskomon.png";
import taskomonconcern from "../assets/taskomon/Taskomon-Icon-Thinking.png";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import {
  getBackendMode,
  getCurrentSession,
  getSessionDisplayName,
  logout,
} from "../services/authService";
import { getMockUserWorkspaces } from "../services/databaseService";
import {
  DEMO_USER_ID,
  demoTodos,
} from "../data/demoData";
import {
  createBehaviourSnapshot,
  loadBehaviourEvents,
} from "../services/behaviourService";
import { loadFromStorage, saveToStorage } from "../services/storageServices";
import {
  applyHabitAutoReset,
  deleteHabitArtifacts,
  deleteWorkflowArtifacts,
  getDefaultWorkflowRuntime,
  getHabitTodoStorageKey,
  getStoredHabits,
  getStoredWorkflows,
  getWorkflowRuntimeStorageKey,
  getWorkflowTodoStorageKey,
  saveStoredHabits,
  saveStoredWorkflows,
} from "../services/workspaceStorage";
import type { WorkflowRuntimeSummary } from "../services/workspaceStorage";
import type {
  BehaviourEvent,
  Habit,
  Heaviness,
  Priority,
  Todo,
  TodoStatus,
  Workflow,
} from "../types";
import NavBar from "./NavBar";

const PREVIEW_BUBBLE_HEIGHT = 96;

const PRIORITY_PREVIEW_STYLE: Record<
  Priority,
  { label: string; badge: string; dot: string; widthBoost: number; heightBoost: number }
> = {
  low: {
    label: "Low priority",
    badge: "border-sky-300/30 bg-sky-400/12 text-sky-100",
    dot: "bg-sky-300",
    widthBoost: 0,
    heightBoost: 0,
  },
  medium: {
    label: "Medium priority",
    badge: "border-amber-300/35 bg-amber-400/14 text-amber-100",
    dot: "bg-amber-300",
    widthBoost: 14,
    heightBoost: 6,
  },
  high: {
    label: "High priority",
    badge: "border-red-300/40 bg-red-400/16 text-red-50",
    dot: "bg-red-300",
    widthBoost: 32,
    heightBoost: 12,
  },
};

const HEAVINESS_PREVIEW_STYLE: Record<
  Heaviness,
  { label: string; badge: string; ring: string; stripe: string; heightBoost: number }
> = {
  light: {
    label: "Light weight",
    badge: "border-emerald-300/30 bg-emerald-400/12 text-emerald-100",
    ring: "ring-1 ring-emerald-200/20",
    stripe: "from-emerald-300/70 via-emerald-200/25 to-transparent",
    heightBoost: 0,
  },
  medium: {
    label: "Medium weight",
    badge: "border-violet-300/30 bg-violet-400/12 text-violet-100",
    ring: "ring-2 ring-violet-200/20",
    stripe: "from-violet-300/75 via-violet-200/25 to-transparent",
    heightBoost: 4,
  },
  heavy: {
    label: "Heavy weight",
    badge: "border-fuchsia-300/35 bg-fuchsia-400/14 text-fuchsia-50",
    ring: "ring-[3px] ring-fuchsia-200/22",
    stripe: "from-fuchsia-300/85 via-fuchsia-200/30 to-transparent",
    heightBoost: 8,
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getPreviewBubbleDimensions(
  todo: Pick<Todo, "title" | "priority" | "heaviness">
) {
  const priority = todo.priority ?? "medium";
  const heaviness = todo.heaviness ?? "medium";
  const titleBoost = Math.max(0, todo.title.trim().length - 14) * 4.5;

  return {
    width: clamp(
      106 + PRIORITY_PREVIEW_STYLE[priority].widthBoost + titleBoost,
      96,
      230
    ),
    height: clamp(
      PREVIEW_BUBBLE_HEIGHT +
        PRIORITY_PREVIEW_STYLE[priority].heightBoost +
        HEAVINESS_PREVIEW_STYLE[heaviness].heightBoost,
      92,
      124
    ),
  };
}

function getInitialHabitTodos(habitId: string) {
  return demoTodos.filter(
    (todo) => todo.parentType === "habit" && todo.parentId === habitId
  );
}

function getInitialWorkflowTodos(workflowId: string) {
  return demoTodos.filter(
    (todo) => todo.parentType === "workflow" && todo.parentId === workflowId
  );
}

function getStatusLabel(status: TodoStatus) {
  if (status === "in_progress") return "Doing";
  if (status === "done") return "Done";
  return "Idle";
}

function getDueMinutes(todo: Todo) {
  if (!todo.dueTime) return null;

  const [hours, minutes] = todo.dueTime.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  return hours * 60 + minutes;
}

function getNowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function isTodoLate(todo: Todo) {
  const dueMinutes = getDueMinutes(todo);
  return (
    todo.status !== "done" &&
    todo.dueMode !== "anytime" &&
    dueMinutes !== null &&
    dueMinutes < getNowMinutes()
  );
}

function isTodoDueSoon(todo: Todo) {
  const dueMinutes = getDueMinutes(todo);
  if (
    todo.status === "done" ||
    todo.dueMode === "anytime" ||
    dueMinutes === null
  ) {
    return false;
  }

  const minutesUntilDue = dueMinutes - getNowMinutes();

  return minutesUntilDue >= 0 && minutesUntilDue <= 90;
}

function getDueText(todo: Todo) {
  if (!todo.dueTime) return "soon";

  return `${todo.dueMode === "at_time" ? "at" : "by"} ${todo.dueTime}`;
}

function getStableThoughtIndex(seed: string, total: number) {
  let hash = 0;

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) % 2147483647;
  }

  return total === 0 ? 0 : hash % total;
}

function getDashboardThought(input: {
  events: BehaviourEvent[];
  monitoredTodos: Todo[];
  completedTodos: number;
  inProgressTodos: number;
  heavyTodos: number;
  heldWorkflowCount: number;
  completedHabitCount: number;
  activeTodo?: Todo;
}) {
  const candidates = [
    "I am doing a tiny patrol around the bubbles. Nothing dramatic, just keeping the desk from getting too foggy.",
    "Small starts still count. I am mostly here to make the first bubble feel less annoying.",
    "The workspace feels better when one bubble is allowed to be the main character for a while.",
    "I am watching for patterns, not judging them. A slow patch is data, not a disaster.",
  ];
  const latestEvent = input.events.find(
    (event) =>
      event.type !== "workspace_opened" && event.type !== "workspace_closed"
  );
  const latestEventTodo = input.monitoredTodos.find(
    (todo) => todo.id === latestEvent?.todoId
  );

  if (latestEvent?.type === "todo_completed") {
    candidates.push(
      latestEventTodo
        ? `I noticed "${latestEventTodo.title}" got cleared. That kind of clean finish makes the board easier to breathe around.`
        : "I noticed a bubble got cleared recently. The board is a little lighter now."
    );
  }

  if (latestEvent?.type === "todo_moved") {
    candidates.push(
      "You moved a bubble recently. Repositioning things is usually the brain quietly negotiating the plan."
    );
  }

  if (latestEvent?.type === "timer_started") {
    candidates.push(
      "The timer started recently. I like that move: it gives the bubble a little fence instead of an endless field."
    );
  }

  if (latestEvent?.type === "rest_taken") {
    candidates.push(
      "A rest interval showed up in the records. Good, the system works better when recovery is part of the plan."
    );
  }

  if (latestEvent?.type === "advice_requested") {
    candidates.push(
      "You asked for advice recently. I am storing that as curiosity, which is secretly a productivity tool."
    );
  }

  if (input.activeTodo) {
    candidates.push(
      `"${input.activeTodo.title}" is active. I am watching the rhythm, but I am not going to shout unless the board gets weird.`
    );
  }

  if (input.inProgressTodos > 1) {
    candidates.push(
      `${input.inProgressTodos} bubbles are in progress. That can work, but one clean finish would calm the board down.`
    );
  }

  if (input.heavyTodos > 0) {
    candidates.push(
      `${input.heavyTodos} heavy bubble${input.heavyTodos > 1 ? "s" : ""} on the board. Heavy does not mean urgent; it means worth slicing carefully.`
    );
  }

  if (input.completedTodos > 0) {
    candidates.push(
      `${input.completedTodos} bubble${input.completedTodos > 1 ? "s" : ""} cleared across the monitored spaces. That is real movement.`
    );
  }

  if (input.completedHabitCount > 0) {
    candidates.push(
      `${input.completedHabitCount} habit space${input.completedHabitCount > 1 ? "s" : ""} look fully clear. The routine is getting some shape.`
    );
  }

  if (input.heldWorkflowCount > 0) {
    candidates.push(
      `${input.heldWorkflowCount} workflow${input.heldWorkflowCount > 1 ? "s are" : " is"} on hold, so I am leaving those bubbles alone for now.`
    );
  }

  const now = new Date();
  const seed = [
    now.toDateString(),
    now.getHours(),
    Math.floor(now.getMinutes() / 10),
    input.events.length,
    input.completedTodos,
    input.inProgressTodos,
    input.heavyTodos,
  ].join(":");

  return candidates[getStableThoughtIndex(seed, candidates.length)];
}

function formatPatternLabel(pattern: string) {
  return pattern
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isTodoBlocked(todo: Todo, allTodos: Todo[]) {
  return todo.dependencyIds.some((dependencyId) => {
    const dependency = allTodos.find((item) => item.id === dependencyId);
    return dependency && dependency.status !== "done";
  });
}

function getTodoProgress(todos: Todo[]) {
  if (todos.length === 0) return 0;

  return Math.round(
    (todos.filter((todo) => todo.status === "done").length / todos.length) * 100
  );
}

function getWorkflowTodos(workflow: Workflow) {
  return loadFromStorage<Todo[]>(
    getWorkflowTodoStorageKey(workflow.id),
    getInitialWorkflowTodos(workflow.id)
  );
}

function getHabitModeLabel(habit: Habit) {
  return habit.mode === "build_habit" ? "Build rhythm" : "One time";
}

function getBubbleTheme(status: TodoStatus) {
  if (status === "done") {
    return {
      shell: "border-emerald-300/75 bg-emerald-500/22 shadow-[0_0_34px_rgba(16,185,129,0.22)]",
      glow: "bg-emerald-300/28",
      label: "text-emerald-50 border-emerald-200/45 bg-emerald-400/18",
    };
  }
  if (status === "in_progress") {
    return {
      shell: "border-orange-300/80 bg-orange-500/22 shadow-[0_0_38px_rgba(249,115,22,0.26)]",
      glow: "bg-orange-300/30",
      label: "text-orange-50 border-orange-200/50 bg-orange-400/18",
    };
  }
  return {
    shell: "border-rose-300/45 bg-rose-500/14 shadow-[0_0_28px_rgba(244,63,94,0.12)]",
    glow: "bg-rose-300/16",
    label: "text-rose-50/80 border-rose-200/30 bg-rose-400/12",
  };
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#321b13]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-red-500 via-orange-400 to-amber-200 transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function Panel({
  title,
  children,
  action,
  className = "",
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-2xl border border-orange-950/40 bg-gradient-to-b from-[#1c1210]/60 to-[#120d0c]/90 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.35)] backdrop-blur",
        className,
      ].join(" ")}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
          {title}
        </h2>
        {action && (
          <div className="text-[10px] font-black uppercase tracking-wider text-orange-400 transition-colors hover:brightness-125">
            {action}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

function MiniStat({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-orange-950/50 bg-[#16100f] p-4 shadow-inner">
      <p className="text-2xl font-black text-amber-300 tracking-tight">{value}</p>
      <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-orange-100/45">{label}</p>
      {note && <p className="mt-2 text-[10px] text-orange-100/30">{note}</p>}
    </div>
  );
}

function WorkspaceCard({
  title,
  description,
  status,
  progress,
  onDelete,
  onEdit,
  openTo,
}: {
  title: string;
  description?: string;
  status?: string;
  progress: number;
  onDelete: () => void;
  onEdit: () => void;
  openTo: string;
}) {
  return (
    <article className="group rounded-2xl border border-orange-950/50 bg-[#15100f] p-4 transition-all duration-200 hover:border-orange-500/30 hover:bg-[#1f1411]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-neutral-50">{title}</h3>
          <p className="mt-1 truncate text-xs text-orange-100/45">{description}</p>
        </div>
        {status && (
          <span className="rounded-full border border-orange-300/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-orange-200">
            {status}
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[10px] font-bold text-orange-100/45">
          <span>Progress</span>
          <span className="font-black text-amber-300">{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
        <Link
          to={openTo}
          className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-3 py-2 text-center text-[10px] font-black uppercase text-white transition hover:brightness-110"
        >
          Open
        </Link>
        <button
          onClick={onEdit}
          className="rounded-xl border border-sky-300/25 bg-sky-500/10 px-3 py-2 text-[10px] font-black uppercase text-sky-100 transition hover:bg-sky-500/20"
        >
          Set
        </button>
        <button
          onClick={onDelete}
          className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-[10px] font-black uppercase text-red-100 transition hover:bg-red-500/20"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function HabitCard({
  title,
  subtitle,
  progress,
  completed,
  notice,
  onDelete,
  onEdit,
  openTo,
}: {
  title: string;
  subtitle: string;
  progress: number;
  completed: string;
  notice?: string;
  onDelete: () => void;
  onEdit: () => void;
  openTo: string;
}) {
  return (
    <article className="rounded-2xl border border-orange-950/50 bg-[#15100f] p-4 shadow-md">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-neutral-50">{title}</h3>
          <p className="mt-1 text-xs text-orange-100/45">{subtitle}</p>
        </div>
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-orange-400/40 bg-[#0c0908] text-xs font-black text-amber-300 shadow-[0_0_14px_rgba(249,115,22,0.12)]">
          {progress}%
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-orange-950/40 pt-3">
        <p className="text-[11px] font-black uppercase tracking-wide text-orange-100/30">Today</p>
        <p className="text-xs font-black text-orange-100">{completed}</p>
      </div>
      {notice && (
        <p className="mt-2 truncate rounded-xl border border-sky-300/15 bg-sky-500/10 px-2.5 py-1.5 text-[10px] font-bold text-sky-100/70">
          {notice}
        </p>
      )}
      <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
        <Link
          to={openTo}
          className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-3 py-2 text-center text-[10px] font-black uppercase text-white transition hover:brightness-110"
        >
          Open
        </Link>
        <button
          onClick={onEdit}
          className="rounded-xl border border-sky-300/25 bg-sky-500/10 px-3 py-2 text-[10px] font-black uppercase text-sky-100 transition hover:bg-sky-500/20"
        >
          Set
        </button>
        <button
          onClick={onDelete}
          className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-[10px] font-black uppercase text-red-100 transition hover:bg-red-500/20"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function TaskomonMoodPanel({
  thought,
}: {
  thought: string;
}) {
  return (
    <Panel title="Taskomon">
      <div className="rounded-2xl border border-orange-950/60 bg-[#0c0908] p-5 text-center shadow-inner">
        <img
          src={taskomonImage}
          alt="Taskomon"
          className="mx-auto h-36 object-contain drop-shadow-[0_0_30px_rgba(249,115,22,0.22)]"
        />
        <div className="mt-4 rounded-2xl border border-orange-400/20 bg-[#201411]/90 p-4 text-left shadow-md">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
            Current thought
          </p>
          <p className="mt-1.5 text-xs font-bold leading-relaxed text-orange-50">
            {thought}
          </p>
        </div>
      </div>
    </Panel>
  );
}

type DashboardModal =
  | { type: "create-habit" }
  | { type: "create-workflow" }
  | { type: "edit-habit"; id: string }
  | { type: "edit-workflow"; id: string }
  | { type: "delete-habit"; id: string }
  | { type: "delete-workflow"; id: string }
  | { type: "report" };

type WorkspaceFormState = {
  title: string;
  description: string;
  habitMode: Habit["mode"];
  resetFrequency: Habit["resetFrequency"];
  focusMinutes: string;
  restMinutes: string;
};

const DEFAULT_WORKSPACE_FORM: WorkspaceFormState = {
  title: "",
  description: "",
  habitMode: "build_habit",
  resetFrequency: "daily",
  focusMinutes: "25",
  restMinutes: "5",
};

function DashboardPage() {
  const currentSession = getCurrentSession();

  if (currentSession?.mode === "guest") {
    return <Navigate to="/guest" replace />;
  }

  if (!currentSession) {
    return <Navigate to="/login" replace />;
  }

  return <AuthenticatedDashboardPage initialSession={currentSession} />;
}

function AuthenticatedDashboardPage({
  initialSession,
}: {
  initialSession: ReturnType<typeof getCurrentSession>;
}) {
  const [habits, setHabits] = useState(() => getStoredHabits());
  const [workflows, setWorkflows] = useState(() => getStoredWorkflows());
  const [modal, setModal] = useState<DashboardModal | null>(null);
  const [workspaceForm, setWorkspaceForm] = useState(DEFAULT_WORKSPACE_FORM);
  const [authSession, setAuthSession] = useState(initialSession);
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    getMockUserWorkspaces()
      .then((workspaces) => {
        console.log("[SUPABASE TEST] Loaded workspaces:", workspaces);
      })
      .catch((error) => {
        console.error("[SUPABASE TEST] Failed:", error);
      });
  }, []);
  const syncTime = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
    []
  );
  const activeHabits = habits.filter((habit) => habit.status !== "archived");

  const habitTodoMap = useMemo(() => {
    return new Map(
      activeHabits.map((habit) => {
        const storedTodos = loadFromStorage<Todo[]>(
          getHabitTodoStorageKey(habit.id),
          getInitialHabitTodos(habit.id)
        );
        const resetTodos = applyHabitAutoReset(habit, storedTodos);

        if (resetTodos !== storedTodos) {
          saveToStorage(getHabitTodoStorageKey(habit.id), resetTodos);
        }

        return [habit.id, resetTodos] as const;
      })
    );
  }, [activeHabits]);

  const habitSummaries = activeHabits.map((habit) => {
    const habitTodos = habitTodoMap.get(habit.id) ?? [];
    const completed = habitTodos.filter((todo) => todo.status === "done").length;
    const late = habitTodos.filter(isTodoLate).length;
    const dueSoon = habitTodos.filter(isTodoDueSoon).length;
    const blocked = habitTodos.filter((todo) => isTodoBlocked(todo, habitTodos)).length;
    const unfinished = habitTodos.filter((todo) => todo.status !== "done").length;
    const nextDue = habitTodos
      .filter((todo) => todo.status !== "done" && todo.dueMode !== "anytime")
      .sort((a, b) => (getDueMinutes(a) ?? 9999) - (getDueMinutes(b) ?? 9999))[0];
    const progress = getTodoProgress(habitTodos);
    const attentionScore =
      late * 120 +
      blocked * 70 +
      dueSoon * 45 +
      unfinished * 12 +
      Math.max(0, 100 - progress);

    return {
      habit,
      todos: habitTodos,
      completed,
      late,
      dueSoon,
      blocked,
      unfinished,
      nextDue,
      progress,
      attentionScore,
      notice: late
        ? `${late} timed bubble${late > 1 ? "s" : ""} late`
        : blocked
        ? `${blocked} dependency wait${blocked > 1 ? "s" : ""}`
        : dueSoon
        ? `${dueSoon} timed bubble${dueSoon > 1 ? "s" : ""} soon`
        : nextDue
        ? `Next: ${nextDue.title} ${getDueText(nextDue)}`
        : unfinished
        ? `${unfinished} bubble${unfinished > 1 ? "s" : ""} left`
        : "All clear",
    };
  });

  const workflowSummaries = workflows.map((workflow) => {
    const todos = getWorkflowTodos(workflow);
    const runtime = loadFromStorage<WorkflowRuntimeSummary>(
      getWorkflowRuntimeStorageKey(workflow.id),
      getDefaultWorkflowRuntime(workflow)
    );

    return {
      workflow,
      runtime,
      todos,
      progress: getTodoProgress(todos),
    };
  });

  const monitoredWorkflowSummaries = workflowSummaries.filter(
    (summary) => summary.runtime.status !== "held"
  );
  const behaviourEvents = [
    ...habitSummaries.flatMap((summary) =>
      loadBehaviourEvents(DEMO_USER_ID, summary.habit.id)
    ),
    ...monitoredWorkflowSummaries.flatMap((summary) =>
      loadBehaviourEvents(DEMO_USER_ID, summary.workflow.id)
    ),
    ...loadBehaviourEvents(DEMO_USER_ID),
  ].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const monitoredTodos = [
    ...monitoredWorkflowSummaries.flatMap((summary) => summary.todos),
    ...habitSummaries.flatMap((summary) => summary.todos),
  ];
  const behaviourSnapshot = createBehaviourSnapshot({
    todos: monitoredTodos,
    events: behaviourEvents,
  });
  const blockedTodos = [
    ...monitoredWorkflowSummaries.flatMap((summary) =>
      summary.todos.filter((todo) => isTodoBlocked(todo, summary.todos))
    ),
    ...habitSummaries.flatMap((summary) =>
      summary.todos.filter((todo) => isTodoBlocked(todo, summary.todos))
    ),
  ];
  const previewTodos = [...monitoredTodos]
    .filter((todo) => todo.status !== "done")
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 1);
  const completedTodos = monitoredTodos.filter(
    (todo) => todo.status === "done"
  ).length;
  const inProgressTodos = monitoredTodos.filter(
    (todo) => todo.status === "in_progress"
  ).length;
  const heavyTodos = monitoredTodos.filter(
    (todo) => todo.heaviness === "heavy"
  ).length;
  const lateTodos = habitSummaries.flatMap((summary) =>
    summary.todos.filter(isTodoLate)
  );
  const activeTodo = monitoredTodos.find((todo) => todo.status === "in_progress");
  const attentionHabit = [...habitSummaries].sort(
    (a, b) => b.attentionScore - a.attentionScore
  )[0];
  const dashboardNotice = attentionHabit
    ? attentionHabit.late
      ? {
          title: "Habit needs attention",
          message: `"${attentionHabit.habit.title}" has ${attentionHabit.late} late timed bubble${attentionHabit.late > 1 ? "s" : ""}. Open it and clear the most realistic one first.`,
          openTo: `/habit/${attentionHabit.habit.id}`,
        }
      : attentionHabit.blocked
      ? {
          title: "Habit dependency notice",
          message: `"${attentionHabit.habit.title}" has ${attentionHabit.blocked} blocked bubble${attentionHabit.blocked > 1 ? "s" : ""}. Follow the line to the prerequisite bubble.`,
          openTo: `/habit/${attentionHabit.habit.id}`,
        }
      : attentionHabit.dueSoon
      ? {
          title: "Habit timing notice",
          message: `"${attentionHabit.habit.title}" has a timed bubble coming up. ${
            attentionHabit.nextDue
              ? `"${attentionHabit.nextDue.title}" is due ${getDueText(attentionHabit.nextDue)}.`
              : "Check the next timed bubble."
          }`,
          openTo: `/habit/${attentionHabit.habit.id}`,
        }
      : attentionHabit.unfinished
      ? {
          title: "Habit notice",
          message: `"${attentionHabit.habit.title}" needs the most attention right now with ${attentionHabit.unfinished} open bubble${attentionHabit.unfinished > 1 ? "s" : ""}.`,
          openTo: `/habit/${attentionHabit.habit.id}`,
        }
      : {
          title: "Habit status",
          message: "No urgent habit notices right now. Your habit workspaces are clear.",
          openTo: "/habits",
        }
    : {
        title: "Habit status",
        message: "No active habits yet. Add one when you are ready to track a rhythm.",
        openTo: "/dashboard",
      };
  const rhythmStatus = lateTodos.length
    ? "Needs check"
    : blockedTodos.length
    ? "Blocked"
    : activeTodo
    ? "In flow"
    : attentionHabit?.unfinished
    ? "Ready"
    : "Stable";
  const taskomonThought = getDashboardThought({
    events: behaviourEvents,
    monitoredTodos,
    completedTodos,
    inProgressTodos,
    heavyTodos,
    heldWorkflowCount:
      workflowSummaries.length - monitoredWorkflowSummaries.length,
    completedHabitCount: habitSummaries.filter(
      (summary) => summary.progress === 100
    ).length,
    activeTodo,
  });
  const modalHabit =
    modal && "id" in modal && modal.type.includes("habit")
      ? habits.find((habit) => habit.id === modal.id)
      : undefined;
  const modalWorkflow =
    modal && "id" in modal && modal.type.includes("workflow")
      ? workflows.find((workflow) => workflow.id === modal.id)
      : undefined;
  const modalIsHabit =
    modal?.type === "create-habit" || modal?.type === "edit-habit";
  const modalIsWorkflow =
    modal?.type === "create-workflow" || modal?.type === "edit-workflow";
  const modalIsDelete =
    modal?.type === "delete-habit" || modal?.type === "delete-workflow";
  const modalTitle =
    modal?.type === "create-habit"
      ? "Add Habit"
      : modal?.type === "edit-habit"
      ? "Set Habit"
      : modal?.type === "delete-habit"
      ? "Delete Habit"
      : modal?.type === "create-workflow"
      ? "Add Workflow"
      : modal?.type === "edit-workflow"
      ? "Set Workflow"
      : modal?.type === "delete-workflow"
      ? "Delete Workflow"
      : modal?.type === "report"
      ? "Behaviour Report"
      : "";
  const userName = authSession ? getSessionDisplayName(authSession) : "Not signed in";
  const backendMode = getBackendMode();

  function handleLogout() {
    logout();
    setAuthSession(null);
    window.location.assign("/login");
  }

  function openCreateHabitModal() {
    setWorkspaceForm({
      ...DEFAULT_WORKSPACE_FORM,
      title: "",
      description: "",
      habitMode: "build_habit",
      resetFrequency: "daily",
    });
    setModal({ type: "create-habit" });
  }

  function openCreateWorkflowModal() {
    setWorkspaceForm({
      ...DEFAULT_WORKSPACE_FORM,
      title: "",
      description: "",
      focusMinutes: "25",
      restMinutes: "5",
    });
    setModal({ type: "create-workflow" });
  }

  function openEditHabitModal(habit: Habit) {
    setWorkspaceForm({
      title: habit.title,
      description: habit.description ?? "",
      habitMode: habit.mode,
      resetFrequency: habit.resetFrequency,
      focusMinutes: "25",
      restMinutes: "5",
    });
    setModal({ type: "edit-habit", id: habit.id });
  }

  function openEditWorkflowModal(workflow: Workflow) {
    const runtime = loadFromStorage<WorkflowRuntimeSummary>(
      getWorkflowRuntimeStorageKey(workflow.id),
      getDefaultWorkflowRuntime(workflow)
    );

    setWorkspaceForm({
      title: workflow.title,
      description: workflow.description ?? "",
      habitMode: "build_habit",
      resetFrequency: "daily",
      focusMinutes: String(runtime.focusMinutes),
      restMinutes: String(runtime.restMinutes),
    });
    setModal({ type: "edit-workflow", id: workflow.id });
  }

  function closeModal() {
    setModal(null);
    setWorkspaceForm(DEFAULT_WORKSPACE_FORM);
  }

  function getMinuteValue(value: string, fallback: number) {
    const parsedValue = Number.parseInt(value, 10);

    if (Number.isNaN(parsedValue)) return fallback;

    return clamp(parsedValue, 1, 180);
  }

  function handleSaveWorkspaceForm() {
    if (!modal || modalIsDelete) return;

    const title = workspaceForm.title.trim();
    const description = workspaceForm.description.trim();
    if (!title) return;

    const now = new Date().toISOString();

    if (modal.type === "create-habit") {
      const nextHabit: Habit = {
        id: crypto.randomUUID(),
        userId: DEMO_USER_ID,
        type: "habit",
        title,
        description,
        createdAt: now,
        updatedAt: now,
        todos: [],
        mode: workspaceForm.habitMode,
        resetFrequency: workspaceForm.resetFrequency,
        noticeEnabled: true,
        status: "active",
      };
      const nextHabits = [...habits, nextHabit];
      setHabits(nextHabits);
      saveStoredHabits(nextHabits);
      closeModal();
      return;
    }

    if (modal.type === "edit-habit" && modalHabit) {
      const nextHabits = habits.map((habit) =>
        habit.id === modalHabit.id
          ? {
              ...habit,
              title,
              description,
              mode: workspaceForm.habitMode,
              resetFrequency: workspaceForm.resetFrequency,
              updatedAt: now,
            }
          : habit
      );
      setHabits(nextHabits);
      saveStoredHabits(nextHabits);
      closeModal();
      return;
    }

    if (modal.type === "create-workflow") {
      const focusMinutes = getMinuteValue(workspaceForm.focusMinutes, 25);
      const restMinutes = getMinuteValue(workspaceForm.restMinutes, 5);
      const nextWorkflow: Workflow = {
        id: crypto.randomUUID(),
        userId: DEMO_USER_ID,
        type: "workflow",
        title,
        description,
        createdAt: now,
        updatedAt: now,
        todos: [],
        focusMinutes,
        restMinutes,
        status: "active",
      };
      const nextWorkflows = [...workflows, nextWorkflow];
      setWorkflows(nextWorkflows);
      saveStoredWorkflows(nextWorkflows);
      saveToStorage(getWorkflowRuntimeStorageKey(nextWorkflow.id), {
        status: nextWorkflow.status,
        focusMinutes,
        restMinutes,
        timerPhase: "focus",
        timerSeconds: focusMinutes * 60,
        timerRunning: false,
        updatedAt: now,
      });
      closeModal();
      return;
    }

    if (modal.type === "edit-workflow" && modalWorkflow) {
      const focusMinutes = getMinuteValue(
        workspaceForm.focusMinutes,
        modalWorkflow.focusMinutes
      );
      const restMinutes = getMinuteValue(
        workspaceForm.restMinutes,
        modalWorkflow.restMinutes
      );
      const nextWorkflows = workflows.map((workflow) =>
        workflow.id === modalWorkflow.id
          ? {
              ...workflow,
              title,
              description,
              focusMinutes,
              restMinutes,
              updatedAt: now,
            }
          : workflow
      );
      const currentRuntime = loadFromStorage<WorkflowRuntimeSummary>(
        getWorkflowRuntimeStorageKey(modalWorkflow.id),
        getDefaultWorkflowRuntime(modalWorkflow)
      );

      setWorkflows(nextWorkflows);
      saveStoredWorkflows(nextWorkflows);
      saveToStorage(getWorkflowRuntimeStorageKey(modalWorkflow.id), {
        ...currentRuntime,
        focusMinutes,
        restMinutes,
        updatedAt: now,
      });
      closeModal();
    }
  }

  function handleConfirmDelete() {
    if (!modalIsDelete || !modal) return;

    if (modal.type === "delete-habit" && modalHabit) {
      const nextHabits = habits.filter((habit) => habit.id !== modalHabit.id);
      setHabits(nextHabits);
      saveStoredHabits(nextHabits);
      deleteHabitArtifacts(modalHabit.id);
      closeModal();
      return;
    }

    if (modal.type === "delete-workflow" && modalWorkflow) {
      const nextWorkflows = workflows.filter(
        (workflow) => workflow.id !== modalWorkflow.id
      );
      setWorkflows(nextWorkflows);
      saveStoredWorkflows(nextWorkflows);
      deleteWorkflowArtifacts(modalWorkflow.id);
      closeModal();
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-[#100c0b] text-neutral-100 antialiased">
      <style>
        {`
          .clip-title {
            clip-path: polygon(0 0, 100% 0, 85% 100%, 0 100%);
          }
          .clip-hex {
            clip-path: polygon(6% 0, 94% 0, 100% 50%, 94% 100%, 6% 100%, 0 50%);
          }
          .clip-notice {
            clip-path: polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 0 100%);
          }
          @keyframes bubbleIdle {
            0%, 100% { translate: 0 0; }
            50% { translate: 0 -3px; }
          }
          .bubble-preview-idle {
            animation: bubbleIdle 3.2s ease-in-out infinite;
          }
          .dashboard-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .dashboard-scrollbar::-webkit-scrollbar-track {
            background: #100c0b;
          }
          .dashboard-scrollbar::-webkit-scrollbar-thumb {
            background: #42231b;
            border-radius: 999px;
          }
          .dashboard-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #f97316;
          }
        `}
      </style>

      {/* Atmospheric Backlighting ambient maps */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(220,38,38,0.1),transparent_30%),radial-gradient(circle_at_82%_16%,rgba(251,191,36,0.06),transparent_28%),radial-gradient(circle_at_50%_70%,rgba(249,115,22,0.05),transparent_40%)]" />

      <div className="relative z-10 grid h-screen grid-cols-[230px_1fr]">
        {/* Left Global Control Deck Sidebar */}
        <aside className="relative flex h-screen flex-col justify-between border-r border-orange-950/60 bg-gradient-to-b from-[#21110e] via-[#17100f] to-[#100c0b] p-4 pt-0">
          <div>
            <div className="absolute left-0 top-0 h-14 w-full">
              <div className="clip-title absolute inset-0 bg-gradient-to-r from-red-600 via-orange-500 to-amber-300" />
              <div className="clip-title absolute inset-[0_0_2px_0] flex items-center bg-[#3a1710] pl-5">
                <h1 className="text-sm font-black uppercase tracking-widest text-white">
                  Dashboard
                </h1>
              </div>
            </div>

            <NavBar />
          </div>

          {/* User Anchor Pod */}
          <div className="rounded-2xl border border-orange-500/20 bg-orange-950/20 p-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 overflow-hidden rounded-full border border-orange-400/50 bg-orange-500/15">
                <img
                  src={taskomonImage}
                  alt="Taskomon"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-orange-50">{userName}</p>
                <p className="text-[11px] text-amber-300/80">
                  {backendMode === "supabase" ? "Supabase profile" : "Local profile"}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 w-full rounded-lg border border-orange-300/20 bg-orange-500/10 px-2 py-1.5 text-center text-[10px] font-black uppercase text-orange-100/70 transition hover:bg-orange-500/20"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Content Stream Viewport */}
        <section className="grid h-screen grid-rows-[76px_1fr] overflow-hidden">
          <header className="border-b border-orange-950/60 bg-gradient-to-r from-[#40160f] via-[#3a1d10] to-[#2b2011] px-8 py-3">
            <div className="flex h-full items-center justify-between gap-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
                  Organize your Task with
                </p>
                <h2 className="mt-0.8 text-[32px] font-black tracking-tight text-white">
                  Taskomon
                </h2>
              </div>
              <div className="text-right shrink-0 rounded-2xl border border-orange-300/15 bg-orange-500/5 px-4 py-1.5">
                <p className="text-[9px] font-black uppercase tracking-wider text-orange-100/45">
                  Local Sync Time
                </p>
                <p className="text-sm font-black text-orange-100">{syncTime}</p>
              </div>
            </div>
          </header>

          <div className="dashboard-scrollbar overflow-y-auto bg-[#140f0e] p-8">
            <div className="mx-auto w-full max-w-6xl grid gap-6 xl:grid-cols-[1fr_340px]">
              {/* Primary Metric Arrays & Lists */}
              <div className="flex flex-col gap-6">
                
                {/* Micro-Notice Banner Pod */}
                <section className="clip-notice relative overflow-hidden border-l-2 border-orange-500 bg-gradient-to-r from-[#3a1712]/90 via-[#1c110f]/95 to-[#120d0c]/90 p-5 pr-12 shadow-lg">
                  <div className="absolute right-0 top-0 h-24 w-24 bg-gradient-to-bl from-orange-500/10 to-transparent blur-2xl" />
                  <div className="flex items-start gap-4">
                    <div className="hidden h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-orange-500/30 bg-black/30 md:grid">
                      <img src={taskomonconcern} alt="Taskomon" className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">
                        {dashboardNotice.title}
                      </p>
                      <p className="mt-1.5 max-w-2xl text-base font-bold leading-snug text-orange-50">
                        {dashboardNotice.message}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          to={dashboardNotice.openTo}
                          className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-xs font-black text-white transition hover:brightness-110"
                        >
                          Open notice
                        </Link>
                        <Link
                          to="/advice"
                          className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-xs font-bold text-sky-100 transition hover:bg-sky-500/20"
                        >
                          Ask advice
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Performance Matrix */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <MiniStat label="Tasks cleared" value={completedTodos} />
                  <MiniStat label="Currently doing" value={inProgressTodos} />
                  <MiniStat label="Heavy tasks" value={heavyTodos} />
                  <MiniStat
                    label="Rhythm Status"
                    value={rhythmStatus}
                    note={
                      monitoredWorkflowSummaries.length === workflowSummaries.length
                        ? "Active habits and workflows watched"
                        : "Held workflows ignored"
                    }
                  />
                </div>

                {/* Habit Realms Grid */}
              <Panel
                title="Habit Workpaces"
                action={<Link to="/habits">View all</Link>}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  {habitSummaries.map((summary) => (
                    <HabitCard
                      key={summary.habit.id}
                      title={summary.habit.title}
                      subtitle={`${getHabitModeLabel(summary.habit)} - ${
                        summary.habit.resetFrequency
                      } reset`}
                      progress={summary.progress}
                      completed={`${summary.completed} / ${summary.todos.length} bubbles clear`}
                      notice={summary.notice}
                      openTo={`/habit/${summary.habit.id}`}
                      onEdit={() => openEditHabitModal(summary.habit)}
                      onDelete={() =>
                        setModal({ type: "delete-habit", id: summary.habit.id })
                      }
                    />
                  ))}
                </div>
              </Panel>

                {/* Workflows Framework */}
                <Panel
                  title="Workflow Workspaces"
                  action={<Link to="/workflows">View all</Link>}
                >
                  <div className="grid gap-3">
                    {workflowSummaries.map((summary) => (
                      <WorkspaceCard
                        key={summary.workflow.id}
                        title={summary.workflow.title}
                        description={summary.workflow.description}
                        status={summary.runtime.status}
                        progress={summary.progress}
                        openTo={`/workflow/${summary.workflow.id}`}
                        onEdit={() => openEditWorkflowModal(summary.workflow)}
                        onDelete={() =>
                          setModal({
                            type: "delete-workflow",
                            id: summary.workflow.id,
                          })
                        }
                      />
                    ))}
                  </div>
                </Panel>

                {/* Authentic Fluid-Bubble Node Previewer */}
                <Panel title="To-do preview">
                  <div className="flex flex-wrap items-center justify-start gap-5 p-2 bg-[#0c0908]/50 rounded-2xl border border-orange-950/40">
                    {previewTodos.map((todo, i) => {
                      const theme = getBubbleTheme(todo.status as TodoStatus);
                      const dimensions = getPreviewBubbleDimensions(todo);
                      const priority = todo.priority ?? "medium";
                      const heaviness = todo.heaviness ?? "medium";
                      const priorityStyle = PRIORITY_PREVIEW_STYLE[priority];
                      const heavinessStyle = HEAVINESS_PREVIEW_STYLE[heaviness];
                      return (
                        <div
                          key={todo.id}
                          className={[
                            "bubble-preview-idle relative select-none rounded-full border flex items-center justify-center p-3 text-center",
                            theme.shell,
                            heavinessStyle.ring,
                          ].join(" ")}
                          style={{
                            width: dimensions.width,
                            height: dimensions.height,
                            animationDelay: `${i * 240}ms`,
                          }}
                        >
                          <div
                            className={[
                              "absolute left-0 top-1/2 h-[62%] w-1.5 -translate-y-1/2 rounded-full bg-gradient-to-b",
                              heavinessStyle.stripe,
                            ].join(" ")}
                          />
                          <div
                            className={[
                              "absolute right-3 top-3 h-2 w-2 rounded-full shadow-[0_0_10px_currentColor]",
                              priorityStyle.dot,
                            ].join(" ")}
                          />
                          <div className="min-w-0 overflow-hidden rounded-full p-1">
                            <div className={[
                              "pointer-events-none absolute -right-3 -top-3 h-12 w-12 rounded-full blur-xl opacity-30",
                              theme.glow
                            ].join(" ")} />
                            <p className="relative z-10 line-clamp-2 text-[10px] font-black leading-tight text-neutral-100 [overflow-wrap:anywhere]">
                              {todo.title}
                            </p>
                            <div className="relative z-10 mt-1 flex flex-wrap justify-center gap-1">
                              <span
                                className={[
                                  "rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase",
                                  priorityStyle.badge,
                                ].join(" ")}
                              >
                                {priorityStyle.label}
                              </span>
                              <span
                                className={[
                                  "rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase",
                                  heavinessStyle.badge,
                                ].join(" ")}
                              >
                                {heavinessStyle.label}
                              </span>
                            </div>
                            <span className={[
                              "relative z-10 mt-1 inline-block rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide scale-90",
                              theme.label
                            ].join(" ")}>
                              {getStatusLabel(todo.status)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              </div>

              {/* Auxiliary Monitor Sidebar Panel */}
              <aside className="flex flex-col gap-6">
                <TaskomonMoodPanel thought={taskomonThought} />

                <Panel title="Habit Analysis Report">
                  <div className="grid gap-2.5">
                    {habitSummaries.map((summary) => (
                      <div
                        key={summary.habit.id}
                        className="rounded-2xl border border-sky-300/15 bg-[#10161d] p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-xs font-black text-sky-50">
                            {summary.habit.title}
                          </p>
                          <span className="rounded-full border border-sky-300/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-black text-sky-100">
                            {summary.progress}%
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] font-semibold text-sky-100/55">
                          {summary.completed}/{summary.todos.length} clear,
                          {" "}
                          {summary.late} late, {summary.blocked} blocked
                        </p>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel title="Navigate">
                  <div className="grid gap-2">
                    <button
                      onClick={openCreateWorkflowModal}
                      className="rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-amber-500/5 px-4 py-3 text-left text-xs font-black tracking-wide uppercase text-orange-100 transition hover:brightness-125"
                    >
                      + Add Workflow
                    </button>
                    <button
                      onClick={openCreateHabitModal}
                      className="rounded-xl border border-orange-950/60 bg-[#15100f] px-4 py-3 text-left text-xs font-black tracking-wide uppercase text-orange-100/60 transition hover:border-orange-500/30 hover:text-orange-100"
                    >
                      + Add Habit
                    </button>
                    <button
                      onClick={() => setModal({ type: "report" })}
                      className="rounded-xl border border-orange-950/60 bg-[#15100f] px-4 py-3 text-left text-xs font-black tracking-wide uppercase text-orange-100/60 transition hover:border-orange-500/30 hover:text-orange-100"
                    >
                      ? Request Report
                    </button>
                  </div>
                </Panel>
              </aside>
            </div>
          </div>
        </section>
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-2xl border border-orange-300/25 bg-[#15100f] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                  Report Analysis
                </p>
                <h3 className="mt-1 text-lg font-black text-white">{modalTitle}</h3>
              </div>
              <button
                onClick={closeModal}
                className="rounded-full border border-orange-300/20 bg-orange-500/10 px-3 py-1.5 text-[10px] font-black uppercase text-orange-100/70 transition hover:bg-orange-500/20"
              >
                Close
              </button>
            </div>

            {modal?.type === "report" ? (
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-orange-950/50 bg-[#0c0908] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                    Prototype analysis
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-orange-50/75">
                    This report is generated from stored behaviour events and
                    currently monitored todos. Held workflows are ignored.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Completion", `${behaviourSnapshot.completionRate}%`],
                    ["Momentum", `${behaviourSnapshot.momentumScore}%`],
                    ["Fatigue", `${behaviourSnapshot.fatigueScore}%`],
                    ["Avoidance", `${behaviourSnapshot.avoidanceScore}%`],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-orange-950/50 bg-[#16100f] p-3"
                    >
                      <p className="text-[9px] font-black uppercase tracking-wide text-orange-100/35">
                        {label}
                      </p>
                      <p className="mt-1 text-xl font-black text-orange-50">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-sky-300/15 bg-[#10161d] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-200">
                    Behaviour notes
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {behaviourSnapshot.detectedPatterns.length > 0 ? (
                      behaviourSnapshot.detectedPatterns.map((pattern) => (
                        <span
                          key={pattern}
                          className="rounded-full border border-sky-300/20 bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase text-sky-100"
                        >
                          {formatPatternLabel(pattern)}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs font-semibold text-sky-100/55">
                        No strong pattern detected yet.
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 text-xs font-semibold text-orange-50/70">
                  <p>
                    {behaviourSnapshot.completedTodos}/
                    {behaviourSnapshot.totalTodos} monitored bubbles are done.
                  </p>
                  <p>
                    {behaviourSnapshot.highPriorityUnfinishedCount} high
                    priority bubble
                    {behaviourSnapshot.highPriorityUnfinishedCount === 1
                      ? ""
                      : "s"}{" "}
                    still need attention.
                  </p>
                  <p>
                    {behaviourSnapshot.heavyCompletedCount}/
                    {behaviourSnapshot.heavyTaskCount} heavy bubbles are clear.
                  </p>
                  {behaviourSnapshot.averageCompletionMinutes !== undefined && (
                    <p>
                      Average completion time is about{" "}
                      {behaviourSnapshot.averageCompletionMinutes} minutes.
                    </p>
                  )}
                  {behaviourSnapshot.currentTaskMinutes !== undefined && (
                    <p>
                      Current active task has been running about{" "}
                      {behaviourSnapshot.currentTaskMinutes} minutes.
                    </p>
                  )}
                </div>
              </div>
            ) : modalIsDelete ? (
              <div className="mt-5">
                <p className="text-sm font-semibold leading-relaxed text-orange-50/80">
                  Delete{" "}
                  <span className="font-black text-white">
                    {modalHabit?.title ?? modalWorkflow?.title}
                  </span>
                  ? This also clears its saved todos, timer data, and reset data.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    onClick={closeModal}
                    className="rounded-xl border border-orange-300/20 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase text-orange-100 transition hover:bg-orange-500/20"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="rounded-xl border border-red-300/35 bg-red-500/15 px-4 py-2 text-xs font-black uppercase text-red-100 transition hover:bg-red-500/25"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-orange-100/55">
                  Title
                  <input
                    value={workspaceForm.title}
                    onChange={(event) =>
                      setWorkspaceForm((form) => ({
                        ...form,
                        title: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-orange-300/20 bg-[#0f0a09] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-orange-50 outline-none focus:border-orange-300/60"
                  />
                </label>

                <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-orange-100/55">
                  Description
                  <textarea
                    value={workspaceForm.description}
                    onChange={(event) =>
                      setWorkspaceForm((form) => ({
                        ...form,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    className="resize-none rounded-xl border border-orange-300/20 bg-[#0f0a09] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-orange-50 outline-none focus:border-orange-300/60"
                  />
                </label>

                {modalIsHabit && (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-orange-100/55">
                      Habit mode
                      <select
                        value={workspaceForm.habitMode}
                        onChange={(event) =>
                          setWorkspaceForm((form) => ({
                            ...form,
                            habitMode: event.target.value as Habit["mode"],
                          }))
                        }
                        className="rounded-xl border border-orange-300/20 bg-[#0f0a09] px-3 py-2 text-xs font-semibold normal-case tracking-normal text-orange-50 outline-none focus:border-orange-300/60"
                      >
                        <option value="build_habit">Build habit</option>
                        <option value="one_time">One time</option>
                      </select>
                    </label>

                    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-orange-100/55">
                      Reset
                      <select
                        value={workspaceForm.resetFrequency}
                        disabled={workspaceForm.habitMode === "one_time"}
                        onChange={(event) =>
                          setWorkspaceForm((form) => ({
                            ...form,
                            resetFrequency: event.target.value as Habit["resetFrequency"],
                          }))
                        }
                        className="rounded-xl border border-orange-300/20 bg-[#0f0a09] px-3 py-2 text-xs font-semibold normal-case tracking-normal text-orange-50 outline-none disabled:opacity-40 focus:border-orange-300/60"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </label>
                  </div>
                )}

                {modalIsWorkflow && (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-orange-100/55">
                      Focus min
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={workspaceForm.focusMinutes}
                        onChange={(event) =>
                          setWorkspaceForm((form) => ({
                            ...form,
                            focusMinutes: event.target.value,
                          }))
                        }
                        className="rounded-xl border border-orange-300/20 bg-[#0f0a09] px-3 py-2 text-xs font-semibold normal-case tracking-normal text-orange-50 outline-none focus:border-orange-300/60"
                      />
                    </label>

                    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-orange-100/55">
                      Rest min
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={workspaceForm.restMinutes}
                        onChange={(event) =>
                          setWorkspaceForm((form) => ({
                            ...form,
                            restMinutes: event.target.value,
                          }))
                        }
                        className="rounded-xl border border-orange-300/20 bg-[#0f0a09] px-3 py-2 text-xs font-semibold normal-case tracking-normal text-orange-50 outline-none focus:border-orange-300/60"
                      />
                    </label>
                  </div>
                )}

                <button
                  onClick={handleSaveWorkspaceForm}
                  className="mt-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2.5 text-xs font-black uppercase text-white transition hover:brightness-110"
                >
                  Save
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default DashboardPage;
