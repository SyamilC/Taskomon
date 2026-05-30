import type { DueMode, Heaviness, Priority } from "./todo";

export interface WebSearchResult {
  id: string;
  title: string;
  snippet: string;
  url: string;
  sourceName?: string;
}

export interface SearchBundle {
  query: string;
  generatedAt: string;
  results: WebSearchResult[];
}

export interface AdviceRequest {
  id: string;
  userId: string;
  query: string;
  targetType: "workflow" | "habit";
  createdAt: string;
}

export interface SuggestedTodo {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  heaviness: Heaviness;
  dueMode?: DueMode;
  reasoning: string;
}

export interface AdviceResponse {
  id: string;
  requestId: string;
  summary: string;
  suggestedTodos: SuggestedTodo[];
  createdAt: string;
}

export interface AdvicePlan {
  id: string;
  query: string;
  targetType: "workflow" | "habit";
  summary: string;
  cautions: string[];
  sources: WebSearchResult[];
  suggestedTodos: SuggestedTodo[];
  createdAt: string;
}
