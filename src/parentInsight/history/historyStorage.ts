import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ParentInsight } from '@/src/parentInsight/types';

const STORAGE_KEY = '@clarivo/parentInsightHistory/v1';
const MAX_ITEMS = 25;

export type ParentInsightHistoryItem = {
  id: string;
  question: string;
  insight: ParentInsight;
  createdAt: number;
};

function safeParse(raw: string | null): ParentInsightHistoryItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is ParentInsightHistoryItem => {
      if (!x || typeof x !== 'object') return false;
      const v = x as ParentInsightHistoryItem;
      return (
        typeof v.id === 'string' &&
        typeof v.question === 'string' &&
        typeof v.createdAt === 'number' &&
        v.insight != null &&
        typeof v.insight === 'object' &&
        typeof v.insight.whatItIs === 'string' &&
        typeof v.insight.whyKidsCare === 'string' &&
        Array.isArray(v.insight.conversationStarters)
      );
    });
  } catch {
    return [];
  }
}

export async function loadParentInsightHistory(): Promise<ParentInsightHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return safeParse(raw).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function saveParentInsightHistory(items: ParentInsightHistoryItem[]): Promise<void> {
  try {
    const trimmed = items
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

export async function addParentInsightHistoryItem(question: string, insight: ParentInsight): Promise<void> {
  const q = question.trim();
  if (!q) return;

  const now = Date.now();
  const existing = await loadParentInsightHistory();

  // De-dupe by normalized question (keep newest)
  const normalized = q.toLowerCase();
  const filtered = existing.filter((x) => x.question.trim().toLowerCase() !== normalized);

  const item: ParentInsightHistoryItem = {
    id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
    question: q,
    insight,
    createdAt: now,
  };

  await saveParentInsightHistory([item, ...filtered]);
}

export async function clearParentInsightHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

