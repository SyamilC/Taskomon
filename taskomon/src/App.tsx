import { demoHabits, demoTodos, demoWorkflows } from "./data/demoData";

function App() {
  return (
    <main className="min-h-screen p-6">
      <section className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-black tracking-tight">Taskomon</h1>
        <p className="mt-2 text-lg text-stone-600">
          A cute productivity companion that watches your workflow and helps you stay steady.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-orange-100">
            <h2 className="text-2xl font-bold">Workflows</h2>
            {demoWorkflows.map((workflow) => (
              <div key={workflow.id} className="mt-4 rounded-2xl bg-orange-50 p-4">
                <h3 className="font-bold">{workflow.title}</h3>
                <p className="text-sm text-stone-600">{workflow.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm border border-orange-100">
            <h2 className="text-2xl font-bold">Habits</h2>
            {demoHabits.map((habit) => (
              <div key={habit.id} className="mt-4 rounded-2xl bg-yellow-50 p-4">
                <h3 className="font-bold">{habit.title}</h3>
                <p className="text-sm text-stone-600">{habit.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm border border-orange-100">
          <h2 className="text-2xl font-bold">Todo Bubbles</h2>

          <div className="mt-5 flex flex-wrap gap-4">
            {demoTodos.map((todo) => (
              <div
                key={todo.id}
                className="min-h-32 w-40 rounded-full bg-orange-100 border-4 border-orange-300 p-5 text-center flex flex-col justify-center shadow-sm"
              >
                <p className="font-bold text-sm">{todo.title}</p>
                <p className="mt-2 text-xs">{todo.status}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;