import { type FormEvent, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import taskomonImage from "../assets/taskomon/taskomon.png";
import { localSeed } from "../data/localSeed";
import { getCurrentSession } from "../services/authService";
import { loadFromStorage, saveToStorage } from "../services/storageServices";
import {
  getDefaultWorkflowRuntime,
  getStoredWorkflows,
  getWorkflowRuntimeStorageKey,
  getWorkflowTodoStorageKey,
  saveStoredWorkflows,
} from "../services/workspaceStorage";
import type { WorkflowRuntimeSummary } from "../services/workspaceStorage";
import type { Todo, Workflow } from "../types";
import NavBar from "./NavBar";

function getInitialWorkflowTodos(workflowId: string) {
  return localSeed.todos.filter(
    (todo) => todo.parentType === "workflow" && todo.parentId === workflowId
  );
}

function getWorkflowTodos(workflow: Workflow) {
  return loadFromStorage<Todo[]>(
    getWorkflowTodoStorageKey(workflow.id),
    getInitialWorkflowTodos(workflow.id)
  );
}

function getProgress(todos: Todo[]) {
  if (todos.length === 0) return 0;

  return Math.round(
    (todos.filter((todo) => todo.status === "done").length / todos.length) * 100
  );
}

type GuestActionTone = "orange" | "sky" | "emerald" | "muted";

const GUEST_ACTION_TONES: Record<
  GuestActionTone,
  { outer: string; inner: string }
> = {
  orange: {
    outer: "bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 shadow-[0_0_18px_rgba(249,115,22,0.22)]",
    inner: "bg-[#23110d] text-orange-50 group-hover:bg-[#32160f]",
  },
  sky: {
    outer: "bg-sky-300/25 group-hover:bg-sky-300/45",
    inner: "bg-[#10161d] text-sky-100/75 group-hover:text-sky-50",
  },
  emerald: {
    outer: "bg-emerald-300/25 group-hover:bg-emerald-300/45",
    inner: "bg-[#101a15] text-emerald-100/75 group-hover:text-emerald-50",
  },
  muted: {
    outer: "bg-orange-300/18 group-hover:bg-orange-300/32",
    inner: "bg-[#17100f] text-orange-100/58 group-hover:text-orange-100",
  },
};

function GuestHexLink({
  to,
  children,
  tone = "muted",
  className = "",
}: {
  to: string;
  children: string;
  tone?: GuestActionTone;
  className?: string;
}) {
  const theme = GUEST_ACTION_TONES[tone];

  return (
    <Link
      to={to}
      className={`group relative block h-10 text-[10px] font-black uppercase tracking-wide transition-transform active:scale-[0.98] ${className}`}
    >
      <div className={`clip-hex absolute inset-0 transition ${theme.outer}`} />
      <div
        className={`clip-hex absolute inset-[1px] grid place-items-center px-4 transition ${theme.inner}`}
      >
        <span className="relative z-10">{children}</span>
      </div>
    </Link>
  );
}

function GuestHexButton({
  onClick,
  children,
  tone = "muted",
}: {
  onClick: () => void;
  children: string;
  tone?: GuestActionTone;
}) {
  const theme = GUEST_ACTION_TONES[tone];

  return (
    <button
      onClick={onClick}
      className="group relative h-11 w-full text-left text-xs font-black uppercase tracking-wide transition-transform active:scale-[0.98]"
    >
      <div className={`clip-hex absolute inset-0 transition ${theme.outer}`} />
      <div
        className={`clip-hex absolute inset-[1px] flex items-center px-5 transition ${theme.inner}`}
      >
        <span className="relative z-10">{children}</span>
      </div>
    </button>
  );
}

function GuestDashboardPage() {
  const session = getCurrentSession();

  if (session?.mode === "local") {
    return <Navigate to="/dashboard" replace />;
  }

  if (session?.mode !== "guest") {
    return <Navigate to="/login" replace />;
  }

  return <GuestDashboardContent />;
}

function GuestDashboardContent() {
  const [workflows, setWorkflows] = useState(() => getStoredWorkflows());
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [focusMinutes, setFocusMinutes] = useState("25");
  const [restMinutes, setRestMinutes] = useState("5");
  const syncTime = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
    []
  );
  const summaries = workflows.map((workflow) => {
    const todos = getWorkflowTodos(workflow);
    const runtime = loadFromStorage<WorkflowRuntimeSummary>(
      getWorkflowRuntimeStorageKey(workflow.id),
      getDefaultWorkflowRuntime(workflow)
    );

    return {
      workflow,
      runtime,
      todos,
      progress: getProgress(todos),
      completed: todos.filter((todo) => todo.status === "done").length,
      active: todos.filter((todo) => todo.status === "in_progress").length,
    };
  });

  function getMinuteValue(value: string, fallback: number) {
    const parsedValue = Number.parseInt(value, 10);

    if (Number.isNaN(parsedValue)) return fallback;

    return Math.max(1, Math.min(180, parsedValue));
  }

  function handleCreateWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const now = new Date().toISOString();
    const focus = getMinuteValue(focusMinutes, 25);
    const rest = getMinuteValue(restMinutes, 5);
    const workflow: Workflow = {
      id: crypto.randomUUID(),
      userId: "guest-user",
      type: "workflow",
      title: trimmedTitle,
      description: description.trim(),
      createdAt: now,
      updatedAt: now,
      todos: [],
      focusMinutes: focus,
      restMinutes: rest,
      status: "active",
    };
    const nextWorkflows = [...workflows, workflow];

    setWorkflows(nextWorkflows);
    saveStoredWorkflows(nextWorkflows);
    saveToStorage(getWorkflowTodoStorageKey(workflow.id), []);
    saveToStorage(getWorkflowRuntimeStorageKey(workflow.id), {
      ...getDefaultWorkflowRuntime(workflow),
      focusMinutes: focus,
      restMinutes: rest,
    });
    setTitle("");
    setDescription("");
    setFocusMinutes("25");
    setRestMinutes("5");
    setShowCreate(false);
  }

  return (
    <main className="h-screen overflow-hidden bg-[#100c0b] text-neutral-100 antialiased">
      <style>
        {`
          .clip-title {
            clip-path: polygon(0 0, 100% 0, 85% 100%, 0 100%);
          }
          .clip-notice {
            clip-path: polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 0 100%);
          }
          .clip-hex {
            clip-path: polygon(6% 0, 94% 0, 100% 50%, 94% 100%, 6% 100%, 0 50%);
          }
        `}
      </style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(220,38,38,0.1),transparent_30%),radial-gradient(circle_at_82%_16%,rgba(251,191,36,0.06),transparent_28%),radial-gradient(circle_at_50%_70%,rgba(249,115,22,0.05),transparent_40%)]" />

      <div className="relative z-10 grid h-screen grid-cols-[230px_1fr]">
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
                <p className="text-sm font-bold text-orange-50">Guest</p>
                <p className="text-[11px] text-amber-300/80">Workflow only</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <GuestHexLink to="/login" tone="sky">
                Login
              </GuestHexLink>
              <GuestHexLink to="/register" tone="emerald">
                Register
              </GuestHexLink>
            </div>
          </div>
        </aside>

        <section className="grid h-screen grid-rows-[76px_1fr] overflow-hidden">
          <header className="border-b border-orange-950/60 bg-gradient-to-r from-[#40160f] via-[#3a1d10] to-[#2b2011] px-8 py-3">
            <div className="flex h-full items-center justify-between gap-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
                  Local demo access
                </p>
                <h2 className="mt-0.8 text-[32px] font-black tracking-tight text-white">
                  Guest Dashboard
                </h2>
              </div>
              <div className="shrink-0 rounded-2xl border border-orange-300/15 bg-orange-500/5 px-4 py-1.5 text-right">
                <p className="text-[9px] font-black uppercase tracking-wider text-orange-100/45">
                  Local Sync Time
                </p>
                <p className="text-sm font-black text-orange-100">{syncTime}</p>
              </div>
            </div>
          </header>

          <div className="overflow-y-auto bg-[#140f0e] p-8">
            <div className="mx-auto grid w-full max-w-6xl gap-6 xl:grid-cols-[1fr_320px]">
              <div className="grid gap-6">
                <section className="clip-notice relative overflow-hidden border-l-2 border-orange-500 bg-gradient-to-r from-[#3a1712]/90 via-[#1c110f]/95 to-[#120d0c]/90 p-5 shadow-lg">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">
                    Guest mode
                  </p>
                  <p className="mt-1.5 max-w-2xl text-base font-bold leading-snug text-orange-50">
                    Workflows stay usable here and save to this browser. Habits,
                    reports, advice, and behaviour analysis unlock after login.
                  </p>
                </section>

                <section className="rounded-2xl border border-orange-950/60 bg-[#15100f] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                        Workflow Workspaces
                      </p>
                      <h3 className="mt-1 text-lg font-black text-white">
                        Continue locally
                      </h3>
                    </div>
                    <GuestHexLink
                      to="/workflows"
                      tone="orange"
                      className="w-28 shrink-0"
                    >
                      View all
                    </GuestHexLink>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {summaries.map((summary) => (
                      <article
                        key={summary.workflow.id}
                        className="rounded-2xl border border-orange-950/50 bg-[#0f0b0a] p-4 shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-black text-neutral-50">
                              {summary.workflow.title}
                            </h4>
                            <p className="mt-1 line-clamp-2 text-xs text-orange-100/45">
                              {summary.workflow.description || "No description"}
                            </p>
                          </div>
                          <span className="rounded-full border border-orange-300/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-orange-200">
                            {summary.runtime.status}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-xl border border-orange-300/15 bg-orange-500/10 p-2">
                            <p className="text-sm font-black text-orange-100">
                              {summary.completed}/{summary.todos.length}
                            </p>
                            <p className="text-[9px] font-bold uppercase text-orange-100/45">
                              Done
                            </p>
                          </div>
                          <div className="rounded-xl border border-sky-300/15 bg-sky-500/10 p-2">
                            <p className="text-sm font-black text-sky-100">
                              {summary.active}
                            </p>
                            <p className="text-[9px] font-bold uppercase text-sky-100/45">
                              Doing
                            </p>
                          </div>
                          <div className="rounded-xl border border-emerald-300/15 bg-emerald-500/10 p-2">
                            <p className="text-sm font-black text-emerald-100">
                              {summary.runtime.restMinutes}
                            </p>
                            <p className="text-[9px] font-bold uppercase text-emerald-100/45">
                              Rest
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#321b13]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-red-500 via-orange-400 to-amber-200"
                            style={{ width: `${summary.progress}%` }}
                          />
                        </div>

                        <Link
                          to={`/workflow/${summary.workflow.id}`}
                          className="mt-4 block rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-3 py-2 text-center text-[10px] font-black uppercase text-white transition hover:brightness-110"
                        >
                          Open workflow
                        </Link>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="grid content-start gap-6">
                <section className="rounded-2xl border border-amber-300/20 bg-[#1a120d] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                    Locked in guest
                  </p>
                  <h3 className="mt-1 text-base font-black text-white">
                    Habits and reports
                  </h3>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-orange-50/58">
                    Login keeps habit reset history, notices, and Taskomon
                    behaviour reports tied to a real profile.
                  </p>
                </section>

                <section className="rounded-2xl border border-orange-950/60 bg-[#15100f] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                    Navigate
                  </p>
                  <div className="mt-3 grid gap-2">
                    <GuestHexButton
                      onClick={() => setShowCreate(true)}
                      tone="orange"
                    >
                      + Add Workflow
                    </GuestHexButton>
                    <GuestHexLink to="/workflows" tone="muted">
                      View Workflows
                    </GuestHexLink>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </section>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateWorkflow}
            className="w-full max-w-md rounded-2xl border border-orange-300/25 bg-[#15100f] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                  Guest workflow
                </p>
                <h3 className="mt-1 text-lg font-black text-white">
                  Add Workflow
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-full border border-orange-300/20 bg-orange-500/10 px-3 py-1.5 text-[10px] font-black uppercase text-orange-100/70 transition hover:bg-orange-500/20"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-orange-100/55">
                Title
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="rounded-xl border border-orange-300/20 bg-[#0f0a09] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-orange-50 outline-none focus:border-orange-300/60"
                />
              </label>

              <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-orange-100/55">
                Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="resize-none rounded-xl border border-orange-300/20 bg-[#0f0a09] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-orange-50 outline-none focus:border-orange-300/60"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-orange-100/55">
                  Focus min
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={focusMinutes}
                    onChange={(event) => setFocusMinutes(event.target.value)}
                    className="rounded-xl border border-orange-300/20 bg-[#0f0a09] px-3 py-2 text-xs font-semibold normal-case tracking-normal text-orange-50 outline-none focus:border-orange-300/60"
                  />
                </label>

                <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-orange-100/55">
                  Rest min
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={restMinutes}
                    onChange={(event) => setRestMinutes(event.target.value)}
                    className="rounded-xl border border-orange-300/20 bg-[#0f0a09] px-3 py-2 text-xs font-semibold normal-case tracking-normal text-orange-50 outline-none focus:border-orange-300/60"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="mt-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2.5 text-xs font-black uppercase text-white transition hover:brightness-110"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

export default GuestDashboardPage;
