import { buildParentInsightPrompt, coerceInsightShape } from '@/src/parentInsight/ai/prompt';
import type { ParentInsight } from '@/src/parentInsight/types';

type OpenAIChatResponse = {
  choices?: Array<{
    message?: { content?: string | null } | null;
  }>;
};

export type OpenAICompatibleConfig = {
  baseUrl: string; // e.g. https://api.openai.com/v1
  apiKey: string;
  model: string; // e.g. gpt-4.1-mini
};

export async function generateParentInsightViaOpenAICompatible(
  userInput: string,
  config: OpenAICompatibleConfig
): Promise<ParentInsight> {
  const { system, user } = buildParentInsightPrompt(userInput);

  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI request failed (${res.status}). ${text}`.trim());
  }

  const json = (await res.json()) as OpenAIChatResponse;
  const content = json.choices?.[0]?.message?.content ?? '';

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Some providers wrap JSON in text; try to extract the first JSON object.
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response was not valid JSON.');
    parsed = JSON.parse(match[0]);
  }

  const insight = coerceInsightShape(parsed);
  if (!insight) throw new Error('AI response did not match expected shape.');
  return insight;
}

