import type { SearchBundle, WebSearchResult } from "../types";
import { findBestAdviceMatch } from "./adviceMatcherService";
import { normalizeAdviceQuery } from "./adviceQueryTokenizer";

function createResult(input: {
  title: string;
  snippet: string;
  urlPath: string;
  sourceName: string;
}): WebSearchResult {
  return {
    id: crypto.randomUUID(),
    title: input.title,
    snippet: input.snippet,
    sourceName: input.sourceName,
    url: `local://taskomon-advice/${input.urlPath}`,
  };
}

export async function searchWeb(query: string): Promise<SearchBundle> {
  const match = findBestAdviceMatch(query);
  const results = match.entry
    ? [
        createResult({
          title: match.entry.title,
          snippet: match.entry.summary,
          sourceName: "Taskomon Knowledge Base",
          urlPath: match.entry.id,
        }),
        createResult({
          title: `${match.entry.category} local match`,
          snippet:
            match.matchedKeywords.length > 0
              ? `Matched ${match.matchedKeywords
                  .slice(0, 6)
                  .join(", ")} with ${Math.round(match.score * 100)}% confidence.`
              : `Matched local entry with ${Math.round(match.score * 100)}% confidence.`,
          sourceName: "Local Advice Matcher",
          urlPath: `${match.entry.id}/match`,
        }),
      ]
    : [
        createResult({
          title: "Generic planning fallback",
          snippet:
            "No strong local knowledge-base match was found, so a general planning fallback is available.",
          sourceName: "Taskomon Generic Planner",
          urlPath: `fallback/${encodeURIComponent(
            normalizeAdviceQuery(query) || "empty"
          )}`,
        }),
      ];

  return {
    query,
    generatedAt: new Date().toISOString(),
    results,
  };
}
