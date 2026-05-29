import type { AdviceResponse, SuggestedTodo } from "../types";

export async function generateAdviceTodos(
  query: string,
  targetType: "workflow" | "habit"
): Promise<AdviceResponse> {
  const requestId = crypto.randomUUID();

  const suggestions: SuggestedTodo[] = [
    {
      id: crypto.randomUUID(),
      title: `Research: ${query}`,
      description: "Understand the basic steps before starting.",
      priority: "medium",
      heaviness: "light",
      dueMode: targetType === "habit" ? "anytime" : undefined,
      reasoning: "Research helps make the workflow less vague.",
    },
    {
      id: crypto.randomUUID(),
      title: "Break the goal into smaller actions",
      description: "Turn the main goal into clear, doable tasks.",
      priority: "high",
      heaviness: "medium",
      dueMode: targetType === "habit" ? "anytime" : undefined,
      reasoning: "Smaller actions are easier to track and complete.",
    },
    {
      id: crypto.randomUUID(),
      title: "Review progress and adjust",
      description: "Check what worked and what needs to change.",
      priority: "medium",
      heaviness: "light",
      dueMode: targetType === "habit" ? "anytime" : undefined,
      reasoning: "Reviewing keeps the plan realistic.",
    },
  ];

  return {
    id: crypto.randomUUID(),
    requestId,
    summary: `Taskomon created a starter plan for: "${query}".`,
    suggestedTodos: suggestions,
    createdAt: new Date().toISOString(),
  };
}