import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, WheelEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import taskomonImage from "../assets/taskomon/taskomon.png";
import { demoTodos, demoWorkflows } from "../data/demoData";
import { loadFromStorage, saveToStorage } from "../services/storageServices";
import type {
  Heaviness,
  PomodoroPhase,
  PomodoroTimerState,
  Priority,
  Todo,
  TodoStatus,
  Workflow,
} from "../types";

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

type WorkflowRuntime = {
  status: Workflow["status"];
  focusMinutes: number;
  restMinutes: number;
  updatedAt: string;
};

const BASE_BUBBLE_HEIGHT = 128;
const WORLD_WIDTH = 2800;
const WORLD_HEIGHT = 1800;
const WORKFLOW_STORAGE_PREFIX = "taskomon:workflow";
const LAST_OPENED_WORKFLOW_KEY = "taskomon:lastOpenedWorkflowId";
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

function getWorkflowTodoStorageKey(workflowId: string) {
  return `${WORKFLOW_STORAGE_PREFIX}:${workflowId}:todos`;
}

function getWorkflowRuntimeStorageKey(workflowId: string) {
  return `${WORKFLOW_STORAGE_PREFIX}:${workflowId}:runtime`;
}

function getDefaultRuntime(workflow: Workflow): WorkflowRuntime {
  return {
    status: workflow.status,
    focusMinutes: workflow.focusMinutes,
    restMinutes: workflow.restMinutes,
    updatedAt: workflow.updatedAt,
  };
}

function getInitialWorkflowTodos(workflowId: string) {
  return demoTodos
    .filter((todo) => todo.parentType === "workflow" && todo.parentId === workflowId)
    .map((todo, index) => ({
      ...todo,
      x: todo.x + (index === 0 ? 380 : 460),
      y: todo.y + 260,
      priority: todo.priority ?? "medium",
      heaviness: todo.heaviness ?? "medium",
      dueMode: undefined,
      dueTime: undefined,
    }));
}

function getBubbleDimensions(todo: Pick<Todo, "title" | "priority" | "heaviness">) {
  const priority = todo.priority ?? "medium";
  const heaviness = todo.heaviness ?? "medium";
  const titleBoost = Math.max(0, todo.title.trim().length - 14) * 5.5;
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

function getEdgePoint(
  from: ReturnType<typeof getBubbleCenter>,
  to: ReturnType<typeof getBubbleCenter>
) {
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

function getNextStatus(status: TodoStatus): TodoStatus {
  if (status === "not_started") return "in_progress";
  if (status === "in_progress") return "done";
  return "not_started";
}

function getStatusLabel(status: TodoStatus) {
  if (status === "in_progress") return "Doing";
  if (status === "done") return "Done";
  return "Idle";
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

function isTodoBlocked(todo: Todo, allTodos: Todo[]) {
  return todo.dependencyIds.some((dependencyId) => {
    const dependency = allTodos.find((item) => item.id === dependencyId);
    return dependency && dependency.status !== "done";
  });
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

function formatClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getWorkflowAttentionScore(workflow: Workflow) {
  const todos = loadFromStorage<Todo[]>(
    getWorkflowTodoStorageKey(workflow.id),
    getInitialWorkflowTodos(workflow.id)
  );
  const runtime = loadFromStorage<WorkflowRuntime>(
    getWorkflowRuntimeStorageKey(workflow.id),
    getDefaultRuntime(workflow)
  );
  const activeCount = todos.filter((todo) => todo.status === "in_progress").length;
  const blockedCount = todos.filter((todo) => isTodoBlocked(todo, todos)).length;
  const heavyOpenCount = todos.filter(
    (todo) => todo.status !== "done" && todo.heaviness === "heavy"
  ).length;
  const unfinishedCount = todos.filter((todo) => todo.status !== "done").length;
  const statusWeight =
    runtime.status === "active" ? 500 : runtime.status === "held" ? 180 : 0;

  return (
    statusWeight +
    activeCount * 500 +
    blockedCount * 280 +
    heavyOpenCount * 160 +
    unfinishedCount * 60
  );
}

function getWorkflowRouteTarget(routeWorkflowId?: string) {
  if (
    routeWorkflowId &&
    demoWorkflows.some((workflow) => workflow.id === routeWorkflowId)
  ) {
    return routeWorkflowId;
  }

  const lastOpenedWorkflowId = sessionStorage.getItem(LAST_OPENED_WORKFLOW_KEY);
  if (
    lastOpenedWorkflowId &&
    demoWorkflows.some((workflow) => workflow.id === lastOpenedWorkflowId)
  ) {
    return lastOpenedWorkflowId;
  }

  return [...demoWorkflows].sort(
    (a, b) => getWorkflowAttentionScore(b) - getWorkflowAttentionScore(a)
  )[0]?.id;
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

function WorkflowBubble({
  todo,
  isDragging,
  isBlocked,
  onStartDrag,
  onCycleStatus,
  onEditTodo,
}: {
  todo: Todo;
  isDragging: boolean;
  isBlocked: boolean;
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
        animationDuration: `${3.8 + todo.title.length * 0.04}s`,
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

          <p className="mt-1 line-clamp-1 text-[10px] font-bold text-neutral-300/70 [overflow-wrap:anywhere]">
            {todo.description || "Workflow bubble"}
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

function WorkflowWorkspacePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { workflowId: routeWorkflowId } = useParams();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const activeWorkflowId =
    getWorkflowRouteTarget(routeWorkflowId) ?? demoWorkflows[0].id;
  const workflow =
    demoWorkflows.find((workflowItem) => workflowItem.id === activeWorkflowId) ??
    demoWorkflows[0];
  const workflowStorageKey = getWorkflowTodoStorageKey(workflow.id);
  const workflowRuntimeStorageKey = getWorkflowRuntimeStorageKey(workflow.id);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);
  const [editorPosition, setEditorPosition] = useState<EditorPosition | null>(
    null
  );
  const [editorDragState, setEditorDragState] =
    useState<EditorDragState | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState<Priority>("medium");
  const [newTodoHeaviness, setNewTodoHeaviness] = useState<Heaviness>("medium");
  const [newTodoDependencyId, setNewTodoDependencyId] = useState("");
  const [selectedTodoId, setSelectedTodoId] = useState("");
  const [editingTodoId, setEditingTodoId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>("medium");
  const [editHeaviness, setEditHeaviness] = useState<Heaviness>("medium");
  const [editDependencyId, setEditDependencyId] = useState("");
  const [taskomonNoticeState, setTaskomonNoticeState] = useState({
    workflowId: workflow.id,
    message: "",
  });
  const [lastCompletionTitle, setLastCompletionTitle] = useState("");
  const [timerPhase, setTimerPhase] = useState<PomodoroPhase>("focus");
  const [timerSeconds, setTimerSeconds] = useState(workflow.focusMinutes * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  const [workflowRuntimeState, setWorkflowRuntimeState] = useState<{
    workflowId: string;
    runtime: WorkflowRuntime;
  }>(() => ({
    workflowId: workflow.id,
    runtime: loadFromStorage(
      workflowRuntimeStorageKey,
      getDefaultRuntime(workflow)
    ),
  }));
  const [todoState, setTodoState] = useState<{
    workflowId: string;
    items: Todo[];
  }>(() => ({
    workflowId: workflow.id,
    items: loadFromStorage(
      workflowStorageKey,
      getInitialWorkflowTodos(workflow.id)
    ),
  }));

  const runtime =
    workflowRuntimeState.workflowId === workflow.id
      ? workflowRuntimeState.runtime
      : loadFromStorage(workflowRuntimeStorageKey, getDefaultRuntime(workflow));
  const todos =
    todoState.workflowId === workflow.id
      ? todoState.items
      : loadFromStorage(workflowStorageKey, getInitialWorkflowTodos(workflow.id));
  const taskomonNotice =
    taskomonNoticeState.workflowId === workflow.id
      ? taskomonNoticeState.message
      : "";
  const editingTodo = todos.find((todo) => todo.id === editingTodoId);
  const timerState: PomodoroTimerState = {
    phase: timerPhase,
    remainingSeconds: timerSeconds,
    running: timerRunning,
    focusMinutes: runtime.focusMinutes,
    restMinutes: runtime.restMinutes,
  };

  function setTaskomonNotice(message: string) {
    setTaskomonNoticeState({ workflowId: workflow.id, message });
  }

  function setTodos(updater: Todo[] | ((currentTodos: Todo[]) => Todo[])) {
    setTodoState((currentState) => {
      const currentTodos =
        currentState.workflowId === workflow.id
          ? currentState.items
          : loadFromStorage(workflowStorageKey, getInitialWorkflowTodos(workflow.id));
      const nextItems =
        typeof updater === "function" ? updater(currentTodos) : updater;

      return {
        workflowId: workflow.id,
        items: nextItems.map((todo) => ({
          ...todo,
          dueMode: undefined,
          dueTime: undefined,
        })),
      };
    });
  }

  function setRuntime(
    updater: WorkflowRuntime | ((currentRuntime: WorkflowRuntime) => WorkflowRuntime)
  ) {
    setWorkflowRuntimeState((currentState) => {
      const currentRuntime =
        currentState.workflowId === workflow.id
          ? currentState.runtime
          : loadFromStorage(workflowRuntimeStorageKey, getDefaultRuntime(workflow));
      const nextRuntime =
        typeof updater === "function" ? updater(currentRuntime) : updater;

      return {
        workflowId: workflow.id,
        runtime: {
          ...nextRuntime,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }

  useEffect(() => {
    if (!routeWorkflowId || routeWorkflowId !== workflow.id) {
      navigate(`/workflow/${workflow.id}`, { replace: true });
    }
  }, [navigate, routeWorkflowId, workflow.id]);

  useEffect(() => {
    sessionStorage.setItem(LAST_OPENED_WORKFLOW_KEY, workflow.id);
  }, [workflow.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setWorkflowRuntimeState({
        workflowId: workflow.id,
        runtime: loadFromStorage(
          workflowRuntimeStorageKey,
          getDefaultRuntime(workflow)
        ),
      });
      setTodoState({
        workflowId: workflow.id,
        items: loadFromStorage(
          workflowStorageKey,
          getInitialWorkflowTodos(workflow.id)
        ),
      });
      setEditingTodoId("");
      setSelectedTodoId("");
      setEditorPosition(null);
      setTimerPhase("focus");
      setTimerSeconds(workflow.focusMinutes * 60);
      setTimerRunning(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [workflow, workflowRuntimeStorageKey, workflowStorageKey]);

  useEffect(() => {
    if (
      todos.some(
        (todo) => todo.parentId !== workflow.id || todo.parentType !== "workflow"
      )
    ) {
      return;
    }

    saveToStorage(workflowStorageKey, todos);
  }, [todos, workflow.id, workflowStorageKey]);

  useEffect(() => {
    saveToStorage(workflowRuntimeStorageKey, runtime);
  }, [runtime, workflowRuntimeStorageKey]);

  useEffect(() => {
    if (!lastCompletionTitle) return;

    const timeoutId = window.setTimeout(() => {
      setLastCompletionTitle("");
    }, 2400);

    return () => window.clearTimeout(timeoutId);
  }, [lastCompletionTitle]);

  useEffect(() => {
    if (!timerRunning) return;

    const intervalId = window.setInterval(() => {
      setTimerSeconds((currentSeconds) => {
        if (currentSeconds > 1) {
          return currentSeconds - 1;
        }

        if (timerPhase === "focus") {
          setTimerPhase("rest");
          setTaskomonNoticeState({
            workflowId: workflow.id,
            message: "Focus interval complete. Take the rest clock seriously.",
          });
          return runtime.restMinutes * 60;
        }

        setTimerPhase("focus");
        setTaskomonNoticeState({
          workflowId: workflow.id,
          message: "Rest finished. Pick the next bubble when you are ready.",
        });
        return runtime.focusMinutes * 60;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [
    runtime.focusMinutes,
    runtime.restMinutes,
    timerPhase,
    timerRunning,
    workflow.id,
  ]);

  const activeTodo = todos.find((todo) => todo.status === "in_progress");
  const completedCount = todos.filter((todo) => todo.status === "done").length;
  const blockedTodos = todos.filter(
    (todo) => todo.status !== "done" && isTodoBlocked(todo, todos)
  );
  const heavyOpenTodos = todos.filter(
    (todo) => todo.status !== "done" && todo.heaviness === "heavy"
  );
  const completionPercentage =
    todos.length === 0 ? 0 : Math.round((completedCount / todos.length) * 100);
  const focusTotalSeconds = runtime.focusMinutes * 60;
  const focusElapsedSeconds =
    timerPhase === "focus" ? focusTotalSeconds - timerSeconds : 0;
  const focusElapsedRatio =
    focusTotalSeconds === 0 ? 0 : focusElapsedSeconds / focusTotalSeconds;
  const timerProgress =
    timerState.phase === "focus"
      ? clamp((focusElapsedSeconds / focusTotalSeconds) * 100, 0, 100)
      : clamp(
          ((runtime.restMinutes * 60 - timerSeconds) /
            (runtime.restMinutes * 60)) *
            100,
          0,
          100
        );
  const taskomonThought = taskomonNotice
    ? taskomonNotice
    : runtime.status === "held"
    ? "Workflow is held. I will keep the bubbles as they are until you resume."
    : runtime.status === "completed"
    ? "Workflow complete. That session can be archived or used as a reference."
    : timerPhase === "rest"
    ? "Rest interval is running. Let the brain cool down before the next bubble."
    : activeTodo && activeTodo.heaviness === "heavy" && focusElapsedRatio > 0.35
    ? `Your work on "${activeTodo.title}" is getting slower. Is the task getting difficult? You should take a rest or split it.`
    : activeTodo && activeTodo.priority === "high"
    ? `"${activeTodo.title}" is the current high-priority bubble. Stay with one clean action.`
    : blockedTodos[0]
    ? `"${blockedTodos[0].title}" is blocked by a dependency. Clear the connected bubble first.`
    : activeTodo
    ? `You are working on "${activeTodo.title}". Keep the check-ins steady.`
    : "Start one workflow bubble and I will watch the rhythm from here.";
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
    setSelectedTodoId(todo.id);
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

    scrollToWorldPoint((minX + maxX) / 2, (minY + maxY) / 2);
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
    viewportRef.current.scrollLeft += event.deltaX;
    viewportRef.current.scrollTop += event.deltaY;
  }

  function handleAddTodo() {
    const title = newTodoTitle.trim();
    if (!title) return;

    const dependencyTodo = todos.find((todo) => todo.id === newTodoDependencyId);
    const baseX = dependencyTodo
      ? dependencyTodo.x + getBubbleDimensions(dependencyTodo).width + 140
      : 340 + todos.length * 44;
    const baseY = dependencyTodo ? dependencyTodo.y + 16 : 300 + todos.length * 38;
    const now = new Date().toISOString();
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      parentId: workflow.id,
      parentType: "workflow",
      title,
      description: "",
      status: "not_started",
      x: clamp(baseX, 40, WORLD_WIDTH - 260),
      y: clamp(baseY, 40, WORLD_HEIGHT - 220),
      priority: newTodoPriority,
      heaviness: newTodoHeaviness,
      dependencyIds: newTodoDependencyId ? [newTodoDependencyId] : [],
      createdAt: now,
      updatedAt: now,
    };

    setTodos((currentTodos) => [...currentTodos, newTodo]);
    setNewTodoTitle("");
    setNewTodoDependencyId("");
    setSelectedTodoId(newTodo.id);
    setTaskomonNotice(`Added "${title}" to the workflow session.`);
    window.setTimeout(() => scrollToTodo(newTodo.id), 80);
  }

  function handleCycleStatus(todoId: string) {
    const targetTodo = todos.find((todo) => todo.id === todoId);
    if (!targetTodo) return;

    const nextStatus = getNextStatus(targetTodo.status);
    if (nextStatus === "in_progress" && isTodoBlocked(targetTodo, todos)) {
      setTaskomonNotice(
        `"${targetTodo.title}" is still blocked. Follow the dependency line first.`
      );
      return;
    }

    const now = new Date().toISOString();

    setTodos((currentTodos) => {
      const nextTodos = currentTodos.map((todo) => {
        if (nextStatus === "in_progress" && todo.status === "in_progress") {
          return {
            ...todo,
            status: "not_started" as TodoStatus,
            updatedAt: now,
          };
        }

        if (todo.id !== todoId) return todo;

        return {
          ...todo,
          status: nextStatus,
          startedAt: nextStatus === "in_progress" ? now : todo.startedAt,
          completedAt: nextStatus === "done" ? now : todo.completedAt,
          updatedAt: now,
        };
      });

      if (nextTodos.every((todo) => todo.status === "done") && nextTodos.length > 0) {
        setRuntime((currentRuntime) => ({
          ...currentRuntime,
          status: "completed",
        }));
        setTimerRunning(false);
      } else if (runtime.status === "completed") {
        setRuntime((currentRuntime) => ({
          ...currentRuntime,
          status: "active",
        }));
      }

      return nextTodos;
    });

    setSelectedTodoId(todoId);

    if (nextStatus === "done") {
      setLastCompletionTitle(targetTodo.title);
      setTaskomonNotice(`Finished "${targetTodo.title}". That was a clean check.`);
      return;
    }

    if (nextStatus === "in_progress") {
      setRuntime((currentRuntime) => ({
        ...currentRuntime,
        status: "active",
      }));
      setTaskomonNotice(
        targetTodo.heaviness === "heavy"
          ? `"${targetTodo.title}" is heavy. I will watch for slowdown.`
          : `Tracking "${targetTodo.title}" as the active workflow bubble.`
      );
      return;
    }

    setTaskomonNotice(`"${targetTodo.title}" moved back to idle.`);
  }

  function openTodoEditor(todoId: string) {
    const todo = todos.find((item) => item.id === todoId);
    if (!todo) return;

    setSelectedTodoId(todo.id);
    setEditingTodoId(todo.id);
    setEditTitle(todo.title);
    setEditDescription(todo.description ?? "");
    setEditPriority(todo.priority ?? "medium");
    setEditHeaviness(todo.heaviness ?? "medium");
    setEditDependencyId(todo.dependencyIds[0] ?? "");
  }

  function handleSaveEditedTodo() {
    if (!editingTodo) return;

    const title = editTitle.trim();
    if (!title) return;

    const dependencyIds = editDependencyId ? [editDependencyId] : [];
    if (
      editDependencyId &&
      wouldCreateDependencyCycle(editingTodo.id, editDependencyId, todos)
    ) {
      setTaskomonNotice("That dependency would create a loop between bubbles.");
      return;
    }

    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.id === editingTodo.id
          ? {
              ...todo,
              title,
              description: editDescription.trim(),
              priority: editPriority,
              heaviness: editHeaviness,
              dependencyIds,
              dueMode: undefined,
              dueTime: undefined,
              updatedAt: new Date().toISOString(),
            }
          : todo
      )
    );
    setTaskomonNotice(`Updated "${title}" in the workflow.`);
  }

  function handleDeleteEditedTodo() {
    if (!editingTodo) return;

    const deletedTitle = editingTodo.title;
    setTodos((currentTodos) =>
      currentTodos
        .filter((todo) => todo.id !== editingTodo.id)
        .map((todo) => ({
          ...todo,
          dependencyIds: todo.dependencyIds.filter((id) => id !== editingTodo.id),
          updatedAt: new Date().toISOString(),
        }))
    );
    setEditingTodoId("");
    setSelectedTodoId("");
    setTaskomonNotice(`Deleted "${deletedTitle}" and cleared its dependency lines.`);
  }

  function handleSetTimerPhase(phase: PomodoroPhase) {
    setTimerPhase(phase);
    setTimerSeconds(
      phase === "focus" ? runtime.focusMinutes * 60 : runtime.restMinutes * 60
    );
    setTimerRunning(false);
  }

  function handleResetTimer() {
    setTimerSeconds(
      timerPhase === "focus" ? runtime.focusMinutes * 60 : runtime.restMinutes * 60
    );
    setTimerRunning(false);
  }

  function handleHoldWorkflow() {
    setTimerRunning(false);
    setRuntime((currentRuntime) => ({
      ...currentRuntime,
      status: "held",
    }));
    setTaskomonNotice("Workflow held. Your bubbles are stored for later.");
  }

  function handleResumeWorkflow() {
    setRuntime((currentRuntime) => ({
      ...currentRuntime,
      status: "active",
    }));
    setTaskomonNotice("Workflow resumed. Start a bubble and I will watch the rhythm.");
  }

  function handleCompleteWorkflow() {
    setTimerRunning(false);
    setRuntime((currentRuntime) => ({
      ...currentRuntime,
      status: "completed",
    }));
    setTaskomonNotice("Workflow marked complete for this session.");
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
              linear-gradient(rgba(249, 115, 22, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249, 115, 22, 0.08) 1px, transparent 1px),
              radial-gradient(circle at 30% 20%, rgba(244, 63, 94, 0.09), transparent 28%),
              radial-gradient(circle at 72% 58%, rgba(251, 191, 36, 0.08), transparent 34%);
            background-size: 64px 64px, 64px 64px, 100% 100%, 100% 100%;
          }
          @keyframes bubbleIdle {
            0%, 100% { translate: 0 0; }
            50% { translate: 0 -6px; }
          }
          .bubble-idle {
            animation: bubbleIdle 4s ease-in-out infinite;
          }
          @keyframes finishPop {
            0% { transform: translate(-50%, 10px) scale(0.92); opacity: 0; }
            18% { transform: translate(-50%, 0) scale(1.03); opacity: 1; }
            72% { transform: translate(-50%, -4px) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -10px) scale(0.96); opacity: 0; }
          }
          .finish-pop {
            animation: finishPop 2.4s ease forwards;
          }
          .workspace-scrollbar::-webkit-scrollbar {
            width: 9px;
            height: 9px;
          }
          .workspace-scrollbar::-webkit-scrollbar-track {
            background: #100c0b;
          }
          .workspace-scrollbar::-webkit-scrollbar-thumb {
            background: #42231b;
            border-radius: 999px;
          }
          .workspace-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #f97316;
          }
        `}
      </style>

      <div className="relative z-10 grid h-screen grid-cols-[230px_1fr]">
        <aside className="relative flex h-screen flex-col justify-between border-r border-orange-950/60 bg-gradient-to-b from-[#21110e] via-[#17100f] to-[#100c0b] p-4 pt-0">
          <div>
            <div className="absolute left-0 top-0 h-14 w-full">
              <div className="clip-title absolute inset-0 bg-gradient-to-r from-red-600 via-orange-500 to-amber-300" />
              <div className="clip-title absolute inset-[0_0_2px_0] flex items-center bg-[#3a1710] pl-5">
                <h1 className="text-sm font-black uppercase tracking-widest text-white">
                  Workflow
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
              <NavButton
                active={location.pathname.startsWith("/workflow")}
                label="Workflow"
                to="/workflow"
              />
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
                <p className="text-[11px] text-amber-300/80">Workflow shell</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="grid h-screen grid-rows-[76px_auto_1fr] overflow-hidden">
          <header className="border-b border-orange-950/60 bg-gradient-to-r from-[#40160f] via-[#3a1d10] to-[#2b2011] px-8 py-3">
            <div className="flex h-full items-center justify-between gap-5">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
                  Workflow workspace
                </p>
                <h2 className="truncate text-lg font-black tracking-tight text-white">
                  {workflow.title}
                </h2>
                <p className="truncate text-xs font-semibold text-orange-100/45">
                  {workflow.description}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="rounded-2xl border border-emerald-300/15 bg-emerald-500/10 px-4 py-1.5 text-right">
                  <p className="text-[9px] font-black uppercase tracking-wider text-emerald-100/45">
                    Progress
                  </p>
                  <p className="text-sm font-black text-emerald-100">
                    {completionPercentage}%
                  </p>
                </div>
                <div className="rounded-2xl border border-orange-300/15 bg-orange-500/10 px-4 py-1.5 text-right">
                  <p className="text-[9px] font-black uppercase tracking-wider text-orange-100/45">
                    Status
                  </p>
                  <p className="text-sm font-black capitalize text-orange-100">
                    {runtime.status}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="flex flex-wrap items-center gap-2 border-b border-orange-950/50 bg-[#1a100e] px-6 py-3">
            <input
              value={newTodoTitle}
              onChange={(event) => setNewTodoTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleAddTodo();
              }}
              placeholder="New Bubble..."
              className="w-48 rounded-xl border border-orange-400/20 bg-[#120c0b] px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-orange-100/25 focus:border-orange-300/60"
            />

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
              onChange={(event) =>
                setNewTodoHeaviness(event.target.value as Heaviness)
              }
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
          </div>

          <section className="relative min-h-0 overflow-hidden bg-[#140f0e]">
            <div className="absolute right-5 top-5 z-40 w-80 rounded-2xl border border-orange-300/25 bg-[#15100f]/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.42)] backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                    Rest clock
                  </p>
                  <p className="mt-1 text-4xl font-black tracking-tight text-white">
                    {formatClock(timerState.remainingSeconds)}
                  </p>
                </div>
                <span
                  className={[
                    "rounded-full border px-3 py-1 text-[10px] font-black uppercase",
                    timerState.phase === "focus"
                      ? "border-orange-300/30 bg-orange-500/10 text-orange-100"
                      : "border-sky-300/30 bg-sky-500/10 text-sky-100",
                  ].join(" ")}
                >
                  {timerState.phase}
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#321b13]">
                <div
                  className={[
                    "h-full rounded-full transition-all duration-300",
                    timerState.phase === "focus"
                      ? "bg-gradient-to-r from-red-500 via-orange-400 to-amber-200"
                      : "bg-gradient-to-r from-sky-500 via-cyan-300 to-emerald-200",
                  ].join(" ")}
                  style={{ width: `${timerProgress}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSetTimerPhase("focus")}
                  className={[
                    "rounded-xl border px-3 py-2 text-xs font-black uppercase transition",
                    timerState.phase === "focus"
                      ? "border-orange-200/45 bg-orange-400/18 text-orange-50"
                      : "border-orange-300/20 bg-orange-500/10 text-orange-100/60 hover:bg-orange-500/20",
                  ].join(" ")}
                >
                  Focus
                </button>
                <button
                  onClick={() => handleSetTimerPhase("rest")}
                  className={[
                    "rounded-xl border px-3 py-2 text-xs font-black uppercase transition",
                    timerState.phase === "rest"
                      ? "border-sky-200/45 bg-sky-400/18 text-sky-50"
                      : "border-sky-300/20 bg-sky-500/10 text-sky-100/60 hover:bg-sky-500/20",
                  ].join(" ")}
                >
                  Rest
                </button>
              </div>

              <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-2">
                <button
                  onClick={() => setTimerRunning((running) => !running)}
                  disabled={runtime.status === "held" || runtime.status === "completed"}
                  className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-xs font-black uppercase text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {timerState.running ? "Pause" : "Start"}
                </button>
                <button
                  onClick={handleResetTimer}
                  className="rounded-xl border border-orange-300/25 bg-orange-500/10 px-3 py-2 text-xs font-black uppercase text-orange-100 transition hover:bg-orange-500/20"
                >
                  Reset
                </button>
                <button
                  onClick={
                    timerState.phase === "focus"
                      ? () => handleSetTimerPhase("rest")
                      : () => handleSetTimerPhase("focus")
                  }
                  className="rounded-xl border border-sky-300/25 bg-sky-500/10 px-3 py-2 text-xs font-black uppercase text-sky-100 transition hover:bg-sky-500/20"
                >
                  Skip
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {runtime.status === "held" ? (
                  <button
                    onClick={handleResumeWorkflow}
                    className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-xs font-black uppercase text-emerald-100 transition hover:bg-emerald-500/20"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={handleHoldWorkflow}
                    className="rounded-xl border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-xs font-black uppercase text-amber-100 transition hover:bg-amber-500/20"
                  >
                    Hold
                  </button>
                )}
                <button
                  onClick={handleCompleteWorkflow}
                  className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-xs font-black uppercase text-emerald-100 transition hover:bg-emerald-500/20"
                >
                  Complete
                </button>
              </div>
            </div>

            {editingTodo && (
              <div
                ref={editorRef}
                data-testid="workflow-todo-editor"
                style={
                  editorPosition
                    ? { left: editorPosition.left, top: editorPosition.top }
                    : { right: 20, top: 354 }
                }
                className="absolute z-40 w-80 rounded-2xl border border-sky-300/25 bg-[#111923]/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.4)] backdrop-blur"
              >
                <div
                  data-testid="workflow-todo-editor-drag-handle"
                  onPointerDown={handleEditorDragStart}
                  onPointerMove={handleEditorDragMove}
                  onPointerUp={handleEditorDragEnd}
                  onPointerCancel={handleEditorDragEnd}
                  className="mb-3 flex cursor-grab select-none items-center justify-between gap-3 active:cursor-grabbing"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-200">
                    Workflow todo
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
                      data-testid="workflow-todo-editor-title"
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      className="rounded-xl border border-sky-300/20 bg-[#0b1118] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-sky-50 outline-none focus:border-sky-300/60"
                    />
                  </label>

                  <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-sky-100/55">
                    Description
                    <textarea
                      data-testid="workflow-todo-editor-description"
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      rows={3}
                      className="resize-none rounded-xl border border-sky-300/20 bg-[#0b1118] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-sky-50 outline-none focus:border-sky-300/60"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-sky-100/55">
                      Priority
                      <select
                        data-testid="workflow-todo-editor-priority"
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
                        data-testid="workflow-todo-editor-heaviness"
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
                      data-testid="workflow-todo-editor-dependency"
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
                      data-testid="workflow-todo-editor-save"
                      onClick={handleSaveEditedTodo}
                      className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-300 px-4 py-2 text-xs font-black uppercase text-slate-950 transition hover:brightness-110"
                    >
                      Save changes
                    </button>
                    <button
                      data-testid="workflow-todo-editor-delete"
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
                      id="workflowDependencyLine"
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
                      id="workflowDependencyArrow"
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
                      stroke="url(#workflowDependencyLine)"
                      strokeWidth="2"
                      strokeDasharray="6 8"
                      markerEnd="url(#workflowDependencyArrow)"
                    />
                  ))}
                </svg>

                {todos.map((todo) => (
                  <WorkflowBubble
                    key={todo.id}
                    todo={todo}
                    isDragging={dragState?.todoId === todo.id}
                    isBlocked={isTodoBlocked(todo, todos)}
                    onStartDrag={handleStartDrag}
                    onCycleStatus={handleCycleStatus}
                    onEditTodo={openTodoEditor}
                  />
                ))}

                {todos.length === 0 && (
                  <div className="absolute inset-0 grid place-items-center text-center">
                    <div>
                      <p className="text-lg font-black text-neutral-200">
                        Empty workflow space
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        Add a workflow bubble to begin the session.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-6 left-6 z-30 w-72 rounded-2xl border border-sky-300/20 bg-[#10161d]/92 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-200">
                Workflow report
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
                <div className="rounded-xl border border-fuchsia-300/15 bg-fuchsia-500/10 p-2">
                  <p className="text-base font-black text-fuchsia-200">
                    {heavyOpenTodos.length}
                  </p>
                  <p className="text-[9px] font-bold uppercase text-fuchsia-100/50">
                    Heavy
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
                {activeTodo
                  ? `Active: ${activeTodo.title}`
                  : "No active bubble selected"}
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
                  Taskomon
                </p>
                <p className="mt-1 max-w-xs text-sm font-bold leading-snug text-orange-50">
                  {taskomonThought}
                </p>
              </div>
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl border border-orange-300/30 bg-orange-500/10 shadow-[0_0_40px_rgba(249,115,22,0.24)]">
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

export default WorkflowWorkspacePage;
