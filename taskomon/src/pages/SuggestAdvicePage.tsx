import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import adviceImage from "../assets/taskomon/Taskomon-Advice.png";
import thinkingIcon from "../assets/taskomon/Taskomon-Icon-Thinking.png";
import { DEMO_USER_ID } from "../data/demoData";
import { generateAdviceTodos } from "../services/adviceService";
import { appendBehaviourEvent } from "../services/behaviourService";
import type { AdviceResponse, SuggestedTodo } from "../types";

type AdviceTarget = "workflow" | "habit";

function getRouteState(value: unknown) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as {
    query?: string;
    targetType?: AdviceTarget;
  };
}

const PRIORITY_STYLE: Record<
  SuggestedTodo["priority"],
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
  SuggestedTodo["heaviness"],
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

function getAdviceBubbleDimensions(todo: SuggestedTodo) {
  const titleBoost = Math.max(0, todo.title.trim().length - 14) * 5.5;

  return {
    width: clamp(
      140 + PRIORITY_STYLE[todo.priority].widthBoost + titleBoost,
      136,
      282
    ),
    height: clamp(
      124 +
        PRIORITY_STYLE[todo.priority].heightBoost +
        HEAVINESS_STYLE[todo.heaviness].heightBoost,
      118,
      164
    ),
  };
}

function AdviceBubble({
  todo,
  index,
}: {
  todo: SuggestedTodo;
  index: number;
}) {
  const priorityStyle = PRIORITY_STYLE[todo.priority];
  const heavinessStyle = HEAVINESS_STYLE[todo.heaviness];
  const dimensions = getAdviceBubbleDimensions(todo);

  return (
    <article
      data-testid="advice-bubble"
      className={[
        "advice-float relative mx-auto select-none overflow-hidden rounded-full border border-emerald-200/30 bg-[#0f3a2b]/90 p-4 text-center",
        priorityStyle.halo,
        heavinessStyle.ring,
      ].join(" ")}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        animationDelay: `${index * 160}ms`,
      }}
    >
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
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-300/18 blur-2xl" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center">
        <p className="line-clamp-3 text-[11px] font-black leading-tight text-neutral-50 [overflow-wrap:anywhere]">
          {todo.title}
        </p>
        <p className="mt-1 line-clamp-2 text-[10px] font-bold text-emerald-50/62 [overflow-wrap:anywhere]">
          {todo.description}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-1">
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
        </div>
      </div>
    </article>
  );
}

function SuggestAdvicePage() {
  const location = useLocation();
  const routeState = getRouteState(location.state);
  const query =
    routeState.query ??
    sessionStorage.getItem("taskomon:advice-query") ??
    "How to gain weight safely";
  const targetType =
    routeState.targetType ??
    (sessionStorage.getItem("taskomon:advice-target") as AdviceTarget | null) ??
    "habit";
  const [advice, setAdvice] = useState<AdviceResponse | null>(null);
  const [shellMessage, setShellMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const timeoutId = window.setTimeout(() => {
      generateAdviceTodos(query, targetType).then((response) => {
        if (!cancelled) {
          setAdvice(response);
        }
      });
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [query, targetType]);

  const suggestedTodos = useMemo(() => {
    if (!advice) return [];

    return [
      ...advice.suggestedTodos,
      {
        id: "mock-checkpoint",
        title: "Make a weekly checkpoint",
        description: "Review the plan and adjust the next bubbles.",
        priority: "medium" as const,
        heaviness: "light" as const,
        dueMode: targetType === "habit" ? ("anytime" as const) : undefined,
        reasoning: "Reflection keeps advice from becoming stale.",
      },
    ];
  }, [advice, targetType]);

  const primaryAction =
    targetType === "habit" ? "Make Workspace" : "Make Workspace";
  const actionHint =
    targetType === "habit"
      ? "Ready to shape these into a habit."
      : "Ready to shape these into a workflow.";

  function handleUseSuggestion() {
    appendBehaviourEvent({
      userId: DEMO_USER_ID,
      type: "suggestion_added",
      metadata: {
        note: `${targetType}: ${query} (${suggestedTodos.length} suggested bubbles)`,
      },
    });
    setShellMessage(`${primaryAction} selected.`);
  }

  return (
    <main className="h-screen overflow-hidden bg-[#100c0b] text-neutral-100 antialiased">
      <style>
        {`
          .advice-stage-grid {
            background-image:
              linear-gradient(rgba(249, 115, 22, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249, 115, 22, 0.08) 1px, transparent 1px),
              radial-gradient(circle at 24% 68%, rgba(249, 115, 22, 0.18), transparent 32%),
              radial-gradient(circle at 78% 30%, rgba(16, 185, 129, 0.12), transparent 34%),
              radial-gradient(circle at 84% 78%, rgba(251, 191, 36, 0.08), transparent 32%);
            background-size: 58px 58px, 58px 58px, 100% 100%, 100% 100%, 100% 100%;
          }
          @keyframes floatAdvice {
            0%, 100% { translate: 0 0; }
            50% { translate: 0 -5px; }
          }
          .advice-float {
            animation: floatAdvice 3.8s ease-in-out infinite;
          }
        `}
      </style>

      {!advice ? (
        <section className="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_25%,rgba(249,115,22,0.12),transparent_32%)] text-center">
          <div className="rounded-2xl border border-orange-300/25 bg-[#15100f]/95 p-7 shadow-[0_28px_90px_rgba(0,0,0,0.48)]">
            <img
              src={thinkingIcon}
              alt="Taskomon thinking"
              className="mx-auto h-28 w-28 object-contain"
            />
            <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-amber-300">
              Taskomon is thinking
            </p>
            <p className="mt-2 max-w-sm text-sm font-semibold text-orange-50/70">
              Turning "{query}" into suggested bubbles.
            </p>
          </div>
        </section>
      ) : (
        <section className="grid h-screen grid-rows-[74px_1fr] overflow-hidden">
          <header className="border-b border-orange-950/60 bg-gradient-to-r from-[#40160f] via-[#3a1d10] to-[#2b2011] px-6 py-3 md:px-8">
            <div className="flex h-full items-center justify-between gap-5">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
                  Taskomon answered
                </p>
                <h1 className="truncate text-lg font-black tracking-tight text-white">
                  Suggested todo bubbles
                </h1>
              </div>

              <Link
                to="/dashboard"
                className="rounded-xl border border-orange-300/25 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase text-orange-100 transition hover:bg-orange-500/20"
              >
                Cancel
              </Link>
            </div>
          </header>

          <div className="min-h-0 overflow-hidden p-4 md:p-8">
            <section
              data-testid="advice-workspace"
              className="advice-stage-grid relative isolate h-full overflow-hidden rounded-2xl border border-orange-950/45 bg-[#140f0e] shadow-[0_22px_80px_rgba(0,0,0,0.38)]"
            >
              <div className="absolute left-5 top-5 z-30 w-[min(500px,calc(100%-40px))] rounded-2xl border border-orange-300/22 bg-[#15100f]/94 p-4 shadow-[0_16px_52px_rgba(0,0,0,0.32)] backdrop-blur lg:left-6 lg:top-6">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">
                  You asked
                </p>
                <p className="mt-1 line-clamp-2 text-lg font-black leading-tight text-white [overflow-wrap:anywhere]">
                  {query}
                </p>
                <p className="mt-2 line-clamp-2 text-xs font-semibold leading-relaxed text-orange-50/55">
                  {advice.summary}
                </p>
              </div>

              <div className="pointer-events-none absolute bottom-0 left-0 z-20 hidden h-[78%] w-[42%] min-w-[320px] sm:block">
                <img
                  data-testid="taskomon-advice-image"
                  src={adviceImage}
                  alt="Taskomon giving advice"
                  className="h-full w-full object-contain object-left-bottom drop-shadow-[0_24px_58px_rgba(0,0,0,0.48)]"
                />
              </div>

              <div className="absolute bottom-28 left-4 right-4 top-44 z-20 lg:bottom-24 lg:left-[45%] lg:right-6 lg:top-[118px]">
                <div className="grid h-full grid-cols-2 content-center items-center gap-4 overflow-hidden">
                  {suggestedTodos.map((todo, index) => (
                    <AdviceBubble key={todo.id} todo={todo} index={index} />
                  ))}
                </div>
              </div>

              <div className="absolute bottom-5 left-5 right-5 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-950/50 bg-[#15100f]/94 p-3 shadow-[0_16px_52px_rgba(0,0,0,0.32)] backdrop-blur lg:left-[45%] lg:right-6">
                <p className="text-xs font-semibold text-orange-50/55">
                  {actionHint}
                </p>

                <div className="flex shrink-0 gap-2">
                  <Link
                    to="/advice"
                    className="rounded-xl border border-orange-300/20 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase text-orange-100/70 transition hover:bg-orange-500/20"
                  >
                    Back
                  </Link>
                  <button
                    onClick={handleUseSuggestion}
                    className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-xs font-black uppercase text-white transition hover:brightness-110"
                  >
                    {primaryAction}
                  </button>
                </div>
              </div>

              {shellMessage && (
                <div className="absolute right-6 top-6 z-40 rounded-2xl border border-emerald-300/25 bg-emerald-500/12 px-4 py-3 text-sm font-black text-emerald-100 shadow-[0_18px_60px_rgba(0,0,0,0.36)]">
                  {shellMessage}
                </div>
              )}
            </section>
          </div>
        </section>
      )}
    </main>
  );
}

export default SuggestAdvicePage;
