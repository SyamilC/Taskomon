import type {
  AdvicePlan,
  DueMode,
  Heaviness,
  Priority,
  SuggestedTodo,
  WebSearchResult,
} from "../types";
import type {
  AdviceKnowledgeEntry,
  AdviceKnowledgeTodo,
} from "../data/adviceKnowledgeBase";
import { findBestAdviceMatch } from "./adviceMatcherService";
import {
  getAdviceQueryTokens,
  normalizeAdviceQuery,
} from "./adviceQueryTokenizer";

type AdviceTarget = "workflow" | "habit";

const HABIT_HINTS = new Set([
  "daily",
  "habit",
  "routine",
  "consistent",
  "consistency",
  "water",
  "sleep",
  "exercise",
  "workout",
  "reading",
  "budget",
  "stress",
  "hair",
  "friends",
]);

const WORKFLOW_HINTS = new Set([
  "application",
  "apply",
  "clean",
  "coding",
  "exam",
  "portfolio",
  "project",
  "resume",
  "room",
  "study",
  "test",
  "website",
]);

function createSuggestedTodo(
  todo: Omit<SuggestedTodo, "id">
): SuggestedTodo {
  return {
    id: crypto.randomUUID(),
    ...todo,
  };
}

function getFallbackGoalTitle(query: string): string {
  const trimmedQuery = query.replace(/^how\s+to\s+/i, "").trim();

  return trimmedQuery || "the goal";
}

function inferFallbackTarget(
  query: string,
  preferredTargetType: AdviceTarget
): AdviceTarget {
  const tokens = getAdviceQueryTokens(query);
  const habitScore = tokens.filter((token) => HABIT_HINTS.has(token)).length;
  const workflowScore = tokens.filter((token) => WORKFLOW_HINTS.has(token)).length;

  if (habitScore > workflowScore) return "habit";
  if (workflowScore > habitScore) return "workflow";

  return preferredTargetType;
}

function withHabitDueMode(
  targetType: AdviceTarget,
  todo: Omit<SuggestedTodo, "id">
): Omit<SuggestedTodo, "id"> {
  if (targetType === "workflow") return todo;

  return {
    ...todo,
    dueMode: (todo.dueMode ?? "anytime") as DueMode,
  };
}

function toSuggestedTodo(
  todo: AdviceKnowledgeTodo,
  targetType: AdviceTarget
): SuggestedTodo {
  return createSuggestedTodo(
    withHabitDueMode(targetType, {
      title: todo.title,
      description: todo.description,
      priority: todo.priority as Priority,
      heaviness: todo.heaviness as Heaviness,
      reasoning: todo.reasoning,
    })
  );
}

function createLocalSource(input: {
  title: string;
  snippet: string;
  sourceName: string;
  urlPath: string;
}): WebSearchResult {
  return {
    id: crypto.randomUUID(),
    title: input.title,
    snippet: input.snippet,
    sourceName: input.sourceName,
    url: `local://taskomon-advice/${input.urlPath}`,
  };
}

function createKnowledgeSources(
  entry: AdviceKnowledgeEntry,
  score: number,
  matchedKeywords: string[]
): WebSearchResult[] {
  return [
    createLocalSource({
      title: entry.title,
      snippet: entry.summary,
      sourceName: "Taskomon Knowledge Base",
      urlPath: entry.id,
    }),
    createLocalSource({
      title: `${entry.category} match`,
      snippet:
        matchedKeywords.length > 0
          ? `Matched local cues: ${matchedKeywords.slice(0, 6).join(", ")}. Confidence ${Math.round(score * 100)}%.`
          : `Matched local category confidence ${Math.round(score * 100)}%.`,
      sourceName: "Local Advice Matcher",
      urlPath: `${entry.id}/match`,
    }),
  ];
}

function getFallbackTodos(
  query: string,
  targetType: AdviceTarget
): Array<Omit<SuggestedTodo, "id">> {
  const goalTitle = getFallbackGoalTitle(query);
  const sharedTodos: Array<Omit<SuggestedTodo, "id">> = [
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
      reasoning: "Reducing friction makes follow-through easier.",
    },
    {
      title: "Review and adjust",
      description: "Check what worked and choose the next realistic step.",
      priority: "medium",
      heaviness: "light",
      reasoning: "Review keeps the plan connected to real behavior.",
    },
  ];

  return sharedTodos.map((todo) => withHabitDueMode(targetType, todo));
}

function createFallbackSources(query: string): WebSearchResult[] {
  const normalizedQuery = normalizeAdviceQuery(query);

  return [
    createLocalSource({
      title: "Generic planning fallback",
      snippet:
        "No strong local knowledge-base match was found, so Taskomon used a general planning pattern: define, start small, reduce friction, and review.",
      sourceName: "Taskomon Generic Planner",
      urlPath: `fallback/${encodeURIComponent(normalizedQuery || "empty")}`,
    }),
  ];
}

export async function generateAdviceTodos(
  query: string,
  targetType: AdviceTarget
): Promise<AdvicePlan> {
  const match = findBestAdviceMatch(query);
  const matchedEntry = match.entry;
  const resolvedTargetType =
    matchedEntry?.recommendedTargetType ?? inferFallbackTarget(query, targetType);
  const suggestedTodos = matchedEntry
    ? (matchedEntry.recommendedTargetType === "habit"
        ? matchedEntry.habitTodos
        : matchedEntry.workflowTodos
      ).map((todo) => toSuggestedTodo(todo, resolvedTargetType))
    : getFallbackTodos(query, resolvedTargetType).map((todo) =>
        createSuggestedTodo(withHabitDueMode(resolvedTargetType, todo))
      );

  return {
    id: crypto.randomUUID(),
    query,
    targetType: resolvedTargetType,
    summary: matchedEntry
      ? `Taskomon matched "${matchedEntry.title}" in the local advice knowledge base and shaped it into a ${resolvedTargetType} workspace for "${query}".`
      : `Taskomon did not find a strong local match, so it shaped a general ${resolvedTargetType} workspace for "${query}".`,
    cautions: matchedEntry?.cautions ?? [],
    sources: matchedEntry
      ? createKnowledgeSources(matchedEntry, match.score, match.matchedKeywords)
      : createFallbackSources(query),
    suggestedTodos,
    createdAt: new Date().toISOString(),
  };
}
