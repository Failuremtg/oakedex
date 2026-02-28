/**
 * Master Ball variant rules for specific sets.
 * - 151 (EN sv03.5, JP SV2a): every standard Pokémon 001–151 has a Master Ball version.
 * - Terastal Festival ex (JP SV8a): main set 001–187, standard Pokémon only (not ex).
 * - Prismatic Evolutions (EN sv08.5): only selected card numbers have Master Ball.
 */

import type { CardVariant } from '@/src/types';

export type MasterBallRule =
  | { setIds: string[]; type: 'range'; min: number; max: number; excludeEx?: boolean }
  | { setIds: string[]; type: 'list'; numbers: number[] };

/** Set IDs are matched case-sensitively; TCGdex uses e.g. sv03.5 (en) and SV2a (ja). */
export const MASTER_BALL_RULES: MasterBallRule[] = [
  {
    setIds: ['sv03.5', 'SV2a'],
    type: 'range',
    min: 1,
    max: 151,
  },
  {
    setIds: ['SV8a'],
    type: 'range',
    min: 1,
    max: 187,
    excludeEx: true,
  },
  {
    setIds: ['sv08.5'],
    type: 'list',
    numbers: [5, 6, 19, 35, 47, 61, 63, 72, 74, 75, 76, 77, 78, 79, 80, 81, 82],
  },
];

function parseLocalId(localId: string | undefined): number | null {
  if (localId == null || localId === '') return null;
  const n = parseInt(localId.replace(/^0+/, '') || '0', 10);
  return Number.isNaN(n) ? null : n;
}

/** True if the card is a Pokémon ex (name ends with " ex"). */
function isExCard(card: { name?: string } | null): boolean {
  const name = card?.name?.trim();
  return !!name && /\s+ex$/i.test(name);
}

/**
 * Returns true if this set/card has a Master Ball variant.
 * For range rules, excludeEx excludes cards whose name ends with " ex" (e.g. Terastal Festival).
 */
export function cardHasMasterBall(
  setId: string,
  localId: string | undefined,
  card?: { name?: string } | null
): boolean {
  const num = parseLocalId(localId);
  if (num === null) return false;

  for (const rule of MASTER_BALL_RULES) {
    if (!rule.setIds.includes(setId)) continue;

    if (rule.type === 'range') {
      if (num < rule.min || num > rule.max) continue;
      if (rule.excludeEx && isExCard(card)) return false;
      return true;
    }

    if (rule.type === 'list') {
      if (rule.numbers.includes(num)) return true;
    }
  }

  return false;
}

/**
 * Adds 'masterBall' to the variant list when the card is in a Master Ball set and qualifies.
 * Call after getDisplayVariants / filterVariantsBySetCardCount / filterVariantsBySetReleaseDate,
 * and before or after filterVariantsByEdition (adding before keeps Master Ball as a selectable option).
 */
export function addMasterBallIfEligible(
  variants: readonly CardVariant[],
  setId: string,
  localId: string | undefined,
  card?: { name?: string } | null
): CardVariant[] {
  if (!cardHasMasterBall(setId, localId, card)) return [...variants];
  if (variants.includes('masterBall')) return [...variants];
  return [...variants, 'masterBall'];
}
