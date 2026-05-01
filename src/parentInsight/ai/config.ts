export type ParentInsightAiConfig = {
  provider: 'openai-compatible';
  baseUrl: string;
  apiKey: string;
  model: string;
};

/**
 * Reads a minimal, Expo-friendly config from public env vars.
 * These are intentionally optional so the MVP can run with mock data.
 */
export function getParentInsightAiConfig(): ParentInsightAiConfig | null {
  const baseUrl = process.env.EXPO_PUBLIC_PARENT_INSIGHT_API_URL?.trim();
  const apiKey = process.env.EXPO_PUBLIC_PARENT_INSIGHT_API_KEY?.trim();
  const model = process.env.EXPO_PUBLIC_PARENT_INSIGHT_MODEL?.trim() || 'gpt-4.1-mini';

  if (!baseUrl || !apiKey) return null;
  return { provider: 'openai-compatible', baseUrl, apiKey, model };
}

