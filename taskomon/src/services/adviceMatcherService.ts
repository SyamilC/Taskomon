import {
  adviceKnowledgeBase,
  type AdviceKnowledgeEntry,
} from "../data/adviceKnowledgeBase";
import {
  getAdviceQueryTokens,
  normalizeAdviceQuery,
  removeStopWords,
  tokenizeAdviceQuery,
} from "./adviceQueryTokenizer";

const MINIMUM_MATCH_SCORE = 0.3;

type EntryScore = {
  entry: AdviceKnowledgeEntry;
  score: number;
  matchedKeywords: string[];
};

function getTokenVariants(token: string): string[] {
  const variants = new Set([token]);

  if (token.endsWith("ies") && token.length > 4) {
    variants.add(`${token.slice(0, -3)}y`);
  }

  if (token.endsWith("ing") && token.length > 5) {
    variants.add(token.slice(0, -3));
  }

  if (token.endsWith("ed") && token.length > 4) {
    variants.add(token.slice(0, -2));
  }

  if (token.endsWith("ly") && token.length > 4) {
    variants.add(token.slice(0, -2));
  }

  if (token.endsWith("s") && token.length > 3) {
    variants.add(token.slice(0, -1));
  }

  return [...variants];
}

function getPhraseTokens(value: string): string[] {
  return removeStopWords(tokenizeAdviceQuery(value)).flatMap(getTokenVariants);
}

function getQueryTokenSet(tokens: string[]): Set<string> {
  return new Set(tokens.flatMap(getTokenVariants));
}

function scoreCandidate({
  candidate,
  label,
  queryNormalized,
  queryTokenSet,
  weight,
}: {
  candidate: string;
  label: string;
  queryNormalized: string;
  queryTokenSet: Set<string>;
  weight: number;
}) {
  const candidateNormalized = normalizeAdviceQuery(candidate);
  const phraseTokens = getPhraseTokens(candidate);
  const uniquePhraseTokens = [...new Set(phraseTokens)];

  if (uniquePhraseTokens.length === 0) {
    return { score: 0, matchedLabel: "" };
  }

  const overlapCount = uniquePhraseTokens.filter((token) =>
    queryTokenSet.has(token)
  ).length;
  const allTokensMatched = overlapCount === uniquePhraseTokens.length;
  const exactPhraseMatched =
    candidateNormalized.length > 0 && queryNormalized.includes(candidateNormalized);
  let score = overlapCount * weight;

  if (exactPhraseMatched && uniquePhraseTokens.length > 1) {
    score += uniquePhraseTokens.length * weight * 1.4;
  } else if (allTokensMatched && uniquePhraseTokens.length > 1) {
    score += uniquePhraseTokens.length * weight * 0.9;
  }

  return {
    score,
    matchedLabel: overlapCount > 0 || exactPhraseMatched ? label : "",
  };
}

function scoreEntry(
  entry: AdviceKnowledgeEntry,
  query: string,
  queryTokens: string[]
): EntryScore {
  const queryNormalized = normalizeAdviceQuery(query);
  const queryTokenSet = getQueryTokenSet(queryTokens);
  const matchedKeywords = new Set<string>();
  let rawScore = 0;

  entry.keywords.forEach((keyword) => {
    const candidateScore = scoreCandidate({
      candidate: keyword,
      label: keyword,
      queryNormalized,
      queryTokenSet,
      weight: 1.25,
    });

    rawScore += candidateScore.score;
    if (candidateScore.matchedLabel) {
      matchedKeywords.add(candidateScore.matchedLabel);
    }
  });

  entry.relatedPhrases.forEach((phrase) => {
    const candidateScore = scoreCandidate({
      candidate: phrase,
      label: phrase,
      queryNormalized,
      queryTokenSet,
      weight: 1,
    });

    rawScore += candidateScore.score;
    if (candidateScore.matchedLabel) {
      matchedKeywords.add(candidateScore.matchedLabel);
    }
  });

  rawScore += scoreCandidate({
    candidate: entry.title,
    label: entry.title,
    queryNormalized,
    queryTokenSet,
    weight: 0.7,
  }).score;
  rawScore += scoreCandidate({
    candidate: entry.category,
    label: entry.category,
    queryNormalized,
    queryTokenSet,
    weight: 0.35,
  }).score;

  const denominator = Math.max(3, queryTokens.length * 2.2);
  const score = Math.min(1, rawScore / denominator);

  return {
    entry,
    score,
    matchedKeywords: [...matchedKeywords],
  };
}

export function findBestAdviceMatch(query: string): {
  entry: AdviceKnowledgeEntry | null;
  score: number;
  matchedKeywords: string[];
} {
  const queryTokens = getAdviceQueryTokens(query);

  if (queryTokens.length === 0) {
    return {
      entry: null,
      score: 0,
      matchedKeywords: [],
    };
  }

  const bestMatch = adviceKnowledgeBase
    .map((entry) => scoreEntry(entry, query, queryTokens))
    .sort((a, b) => b.score - a.score)[0];

  if (!bestMatch || bestMatch.score < MINIMUM_MATCH_SCORE) {
    return {
      entry: null,
      score: bestMatch?.score ?? 0,
      matchedKeywords: bestMatch?.matchedKeywords ?? [],
    };
  }

  return {
    entry: bestMatch.entry,
    score: bestMatch.score,
    matchedKeywords: bestMatch.matchedKeywords,
  };
}
