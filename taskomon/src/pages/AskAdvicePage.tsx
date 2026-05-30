import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import lookupAdviceImage from "../assets/taskomon/Taskomon-LookupAdvice.png";
import thinkingIcon from "../assets/taskomon/Taskomon-Icon-Thinking.png";
import { DEMO_USER_ID } from "../data/demoData";
import { getCurrentSession } from "../services/authService";
import { appendBehaviourEvent } from "../services/behaviourService";

type AdviceTarget = "workflow" | "habit";

const ADVICE_TARGETS = ["habit", "workflow"] as const;

const EXAMPLE_PROMPTS = [
  "How to gain weight safely",
  "How to prepare for exams",
  "How to build a water habit",
];

function AskAdvicePage() {
  const session = getCurrentSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.mode === "guest") {
    return <Navigate to="/guest" replace />;
  }

  return <AskAdviceContent />;
}

function AskAdviceContent() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [targetType, setTargetType] = useState<AdviceTarget>("habit");
  const [isThinking, setIsThinking] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim() || EXAMPLE_PROMPTS[0];

    setIsThinking(true);
    sessionStorage.setItem("taskomon:advice-query", trimmedQuery);
    sessionStorage.setItem("taskomon:advice-target", targetType);
    appendBehaviourEvent({
      userId: DEMO_USER_ID,
      type: "advice_requested",
      metadata: {
        note: `${targetType}: ${trimmedQuery}`,
      },
    });

    window.setTimeout(() => {
      navigate("/advice/suggest", {
        state: {
          query: trimmedQuery,
          targetType,
        },
      });
    }, 850);
  }

  return (
    <main className="h-screen overflow-hidden bg-[#100c0b] text-neutral-100 antialiased">
      <style>
        {`
          .advice-stage-grid {
            background-image:
              linear-gradient(rgba(249, 115, 22, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249, 115, 22, 0.08) 1px, transparent 1px),
              radial-gradient(circle at 50% 22%, rgba(249, 115, 22, 0.16), transparent 34%),
              radial-gradient(circle at 18% 82%, rgba(244, 63, 94, 0.10), transparent 36%),
              radial-gradient(circle at 82% 78%, rgba(251, 191, 36, 0.08), transparent 32%);
            background-size: 58px 58px, 58px 58px, 100% 100%, 100% 100%, 100% 100%;
          }
          @keyframes thinkPulse {
            0%, 100% { transform: translateY(0) scale(1); opacity: 0.86; }
            50% { transform: translateY(-6px) scale(1.02); opacity: 1; }
          }
          @keyframes questionGlow {
            0%, 100% { box-shadow: 0 0 22px rgba(251, 191, 36, 0.22); }
            50% { box-shadow: 0 0 42px rgba(249, 115, 22, 0.34); }
          }
          .think-pulse {
            animation: thinkPulse 1.1s ease-in-out infinite;
          }
          .question-glow {
            animation: questionGlow 2.8s ease-in-out infinite;
          }
        `}
      </style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(220,38,38,0.10),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(251,191,36,0.07),transparent_26%),radial-gradient(circle_at_55%_72%,rgba(249,115,22,0.06),transparent_38%)]" />

      <section className="relative z-10 grid h-screen grid-rows-[74px_1fr] overflow-hidden">
        <header className="border-b border-orange-950/60 bg-gradient-to-r from-[#40160f] via-[#3a1d10] to-[#2b2011] px-6 py-3 md:px-8">
          <div className="flex h-full items-center justify-between gap-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
                Advice agent
              </p>
              <h1 className="mt-0.5 text-lg font-black tracking-tight text-white">
                Ask Taskomon
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
            data-testid="ask-advice-stage"
            className="advice-stage-grid relative isolate h-full overflow-hidden rounded-2xl border border-orange-950/45 bg-[#140f0e] shadow-[0_22px_80px_rgba(0,0,0,0.38)]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-[120px] z-0 mx-auto h-64 w-64 rounded-full bg-orange-400/10 blur-3xl" />
            <div className="pointer-events-none absolute left-1/2 top-[132px] z-0 h-[38%] w-px -translate-x-1/2 bg-gradient-to-b from-amber-200/60 via-orange-400/28 to-transparent" />
            <div className="question-glow pointer-events-none absolute left-1/2 top-[116px] z-0 h-3 w-3 -translate-x-1/2 rounded-full bg-amber-200" />

            <form
              onSubmit={handleSubmit}
              className="absolute left-1/2 top-5 z-30 w-[min(820px,calc(100%-40px))] -translate-x-1/2 rounded-2xl border border-orange-300/24 bg-[#15100f]/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.36)] backdrop-blur"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">
                    Question
                  </p>
                  <h2 className="mt-0.5 text-base font-black text-white">
                    What do you want to do?
                  </h2>
                </div>

                <div className="flex rounded-xl border border-orange-300/20 bg-[#0d0908] p-1">
                  {ADVICE_TARGETS.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTargetType(type)}
                      className={[
                        "rounded-lg px-3 py-1.5 text-[10px] font-black uppercase transition",
                        targetType === type
                          ? "bg-orange-400/20 text-orange-50"
                          : "text-orange-100/45 hover:text-orange-50",
                      ].join(" ")}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <label className="mt-3 flex h-12 items-center rounded-xl border border-orange-300/22 bg-[#0b0807] shadow-inner focus-within:border-orange-300/60">
                <span className="grid h-full w-12 shrink-0 place-items-center border-r border-orange-300/12 text-sm font-black text-amber-300">
                  ?
                </span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="How to..."
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm font-bold text-orange-50 outline-none placeholder:text-orange-100/25"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isThinking}
                  className="mr-1 rounded-lg bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-[10px] font-black uppercase text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
                >
                  {isThinking ? "Thinking" : "Ask"}
                </button>
              </label>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setQuery(prompt)}
                    className="rounded-lg border border-sky-300/15 bg-sky-500/10 px-3 py-1.5 text-[10px] font-bold text-sky-100/65 transition hover:border-sky-300/35 hover:text-sky-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </form>

            <div className="pointer-events-none absolute bottom-5 left-5 z-20 hidden max-w-[300px] rounded-2xl border border-orange-300/22 bg-gradient-to-br from-[#3b180f]/92 via-[#28130e]/92 to-[#1b100d]/92 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur sm:block">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                Taskomon
              </p>
              <p className="mt-1 text-sm font-bold leading-snug text-orange-50">
                Ask it cleanly. I will turn the answer into bubbles.
              </p>
            </div>

            <img
              data-testid="lookup-taskomon"
              src={lookupAdviceImage}
              alt="Taskomon looking at the question"
              className="absolute bottom-[-5%] left-1/2 z-10 h-[68%] min-h-[340px] max-h-[640px] -translate-x-1/2 object-contain object-bottom drop-shadow-[0_24px_58px_rgba(0,0,0,0.48)]"
            />

            {isThinking && (
              <div className="absolute inset-0 z-40 grid place-items-center bg-[#0f0a09]/78 backdrop-blur-sm">
                <div className="think-pulse rounded-2xl border border-orange-300/25 bg-[#15100f]/95 p-5 text-center shadow-[0_24px_80px_rgba(0,0,0,0.48)]">
                  <img
                    src={thinkingIcon}
                    alt="Taskomon thinking"
                    className="mx-auto h-20 w-20 object-contain"
                  />
                  <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                    Taskomon is thinking
                  </p>
                  <p className="mt-1 text-xs font-semibold text-orange-50/60">
                    Making bubbles from the question.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

export default AskAdvicePage;
