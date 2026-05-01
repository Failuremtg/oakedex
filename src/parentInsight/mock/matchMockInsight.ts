import { MOCK_INSIGHTS } from '@/src/parentInsight/mock/mockInsights';
import type { ParentInsight } from '@/src/parentInsight/types';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2019']/g, "'")
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchMockInsight(userInput: string): { insight: ParentInsight; matchedId: string } | null {
  const q = normalize(userInput);
  if (!q) return null;

  for (const entry of MOCK_INSIGHTS) {
    for (const m of entry.matchers) {
      const mm = normalize(m);
      if (!mm) continue;
      if (q === mm || q.includes(mm) || mm.includes(q)) {
        return { insight: entry.insight, matchedId: entry.id };
      }
    }
  }

  return null;
}

