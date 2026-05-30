import { Link, Navigate } from "react-router-dom";
import taskomonImage from "../assets/taskomon/taskomon.png";
import { loadFromStorage, saveToStorage } from "../services/storageServices";
import { getCurrentSession } from "../services/authService";
import {
  applyHabitAutoReset,
  getHabitTodoStorageKey,
  getSeedTodosForWorkspace,
  getStoredHabits,
} from "../services/workspaceStorage";
import type { Habit, Todo } from "../types";
import NavBar from "./NavBar";

function getInitialHabitTodos(habitId: string) {
  return getSeedTodosForWorkspace(habitId, "habit");
}

function getHabitTodos(habit: Habit) {
  const storageKey = getHabitTodoStorageKey(habit.id);
  const storedTodos = loadFromStorage<Todo[]>(
    storageKey,
    getInitialHabitTodos(habit.id)
  );
  const resetTodos = applyHabitAutoReset(habit, storedTodos);

  if (resetTodos !== storedTodos) {
    saveToStorage(storageKey, resetTodos);
  }

  return resetTodos;
}

function getProgress(todos: Todo[]) {
  if (todos.length === 0) return 0;

  return Math.round(
    (todos.filter((todo) => todo.status === "done").length / todos.length) * 100
  );
}

function getHabitLabel(habit: Habit) {
  if (habit.mode === "one_time") return "One time";
  return `${habit.resetFrequency} reset`;
}

function ViewAllHabitPage() {
  const session = getCurrentSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.mode === "guest") {
    return <Navigate to="/guest" replace />;
  }

  const habits = getStoredHabits();
  const summaries = habits.map((habit) => {
    const todos = getHabitTodos(habit);

    return {
      habit,
      todos,
      progress: getProgress(todos),
      completed: todos.filter((todo) => todo.status === "done").length,
    };
  });

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
        `}
      </style>

      <div className="grid h-screen grid-cols-[230px_1fr]">
        <aside className="relative flex h-screen flex-col justify-between border-r border-orange-950/60 bg-gradient-to-b from-[#21110e] via-[#17100f] to-[#100c0b] p-4 pt-0">
          <div>
            <div className="absolute left-0 top-0 h-14 w-full">
              <div className="clip-title absolute inset-0 bg-gradient-to-r from-red-600 via-orange-500 to-amber-300" />
              <div className="clip-title absolute inset-[0_0_2px_0] flex items-center bg-[#3a1710] pl-5">
                <h1 className="text-sm font-black uppercase tracking-widest text-white">
                  Habits
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
                <p className="text-sm font-bold text-orange-50">Syamil</p>
                <p className="text-[11px] text-amber-300/80">Habit archive</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="grid h-screen grid-rows-[76px_1fr] overflow-hidden">
          <header className="border-b border-orange-950/60 bg-gradient-to-r from-[#40160f] via-[#3a1d10] to-[#2b2011] px-8 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
              View all
            </p>
            <h2 className="mt-0.5 text-lg font-black tracking-tight text-white">
              Habit Workspaces
            </h2>
          </header>

          <div className="overflow-y-auto bg-[#140f0e] p-8">
            <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-3">
              {summaries.map((summary) => (
                <article
                  key={summary.habit.id}
                  className="rounded-2xl border border-orange-950/50 bg-[#15100f] p-4 shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-neutral-50">
                        {summary.habit.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-orange-100/45">
                        {summary.habit.description || "No description"}
                      </p>
                    </div>
                    <span className="rounded-full border border-orange-300/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-orange-200">
                      {summary.habit.status === "archived" ? "Archived" : "Active"}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-orange-950/40 pt-3">
                    <p className="text-[11px] font-black uppercase tracking-wide text-orange-100/30">
                      {getHabitLabel(summary.habit)}
                    </p>
                    <p className="text-xs font-black text-orange-100">
                      {summary.completed}/{summary.todos.length} clear
                    </p>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#321b13]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-500 via-orange-400 to-amber-200"
                      style={{ width: `${summary.progress}%` }}
                    />
                  </div>

                  {summary.habit.status !== "archived" && (
                    <Link
                      to={`/habit/${summary.habit.id}`}
                      className="mt-4 block rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-3 py-2 text-center text-[10px] font-black uppercase text-white transition hover:brightness-110"
                    >
                      Open habit
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ViewAllHabitPage;
