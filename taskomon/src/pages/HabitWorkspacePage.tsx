import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, WheelEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import taskomonImage from "../assets/taskomon/taskomon.png";
import { demoHabits, demoTodos } from "../data/demoData";
import { loadFromStorage, saveToStorage } from "../services/storageServices";
import type { DueMode, Heaviness, Priority, Todo, TodoStatus } from "../types";

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

type EditorPosition = {
  left: number;
  top: number;
};

type EditorDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
};

const BASE_BUBBLE_HEIGHT = 128;
const WORLD_WIDTH = 2800;
const WORLD_HEIGHT = 1800;
const HABIT_STORAGE_PREFIX = "taskomon:habit";
const LAST_OPENED_HABIT_KEY = "taskomon:lastOpenedHabitId";
const DEFAULT_DUE_TIME = "18:00";
const PRIORITY_STYLE: Record<
  Priority,
  {
    label: string;
    tone: string;
    badge: string;
    halo: string;
    widthBoost: number;
    heightBoost: number;
  }
> = {
  low: {
    label: "Low priority",
    tone: "bg-sky-300",
    badge: "border-sky-300/30 bg-sky-400/12 text-sky-100",
    halo: "shadow-[0_0_24px_rgba(56,189,248,0.16)]",
    widthBoost: 0,
    heightBoost: 0,
  },
  medium: {
    label: "Medium priority",
    tone: "bg-amber-300",
    badge: "border-amber-300/35 bg-amber-400/14 text-amber-100",
    halo: "shadow-[0_0_32px_rgba(251,191,36,0.18)]",
    widthBoost: 18,
    heightBoost: 8,
  },
  high: {
    label: "High priority",
    tone: "bg-red-300",
    badge: "border-red-300/40 bg-red-400/16 text-red-50",
    halo: "shadow-[0_0_42px_rgba(248,113,113,0.22)]",
    widthBoost: 44,
    heightBoost: 18,
  },
};
const HEAVINESS_STYLE: Record<
  Heaviness,
  {
    label: string;
    badge: string;
    ring: string;
    stripe: string;
    heightBoost: number;
  }
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
    heightBoost: 6,
  },
  heavy: {
    label: "Heavy weight",
    badge: "border-fuchsia-300/35 bg-fuchsia-400/14 text-fuchsia-50",
    ring: "ring-[3px] ring-fuchsia-200/22",
    stripe: "from-fuchsia-300/85 via-fuchsia-200/30 to-transparent",
    heightBoost: 14,
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getBubbleDimensions(todo: Pick<Todo, "title" | "priority" | "heaviness">) {
  const priority = todo.priority ?? "medium";
  const heaviness = todo.heaviness ?? "medium";
  const titleLength = todo.title.trim().length;
  const titleBoost = Math.max(0, titleLength - 14) * 5.5;
  const width = clamp(
    138 + PRIORITY_STYLE[priority].widthBoost + titleBoost,
    126,
    340
  );
  const height = clamp(
    BASE_BUBBLE_HEIGHT +
      PRIORITY_STYLE[priority].heightBoost +
      HEAVINESS_STYLE[heaviness].heightBoost,
    118,
    168
  );

  return { width, height };
}

function getBubbleCenter(todo: Todo) {
  const dimensions = getBubbleDimensions(todo);

  return {
    x: todo.x + dimensions.width / 2,
    y: todo.y + dimensions.height / 2,
    ...dimensions,
  };
}

function getEdgePoint(from: ReturnType<typeof getBubbleCenter>, to: ReturnType<typeof getBubbleCenter>) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (dx === 0 && dy === 0) {
    return { x: from.x, y: from.y };
  }

  const rx = from.width / 2;
  const ry = from.height / 2;
  const scale = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));

  return {
    x: from.x + dx * scale,
    y: from.y + dy * scale,
  };
}

function getHabitTodoStorageKey(habitId: string) {
  return `${HABIT_STORAGE_PREFIX}:${habitId}:todos`;
}

function getInitialHabitTodos(habitId: string) {
  const habitTodos = demoTodos.filter(
    (todo) => todo.parentType === "habit" && todo.parentId === habitId
  );

  if (habitTodos.length <= 1) {
    return habitTodos.map((todo) => ({
      ...todo,
      x: todo.x + 420,
      y: todo.y + 320,
    }));
  }

  return habitTodos.map((todo, index) => {
    const shouldAttachDependency = index === 1 && todo.dependencyIds.length === 0;

    return {
      ...todo,
      priority: todo.priority ?? (index === 0 ? "high" : "medium"),
      heaviness: todo.heaviness ?? (index === 0 ? "light" : "medium"),
      dueMode: todo.dueMode ?? (index === 0 ? "by_time" : "anytime"),
      dueTime: todo.dueTime ?? (index === 0 ? "12:00" : undefined),
      dependencyIds: shouldAttachDependency ? [habitTodos[0].id] : todo.dependencyIds,
      x: shouldAttachDependency ? 720 : todo.x + 420,
      y: shouldAttachDependency ? 450 : todo.y + 320,
    };
  });
}

function getDueLabel(todo: Todo) {
  if (!todo.dueMode || todo.dueMode === "anytime") return "Anytime";
  if (todo.dueMode === "by_time") return `By ${todo.dueTime ?? "--:--"}`;
  return `At ${todo.dueTime ?? "--:--"}`;
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

function isTodoSoon(todo: Todo) {
  const dueMinutes = getDueMinutes(todo);
  if (todo.status === "done" || todo.dueMode === "anytime" || dueMinutes === null) {
    return false;
  }

  const diff = dueMinutes - getNowMinutes();
  return diff >= 0 && diff <= 60;
}

function isTodoBlocked(todo: Todo, allTodos: Todo[]) {
  return todo.dependencyIds.some((dependencyId) => {
    const dependency = allTodos.find((item) => item.id === dependencyId);
    return dependency && dependency.status !== "done";
  });
}

function getHabitAttentionScore(habitId: string) {
  const todos = loadFromStorage<Todo[]>(
    getHabitTodoStorageKey(habitId),
    getInitialHabitTodos(habitId)
  );
  const lateCount = todos.filter(isTodoLate).length;
  const blockedCount = todos.filter((todo) => isTodoBlocked(todo, todos)).length;
  const dueSoonCount = todos.filter(isTodoSoon).length;
  const inProgressCount = todos.filter((todo) => todo.status === "in_progress").length;
  const unfinishedCount = todos.filter((todo) => todo.status !== "done").length;
  const heavyUnfinishedCount = todos.filter(
    (todo) => todo.status !== "done" && todo.heaviness === "heavy"
  ).length;

  return (
    lateCount * 1000 +
    blockedCount * 600 +
    dueSoonCount * 350 +
    inProgressCount * 180 +
    heavyUnfinishedCount * 80 +
    unfinishedCount * 20
  );
}

function getMostAttentionHabitId() {
  return [...demoHabits].sort(
    (a, b) => getHabitAttentionScore(b.id) - getHabitAttentionScore(a.id)
  )[0]?.id;
}

function getHabitRouteTarget(routeHabitId?: string) {
  if (routeHabitId && demoHabits.some((habit) => habit.id === routeHabitId)) {
    return routeHabitId;
  }

  const lastOpenedHabitId = sessionStorage.getItem(LAST_OPENED_HABIT_KEY);
  if (
    lastOpenedHabitId &&
    demoHabits.some((habit) => habit.id === lastOpenedHabitId)
  ) {
    return lastOpenedHabitId;
  }

  return getMostAttentionHabitId() ?? demoHabits[0]?.id;
}

function wouldCreateDependencyCycle(
  todoId: string,
  dependencyId: string,
  allTodos: Todo[]
) {
  const visited = new Set<string>();

  function dependencyChainContains(currentId: string): boolean {
    if (currentId === todoId) return true;
    if (visited.has(currentId)) return false;

    visited.add(currentId);
    const currentTodo = allTodos.find((todo) => todo.id === currentId);
    if (!currentTodo) return false;

    return currentTodo.dependencyIds.some(dependencyChainContains);
  }

  return dependencyChainContains(dependencyId);
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

function NavButton({
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
      className={[
        "clip-hex grid h-11 place-items-center text-sm font-bold transition",
        active
          ? "bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 text-white shadow-[0_0_18px_rgba(249,115,22,0.28)]"
          : "bg-[#251713] text-orange-100/45 hover:bg-[#321b15] hover:text-orange-100/75",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function HabitBubble({
  todo,
  isDragging,
  isBlocked,
  isLate,
  isSoon,
  onStartDrag,
  onCycleStatus,
  onEditTodo,
}: {
  todo: Todo;
  isDragging: boolean;
  isBlocked: boolean;
  isLate: boolean;
  isSoon: boolean;
  onStartDrag: (event: PointerEvent<HTMLDivElement>, todo: Todo) => void;
  onCycleStatus: (todoId: string) => void;
  onEditTodo: (todoId: string) => void;
}) {
  const theme = getBubbleTheme(todo.status);
  const dimensions = getBubbleDimensions(todo);
  const priority = todo.priority ?? "medium";
  const heaviness = todo.heaviness ?? "medium";
  const priorityStyle = PRIORITY_STYLE[priority];
  const heavinessStyle = HEAVINESS_STYLE[heaviness];

  return (
    <div
      data-bubble="true"
      onPointerDown={(event) => onStartDrag(event, todo)}
      className={[
        "absolute select-none rounded-full border transition-[filter] duration-200",
        "cursor-grab active:cursor-grabbing",
        theme.shell,
        priorityStyle.halo,
        heavinessStyle.ring,
        !isDragging ? "bubble-idle" : "",
        isDragging
          ? "z-30 scale-105 filter-none"
          : "z-10 hover:z-20 hover:brightness-110",
      ].join(" ")}
      style={{
        width: dimensions.width,
        height: dimensions.height,
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
            "absolute left-0 top-1/2 h-[66%] w-2 -translate-y-1/2 rounded-full bg-gradient-to-b",
            heavinessStyle.stripe,
          ].join(" ")}
        />
        <div
          className={[
            "absolute right-4 top-3 h-2.5 w-2.5 rounded-full shadow-[0_0_12px_currentColor]",
            priorityStyle.tone,
          ].join(" ")}
        />
        <div
          className={[
            "pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl opacity-40",
            theme.glow,
          ].join(" ")}
        />

        <div className="relative z-10 w-full min-w-0 px-2">
          <p className="line-clamp-3 text-[11px] font-black leading-tight text-neutral-50 [overflow-wrap:anywhere]">
            {todo.title}
          </p>

          <p
            className={[
              "mt-1 text-[10px] font-bold",
              isLate
                ? "text-rose-200"
                : isSoon
                ? "text-amber-200"
                : "text-neutral-300/80",
            ].join(" ")}
          >
            {getDueLabel(todo)}
          </p>

          <div className="mt-1 flex flex-wrap justify-center gap-1">
            <span
              className={[
                "rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase",
                priorityStyle.badge,
              ].join(" ")}
            >
              {priorityStyle.label}
            </span>
            <span
              className={[
                "rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase",
                heavinessStyle.badge,
              ].join(" ")}
            >
              {heavinessStyle.label}
            </span>
            {isBlocked && todo.status !== "done" && (
              <span className="rounded-full border border-red-300/25 bg-red-500/12 px-1.5 py-0.5 text-[8px] font-black uppercase text-red-100">
                Blocked
              </span>
            )}
          </div>

          <div className="mt-2 flex justify-center gap-1.5">
            <button
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onCycleStatus(todo.id)}
              aria-label={`Set ${todo.title} status`}
              className={[
                "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition hover:brightness-125",
                theme.label,
              ].join(" ")}
            >
              {isBlocked && todo.status === "not_started"
                ? "Blocked"
                : getStatusLabel(todo.status)}
            </button>
            <button
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onEditTodo(todo.id)}
              aria-label={`Edit ${todo.title}`}
              className="rounded-full border border-sky-300/25 bg-sky-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-sky-100 transition hover:bg-sky-400/20"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HabitWorkspacePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { habitId: routeHabitId } = useParams();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const activeHabitId = getHabitRouteTarget(routeHabitId) ?? demoHabits[0].id;
  const habit =
    demoHabits.find((habitItem) => habitItem.id === activeHabitId) ?? demoHabits[0];
  const habitStorageKey = getHabitTodoStorageKey(habit.id);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);
  const [editorPosition, setEditorPosition] = useState<EditorPosition | null>(
    null
  );
  const [editorDragState, setEditorDragState] =
    useState<EditorDragState | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoDueMode, setNewTodoDueMode] = useState<DueMode>("anytime");
  const [newTodoDueTime, setNewTodoDueTime] = useState(DEFAULT_DUE_TIME);
  const [newTodoPriority, setNewTodoPriority] = useState<Priority>("medium");
  const [newTodoHeaviness, setNewTodoHeaviness] = useState<Heaviness>("medium");
  const [newTodoDependencyId, setNewTodoDependencyId] = useState("");
  const [selectedTodoId, setSelectedTodoId] = useState("");
  const [editingTodoId, setEditingTodoId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueMode, setEditDueMode] = useState<DueMode>("anytime");
  const [editDueTime, setEditDueTime] = useState(DEFAULT_DUE_TIME);
  const [editPriority, setEditPriority] = useState<Priority>("medium");
  const [editHeaviness, setEditHeaviness] = useState<Heaviness>("medium");
  const [editDependencyId, setEditDependencyId] = useState("");
  const [taskomonNoticeState, setTaskomonNoticeState] = useState({
    habitId: habit.id,
    message: "",
  });
  const [lastCompletionTitle, setLastCompletionTitle] = useState("");

  const [todoState, setTodoState] = useState<{
    habitId: string;
    items: Todo[];
  }>(() => ({
    habitId: habit.id,
    items: loadFromStorage(habitStorageKey, getInitialHabitTodos(habit.id)),
  }));
  const todos =
    todoState.habitId === habit.id
      ? todoState.items
      : loadFromStorage(habitStorageKey, getInitialHabitTodos(habit.id));
  const taskomonNotice =
    taskomonNoticeState.habitId === habit.id
      ? taskomonNoticeState.message
      : "";

  const editingTodo = todos.find((todo) => todo.id === editingTodoId);

  function setTaskomonNotice(message: string) {
    setTaskomonNoticeState({ habitId: habit.id, message });
  }

  function setTodos(updater: Todo[] | ((currentTodos: Todo[]) => Todo[])) {
    setTodoState((currentState) => {
      const currentTodos =
        currentState.habitId === habit.id
          ? currentState.items
          : loadFromStorage(habitStorageKey, getInitialHabitTodos(habit.id));
      const nextItems =
        typeof updater === "function" ? updater(currentTodos) : updater;

      return {
        habitId: habit.id,
        items: nextItems,
      };
    });
  }

  useEffect(() => {
    if (!routeHabitId || routeHabitId !== habit.id) {
      navigate(`/habit/${habit.id}`, { replace: true });
    }
  }, [habit.id, navigate, routeHabitId]);

  useEffect(() => {
    sessionStorage.setItem(LAST_OPENED_HABIT_KEY, habit.id);
  }, [habit.id]);

  useEffect(() => {
    if (
      todos.some(
        (todo) => todo.parentId !== habit.id || todo.parentType !== "habit"
      )
    ) {
      return;
    }

    saveToStorage(habitStorageKey, todos);
  }, [habit.id, habitStorageKey, todos]);

  useEffect(() => {
    if (!lastCompletionTitle) return;

    const timeoutId = window.setTimeout(() => {
      setLastCompletionTitle("");
    }, 2400);

    return () => window.clearTimeout(timeoutId);
  }, [lastCompletionTitle]);

  const activeTodo = todos.find((todo) => todo.status === "in_progress");
  const completedCount = todos.filter((todo) => todo.status === "done").length;
  const blockedTodos = todos.filter(
    (todo) => todo.status !== "done" && isTodoBlocked(todo, todos)
  );
  const lateTodos = todos.filter(isTodoLate);
  const dueSoonTodos = todos.filter(isTodoSoon);
  const nextDueTodo = todos
    .filter((todo) => todo.status !== "done" && todo.dueMode !== "anytime")
    .sort((a, b) => (getDueMinutes(a) ?? 9999) - (getDueMinutes(b) ?? 9999))[0];

  const completionPercentage =
    todos.length === 0 ? 0 : Math.round((completedCount / todos.length) * 100);

  const taskomonThought = taskomonNotice
    ? taskomonNotice
    : lateTodos[0]
    ? `"${lateTodos[0].title}" is past its planned time. Finish it gently or move it to a realistic slot.`
    : blockedTodos[0]
    ? `"${blockedTodos[0].title}" is waiting on another bubble. Clear the line before starting it.`
    : activeTodo
    ? `You're working on "${activeTodo.title}". Keep it steady.`
    : dueSoonTodos[0]
    ? `"${dueSoonTodos[0].title}" is due soon. A small start now will help.`
    : completedCount === todos.length && todos.length > 0
    ? "All bubbles are done for now. Nice rhythm."
    : "Pick a bubble to start. Small actions still count.";

  const dependencyLines = useMemo(() => {
    return todos.flatMap((todo) => {
      return todo.dependencyIds
        .map((dependencyId) => {
          const dependency = todos.find((item) => item.id === dependencyId);
          if (!dependency) return null;
          const dependencyCenter = getBubbleCenter(dependency);
          const todoCenter = getBubbleCenter(todo);
          const start = getEdgePoint(dependencyCenter, todoCenter);
          const end = getEdgePoint(todoCenter, dependencyCenter);

          return {
            id: `${dependency.id}-${todo.id}`,
            x1: start.x,
            y1: start.y,
            x2: end.x,
            y2: end.y,
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
    const center = getBubbleCenter(todo);

    scrollToWorldPoint(center.x, center.y);
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
    const maxX = Math.max(
      ...todos.map((todo) => todo.x + getBubbleDimensions(todo).width)
    );
    const maxY = Math.max(
      ...todos.map((todo) => todo.y + getBubbleDimensions(todo).height)
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    scrollToWorldPoint(centerX, centerY);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (dragState && worldRef.current) {
      const rect = worldRef.current.getBoundingClientRect();

      const rawX = event.clientX - rect.left - dragState.offsetX;
      const rawY = event.clientY - rect.top - dragState.offsetY;
      const draggedTodo = todos.find((todo) => todo.id === dragState.todoId);
      const dimensions = draggedTodo
        ? getBubbleDimensions(draggedTodo)
        : { width: BASE_BUBBLE_HEIGHT, height: BASE_BUBBLE_HEIGHT };

      const nextX = clamp(rawX, 16, WORLD_WIDTH - dimensions.width - 16);
      const nextY = clamp(rawY, 16, WORLD_HEIGHT - dimensions.height - 16);

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

  function clampEditorPosition(left: number, top: number): EditorPosition {
    const editor = editorRef.current;
    const container = editor?.offsetParent as HTMLElement | null;
    const gutter = 12;

    if (!editor || !container) {
      return {
        left: Math.max(gutter, left),
        top: Math.max(gutter, top),
      };
    }

    const editorRect = editor.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const maxLeft = Math.max(gutter, containerRect.width - editorRect.width - gutter);
    const maxTop = Math.max(gutter, containerRect.height - editorRect.height - gutter);

    return {
      left: clamp(left, gutter, maxLeft),
      top: clamp(top, gutter, maxTop),
    };
  }

  function getCurrentEditorPosition(): EditorPosition {
    const editor = editorRef.current;
    const container = editor?.offsetParent as HTMLElement | null;

    if (!editor || !container) {
      return editorPosition ?? { left: 20, top: 112 };
    }

    const editorRect = editor.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    return clampEditorPosition(
      editorRect.left - containerRect.left,
      editorRect.top - containerRect.top
    );
  }

  function handleEditorDragStart(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    const position = getCurrentEditorPosition();

    setEditorPosition(position);
    setEditorDragState({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: position.left,
      startTop: position.top,
    });

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleEditorDragMove(event: PointerEvent<HTMLDivElement>) {
    if (!editorDragState || editorDragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    setEditorPosition(
      clampEditorPosition(
        editorDragState.startLeft + event.clientX - editorDragState.startX,
        editorDragState.startTop + event.clientY - editorDragState.startY
      )
    );
  }

  function handleEditorDragEnd(event: PointerEvent<HTMLDivElement>) {
    if (editorDragState?.pointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      setEditorDragState(null);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
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
    const targetTodo = todos.find((todo) => todo.id === todoId);
    if (!targetTodo) return;

    const nextStatus = getNextStatus(targetTodo.status);
    const blocked = isTodoBlocked(targetTodo, todos);

    if (blocked && targetTodo.status === "not_started" && nextStatus === "in_progress") {
      setTaskomonNotice(
        `"${targetTodo.title}" has an unfinished prerequisite. Follow the connecting line first.`
      );
      return;
    }

    const now = new Date().toISOString();

    setTodos((currentTodos) =>
      currentTodos.map((todo) => {
        if (todo.id === todoId) {
          return {
            ...todo,
            status: nextStatus,
            startedAt: nextStatus === "in_progress" ? now : todo.startedAt,
            completedAt: nextStatus === "done" ? now : undefined,
            updatedAt: now,
          };
        }

        if (nextStatus === "in_progress" && todo.status === "in_progress") {
          return {
            ...todo,
            status: "not_started",
            updatedAt: now,
          };
        }

        return todo;
      })
    );

    if (nextStatus === "done") {
      setLastCompletionTitle(targetTodo.title);
      setTaskomonNotice(`Nice finish on "${targetTodo.title}". That one should feel good.`);
      return;
    }

    if (nextStatus === "in_progress") {
      setTaskomonNotice(`Now tracking "${targetTodo.title}" as the current bubble.`);
      return;
    }

    setTaskomonNotice(`"${targetTodo.title}" is back in the queue.`);
  }

  function handleAddTodo() {
    const title = newTodoTitle.trim();
    const viewport = viewportRef.current;

    if (!title || !viewport) return;

    const now = new Date().toISOString();

    const worldCenterX = viewport.scrollLeft + viewport.clientWidth / 2;
    const worldCenterY = viewport.scrollTop + viewport.clientHeight / 2;
    const newTodoDimensions = getBubbleDimensions({
      title,
      priority: newTodoPriority,
      heaviness: newTodoHeaviness,
    });
    const dependencyTodo = todos.find((todo) => todo.id === newTodoDependencyId);
    const dependencyDimensions = dependencyTodo
      ? getBubbleDimensions(dependencyTodo)
      : null;
    const draftX =
      dependencyTodo && dependencyDimensions
        ? dependencyTodo.x + dependencyDimensions.width + 92
        : worldCenterX - newTodoDimensions.width / 2;
    const draftY =
      dependencyTodo && dependencyDimensions
        ? dependencyTodo.y +
          dependencyDimensions.height / 2 -
          newTodoDimensions.height / 2
        : worldCenterY - newTodoDimensions.height / 2;

    const newTodo: Todo = {
      id: crypto.randomUUID(),
      parentId: habit.id,
      parentType: "habit",
      title,
      description: "",
      status: "not_started",
      x: clamp(
        draftX,
        16,
        WORLD_WIDTH - newTodoDimensions.width - 16
      ),
      y: clamp(
        draftY,
        16,
        WORLD_HEIGHT - newTodoDimensions.height - 16
      ),
      priority: newTodoPriority,
      heaviness: newTodoHeaviness,
      dueMode: newTodoDueMode,
      dueTime: newTodoDueMode === "anytime" ? undefined : newTodoDueTime,
      dependencyIds: newTodoDependencyId ? [newTodoDependencyId] : [],
      createdAt: now,
      updatedAt: now,
    };

    setTodos((currentTodos) => [...currentTodos, newTodo]);
    setNewTodoTitle("");
    setSelectedTodoId(newTodo.id);
    setNewTodoDependencyId("");
    setTaskomonNotice(`Added "${newTodo.title}" to this habit space.`);

    requestAnimationFrame(() => {
      const center = getBubbleCenter(newTodo);
      scrollToWorldPoint(center.x, center.y);
    });
  }

  function handleResetHabitDay() {
    const now = new Date().toISOString();

    setTodos((currentTodos) =>
      currentTodos.map((todo) => ({
        ...todo,
        status: "not_started",
        startedAt: undefined,
        completedAt: undefined,
        updatedAt: now,
      }))
    );
    setTaskomonNotice("Habit bubbles reset for the next check cycle.");
  }

  function openTodoEditor(todoId: string) {
    const todo = todos.find((item) => item.id === todoId);
    if (!todo) {
      setSelectedTodoId("");
      setEditingTodoId("");
      return;
    }

    setSelectedTodoId(todoId);
    setEditingTodoId(todoId);
    setEditTitle(todo.title);
    setEditDescription(todo.description ?? "");
    setEditDueMode(todo.dueMode ?? "anytime");
    setEditDueTime(todo.dueTime ?? DEFAULT_DUE_TIME);
    setEditPriority(todo.priority ?? "medium");
    setEditHeaviness(todo.heaviness ?? "medium");
    setEditDependencyId(todo.dependencyIds[0] ?? "");
  }

  function handleSaveEditedTodo() {
    if (!editingTodo) return;

    const title = editTitle.trim();
    if (!title) {
      setTaskomonNotice("A bubble needs a title before Taskomon can track it.");
      return;
    }

    if (editDependencyId === editingTodo.id) {
      setTaskomonNotice("A bubble cannot depend on itself.");
      return;
    }

    if (
      editDependencyId &&
      wouldCreateDependencyCycle(editingTodo.id, editDependencyId, todos)
    ) {
      setTaskomonNotice("That dependency would create a loop. Pick an earlier bubble.");
      return;
    }

    const now = new Date().toISOString();

    setTodos((currentTodos) =>
      currentTodos.map((todo) => {
        if (todo.id !== editingTodo.id) return todo;

        const nextTodo: Todo = {
          ...todo,
          title,
          description: editDescription.trim(),
          priority: editPriority,
          heaviness: editHeaviness,
          dueMode: editDueMode,
          dueTime: editDueMode === "anytime" ? undefined : editDueTime,
          dependencyIds: editDependencyId ? [editDependencyId] : [],
          updatedAt: now,
        };
        const dimensions = getBubbleDimensions(nextTodo);

        return {
          ...nextTodo,
          x: clamp(nextTodo.x, 16, WORLD_WIDTH - dimensions.width - 16),
          y: clamp(nextTodo.y, 16, WORLD_HEIGHT - dimensions.height - 16),
        };
      })
    );
    setTaskomonNotice(`Updated "${title}".`);
  }

  function handleDeleteEditedTodo() {
    if (!editingTodo) return;

    const deletedTitle = editingTodo.title;
    const deletedId = editingTodo.id;
    const now = new Date().toISOString();

    setTodos((currentTodos) =>
      currentTodos
        .filter((todo) => todo.id !== deletedId)
        .map((todo) => {
          if (!todo.dependencyIds.includes(deletedId)) return todo;

          return {
            ...todo,
            dependencyIds: todo.dependencyIds.filter(
              (dependencyId) => dependencyId !== deletedId
            ),
            updatedAt: now,
          };
        })
    );
    setEditingTodoId("");
    setSelectedTodoId("");
    setTaskomonNotice(`Deleted "${deletedTitle}" and cleared its dependency lines.`);
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

          @keyframes finishPop {
            0% { opacity: 0; transform: translate(-50%, 14px) scale(0.96); }
            14% { opacity: 1; transform: translate(-50%, 0) scale(1); }
            78% { opacity: 1; transform: translate(-50%, 0) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -8px) scale(0.98); }
          }

          .finish-pop {
            animation: finishPop 2.4s ease forwards;
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
              <NavButton
                active={location.pathname === "/dashboard"}
                label="Notice"
                to="/dashboard"
              />
              <NavButton
                active={location.pathname.startsWith("/habit")}
                label="Habit"
                to="/habit"
              />
              <NavButton label="Workflow" to="/dashboard" />
              <NavButton label="Advice" to="/dashboard" />
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

                <div className="max-w-36 rounded-2xl border border-sky-300/20 bg-sky-500/10 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-sky-100/55">
                    Next due
                  </p>
                  <p className="truncate text-sm font-black text-sky-100">
                    {nextDueTodo ? getDueLabel(nextDueTodo) : "Clear"}
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

              <select
                value={newTodoDueMode}
                onChange={(event) => setNewTodoDueMode(event.target.value as DueMode)}
                className="w-28 rounded-xl border border-sky-400/20 bg-[#120c0b] px-3 py-2 text-xs font-semibold text-neutral-200 outline-none focus:border-sky-300/60"
              >
                <option value="anytime">Anytime</option>
                <option value="by_time">By time</option>
                <option value="at_time">At time</option>
              </select>

              {newTodoDueMode !== "anytime" && (
                <input
                  type="time"
                  value={newTodoDueTime}
                  onChange={(event) => setNewTodoDueTime(event.target.value)}
                  className="w-28 rounded-xl border border-sky-400/20 bg-[#120c0b] px-3 py-2 text-xs font-semibold text-neutral-200 outline-none focus:border-sky-300/60"
                />
              )}

              <select
                value={newTodoPriority}
                onChange={(event) => setNewTodoPriority(event.target.value as Priority)}
                className="w-28 rounded-xl border border-violet-400/20 bg-[#120c0b] px-3 py-2 text-xs font-semibold capitalize text-neutral-200 outline-none focus:border-violet-300/60"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>

              <select
                value={newTodoHeaviness}
                onChange={(event) => setNewTodoHeaviness(event.target.value as Heaviness)}
                className="w-28 rounded-xl border border-violet-400/20 bg-[#120c0b] px-3 py-2 text-xs font-semibold capitalize text-neutral-200 outline-none focus:border-violet-300/60"
              >
                <option value="light">Light</option>
                <option value="medium">Medium</option>
                <option value="heavy">Heavy</option>
              </select>

              <select
                value={newTodoDependencyId}
                onChange={(event) => setNewTodoDependencyId(event.target.value)}
                className="w-40 rounded-xl border border-red-400/20 bg-[#120c0b] px-3 py-2 text-xs font-semibold text-neutral-200 outline-none focus:border-red-300/60"
              >
                <option value="">No dependency</option>
                {todos.map((todo) => (
                  <option key={todo.id} value={todo.id}>
                    After {todo.title}
                  </option>
                ))}
              </select>

              <button
                onClick={handleAddTodo}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-black text-white transition hover:brightness-110"
              >
                Add
              </button>

              <div className="h-7 w-px bg-orange-400/20" />

              <select
                value={
                  todos.some((todo) => todo.id === selectedTodoId)
                    ? selectedTodoId
                    : ""
                }
                onChange={(event) => {
                  if (event.target.value) {
                    openTodoEditor(event.target.value);
                    return;
                  }

                  setSelectedTodoId("");
                  setEditingTodoId("");
                }}
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

              <button
                onClick={handleResetHabitDay}
                className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-500/20"
              >
                Reset cycle
              </button>
            </div>

            {editingTodo && (
              <div
                ref={editorRef}
                data-testid="todo-editor"
                style={
                  editorPosition
                    ? { left: editorPosition.left, top: editorPosition.top }
                    : { right: 20, top: 112 }
                }
                className="absolute z-30 w-80 rounded-2xl border border-sky-300/25 bg-[#111923]/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.4)] backdrop-blur"
              >
                <div
                  data-testid="todo-editor-drag-handle"
                  onPointerDown={handleEditorDragStart}
                  onPointerMove={handleEditorDragMove}
                  onPointerUp={handleEditorDragEnd}
                  onPointerCancel={handleEditorDragEnd}
                  className="mb-3 flex cursor-grab select-none items-center justify-between gap-3 active:cursor-grabbing"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-200">
                    Todo editor
                  </p>
                  <button
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setEditingTodoId("")}
                    className="rounded-full border border-sky-300/20 bg-sky-400/10 px-2 py-1 text-[10px] font-black uppercase text-sky-100/70 transition hover:bg-sky-400/20"
                  >
                    Close
                  </button>
                </div>

                <div className="grid gap-2.5">
                  <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-sky-100/55">
                    Title
                    <input
                      data-testid="todo-editor-title"
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      className="rounded-xl border border-sky-300/20 bg-[#0b1118] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-sky-50 outline-none focus:border-sky-300/60"
                    />
                  </label>

                  <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-sky-100/55">
                    Description
                    <textarea
                      data-testid="todo-editor-description"
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      rows={3}
                      className="resize-none rounded-xl border border-sky-300/20 bg-[#0b1118] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-sky-50 outline-none focus:border-sky-300/60"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-sky-100/55">
                      Due
                      <select
                        data-testid="todo-editor-due-mode"
                        value={editDueMode}
                        onChange={(event) =>
                          setEditDueMode(event.target.value as DueMode)
                        }
                        className="rounded-xl border border-sky-300/20 bg-[#0b1118] px-3 py-2 text-xs font-semibold normal-case tracking-normal text-sky-50 outline-none focus:border-sky-300/60"
                      >
                        <option value="anytime">Anytime</option>
                        <option value="by_time">By time</option>
                        <option value="at_time">At time</option>
                      </select>
                    </label>

                    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-sky-100/55">
                      Time
                      <input
                        data-testid="todo-editor-due-time"
                        type="time"
                        value={editDueTime}
                        disabled={editDueMode === "anytime"}
                        onChange={(event) => setEditDueTime(event.target.value)}
                        className="rounded-xl border border-sky-300/20 bg-[#0b1118] px-3 py-2 text-xs font-semibold normal-case tracking-normal text-sky-50 outline-none disabled:opacity-35 focus:border-sky-300/60"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-sky-100/55">
                      Priority
                      <select
                        data-testid="todo-editor-priority"
                        value={editPriority}
                        onChange={(event) =>
                          setEditPriority(event.target.value as Priority)
                        }
                        className="rounded-xl border border-sky-300/20 bg-[#0b1118] px-3 py-2 text-xs font-semibold normal-case tracking-normal text-sky-50 outline-none focus:border-sky-300/60"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </label>

                    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-sky-100/55">
                      Weight
                      <select
                        data-testid="todo-editor-heaviness"
                        value={editHeaviness}
                        onChange={(event) =>
                          setEditHeaviness(event.target.value as Heaviness)
                        }
                        className="rounded-xl border border-sky-300/20 bg-[#0b1118] px-3 py-2 text-xs font-semibold normal-case tracking-normal text-sky-50 outline-none focus:border-sky-300/60"
                      >
                        <option value="light">Light</option>
                        <option value="medium">Medium</option>
                        <option value="heavy">Heavy</option>
                      </select>
                    </label>
                  </div>

                  <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-sky-100/55">
                    Dependency
                    <select
                      data-testid="todo-editor-dependency"
                      value={editDependencyId}
                      onChange={(event) => setEditDependencyId(event.target.value)}
                      className="rounded-xl border border-sky-300/20 bg-[#0b1118] px-3 py-2 text-xs font-semibold normal-case tracking-normal text-sky-50 outline-none focus:border-sky-300/60"
                    >
                      <option value="">No dependency</option>
                      {todos
                        .filter((todo) => todo.id !== editingTodo.id)
                        .map((todo) => (
                          <option key={todo.id} value={todo.id}>
                            After {todo.title}
                          </option>
                        ))}
                    </select>
                  </label>

                  <div className="mt-1 grid grid-cols-[1fr_auto] gap-2">
                    <button
                      data-testid="todo-editor-save"
                      onClick={handleSaveEditedTodo}
                      className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-300 px-4 py-2 text-xs font-black uppercase text-slate-950 transition hover:brightness-110"
                    >
                      Save changes
                    </button>
                    <button
                      data-testid="todo-editor-delete"
                      onClick={handleDeleteEditedTodo}
                      className="rounded-xl border border-red-300/30 bg-red-500/10 px-4 py-2 text-xs font-black uppercase text-red-100 transition hover:bg-red-500/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                    <marker
                      id="dependencyArrow"
                      markerHeight="8"
                      markerWidth="8"
                      orient="auto"
                      refX="6"
                      refY="3"
                    >
                      <path d="M0,0 L0,6 L7,3 z" fill="rgba(251,191,36,0.72)" />
                    </marker>
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
                      markerEnd="url(#dependencyArrow)"
                    />
                  ))}
                </svg>

                {todos.map((todo) => (
                  <HabitBubble
                    key={todo.id}
                    todo={todo}
                    isDragging={dragState?.todoId === todo.id}
                    isBlocked={isTodoBlocked(todo, todos)}
                    isLate={isTodoLate(todo)}
                    isSoon={isTodoSoon(todo)}
                    onStartDrag={handleStartDrag}
                    onCycleStatus={handleCycleStatus}
                    onEditTodo={openTodoEditor}
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

            <div className="pointer-events-none absolute bottom-6 left-6 z-30 w-72 rounded-2xl border border-sky-300/20 bg-[#10161d]/92 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-200">
                Habit report
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-emerald-300/15 bg-emerald-500/10 p-2">
                  <p className="text-base font-black text-emerald-200">
                    {completionPercentage}%
                  </p>
                  <p className="text-[9px] font-bold uppercase text-emerald-100/50">
                    Done
                  </p>
                </div>
                <div className="rounded-xl border border-rose-300/15 bg-rose-500/10 p-2">
                  <p className="text-base font-black text-rose-200">{lateTodos.length}</p>
                  <p className="text-[9px] font-bold uppercase text-rose-100/50">
                    Late
                  </p>
                </div>
                <div className="rounded-xl border border-amber-300/15 bg-amber-500/10 p-2">
                  <p className="text-base font-black text-amber-200">
                    {blockedTodos.length}
                  </p>
                  <p className="text-[9px] font-bold uppercase text-amber-100/50">
                    Blocked
                  </p>
                </div>
              </div>
              <p className="mt-3 truncate text-xs font-semibold text-sky-50/70">
                {nextDueTodo
                  ? `Next: ${nextDueTodo.title} (${getDueLabel(nextDueTodo)})`
                  : "No timed bubbles left today"}
              </p>
            </div>

            {lastCompletionTitle && (
              <div className="finish-pop pointer-events-none absolute bottom-8 left-1/2 z-40 rounded-full border border-emerald-200/40 bg-emerald-400 px-5 py-3 text-sm font-black text-emerald-950 shadow-[0_0_36px_rgba(52,211,153,0.45)]">
                Finished: {lastCompletionTitle}
              </div>
            )}

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
