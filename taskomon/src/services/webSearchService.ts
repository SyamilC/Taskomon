import type { SearchBundle, WebSearchResult } from "../types";

function createResult(
  title: string,
  snippet: string,
  sourceName: string
): WebSearchResult {
  return {
    id: crypto.randomUUID(),
    title,
    snippet,
    sourceName,
    url: `mock://taskomon-search/${encodeURIComponent(
      title.toLowerCase().replace(/\s+/g, "-")
    )}`,
  };
}

function getGainWeightResults() {
  return [
    createResult(
      "Safe weight gain starts with a calorie surplus",
      "A steady calorie surplus from balanced meals can support gradual weight gain without relying only on low-nutrient foods.",
      "Mock Health Guide"
    ),
    createResult(
      "Strength training helps turn extra energy into muscle",
      "Progressive strength training is commonly paired with weight gain plans to support muscle growth and appetite.",
      "Mock Fitness Notes"
    ),
    createResult(
      "Balanced meals make weight gain easier to sustain",
      "Meals with protein, carbohydrates, healthy fats, and vegetables can make the plan more consistent and less extreme.",
      "Mock Nutrition Lab"
    ),
    createResult(
      "Medical caution for sudden weight changes",
      "People with medical concerns, appetite issues, or sudden weight changes should speak with a healthcare professional.",
      "Mock Clinic Reference"
    ),
    createResult(
      "Consistency beats aggressive short bursts",
      "Weekly review and repeatable meals can make weight gain safer and easier to adjust over time.",
      "Mock Habit Research"
    ),
  ];
}

function getWaterResults() {
  return [
    createResult(
      "Hydration reminders reduce missed drinks",
      "Simple reminders around existing daily moments can make drinking water easier to remember.",
      "Mock Hydration Guide"
    ),
    createResult(
      "Daily intake works best as a flexible target",
      "Hydration needs vary, but a visible bottle and simple tracking can help users notice low-intake days.",
      "Mock Wellness Notes"
    ),
    createResult(
      "Habit stacking improves routine adoption",
      "Pairing water intake with stable routines like waking up, meals, or study breaks can reduce friction.",
      "Mock Behaviour Lab"
    ),
    createResult(
      "Morning and evening routines create anchors",
      "A morning refill and evening check can make hydration habits easier to repeat.",
      "Mock Routine Research"
    ),
  ];
}

function getGeneralResults() {
  return [
    createResult(
      "Start with a clear small action",
      "Goals become easier to execute when the next action is specific, visible, and small enough to begin.",
      "Mock Productivity Guide"
    ),
    createResult(
      "Use checkpoints to adjust the plan",
      "Short reviews help users compare what they planned with what actually happened.",
      "Mock Planning Notes"
    ),
    createResult(
      "Remove friction before adding pressure",
      "Preparing tools, environment, and reminders can make consistency easier than relying on motivation.",
      "Mock Behaviour Lab"
    ),
    createResult(
      "Track progress without overloading the board",
      "A short list of high-signal tasks is usually easier to maintain than a large vague plan.",
      "Mock Workspace Research"
    ),
  ];
}

export async function searchWeb(query: string): Promise<SearchBundle> {
  const normalizedQuery = query.toLowerCase();
  const results = normalizedQuery.includes("gain weight")
    ? getGainWeightResults()
    : normalizedQuery.includes("water") ||
      normalizedQuery.includes("hydration") ||
      normalizedQuery.includes("drink")
    ? getWaterResults()
    : getGeneralResults();

  return {
    query,
    generatedAt: new Date().toISOString(),
    results,
  };
}
