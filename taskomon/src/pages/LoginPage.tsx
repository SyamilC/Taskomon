import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import lookupAdviceImage from "../assets/taskomon/Taskomon-LookupAdvice.png";
import { loginLocal, startGuestSession } from "../services/authService";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      loginLocal(email, password);
      navigate("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    }
  }

  function handleGuestMode() {
    startGuestSession();
    navigate("/guest");
  }

  return (
    <main className="h-screen overflow-hidden bg-[#100c0b] text-neutral-100 antialiased">
      <style>
        {`
          .auth-grid {
            background-image:
              linear-gradient(rgba(249, 115, 22, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249, 115, 22, 0.08) 1px, transparent 1px),
              radial-gradient(circle at 46% 20%, rgba(249, 115, 22, 0.16), transparent 34%),
              radial-gradient(circle at 18% 82%, rgba(244, 63, 94, 0.10), transparent 36%),
              radial-gradient(circle at 82% 72%, rgba(251, 191, 36, 0.08), transparent 32%);
            background-size: 58px 58px, 58px 58px, 100% 100%, 100% 100%, 100% 100%;
          }
          .clip-auth {
            clip-path: polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 0 100%);
          }
          @keyframes authGlow {
            0%, 100% { box-shadow: 0 0 22px rgba(251, 191, 36, 0.22); }
            50% { box-shadow: 0 0 42px rgba(249, 115, 22, 0.34); }
          }
          .auth-glow {
            animation: authGlow 2.8s ease-in-out infinite;
          }
        `}
      </style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(220,38,38,0.10),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(251,191,36,0.07),transparent_26%),radial-gradient(circle_at_55%_72%,rgba(249,115,22,0.06),transparent_38%)]" />

      <section className="relative z-10 grid h-screen grid-rows-[74px_1fr] overflow-hidden">
        <header className="border-b border-orange-950/60 bg-gradient-to-r from-[#40160f] via-[#3a1d10] to-[#2b2011] px-6 py-3 md:px-8">
          <div className="flex h-full items-center justify-between gap-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
                Taskomon
              </p>
              <h1 className="mt-0.5 text-lg font-black tracking-tight text-white">
                Login
              </h1>
            </div>

            <Link
              to="/dashboard"
              className="rounded-xl border border-orange-300/25 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase text-orange-100 transition hover:bg-orange-500/20"
            >
              Back
            </Link>
          </div>
        </header>

        <div className="min-h-0 overflow-hidden p-4 md:p-8">
          <section className="auth-grid relative isolate h-full overflow-hidden rounded-2xl border border-orange-950/45 bg-[#140f0e] shadow-[0_22px_80px_rgba(0,0,0,0.38)]">
            <div className="pointer-events-none absolute left-1/2 top-28 h-64 w-64 -translate-x-1/2 rounded-full bg-orange-400/10 blur-3xl" />
            <div className="auth-glow pointer-events-none absolute left-1/2 top-24 h-3 w-3 -translate-x-1/2 rounded-full bg-amber-200" />
            <div className="pointer-events-none absolute left-1/2 top-28 h-[38%] w-px -translate-x-1/2 bg-gradient-to-b from-amber-200/60 via-orange-400/28 to-transparent" />

            <form
              onSubmit={handleSubmit}
              className="clip-auth absolute left-1/2 top-8 z-30 w-[min(520px,calc(100%-40px))] -translate-x-1/2 border border-orange-300/24 bg-[#15100f]/95 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.36)] backdrop-blur"
            >
              <h2 className="mt-1 text-2xl font-black tracking-tight text-orange-400">
                Taskomon
              </h2>
              <p className="mt-1 text-sm font-semibold text-orange-50/55">
                Sign in to return to your workflow.
              </p>

              <div className="mt-5 grid gap-3">
                <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-orange-100/55">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="rounded-xl border border-orange-300/20 bg-[#0f0a09] px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-orange-50 outline-none placeholder:text-orange-100/25 focus:border-orange-300/60"
                  />
                </label>

                <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-orange-100/55">
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    className="rounded-xl border border-orange-300/20 bg-[#0f0a09] px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-orange-50 outline-none placeholder:text-orange-100/25 focus:border-orange-300/60"
                  />
                </label>
              </div>


              <button
                type="submit"
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 text-xs font-black uppercase text-white transition hover:brightness-110"
              >
                Login
              </button>

              <button
                type="button"
                onClick={handleGuestMode}
                className="mt-2 w-full rounded-xl border border-orange-300/20 bg-orange-500/10 px-4 py-3 text-xs font-black uppercase text-orange-100 transition hover:bg-orange-500/20"
              >
                Continue as Guest
              </button>

              {message && (
                <p className="mt-3 rounded-xl border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100">
                  {message}
                </p>
              )}

              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-orange-100/55">
                <span>New here?</span>
                <Link
                  to="/register"
                  className="font-black uppercase text-emerald-200/80 transition hover:text-emerald-100"
                >
                  Register
                </Link>
              </div>
            </form>

            <img
              src={lookupAdviceImage}
              alt="Taskomon looking at the login form"
              className="absolute bottom-[-35%] left-1/2 z-10 h-[68%] min-h-[340px] max-h-[640px] -translate-x-1/2 object-contain object-bottom drop-shadow-[0_24px_58px_rgba(0,0,0,0.48)]"
            />

            <div className="pointer-events-none absolute bottom-5 left-5 z-20 hidden max-w-[300px] rounded-2xl border border-orange-300/22 bg-gradient-to-br from-[#3b180f]/92 via-[#28130e]/92 to-[#1b100d]/92 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur sm:block">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                Taskomon
              </p>
              <p className="mt-1 text-sm font-bold leading-snug text-orange-50">
                I will keep the board warm while you sign in.
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
