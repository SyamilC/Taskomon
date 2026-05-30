import type { AdvicePlan, SearchBundle, SuggestedTodo } from "../types";

type AdviceTarget = "workflow" | "habit";

interface GenerateAdvicePlanInput {
  query: string;
  targetType: AdviceTarget;
  searchBundle: SearchBundle;
}

function createSuggestedTodo(
  todo: Omit<SuggestedTodo, "id">
): SuggestedTodo {
  return {
    id: crypto.randomUUID(),
    ...todo,
  };
}

function withHabitDueMode(
  targetType: AdviceTarget,
  todo: Omit<SuggestedTodo, "id">
): Omit<SuggestedTodo, "id"> {
  if (targetType === "workflow") return todo;

  return {
    ...todo,
    dueMode: todo.dueMode ?? "anytime",
  };
}

function getGainWeightTodos(targetType: AdviceTarget) {
  const habitTodos: Array<Omit<SuggestedTodo, "id">> = [
    {
      title: "Eat one extra balanced meal",
      description: "Add a repeatable meal with protein, carbs, and healthy fats.",
      priority: "high",
      heaviness: "medium",
      dueMode: "by_time",
      reasoning: "A controlled calorie surplus is easier when the extra meal is planned.",
    },
    {
      title: "Track daily calories",
      description: "Write down meals and estimate intake once per day.",
      priority: "medium",
      heaviness: "light",
      dueMode: "anytime",
      reasoning: "Tracking helps confirm whether the surplus is actually happening.",
    },
    {
      title: "Add strength training session",
      description: "Schedule a simple progressive strength workout.",
      priority: "high",
      heaviness: "heavy",
      dueMode: "anytime",
      reasoning: "Strength training helps direct weight gain toward muscle growth.",
    },
    {
      title: "Prepare calorie-dense snacks",
      description: "Keep easy snacks ready, such as nuts, yogurt, or smoothies.",
      priority: "medium",
      heaviness: "light",
      dueMode: "anytime",
      reasoning: "Prepared snacks reduce friction on low-appetite days.",
    },
    {
      title: "Review progress weekly",
      description: "Check weight trend, energy, appetite, and workout consistency.",
      priority: "medium",
      heaviness: "light",
      dueMode: "anytime",
      reasoning: "Weekly review keeps the plan gradual and adjustable.",
    },
  ];
  const workflowTodos: Array<Omit<SuggestedTodo, "id">> = [
    {
      title: "Research safe weight gain basics",
      description: "Collect beginner guidance on calorie surplus and balanced meals.",
      priority: "high",
      heaviness: "light",
      reasoning: "Research gives the workflow a safer starting point.",
    },
    {
      title: "Plan meal schedule",
      description: "Choose meal times and where the extra calories fit.",
      priority: "high",
      heaviness: "medium",
      reasoning: "A schedule turns broad advice into repeatable actions.",
    },
    {
      title: "Create grocery list",
      description: "List protein, carb, fat, and snack options for the week.",
      priority: "medium",
      heaviness: "light",
      reasoning: "The plan is easier to follow when food is already available.",
    },
    {
      title: "Set workout routine",
      description: "Choose strength sessions and exercises for the first week.",
      priority: "high",
      heaviness: "heavy",
      reasoning: "Training supports healthy progress alongside extra food.",
    },
    {
      title: "Review plan after one week",
      description: "Compare planned meals, workouts, and actual follow-through.",
      priority: "medium",
      heaviness: "light",
      reasoning: "A checkpoint prevents the plan from becoming stale.",
    },
  ];

  return targetType === "habit" ? habitTodos : workflowTodos;
}

function getWaterTodos(targetType: AdviceTarget) {
  const habitTodos: Array<Omit<SuggestedTodo, "id">> = [
    {
      title: "Drink water after waking",
      description: "Start the day with one glass or bottle refill.",
      priority: "high",
      heaviness: "light",
      dueMode: "at_time",
      reasoning: "A morning anchor makes the habit easier to remember.",
    },
    {
      title: "Refill bottle before work",
      description: "Make water visible before a long focused block.",
      priority: "medium",
      heaviness: "light",
      dueMode: "by_time",
      reasoning: "Visible cues reduce missed hydration moments.",
    },
    {
      title: "Pair water with meals",
      description: "Drink water before or during meals.",
      priority: "medium",
      heaviness: "light",
      dueMode: "anytime",
      reasoning: "Habit stacking links water to routines that already happen.",
    },
    {
      title: "Evening hydration check",
      description: "Review intake and prepare tomorrow's bottle.",
      priority: "low",
      heaviness: "light",
      dueMode: "by_time",
      reasoning: "A small evening check keeps the habit visible.",
    },
  ];
  const workflowTodos: Array<Omit<SuggestedTodo, "id">> = [
    {
      title: "Choose daily water target",
      description: "Pick a realistic target and tracking unit.",
      priority: "high",
      heaviness: "light",
      reasoning: "The workflow needs a clear definition of success.",
    },
    {
      title: "Place reminders around routine",
      description: "Attach water prompts to wake-up, meals, and study breaks.",
      priority: "high",
      heaviness: "medium",
      reasoning: "Routine anchors make reminders less random.",
    },
    {
      title: "Prepare bottle setup",
      description: "Choose bottle size, refill locations, and backup plan.",
      priority: "medium",
      heaviness: "light",
      reasoning: "Reducing friction makes the plan easier to start.",
    },
    {
      title: "Review hydration after three days",
      description: "Check whether reminders are too frequent or too weak.",
      priority: "medium",
      heaviness: "light",
      reasoning: "Early review helps tune the plan before it fades.",
    },
  ];

  return targetType === "habit" ? habitTodos : workflowTodos;
}

function getGeneralTodos(targetType: AdviceTarget, query: string) {
  const normalizedTitle = query.replace(/^how to\s+/i, "").trim();
  const goalTitle = normalizedTitle || "the goal";
  const baseTodos: Array<Omit<SuggestedTodo, "id">> = [
    {
      title: `Define success for ${goalTitle}`,
      description: "Write what finished or consistent progress should look like.",
      priority: "high",
      heaviness: "light",
      reasoning: "A clear target keeps the plan from becoming vague.",
    },
    {
      title: "Pick the first small action",
      description: "Choose one action that can be started today.",
      priority: "high",
      heaviness: "light",
      reasoning: "A small first step creates momentum without overloading the board.",
    },
    {
      title: "Remove one friction point",
      description: "Prepare a tool, space, reminder, or schedule slot.",
      priority: "medium",
      heaviness: "medium",
      reasoning: "Fewer barriers makes consistency more likely.",
    },
    {
      title: "Review and adjust",
      description: "Check what worked and change the next step.",
      priority: "medium",
      heaviness: "light",
      reasoning: "Review keeps the plan realistic.",
    },
  ];

  return baseTodos.map((todo) => withHabitDueMode(targetType, todo));
}

export async function generateAdvicePlan({
  query,
  targetType,
  searchBundle,
}: GenerateAdvicePlanInput): Promise<AdvicePlan> {
  const normalizedQuery = query.toLowerCase();
  const healthRelated =
    normalizedQuery.includes("gain weight") ||
    normalizedQuery.includes("diet") ||
    normalizedQuery.includes("health") ||
    normalizedQuery.includes("workout");
  const sourceText = searchBundle.results
    .map((result) => `${result.title} ${result.snippet}`)
    .join(" ")
    .toLowerCase();
  const rawTodos = normalizedQuery.includes("gain weight") ||
    sourceText.includes("calorie surplus")
    ? getGainWeightTodos(targetType)
    : normalizedQuery.includes("water") ||
      normalizedQuery.includes("hydration") ||
      sourceText.includes("hydration")
    ? getWaterTodos(targetType)
    : getGeneralTodos(targetType, query);
  const cautions = healthRelated
    ? [
        "This is general guidance, not medical advice.",
        "Consult a healthcare professional for medical concerns.",
      ]
    : [];

  return {
    id: crypto.randomUUID(),
    query,
    targetType,
    summary:
      targetType === "habit"
        ? `Taskomon found ${searchBundle.results.length} mock sources and shaped them into repeatable habit bubbles for "${query}".`
        : `Taskomon found ${searchBundle.results.length} mock sources and shaped them into a one-session workflow for "${query}".`,
    cautions,
    sources: searchBundle.results,
    suggestedTodos: rawTodos.map((todo) =>
      createSuggestedTodo(withHabitDueMode(targetType, todo))
    ),
    createdAt: new Date().toISOString(),
  };
}
