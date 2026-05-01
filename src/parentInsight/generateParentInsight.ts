import { getParentInsightAiConfig } from '@/src/parentInsight/ai/config';
import { generateParentInsightViaOpenAICompatible } from '@/src/parentInsight/ai/openaiCompatible';
import { matchMockInsight } from '@/src/parentInsight/mock/matchMockInsight';
import type { ParentInsight } from '@/src/parentInsight/types';

function fallbackInsight(userInput: string): ParentInsight {
  const topic = userInput.trim() || 'that';
  return {
    whatItIs:
      `I can help, but I’m not fully sure what “${topic}” refers to yet. It might be a game, a creator, a feature inside a game, or a slang term.`,
    whyKidsCare:
      'Kids often care about these things because they connect them to friends, give them a sense of identity, or make something feel special or “cool” in their world.',
    conversationStarters: [
      `Where did you hear “${topic}” — from a friend, YouTube, or in a game?`,
      `What does “${topic}” mean to you in your own words?`,
      'Is it something you do with friends, or mostly on your own?',
      'What’s the fun part about it—and what’s the annoying part?',
    ],
    goodToKnow:
      'If this involves an online community, purchases, or trading, it can help to ask where chat happens, whether real money is involved, and what the “normal rules” are among kids.',
  };
}

export async function generateParentInsight(userInput: string): Promise<ParentInsight> {
  const trimmed = userInput.trim();
  if (!trimmed) return fallbackInsight(userInput);

  const mock = matchMockInsight(trimmed);
  if (mock) return mock.insight;

  const cfg = getParentInsightAiConfig();
  if (!cfg) return fallbackInsight(trimmed);

  if (cfg.provider === 'openai-compatible') {
    return await generateParentInsightViaOpenAICompatible(trimmed, {
      baseUrl: cfg.baseUrl,
      apiKey: cfg.apiKey,
      model: cfg.model,
    });
  }

  return fallbackInsight(trimmed);
}

