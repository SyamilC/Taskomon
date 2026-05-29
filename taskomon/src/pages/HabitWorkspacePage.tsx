import { useMemo, useRef, useState } from "react";
import type { PointerEvent, WheelEvent } from "react";
import taskomonImage from "../assets/taskomon/taskomon.png";
import { demoHabits, demoTodos } from "../data/demoData";
import type { Todo, TodoStatus } from "../types";

type DragState = {
  todoId: string;
  offsetX: number;
  offsetY: number;
};

type PanState = {
  startX: number;
  startY: number;
  startScrollLeft: number;
  startScrollTop: number;
};

const BUBBLE_SIZE = 128;
const WORLD_WIDTH = 2800;
const WORLD_HEIGHT = 1800;

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
      shell:
        "border-emerald-300/75 bg-emerald-500/22 shadow-[0_0_34px_rgba(16,185,129,0.22)]",
      glow: "bg-emerald-300/28",
      label: "text-emerald-50 border-emerald-200/45 bg-emerald-400/18",
    };
  }

  if (status === "in_progress") {
    return {
      shell:
        "border-orange-300/80 bg-orange-500/22 shadow-[0_0_38px_rgba(249,115,22,0.26)]",
      glow: "bg-orange-300/30",
      label: "text-orange-50 border-orange-200/50 bg-orange-400/18",
    };
  }

  return {
    shell:
      "border-rose-300/45 bg-rose-500/14 shadow-[0_0_28px_rgba(244,63,94,0.12)]",
    glow: "bg-rose-300/16",
    label: "text-rose-50/80 border-rose-200/30 bg-rose-400/12",
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
  onStartDrag: (event: PointerEvent<HTMLDivElement>, todo: Todo) => void;
  onCycleStatus: (todoId: string) => void;
}) {
  const theme = getBubbleTheme(todo.status);

  return (
    <div
      data-bubble="true"
      onPointerDown={(event) => onStartDrag(event, todo)}
      className={[
        "absolute select-none rounded-full border transition-[filter] duration-200",
        "cursor-grab active:cursor-grabbing",
        theme.shell,
        !isDragging ? "bubble-idle" : "",
        isDragging
          ? "z-30 scale-105 filter-none"
          : "z-10 hover:z-20 hover:brightness-110",
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
            "pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl opacity-40",
            theme.glow,
          ].join(" ")}
        />

        <div className="relative z-10">
          <p className="line-clamp-3 text-xs font-black leading-tight text-neutral-50">
            {todo.title}
          </p>

          {todo.dueMode && (
            <p className="mt-1 text-[10px] text-neutral-300/80">
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
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [selectedTodoId, setSelectedTodoId] = useState("");

  const habit = demoHabits[0];

  const [todos, setTodos] = useState<Todo[]>(() => {
    const habitTodos = demoTodos.filter(
      (todo) => todo.parentType === "habit" && todo.parentId === habit.id
    );

    if (habitTodos.length <= 1) {
      return habitTodos.map((todo) => ({
        ...todo,
        x: todo.x + 420,
        y: todo.y + 320,
      }));
    }

    return habitTodos.map((todo, index) => {
      if (index === 1 && todo.dependencyIds.length === 0) {
        return {
          ...todo,
          dependencyIds: [habitTodos[0].id],
          x: 720,
          y: 450,
        };
      }

      return {
        ...todo,
        x: todo.x + 420,
        y: todo.y + 320,
      };
    });
  });

  const activeTodo = todos.find((todo) => todo.status === "in_progress");
  const completedCount = todos.filter((todo) => todo.status === "done").length;

  const completionPercentage =
    todos.length === 0 ? 0 : Math.round((completedCount / todos.length) * 100);

  const taskomonThought = activeTodo
    ? `You're working on "${activeTodo.title}". Keep it steady.`
    : completedCount === todos.length && todos.length > 0
    ? "All bubbles are done for now. Nice rhythm."
    : "Pick a bubble to start. Small actions still count.";

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

  function scrollToWorldPoint(x: number, y: number, smooth = true) {
    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.scrollTo({
      left: x - viewport.clientWidth / 2,
      top: y - viewport.clientHeight / 2,
      behavior: smooth ? "smooth" : "auto",
    });
  }

  function scrollToTodo(todoId: string) {
    const todo = todos.find((item) => item.id === todoId);
    if (!todo) return;

    scrollToWorldPoint(todo.x + BUBBLE_SIZE / 2, todo.y + BUBBLE_SIZE / 2);
  }

  function scrollToActiveTodo() {
    if (activeTodo) {
      scrollToTodo(activeTodo.id);
      return;
    }

    if (todos[0]) {
      scrollToTodo(todos[0].id);
    }
  }

  function scrollToAllBubbles() {
    if (todos.length === 0) return;

    const minX = Math.min(...todos.map((todo) => todo.x));
    const minY = Math.min(...todos.map((todo) => todo.y));
    const maxX = Math.max(...todos.map((todo) => todo.x + BUBBLE_SIZE));
    const maxY = Math.max(...todos.map((todo) => todo.y + BUBBLE_SIZE));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    scrollToWorldPoint(centerX, centerY);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (dragState && worldRef.current) {
      const rect = worldRef.current.getBoundingClientRect();

      const rawX = event.clientX - rect.left - dragState.offsetX;
      const rawY = event.clientY - rect.top - dragState.offsetY;

      const nextX = clamp(rawX, 16, WORLD_WIDTH - BUBBLE_SIZE - 16);
      const nextY = clamp(rawY, 16, WORLD_HEIGHT - BUBBLE_SIZE - 16);

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

      return;
    }

    if (panState && viewportRef.current) {
      const deltaX = event.clientX - panState.startX;
      const deltaY = event.clientY - panState.startY;

      viewportRef.current.scrollLeft = panState.startScrollLeft - deltaX;
      viewportRef.current.scrollTop = panState.startScrollTop - deltaY;
    }
  }

  function handlePointerUp() {
    setDragState(null);
    setPanState(null);
  }

  function handleStartDrag(event: PointerEvent<HTMLDivElement>, todo: Todo) {
    if (!worldRef.current) return;

    const rect = worldRef.current.getBoundingClientRect();

    setDragState({
      todoId: todo.id,
      offsetX: event.clientX - rect.left - todo.x,
      offsetY: event.clientY - rect.top - todo.y,
    });

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCanvasPointerDown(event: PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;

    if (target.closest("[data-bubble='true']")) return;
    if (!viewportRef.current) return;

    setPanState({
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: viewportRef.current.scrollLeft,
      startScrollTop: viewportRef.current.scrollTop,
    });

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleWorkspaceWheel(event: WheelEvent<HTMLDivElement>) {
    if (!viewportRef.current) return;

    event.preventDefault();

    viewportRef.current.scrollBy({
      left: event.deltaX + (event.shiftKey ? event.deltaY : 0),
      top: event.shiftKey ? 0 : event.deltaY,
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
    const viewport = viewportRef.current;

    if (!title || !viewport) return;

    const now = new Date().toISOString();

    const worldCenterX = viewport.scrollLeft + viewport.clientWidth / 2;
    const worldCenterY = viewport.scrollTop + viewport.clientHeight / 2;

    const newTodo: Todo = {
      id: crypto.randomUUID(),
      parentId: habit.id,
      parentType: "habit",
      title,
      description: "",
      status: "not_started",
      x: clamp(
        worldCenterX - BUBBLE_SIZE / 2,
        16,
        WORLD_WIDTH - BUBBLE_SIZE - 16
      ),
      y: clamp(
        worldCenterY - BUBBLE_SIZE / 2,
        16,
        WORLD_HEIGHT - BUBBLE_SIZE - 16
      ),
      dueMode: "anytime",
      dependencyIds: [],
      createdAt: now,
      updatedAt: now,
    };

    setTodos((currentTodos) => [...currentTodos, newTodo]);
    setNewTodoTitle("");
    setSelectedTodoId(newTodo.id);

    requestAnimationFrame(() => {
      scrollToWorldPoint(
        newTodo.x + BUBBLE_SIZE / 2,
        newTodo.y + BUBBLE_SIZE / 2
      );
    });
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

          .canvas-grid {
            background-image:
              radial-gradient(circle, rgba(255, 218, 150, 0.085) 1px, transparent 1px),
              radial-gradient(circle at 26% 22%, rgba(255, 95, 40, 0.1), transparent 26%),
              radial-gradient(circle at 78% 72%, rgba(251, 191, 36, 0.07), transparent 28%),
              radial-gradient(circle at 44% 80%, rgba(244, 63, 94, 0.06), transparent 24%);
            background-size: 34px 34px, 1100px 900px, 900px 900px, 1000px 800px;
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

          .workspace-scrollbar::-webkit-scrollbar {
            width: 9px;
            height: 9px;
          }

          .workspace-scrollbar::-webkit-scrollbar-track {
            background: #120d0c;
          }

          .workspace-scrollbar::-webkit-scrollbar-thumb {
            background: #5a3328;
            border-radius: 999px;
          }

          .workspace-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #f97316;
          }
        `}
      </style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(220,38,38,0.14),transparent_30%),radial-gradient(circle_at_44%_10%,rgba(249,115,22,0.13),transparent_32%),radial-gradient(circle_at_82%_16%,rgba(251,191,36,0.1),transparent_28%),radial-gradient(circle_at_72%_86%,rgba(251,146,60,0.1),transparent_34%)]" />

      <div className="relative z-10 grid h-screen grid-cols-[230px_1fr]">
        <aside className="relative flex h-screen flex-col justify-between border-r border-orange-950/60 bg-gradient-to-b from-[#21110e] via-[#17100f] to-[#100c0b] p-4 pt-0">
          <div>
            <div className="absolute left-0 top-0 h-14 w-full">
              <div className="clip-title absolute inset-0 bg-gradient-to-r from-red-600 via-orange-500 to-amber-300" />
              <div className="clip-title absolute inset-[0_0_2px_0] flex items-center bg-[#3a1710] pl-5">
                <h1 className="text-sm font-black uppercase tracking-widest text-white">
                  Habit
                </h1>
              </div>
            </div>

            <nav className="mt-20 flex flex-col gap-3 px-1">
              <button className="clip-hex h-11 bg-[#251713] text-sm font-bold text-orange-100/45 transition hover:bg-[#321b15]">
                Notice
              </button>
              <button className="clip-hex h-11 bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 text-sm font-bold text-white shadow-[0_0_18px_rgba(249,115,22,0.28)]">
                Habit
              </button>
              <button className="clip-hex h-11 bg-[#251713] text-sm font-bold text-orange-100/45 transition hover:bg-[#321b15]">
                Workflow
              </button>
              <button className="clip-hex h-11 bg-[#251713] text-sm font-bold text-orange-100/45 transition hover:bg-[#321b15]">
                Advice
              </button>
            </nav>
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
                <p className="text-sm font-bold text-orange-50">Syamil</p>
                <p className="text-[11px] text-amber-300/80">
                  Habit workspace
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="grid h-screen grid-rows-[76px_1fr] overflow-hidden">
          <header className="border-b border-orange-950/60 bg-gradient-to-r from-[#40160f] via-[#3a1d10] to-[#2b2011] px-6 py-3">
            <div className="flex h-full items-center justify-between gap-5">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
                  Habit Space
                </p>
                <h2 className="mt-1 truncate text-xl font-black tracking-tight text-white">
                  {habit.title}
                </h2>
                <p className="truncate text-xs text-orange-100/55">
                  {habit.description}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-100/55">
                    Mode
                  </p>
                  <p className="text-sm font-black capitalize text-amber-200">
                    {habit.mode.replace("_", " ")}
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-300/20 bg-orange-500/10 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-orange-100/55">
                    Reset
                  </p>
                  <p className="text-sm font-black capitalize text-orange-100">
                    {habit.resetFrequency}
                  </p>
                </div>

                <div className="rounded-2xl border border-red-300/20 bg-red-500/10 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-red-100/55">
                    Notice
                  </p>
                  <p className="text-sm font-black text-red-100">
                    {habit.noticeEnabled ? "On" : "Off"}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-100/55">
                    Today
                  </p>
                  <p className="text-sm font-black text-emerald-200">
                    {completedCount}/{todos.length}
                  </p>
                </div>

                <div className="w-32 rounded-2xl border border-orange-300/20 bg-orange-500/10 px-3 py-2">
                  <div className="mb-1 flex justify-between text-[10px] font-bold text-orange-100/55">
                    <span>Done</span>
                    <span>{completionPercentage}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#321b13]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-500 via-orange-400 to-amber-200"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </header>

          <section className="relative min-h-0 overflow-hidden bg-[#140f0e]">
            <div className="absolute left-5 top-5 z-20 flex max-w-[calc(100%-40px)] flex-wrap items-center gap-2 rounded-2xl border border-orange-400/25 bg-[#201411]/92 p-2 shadow-[0_14px_50px_rgba(0,0,0,0.32)] backdrop-blur">
              <input
                value={newTodoTitle}
                onChange={(event) => setNewTodoTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleAddTodo();
                }}
                placeholder="New bubble..."
                className="w-44 rounded-xl border border-orange-400/20 bg-[#120c0b] px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-orange-100/25 focus:border-orange-300/60"
              />

              <button
                onClick={handleAddTodo}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-black text-white transition hover:brightness-110"
              >
                Add
              </button>

              <div className="h-7 w-px bg-orange-400/20" />

              <select
                value={selectedTodoId}
                onChange={(event) => setSelectedTodoId(event.target.value)}
                className="w-40 rounded-xl border border-orange-400/20 bg-[#120c0b] px-3 py-2 text-xs font-semibold text-neutral-200 outline-none focus:border-orange-300/60"
              >
                <option value="">Find todo...</option>
                {todos.map((todo) => (
                  <option key={todo.id} value={todo.id}>
                    {todo.title}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  if (selectedTodoId) scrollToTodo(selectedTodoId);
                }}
                className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-100 transition hover:bg-amber-500/20"
              >
                Go
              </button>

              <button
                onClick={scrollToActiveTodo}
                className="rounded-xl border border-orange-300/25 bg-orange-500/10 px-3 py-2 text-xs font-bold text-orange-100 transition hover:bg-orange-500/20"
              >
                Active
              </button>

              <button
                onClick={scrollToAllBubbles}
                className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100 transition hover:bg-red-500/20"
              >
                Show all
              </button>
            </div>

            <div
              ref={viewportRef}
              onWheel={handleWorkspaceWheel}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className={[
                "workspace-scrollbar h-full overflow-auto",
                panState ? "cursor-grabbing" : "cursor-grab",
              ].join(" ")}
            >
              <div
                ref={worldRef}
                onPointerDown={handleCanvasPointerDown}
                className="canvas-grid relative"
                style={{
                  width: WORLD_WIDTH,
                  height: WORLD_HEIGHT,
                }}
              >
                <svg
                  className="pointer-events-none absolute inset-0"
                  width={WORLD_WIDTH}
                  height={WORLD_HEIGHT}
                >
                  <defs>
                    <linearGradient
                      id="dependencyLine"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="rgba(244,63,94,0.7)" />
                      <stop offset="45%" stopColor="rgba(249,115,22,0.86)" />
                      <stop offset="100%" stopColor="rgba(251,191,36,0.5)" />
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
                  <HabitBubble
                    key={todo.id}
                    todo={todo}
                    isDragging={dragState?.todoId === todo.id}
                    onStartDrag={handleStartDrag}
                    onCycleStatus={handleCycleStatus}
                  />
                ))}

                {todos.length === 0 && (
                  <div className="absolute inset-0 grid place-items-center text-center">
                    <div>
                      <p className="text-lg font-black text-neutral-200">
                        Empty habit space
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        Add your first todo bubble to start tracking this habit.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-6 right-6 z-30 flex max-w-[430px] items-end gap-3">
              <div className="relative rounded-3xl border border-orange-300/25 bg-gradient-to-br from-[#3b180f]/95 via-[#28130e]/95 to-[#1b100d]/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.38)] backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                  Taskomon says
                </p>
                <p className="mt-1 text-sm font-bold leading-relaxed text-orange-50">
                  {taskomonThought}
                </p>

                <div className="absolute -right-2 bottom-6 h-4 w-4 rotate-45 border-r border-t border-orange-300/25 bg-[#22110d]" />
              </div>

              <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border border-orange-300/30 bg-orange-500/10 shadow-[0_0_35px_rgba(249,115,22,0.22)]">
                <img
                  src={taskomonImage}
                  alt="Taskomon"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

export default HabitWorkspacePage;