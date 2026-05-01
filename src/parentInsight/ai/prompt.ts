import type { ParentInsight } from '@/src/parentInsight/types';

export type ParentInsightPrompt = {
  system: string;
  user: string;
};

export const PARENT_INSIGHT_JSON_SCHEMA: string = JSON.stringify(
  {
    type: 'object',
    additionalProperties: false,
    required: ['whatItIs', 'whyKidsCare', 'conversationStarters'],
    properties: {
      whatItIs: { type: 'string' },
      whyKidsCare: { type: 'string' },
      conversationStarters: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
      goodToKnow: { type: 'string' },
    },
  },
  null,
  0
);

export function buildParentInsightPrompt(userInput: string): ParentInsightPrompt {
  // This prompt is designed to produce short, scan-friendly, parent-oriented text.
  // Output must be structured JSON so the app can render consistent cards.
  const system = [
    'You are a calm, warm guide for parents.',
    'Your goal is to help a parent understand a digital hobby/game/trend/slang term their child mentioned so they can connect and ask better questions.',
    '',
    'Writing rules:',
    '- Use plain everyday language. No gamer jargon. No condescending tone.',
    '- Be respectful of the child’s interests. Avoid alarmist or fear-based language.',
    '- Be practical and short. Avoid long paragraphs and academic explanations.',
    '- If the term is vague or has multiple meanings, pick the most likely meaning and gently mention the ambiguity in "goodToKnow" only if helpful.',
    '',
    'Output rules:',
    '- Output ONLY valid JSON (no markdown, no extra keys, no commentary).',
    '- Keep the total content roughly 120–220 words.',
    '- "conversationStarters" must be 3–5 natural questions a parent can ask.',
    '- Include "goodToKnow" ONLY when genuinely relevant (spending, safety, social pressure, collecting value, time investment, age relevance).',
    '',
    `JSON shape must match this schema: ${PARENT_INSIGHT_JSON_SCHEMA}`,
  ].join('\n');

  const user = [
    'Parent question:',
    userInput.trim(),
    '',
    'Return the JSON object now.',
  ].join('\n');

  return { system, user };
}

export function coerceInsightShape(value: unknown): ParentInsight | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Partial<Record<keyof ParentInsight, unknown>>;

  if (typeof v.whatItIs !== 'string') return null;
  if (typeof v.whyKidsCare !== 'string') return null;
  if (!Array.isArray(v.conversationStarters)) return null;
  const starters = v.conversationStarters.filter((s) => typeof s === 'string').map((s) => s.trim()).filter(Boolean);
  if (starters.length < 3) return null;

  const goodToKnow = typeof v.goodToKnow === 'string' && v.goodToKnow.trim() ? v.goodToKnow.trim() : undefined;

  return {
    whatItIs: v.whatItIs.trim(),
    whyKidsCare: v.whyKidsCare.trim(),
    conversationStarters: starters.slice(0, 5),
    ...(goodToKnow ? { goodToKnow } : {}),
  };
}

