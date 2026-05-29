import { type ReactNode, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import taskomonImage from "../assets/taskomon/taskomon.png";
import {
  demoBehaviourEvents,
  demoHabits,
  demoTaskomonComments,
  demoTaskomonState,
  demoTodos,
  demoWorkflows,
} from "../data/demoData";
import { loadFromStorage } from "../services/storageServices";
import type { Habit, Heaviness, Priority, Todo, TodoStatus, Workflow } from "../types";

const PREVIEW_BUBBLE_HEIGHT = 96;
const HABIT_STORAGE_PREFIX = "taskomon:habit";
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

function getHabitTodoStorageKey(habitId: string) {
  return `${HABIT_STORAGE_PREFIX}:${habitId}:todos`;
}

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

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getWorkflowTodos(workflow: Workflow) {
  return demoTodos.filter(
    (todo) => todo.parentType === "workflow" && todo.parentId === workflow.id
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

function HexButton({
  active,
  label,
  to,
}: {
  active?: boolean;
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group relative block h-11 w-full text-sm font-bold tracking-wide transition-transform active:scale-[0.98]"
    >
      <div
        className={[
          "clip-hex absolute inset-0 transition-all duration-200",
          active
            ? "bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 shadow-[0_0_18px_rgba(249,115,22,0.28)]"
            : "bg-[#251713] group-hover:bg-[#321b15]",
        ].join(" ")}
      />
      <div
        className={[
          "clip-hex absolute inset-[1px] flex items-center justify-center transition-colors duration-200",
          active
            ? "bg-transparent text-white"
            : "bg-[#17100f] text-orange-100/45 group-hover:text-orange-100/80",
        ].join(" ")}
      >
        <span className="relative z-10">{label}</span>
      </div>
    </Link>
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
  action?: string;
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
          <button className="text-[10px] font-black uppercase tracking-wider text-orange-400 transition-colors hover:brightness-125">
            {action}
          </button>
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
}: {
  title: string;
  description?: string;
  status?: string;
  progress: number;
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
    </article>
  );
}

function HabitCard({
  title,
  subtitle,
  progress,
  completed,
  notice,
}: {
  title: string;
  subtitle: string;
  progress: number;
  completed: string;
  notice?: string;
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
    </article>
  );
}

function TaskomonMoodPanel({
  thought,
  focusScore,
  fatigueScore,
  consistencyScore,
}: {
  thought: string;
  focusScore: number;
  fatigueScore: number;
  consistencyScore: number;
}) {
  return (
    <Panel title="Taskomon State">
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

      <div className="mt-5 grid gap-3.5">
        {[
          { title: "Focus", val: focusScore },
          { title: "Fatigue", val: fatigueScore },
          { title: "Consistency", val: consistencyScore },
        ].map((attr) => (
          <div key={attr.title}>
            <div className="mb-1.5 flex justify-between text-[11px] font-bold">
              <span className="text-orange-100/55">{attr.title}</span>
              <span className="font-black text-neutral-200">{attr.val}%</span>
            </div>
            <ProgressBar value={attr.val} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function DashboardPage() {
  const location = useLocation();
  const syncTime = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
    []
  );

  const habitTodoMap = useMemo(() => {
    return new Map(
      demoHabits.map((habit) => [
        habit.id,
        loadFromStorage<Todo[]>(
          getHabitTodoStorageKey(habit.id),
          getInitialHabitTodos(habit.id)
        ),
      ])
    );
  }, []);

  const habitSummaries = demoHabits.map((habit) => {
    const habitTodos = habitTodoMap.get(habit.id) ?? [];
    const completed = habitTodos.filter((todo) => todo.status === "done").length;
    const late = habitTodos.filter(isTodoLate).length;
    const blocked = habitTodos.filter((todo) => isTodoBlocked(todo, habitTodos)).length;
    const nextDue = habitTodos
      .filter((todo) => todo.status !== "done" && todo.dueMode !== "anytime")
      .sort((a, b) => (getDueMinutes(a) ?? 9999) - (getDueMinutes(b) ?? 9999))[0];

    return {
      habit,
      todos: habitTodos,
      completed,
      late,
      blocked,
      progress: getTodoProgress(habitTodos),
      notice: late
        ? `${late} timed bubble${late > 1 ? "s" : ""} late`
        : blocked
        ? `${blocked} dependency wait${blocked > 1 ? "s" : ""}`
        : nextDue
        ? `Next: ${nextDue.title}`
        : "No timed bubbles left",
    };
  });

  const workflowSummaries = demoWorkflows.map((workflow) => {
    const todos = getWorkflowTodos(workflow);

    return {
      workflow,
      todos,
      progress: getTodoProgress(todos),
    };
  });

  const allTodos = [
    ...workflowSummaries.flatMap((summary) => summary.todos),
    ...habitSummaries.flatMap((summary) => summary.todos),
  ];
  const previewTodos = [...allTodos]
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 5);
  const completedTodos = allTodos.filter((todo) => todo.status === "done").length;
  const inProgressTodos = allTodos.filter(
    (todo) => todo.status === "in_progress"
  ).length;
  const heavyTodos = allTodos.filter((todo) => todo.heaviness === "heavy").length;
  const lateTodos = allTodos.filter(isTodoLate);
  const blockedTodos = allTodos.filter((todo) => isTodoBlocked(todo, allTodos));
  const activeTodo = allTodos.find((todo) => todo.status === "in_progress");
  const heavyActiveTodo = allTodos.find(
    (todo) => todo.status === "in_progress" && todo.heaviness === "heavy"
  );
  const rhythmStatus = lateTodos.length
    ? "Needs check"
    : blockedTodos.length
    ? "Blocked"
    : activeTodo
    ? "In flow"
    : "Stable";
  const taskomonThought = lateTodos[0]
    ? `${lateTodos[0].title} is past its planned time. Adjust the habit or clear it gently.`
    : blockedTodos[0]
    ? `${blockedTodos[0].title} is blocked by a dependency line.`
    : heavyActiveTodo
    ? `${heavyActiveTodo.title} is heavy and currently active. Watch for slowdown.`
    : activeTodo
    ? `${activeTodo.title} is the current bubble. Keep the pace steady.`
    : demoTaskomonState.thought;
  const focusScore = clampScore(
    demoTaskomonState.focusScore + completedTodos * 3 - lateTodos.length * 7
  );
  const fatigueScore = clampScore(
    demoTaskomonState.fatigueScore + heavyTodos * 4 + lateTodos.length * 6
  );
  const consistencyScore = clampScore(
    demoTaskomonState.consistencyScore +
      habitSummaries.filter((summary) => summary.progress === 100).length * 8 -
      lateTodos.length * 5
  );
  const dashboardNotice = lateTodos[0]
    ? {
        title: "Habit timing notice",
        message: `"${lateTodos[0].title}" is past its planned time. Review the habit workspace and either finish it or move the timing.`,
      }
    : blockedTodos[0]
    ? {
        title: "Dependency notice",
        message: `"${blockedTodos[0].title}" is waiting on another bubble. Follow the line and clear the prerequisite first.`,
      }
    : heavyActiveTodo
    ? {
        title: "Taskomon intercept alert",
        message: `"${heavyActiveTodo.title}" is marked heavy and in progress. If the pace slows, split it into a smaller bubble or take a rest.`,
      }
    : {
        title: "Taskomon status",
        message: "No urgent habit notices right now. Your workspace shell is ready for the next check.",
      };

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

          <nav className="mt-20 flex flex-col gap-3 px-1">
            <HexButton
              active={location.pathname === "/dashboard"}
              label="Notice"
              to="/dashboard"
            />

            <HexButton
              active={location.pathname.startsWith("/habit")}
              label="Habit"
              to="/habit"
            />

              <HexButton label="Workflow" to="/dashboard" />
              <HexButton label="Advice" to="/dashboard" />
            </nav>
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
                <p className="text-sm font-bold text-orange-50">Syamil</p>
                <p className="text-[11px] text-amber-300/80">Command deck</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="rounded-lg border border-sky-300/20 bg-sky-500/10 px-2 py-1.5 text-[10px] font-black uppercase text-sky-100/70">
                Login
              </button>
              <button className="rounded-lg border border-emerald-300/20 bg-emerald-500/10 px-2 py-1.5 text-[10px] font-black uppercase text-emerald-100/70">
                Register
              </button>
            </div>
          </div>
        </aside>

        {/* Content Stream Viewport */}
        <section className="grid h-screen grid-rows-[76px_1fr] overflow-hidden">
          <header className="border-b border-orange-950/60 bg-gradient-to-r from-[#40160f] via-[#3a1d10] to-[#2b2011] px-8 py-3">
            <div className="flex h-full items-center justify-between gap-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
                  System Overview
                </p>
                <h2 className="mt-0.5 text-lg font-black tracking-tight text-white">
                  Operational Core Console
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
                      <img src={taskomonImage} alt="Taskomon" className="h-full w-full object-cover" />
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
                          to="/habit"
                          className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-xs font-black text-white transition hover:brightness-110"
                        >
                          Open habit
                        </Link>
                        <button className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-xs font-bold text-sky-100 transition hover:bg-sky-500/20">
                          Ask advice
                        </button>
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
                    note={`${demoBehaviourEvents.length} behaviour events tracked`}
                  />
                </div>

                {/* Habit Realms Grid */}
              <Panel title="Habit Spaces Framework" action="View all units">
                <div className="grid gap-3 md:grid-cols-2">
                  {habitSummaries.map((summary) => (
                  <Link
                    key={summary.habit.id}
                    to={`/habit/${summary.habit.id}`}
                    className="block"
                  >
                    <HabitCard
                      title={summary.habit.title}
                      subtitle={`${getHabitModeLabel(summary.habit)} - ${
                        summary.habit.resetFrequency
                      } reset`}
                      progress={summary.progress}
                      completed={`${summary.completed} / ${summary.todos.length} bubbles clear`}
                      notice={summary.notice}
                    />
                  </Link>
                  ))}
                </div>
              </Panel>

                {/* Workflows Framework */}
                <Panel title="Active Workflow Complexes" action="Inspect pipelines">
                  <div className="grid gap-3">
                    {workflowSummaries.map((summary) => (
                      <WorkspaceCard
                        key={summary.workflow.id}
                        title={summary.workflow.title}
                        description={summary.workflow.description}
                        status={summary.workflow.status}
                        progress={summary.progress}
                      />
                    ))}
                  </div>
                </Panel>

                {/* Authentic Fluid-Bubble Node Previewer */}
                <Panel title="Live Node Matrix Preview">
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
                <TaskomonMoodPanel
                  thought={taskomonThought}
                  focusScore={focusScore}
                  fatigueScore={fatigueScore}
                  consistencyScore={consistencyScore}
                />

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

                <Panel title="Raw Telemetry Stream">
                  <div className="flex flex-col gap-2.5">
                    {demoTaskomonComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-2xl border border-orange-950/40 bg-[#15100f] p-3 shadow-sm"
                      >
                        <span className="text-[9px] font-black uppercase tracking-widest text-orange-400">
                          [{comment.mood}]
                        </span>
                        <p className="mt-1 text-xs font-medium leading-relaxed text-orange-100/70">
                          {comment.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel title="Command Directives">
                  <div className="grid gap-2">
                    <button className="rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-amber-500/5 px-4 py-3 text-left text-xs font-black tracking-wide uppercase text-orange-100 transition hover:brightness-125">
                      + Initialise Workflow Pipeline
                    </button>
                    <button className="rounded-xl border border-orange-950/60 bg-[#15100f] px-4 py-3 text-left text-xs font-black tracking-wide uppercase text-orange-100/60 transition hover:border-orange-500/30 hover:text-orange-100">
                      + Construct Habit Node
                    </button>
                    <button className="rounded-xl border border-orange-950/60 bg-[#15100f] px-4 py-3 text-left text-xs font-black tracking-wide uppercase text-orange-100/60 transition hover:border-orange-500/30 hover:text-orange-100">
                      ? Request AI Assessment
                    </button>
                  </div>
                </Panel>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default DashboardPage;
