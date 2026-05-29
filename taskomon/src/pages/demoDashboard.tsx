import type { ReactNode } from "react";
import taskomonImage from "../assets/taskomon/taskomon.png";
import {
  demoHabits,
  demoTaskomonComments,
  demoTaskomonState,
  demoTodos,
  demoWorkflows,
} from "../data/demoData";

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#241b19]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-300 transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function HexButton({ active, label }: { active?: boolean; label: string }) {
  return (
    <button className="group relative h-12 w-full font-semibold text-sm tracking-wide transition-transform active:scale-[0.98]">
      <div
        className={[
          "clip-hex absolute inset-0 transition-all duration-200",
          active
            ? "bg-gradient-to-r from-orange-600 to-amber-500 shadow-[0_0_18px_rgba(249,115,22,0.25)]"
            : "bg-[#33211c] group-hover:bg-orange-500/50",
        ].join(" ")}
      />

      <div
        className={[
          "clip-hex absolute inset-[1px] flex items-center justify-center transition-colors duration-200",
          active
            ? "bg-gradient-to-r from-orange-500 to-[#d9471f] text-white"
            : "bg-[#141111] text-neutral-400 group-hover:bg-[#211511] group-hover:text-neutral-100",
        ].join(" ")}
      >
        <span className="relative z-10">{label}</span>
      </div>
    </button>
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
        "rounded-2xl border border-[#2b211f] bg-[#12100f]/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]",
        className,
      ].join(" ")}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#a39993]">
          {title}
        </h2>

        {action && (
          <button className="text-xs font-bold text-orange-400 transition-colors hover:text-orange-300">
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
    <div className="rounded-2xl border border-[#2a211f] bg-[#171312] p-4">
      <p className="text-2xl font-black text-orange-400">{value}</p>
      <p className="mt-1 text-xs font-semibold text-neutral-400">{label}</p>
      {note && <p className="mt-2 text-[11px] text-neutral-600">{note}</p>}
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
    <article className="group rounded-2xl border border-[#2a211f] bg-[#151211] p-4 transition-colors hover:border-orange-500/30 hover:bg-[#1b1412]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-neutral-100">{title}</h3>
          <p className="mt-1 truncate text-xs text-neutral-500">{description}</p>
        </div>

        {status && (
          <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-300">
            {status}
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[11px]">
          <span className="text-neutral-500">Progress</span>
          <span className="font-bold text-orange-400">{progress}%</span>
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
    <article className="rounded-2xl border border-[#2a211f] bg-[#151211] p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-neutral-100">{title}</h3>
          <p className="mt-1 text-xs text-neutral-500">{subtitle}</p>
        </div>

        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-orange-500/70 bg-[#0b0909] text-[11px] font-black text-orange-300">
          {progress}%
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-neutral-500">Today</p>
        <p className="text-sm font-bold text-neutral-200">{completed}</p>
      </div>
    </article>
  );
}

function TaskomonMoodPanel() {
  return (
    <Panel title="Taskomon is watching">
      <div className="rounded-2xl border border-[#2a211f] bg-[#090808] p-5 text-center">
        <img
          src={taskomonImage}
          alt="Taskomon"
          className="mx-auto h-40 object-contain drop-shadow-[0_0_24px_rgba(249,115,22,0.15)]"
        />

        <div className="mt-4 rounded-2xl border border-orange-500/20 bg-[#241411] p-4 text-left">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-500">
            Current thought
          </p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-orange-100">
            “{demoTaskomonState.thought}”
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {[
          { title: "Focus", val: demoTaskomonState.focusScore },
          { title: "Fatigue", val: demoTaskomonState.fatigueScore },
          { title: "Consistency", val: demoTaskomonState.consistencyScore },
        ].map((attr) => (
          <div key={attr.title}>
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="font-semibold text-neutral-400">{attr.title}</span>
              <span className="font-bold text-neutral-200">{attr.val}%</span>
            </div>
            <ProgressBar value={attr.val} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function FakeDashboardPage() {
  const completedTodos = demoTodos.filter((todo) => todo.status === "done").length;
  const inProgressTodos = demoTodos.filter(
    (todo) => todo.status === "in_progress"
  ).length;
  const heavyTodos = demoTodos.filter((todo) => todo.heaviness === "heavy").length;

  return (
    <main className="min-h-screen overflow-hidden bg-[#090808] text-neutral-200 antialiased">
      <style>
        {`
          .clip-title {
            clip-path: polygon(0 0, 100% 0, 85% 100%, 0 100%);
          }

          .clip-hex {
            clip-path: polygon(6% 0, 94% 0, 100% 50%, 94% 100%, 6% 100%, 0 50%);
          }

          .clip-notice {
            clip-path: polygon(0 0, calc(100% - 34px) 0, 100% 34px, 100% 100%, 0 100%);
          }
        `}
      </style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_16%,rgba(249,115,22,0.07),transparent_35%),radial-gradient(circle_at_86%_78%,rgba(255,193,7,0.035),transparent_35%)]" />

      <div className="relative z-10 grid min-h-screen grid-cols-[260px_1fr]">
        <aside className="relative flex flex-col justify-between border-r border-[#211918] bg-[#0d0b0b]/90 p-5 pt-0">
          <div className="w-full">
            <div className="absolute left-0 top-0 h-14 w-full">
              <div className="clip-title absolute inset-0 bg-gradient-to-r from-orange-600 to-amber-500" />
              <div className="clip-title absolute inset-[0_0_2px_0] flex items-center bg-[#26110e] pl-5">
                <h1 className="text-sm font-black uppercase tracking-widest text-white">
                  Dashboard
                </h1>
              </div>
            </div>

            <nav className="mt-20 flex flex-col gap-3 px-1">
              <HexButton active label="Notice" />
              <HexButton label="Habit" />
              <HexButton label="Workflow" />
              <HexButton label="Advice" />
            </nav>
          </div>

          <div className="mb-2 rounded-2xl border border-[#2a211f] bg-[#151211] p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full border border-orange-500/30 bg-orange-500/10">
                <img
                  src={taskomonImage}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              </div>

              <div>
                <p className="text-sm font-bold text-neutral-200">Syamil</p>
                <p className="text-[11px] text-neutral-500">Taskomon active</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1 text-xs text-neutral-400">
              <button className="flex justify-center rounded-lg bg-[#0d0b0b] py-1.5 transition-colors hover:bg-[#241815] hover:text-white">
                ⚙
              </button>
              <button className="flex justify-center rounded-lg bg-[#0d0b0b] py-1.5 transition-colors hover:bg-[#241815] hover:text-white">
                🔔
              </button>
              <button className="flex justify-center rounded-lg bg-[#0d0b0b] py-1.5 transition-colors hover:bg-[#241815] hover:text-white">
                ↪
              </button>
            </div>
          </div>
        </aside>

        <section className="mx-auto w-full max-w-7xl overflow-y-auto p-8">
          <header className="mb-7 flex items-end justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">
                Good evening, Syamil
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-neutral-100">
                Taskomon noticed 2 things that may need your attention.
              </h2>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-600">
                Local time
              </p>
              <p className="text-base font-bold text-neutral-300">09:41 PM</p>
            </div>
          </header>

          <div className="grid gap-6 xl:grid-cols-[1fr_350px]">
            <div className="flex flex-col gap-6">
              <section className="clip-notice relative overflow-hidden border-l-2 border-orange-500 bg-gradient-to-r from-[#3a1712] via-[#1b1110] to-[#11100f] p-6 pr-12">
                <div className="absolute right-0 top-0 h-20 w-20 bg-orange-500/10 blur-2xl" />

                <div className="flex items-start gap-5">
                  <div className="hidden h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-orange-500/30 bg-black/30 md:grid">
                    <img
                      src={taskomonImage}
                      alt="Taskomon"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-400">
                      Taskomon says
                    </p>
                    <p className="mt-2 max-w-3xl text-lg font-bold leading-snug text-orange-50">
                      Your heavy task has been in progress for a while. If it feels stuck,
                      split it into a smaller bubble before you burn out.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-black text-white transition hover:bg-orange-400">
                        Split current task
                      </button>
                      <button className="rounded-lg border border-orange-500/30 bg-black/20 px-4 py-2 text-xs font-bold text-orange-200 transition hover:bg-orange-500/10">
                        Start rest timer
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MiniStat label="Tasks cleared" value={completedTodos} />
                <MiniStat label="Currently doing" value={inProgressTodos} />
                <MiniStat label="Heavy tasks" value={heavyTodos} />
                <MiniStat label="Rhythm" value="Stable" />
              </div>

              <Panel title="Habit spaces" action="View all">
                <div className="grid gap-3 md:grid-cols-2">
                  {demoHabits.map((habit, index) => (
                    <HabitCard
                      key={habit.id}
                      title={habit.title}
                      subtitle={`${
                        habit.mode === "build_habit" ? "Build habit" : "One time"
                      } · ${habit.resetFrequency}`}
                      progress={index === 0 ? 70 : 40}
                      completed={index === 0 ? "2 / 3 done" : "2 / 5 done"}
                    />
                  ))}
                </div>
              </Panel>

              <Panel title="Active workflows" action="View all">
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

              <Panel title="Todo bubbles preview">
                <div className="flex flex-wrap gap-3">
                  {demoTodos.slice(0, 5).map((todo) => (
                    <div
                      key={todo.id}
                      className={[
                        "grid min-h-24 w-32 place-items-center rounded-full border p-4 text-center",
                        todo.status === "done"
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : todo.status === "in_progress"
                          ? "border-orange-500/50 bg-orange-500/10"
                          : "border-neutral-700 bg-[#151211]",
                      ].join(" ")}
                    >
                      <div>
                        <p className="text-xs font-bold leading-tight text-neutral-200">
                          {todo.title}
                        </p>
                        <p className="mt-1 text-[10px] capitalize text-neutral-500">
                          {todo.status.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <aside className="flex flex-col gap-6">
              <TaskomonMoodPanel />

              <Panel title="What Taskomon noticed">
                <div className="flex flex-col gap-2.5">
                  {demoTaskomonComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-2xl border border-[#2a211f] bg-[#151211] p-3"
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">
                        {comment.mood}
                      </span>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                        {comment.message}
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Quick start">
                <div className="grid gap-2">
                  <button className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-left text-xs font-bold text-orange-100 transition hover:bg-orange-500/20">
                    Create workflow
                  </button>
                  <button className="rounded-xl border border-[#2a211f] bg-[#151211] px-4 py-3 text-left text-xs font-bold text-neutral-300 transition hover:border-orange-500/30">
                    Create habit
                  </button>
                  <button className="rounded-xl border border-[#2a211f] bg-[#151211] px-4 py-3 text-left text-xs font-bold text-neutral-300 transition hover:border-orange-500/30">
                    Ask Taskomon for advice
                  </button>
                </div>
              </Panel>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

export default FakeDashboardPage;