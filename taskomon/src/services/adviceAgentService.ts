import type { AdvicePlan, SearchBundle } from "../types";
import { generateAdviceTodos } from "./adviceService";

type AdviceTarget = "workflow" | "habit";

interface GenerateAdvicePlanInput {
  query: string;
  targetType: AdviceTarget;
  searchBundle: SearchBundle;
}

export async function generateAdvicePlan({
  query,
  targetType,
}: GenerateAdvicePlanInput): Promise<AdvicePlan> {
  return generateAdviceTodos(query, targetType);
}
