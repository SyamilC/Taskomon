import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import taskomonImage from "../assets/taskomon/taskomon.png";
import {
  demoHabits,
  demoTaskomonComments,
  demoTaskomonState,
  demoTodos,
  demoWorkflows,
} from "../data/demoData";
import type { TodoStatus } from "../types";

const BUBBLE_SIZE = 96; // Scaled down for preview space

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
}: {
  title: string;
  subtitle: string;
  progress: number;
  completed: string;
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
    </article>
  );
}

function TaskomonMoodPanel() {
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
            “{demoTaskomonState.thought}”
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3.5">
        {[
          { title: "Focus", val: demoTaskomonState.focusScore },
          { title: "Fatigue", val: demoTaskomonState.fatigueScore },
          { title: "Consistency", val: demoTaskomonState.consistencyScore },
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
  const completedTodos = demoTodos.filter((todo) => todo.status === "done").length;
  const inProgressTodos = demoTodos.filter((todo) => todo.status === "in_progress").length;
  const heavyTodos = demoTodos.filter((todo) => todo.heaviness === "heavy").length;

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
              active={location.pathname === "/habit"}
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
                <p className="text-sm font-black text-orange-100">09:41 PM</p>
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
                        Taskomon Intercept Alert
                      </p>
                      <p className="mt-1.5 max-w-2xl text-base font-bold leading-snug text-orange-50">
                        Your heavy task has been locked in progress phase for extended parameters. If it feels static, 
                        isolate into a smaller structural bubble cluster before exhaustion triggers.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-xs font-black text-white transition hover:brightness-110">
                          Split current task
                        </button>
                        <button className="rounded-xl border border-orange-500/30 bg-orange-500/5 px-4 py-2 text-xs font-bold text-orange-200 transition hover:bg-orange-500/10">
                          Start rest timer
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
                  <MiniStat label="Rhythm Status" value="Stable" />
                </div>

                {/* Habit Realms Grid */}
              <Panel title="Habit Spaces Framework" action="View all units">
                <div className="grid gap-3 md:grid-cols-2">
                  {demoHabits.map((habit, index) => (
                  <Link key={habit.id} to="/habit" className="block">
                    <HabitCard
                      title={habit.title}
                      subtitle={`${
                      habit.mode === "build_habit" ? "Build rhythm" : "Singular objective"
                      } · ${habit.resetFrequency}`}
                      progress={index === 0 ? 70 : 40}
                      completed={index === 0 ? "2 / 3 units clear" : "2 / 5 units clear"}
                    />
                  </Link>
                  ))}
                </div>
              </Panel>

                {/* Workflows Framework */}
                <Panel title="Active Workflow Complexes" action="Inspect pipelines">
                  <div className="grid gap-3">
                    {demoWorkflows.map((workflow, index) => (
                      <WorkspaceCard
                        key={workflow.id}
                        title={workflow.title}
                        description={workflow.description}
                        status={workflow.status}
                        progress={index === 0 ? 45 : 25}
                      />
                    ))}
                  </div>
                </Panel>

                {/* Authentic Fluid-Bubble Node Previewer */}
                <Panel title="Live Node Matrix Preview">
                  <div className="flex flex-wrap items-center justify-start gap-5 p-2 bg-[#0c0908]/50 rounded-2xl border border-orange-950/40">
                    {demoTodos.slice(0, 5).map((todo, i) => {
                      const theme = getBubbleTheme(todo.status as TodoStatus);
                      return (
                        <div
                          key={todo.id}
                          className={[
                            "bubble-preview-idle relative select-none rounded-full border flex items-center justify-center p-3 text-center",
                            theme.shell,
                          ].join(" ")}
                          style={{
                            width: BUBBLE_SIZE,
                            height: BUBBLE_SIZE,
                            animationDelay: `${i * 240}ms`,
                          }}
                        >
                          <div className="overflow-hidden rounded-full p-1">
                            <div className={[
                              "pointer-events-none absolute -right-3 -top-3 h-12 w-12 rounded-full blur-xl opacity-30",
                              theme.glow
                            ].join(" ")} />
                            <p className="line-clamp-2 text-[10px] font-black leading-tight text-neutral-100 relative z-10">
                              {todo.title}
                            </p>
                            <span className={[
                              "mt-1.5 inline-block rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide scale-90",
                              theme.label
                            ].join(" ")}>
                              {todo.status === "in_progress" ? "Doing" : todo.status === "done" ? "Done" : "Idle"}
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
                <TaskomonMoodPanel />

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