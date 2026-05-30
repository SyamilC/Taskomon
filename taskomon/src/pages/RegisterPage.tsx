import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import happyTaskomonImage from "../assets/taskomon/Taskomon-Icon-Happy.png";

function RegisterPage() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <main className="h-screen overflow-hidden bg-[#100c0b] text-neutral-100 antialiased">
      <style>
        {`
          .auth-grid {
            background-image:
              linear-gradient(rgba(249, 115, 22, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249, 115, 22, 0.08) 1px, transparent 1px),
              radial-gradient(circle at 28% 22%, rgba(249, 115, 22, 0.16), transparent 34%),
              radial-gradient(circle at 72% 32%, rgba(16, 185, 129, 0.12), transparent 34%),
              radial-gradient(circle at 84% 78%, rgba(251, 191, 36, 0.08), transparent 32%);
            background-size: 58px 58px, 58px 58px, 100% 100%, 100% 100%, 100% 100%;
          }
          .clip-auth {
            clip-path: polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 0 100%);
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
                Register
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
            <div className="pointer-events-none absolute bottom-0 right-0 hidden h-[78%] w-[42%] min-w-[320px] sm:block">
              <img
                src={happyTaskomonImage}
                alt="Happy Taskomon"
                className="h-full w-full object-contain object-right-bottom drop-shadow-[0_24px_58px_rgba(0,0,0,0.48)]"
              />
            </div>

            <form
              onSubmit={handleSubmit}
              className="clip-auth absolute left-1/2 top-1/2 z-30 w-[min(560px,calc(100%-40px))] -translate-x-1/2 -translate-y-1/2 border border-orange-300/24 bg-[#15100f]/95 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.36)] backdrop-blur md:left-[42%]"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">
                Start fresh
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-white">
                Create your Taskomon account
              </h2>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-orange-100/55">
                  Name
                  <input
                    placeholder="Syamil"
                    className="rounded-xl border border-orange-300/20 bg-[#0f0a09] px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-orange-50 outline-none placeholder:text-orange-100/25 focus:border-orange-300/60"
                  />
                </label>

                <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-orange-100/55">
                  Email
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="rounded-xl border border-orange-300/20 bg-[#0f0a09] px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-orange-50 outline-none placeholder:text-orange-100/25 focus:border-orange-300/60"
                  />
                </label>

                <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-orange-100/55">
                  Password
                  <input
                    type="password"
                    placeholder="Password"
                    className="rounded-xl border border-orange-300/20 bg-[#0f0a09] px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-orange-50 outline-none placeholder:text-orange-100/25 focus:border-orange-300/60"
                  />
                </label>

                <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-orange-100/55">
                  Confirm
                  <input
                    type="password"
                    placeholder="Password again"
                    className="rounded-xl border border-orange-300/20 bg-[#0f0a09] px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-orange-50 outline-none placeholder:text-orange-100/25 focus:border-orange-300/60"
                  />
                </label>
              </div>

              <label className="mt-4 flex items-start gap-2 text-xs font-bold leading-relaxed text-orange-100/60">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-orange-300/30 bg-[#0f0a09] accent-orange-500"
                />
                Keep me signed in on this device.
              </label>

              <button
                type="submit"
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 text-xs font-black uppercase text-white transition hover:brightness-110"
              >
                Register
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-orange-100/55">
                <span>Already have one?</span>
                <Link
                  to="/login"
                  className="font-black uppercase text-sky-200/80 transition hover:text-sky-100"
                >
                  Login
                </Link>
              </div>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}

export default RegisterPage;
