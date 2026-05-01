import type { TCGdexLang } from '@/src/lib/tcgdex';

export type ParsedCardQuery =
  | { kind: 'none' }
  | { kind: 'cardId'; cardId: string }
  | { kind: 'setAndLocalId'; setId: string; localId: string; cardId: string };

function normalizeSetId(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '');
  // Common shorthand: bs1 -> base1 (Base Set)
  const m = s.match(/^bs(\d+)$/);
  if (m) return `base${m[1]}`;
  return s;
}

/**
 * Supports:
 * - "base1-4" (exact card id)
 * - "base1 4" (set + local number)
 * - "bs1 4" (shorthand set id)
 */
export function parseCardQuery(q: string): ParsedCardQuery {
  const raw = (q ?? '').trim();
  if (!raw) return { kind: 'none' };

  const dash = raw.match(/^([a-z0-9.]+)\s*-\s*([a-z0-9]+)$/i);
  if (dash) {
    const setId = normalizeSetId(dash[1]);
    const localId = dash[2];
    return { kind: 'setAndLocalId', setId, localId, cardId: `${setId}-${localId}` };
  }

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 2 && /^[a-z0-9.]+$/i.test(parts[0]) && /^[a-z0-9]+$/i.test(parts[1])) {
    const setId = normalizeSetId(parts[0]);
    const localId = parts[1];
    return { kind: 'setAndLocalId', setId, localId, cardId: `${setId}-${localId}` };
  }

  // If user pasted a full card id with more than one dash, treat as cardId anyway.
  if (/^[a-z0-9.]+-[a-z0-9]+$/i.test(raw)) {
    return { kind: 'cardId', cardId: normalizeSetId(raw) };
  }

  return { kind: 'none' };
}

export function cardIdForLang(_lang: TCGdexLang, cardId: string): string {
  // TCGdex card IDs are language-agnostic (setId-localId). Keep hook for future if needed.
  return cardId;
}

