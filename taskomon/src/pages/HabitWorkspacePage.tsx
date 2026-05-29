import { useMemo, useRef, useState } from "react";
import taskomonImage from "../assets/taskomon/taskomon.png";
import { demoHabits, demoTodos } from "../data/demoData";
import type { Todo, TodoStatus } from "../types";

type DragState = {
  todoId: string;
  offsetX: number;
  offsetY: number;
};

const BUBBLE_SIZE = 128;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getNextStatus(status: TodoStatus): TodoStatus {
  if (status === "not_started") return "in_progress";
  if (status === "in_progress") return "done";
  return "not_started";
}

function getStatusLabel(status: TodoStatus) {
  if (status === "not_started") return "Not Started";
  if (status === "in_progress") return "Doing";
  return "Done";
}

function getBubbleTheme(status: TodoStatus) {
  if (status === "done") {
    return {
      shell: "border-emerald-400/40 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.12)]",
      glow: "bg-emerald-300/20",
      label: "text-emerald-200 border-emerald-400/30 bg-emerald-400/10",
    };
  }

  if (status === "in_progress") {
    return {
      shell: "border-orange-400/60 bg-orange-500/15 shadow-[0_0_38px_rgba(249,115,22,0.18)]",
      glow: "bg-orange-300/25",
      label: "text-orange-100 border-orange-400/40 bg-orange-400/15",
    };
  }

  return {
    shell: "border-[#3a302d] bg-[#181312] shadow-[0_0_28px_rgba(0,0,0,0.22)]",
    glow: "bg-white/10",
    label: "text-neutral-400 border-neutral-700 bg-neutral-900/70",
  };
}

function HabitBubble({
  todo,
  isDragging,
  onStartDrag,
  onCycleStatus,
}: {
  todo: Todo;
  isDragging: boolean;
  onStartDrag: (event: React.PointerEvent<HTMLDivElement>, todo: Todo) => void;
  onCycleStatus: (todoId: string) => void;
}) {
  const theme = getBubbleTheme(todo.status);

  return (
    <div
      onPointerDown={(event) => onStartDrag(event, todo)}
      className={[
        "group absolute select-none rounded-full border transition-[filter] duration-200",
        "cursor-grab active:cursor-grabbing",
        theme.shell,
        isDragging ? "z-30 scale-105 filter-none" : "z-10 hover:z-20 hover:brightness-110",
      ].join(" ")}
      style={{
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        transform: `translate(${todo.x}px, ${todo.y}px) ${
          isDragging ? "scale(1.06)" : "scale(1)"
        }`,
        transition: isDragging
          ? "filter 120ms ease"
          : "transform 220ms cubic-bezier(.2,.9,.2,1), filter 160ms ease",
      }}
    >
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full p-4 text-center">
        <div
          className={[
            "pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full blur-xl",
            theme.glow,
          ].join(" ")}
        />


        <div className="relative z-10">
          <p className="line-clamp-3 text-xs font-black leading-tight text-neutral-100">
            {todo.title}
          </p>

          {todo.dueMode && (
            <p className="mt-1 text-[10px] text-neutral-500">
              {todo.dueMode === "anytime"
                ? "Anytime"
                : todo.dueMode === "by_time"
                ? `By ${todo.dueTime ?? "--:--"}`
                : `At ${todo.dueTime ?? "--:--"}`}
            </p>
          )}

          <button
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onCycleStatus(todo.id)}
            className={[
              "mt-2 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition hover:brightness-125",
              theme.label,
            ].join(" ")}
          >
            {getStatusLabel(todo.status)}
          </button>
        </div>
      </div>
    </div>
  );
}

function HabitWorkspacePage() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState("");

  const habit = demoHabits[0];

  const [todos, setTodos] = useState<Todo[]>(() => {
    const habitTodos = demoTodos.filter(
      (todo) => todo.parentType === "habit" && todo.parentId === habit.id
    );

    if (habitTodos.length <= 1) return habitTodos;

    return habitTodos.map((todo, index) => {
      if (index === 1 && todo.dependencyIds.length === 0) {
        return {
          ...todo,
          dependencyIds: [habitTodos[0].id],
        };
      }

      return todo;
    });
  });

  const activeTodo = todos.find((todo) => todo.status === "in_progress");
  const completedCount = todos.filter((todo) => todo.status === "done").length;
  const completionPercentage =
    todos.length === 0 ? 0 : Math.round((completedCount / todos.length) * 100);

  const dependencyLines = useMemo(() => {
    return todos.flatMap((todo) => {
      return todo.dependencyIds
        .map((dependencyId) => {
          const dependency = todos.find((item) => item.id === dependencyId);
          if (!dependency) return null;

          return {
            id: `${dependency.id}-${todo.id}`,
            x1: dependency.x + BUBBLE_SIZE / 2,
            y1: dependency.y + BUBBLE_SIZE / 2,
            x2: todo.x + BUBBLE_SIZE / 2,
            y2: todo.y + BUBBLE_SIZE / 2,
          };
        })
        .filter(Boolean);
    }) as Array<{
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }>;
  }, [todos]);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();

    const rawX = event.clientX - rect.left - dragState.offsetX;
    const rawY = event.clientY - rect.top - dragState.offsetY;

    const nextX = clamp(rawX, 16, rect.width - BUBBLE_SIZE - 16);
    const nextY = clamp(rawY, 16, rect.height - BUBBLE_SIZE - 16);

    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.id === dragState.todoId
          ? {
              ...todo,
              x: nextX,
              y: nextY,
              updatedAt: new Date().toISOString(),
            }
          : todo
      )
    );
  }

  function handlePointerUp() {
    setDragState(null);
  }

  function handleStartDrag(event: React.PointerEvent<HTMLDivElement>, todo: Todo) {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();

    setDragState({
      todoId: todo.id,
      offsetX: event.clientX - rect.left - todo.x,
      offsetY: event.clientY - rect.top - todo.y,
    });
  }

  function handleCycleStatus(todoId: string) {
    setTodos((currentTodos) =>
      currentTodos.map((todo) => {
        if (todo.id !== todoId) return todo;

        const nextStatus = getNextStatus(todo.status);
        const now = new Date().toISOString();

        return {
          ...todo,
          status: nextStatus,
          startedAt: nextStatus === "in_progress" ? now : todo.startedAt,
          completedAt: nextStatus === "done" ? now : undefined,
          updatedAt: now,
        };
      })
    );
  }

  function handleAddTodo() {
    const title = newTodoTitle.trim();
    if (!title) return;

    const now = new Date().toISOString();

    const newTodo: Todo = {
      id: crypto.randomUUID(),
      parentId: habit.id,
      parentType: "habit",
      title,
      description: "",
      status: "not_started",
      x: 140 + Math.random() * 360,
      y: 160 + Math.random() * 220,
      dueMode: "anytime",
      dependencyIds: [],
      createdAt: now,
      updatedAt: now,
    };

    setTodos((currentTodos) => [...currentTodos, newTodo]);
    setNewTodoTitle("");
  }

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

          .canvas-grid {
            background-image:
              radial-gradient(circle, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
            background-size: 34px 34px;
          }

          @keyframes bubbleIdle {
            0%, 100% {
              translate: 0 0;
            }
            50% {
              translate: 0 -4px;
            }
          }

          .bubble-idle {
            animation: bubbleIdle 3.4s ease-in-out infinite;
          }
        `}
      </style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(249,115,22,0.08),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(255,193,7,0.04),transparent_35%)]" />

      <div className="relative z-10 grid min-h-screen grid-cols-[260px_1fr]">
        <aside className="relative flex flex-col justify-between border-r border-[#211918] bg-[#0d0b0b]/90 p-5 pt-0">
          <div>
            <div className="absolute left-0 top-0 h-14 w-full">
              <div className="clip-title absolute inset-0 bg-gradient-to-r from-orange-600 to-amber-500" />
              <div className="clip-title absolute inset-[0_0_2px_0] flex items-center bg-[#26110e] pl-5">
                <h1 className="text-sm font-black uppercase tracking-widest text-white">
                  Habit
                </h1>
              </div>
            </div>

            <nav className="mt-20 flex flex-col gap-3 px-1">
              <button className="clip-hex h-12 bg-[#141111] text-sm font-bold text-neutral-500">
                Notice
              </button>
              <button className="clip-hex h-12 bg-gradient-to-r from-orange-500 to-[#d9471f] text-sm font-bold text-white shadow-[0_0_18px_rgba(249,115,22,0.25)]">
                Habit
              </button>
              <button className="clip-hex h-12 bg-[#141111] text-sm font-bold text-neutral-500">
                Workflow
              </button>
              <button className="clip-hex h-12 bg-[#141111] text-sm font-bold text-neutral-500">
                Advice
              </button>
            </nav>
          </div>

          <div className="mb-2 rounded-2xl border border-[#2a211f] bg-[#151211] p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full border border-orange-500/30 bg-orange-500/10">
                <img
                  src={taskomonImage}
                  alt="Taskomon"
                  className="h-full w-full object-cover"
                />
              </div>

              <div>
                <p className="text-sm font-bold text-neutral-200">Syamil</p>
                <p className="text-[11px] text-neutral-500">Habit workspace</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="grid min-h-screen grid-rows-[auto_1fr]">
          <header className="border-b border-[#211918] bg-[#0d0b0b]/80 px-8 py-5">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">
                  Habit Space
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-neutral-100">
                  {habit.title}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">{habit.description}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-[#2a211f] bg-[#151211] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-neutral-600">
                    Today
                  </p>
                  <p className="text-lg font-black text-orange-400">
                    {completedCount}/{todos.length}
                  </p>
                </div>

                <div className="w-36 rounded-2xl border border-[#2a211f] bg-[#151211] px-4 py-3">
                  <div className="mb-1 flex justify-between text-[10px] font-bold text-neutral-500">
                    <span>Completion</span>
                    <span>{completionPercentage}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#241b19]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-300"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-[1fr_330px] overflow-hidden">
            <section className="relative overflow-hidden bg-[#0b0909]">
              <div className="absolute left-6 top-6 z-20 flex items-center gap-2 rounded-2xl border border-[#2a211f] bg-[#12100f]/90 p-2 shadow-[0_14px_50px_rgba(0,0,0,0.35)]">
                <input
                  value={newTodoTitle}
                  onChange={(event) => setNewTodoTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleAddTodo();
                  }}
                  placeholder="New bubble..."
                  className="w-56 rounded-xl border border-[#2a211f] bg-[#0b0909] px-3 py-2 text-sm text-neutral-200 outline-none placeholder:text-neutral-700 focus:border-orange-500/50"
                />

                <button
                  onClick={handleAddTodo}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-black text-white transition hover:bg-orange-400"
                >
                  Add
                </button>
              </div>

              <div
                ref={canvasRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="canvas-grid relative h-full min-h-[calc(100vh-97px)] w-full overflow-hidden"
              >
                <svg className="pointer-events-none absolute inset-0 h-full w-full">
                  <defs>
                    <linearGradient id="dependencyLine" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="rgba(249,115,22,0.8)" />
                      <stop offset="100%" stopColor="rgba(251,191,36,0.35)" />
                    </linearGradient>
                  </defs>

                  {dependencyLines.map((line) => (
                    <line
                      key={line.id}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke="url(#dependencyLine)"
                      strokeWidth="2"
                      strokeDasharray="6 8"
                    />
                  ))}
                </svg>

                {todos.map((todo) => (
                  <div key={todo.id} className="bubble-idle">
                    <HabitBubble
                      todo={todo}
                      isDragging={dragState?.todoId === todo.id}
                      onStartDrag={handleStartDrag}
                      onCycleStatus={handleCycleStatus}
                    />
                  </div>
                ))}

                {todos.length === 0 && (
                  <div className="absolute inset-0 grid place-items-center text-center">
                    <div>
                      <p className="text-lg font-black text-neutral-300">
                        Empty habit space
                      </p>
                      <p className="mt-1 text-sm text-neutral-600">
                        Add your first todo bubble to start tracking this habit.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <aside className="border-l border-[#211918] bg-[#0d0b0b]/90 p-5">
              <div className="rounded-2xl border border-[#2a211f] bg-[#151211] p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500">
                  Taskomon
                </p>

                <div className="mt-4 rounded-2xl border border-[#2a211f] bg-[#090808] p-4 text-center">
                  <img
                    src={taskomonImage}
                    alt="Taskomon"
                    className="mx-auto h-36 object-contain drop-shadow-[0_0_24px_rgba(249,115,22,0.16)]"
                  />

                  <div className="mt-4 rounded-2xl border border-orange-500/20 bg-[#241411] p-3 text-left">
                    <p className="text-xs font-semibold leading-relaxed text-orange-100">
                      {activeTodo
                        ? `You're working on "${activeTodo.title}". Keep it steady.`
                        : completedCount === todos.length && todos.length > 0
                        ? "All bubbles are done for now. Nice rhythm."
                        : "Pick a bubble to start. Small actions still count."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#2a211f] bg-[#151211] p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500">
                  Habit details
                </p>

                <div className="mt-4 grid gap-3 text-sm">
                  <div className="flex justify-between border-b border-[#241b19] pb-2">
                    <span className="text-neutral-500">Mode</span>
                    <span className="font-bold capitalize text-neutral-200">
                      {habit.mode.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-[#241b19] pb-2">
                    <span className="text-neutral-500">Reset</span>
                    <span className="font-bold capitalize text-neutral-200">
                      {habit.resetFrequency}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-[#241b19] pb-2">
                    <span className="text-neutral-500">Notice</span>
                    <span className="font-bold text-neutral-200">
                      {habit.noticeEnabled ? "On" : "Off"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#2a211f] bg-[#151211] p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500">
                  How to use
                </p>

                <div className="mt-4 grid gap-3 text-xs leading-relaxed text-neutral-500">
                  <p>Drag bubbles around the space to arrange your habit flow.</p>
                  <p>Click the status pill inside a bubble to cycle its state.</p>
                  <p>Dashed lines show dependency between related bubbles.</p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

export default HabitWorkspacePage;