import type { AdvicePlan } from "../types";
import { generateAdvicePlan } from "./adviceAgentService";
import { searchWeb } from "./webSearchService";

export async function generateAdviceTodos(
  query: string,
  targetType: "workflow" | "habit"
): Promise<AdvicePlan> {
  const searchBundle = await searchWeb(query);

  return generateAdvicePlan({
    query,
    targetType,
    searchBundle,
  });
}
