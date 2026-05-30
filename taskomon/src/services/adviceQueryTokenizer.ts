const STOP_WORDS = new Set([
  "a",
  "about",
  "am",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "can",
  "could",
  "do",
  "does",
  "for",
  "from",
  "get",
  "give",
  "help",
  "how",
  "i",
  "im",
  "in",
  "into",
  "is",
  "it",
  "make",
  "me",
  "my",
  "of",
  "on",
  "or",
  "please",
  "should",
  "some",
  "that",
  "the",
  "this",
  "to",
  "want",
  "way",
  "what",
  "with",
  "you",
  "your",
]);

export function normalizeAdviceQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeAdviceQuery(query: string): string[] {
  const normalizedQuery = normalizeAdviceQuery(query);

  if (!normalizedQuery) return [];

  return normalizedQuery.split(" ").filter(Boolean);
}

export function removeStopWords(tokens: string[]): string[] {
  return tokens.filter((token) => !STOP_WORDS.has(token));
}

export function getAdviceQueryTokens(query: string): string[] {
  return removeStopWords(tokenizeAdviceQuery(query));
}
