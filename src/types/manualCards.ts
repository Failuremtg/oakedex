/**
 * Manual cards layer – types and validation.
 * Sits alongside TCGdex; cards can optionally link via tcgdexId.
 */

/** Supported locale codes for Pokémon localized names. */
export type ManualCardLocaleCode =
  | 'en'
  | 'da'
  | 'de'
  | 'fr'
  | 'es'
  | 'it'
  | 'pt'
  | 'nl'
  | 'sv'
  | 'no'
  | 'fi'
  | 'pl'
  | 'cs'
  | 'hu'
  | 'ro'
  | 'bg'
  | 'el'
  | 'tr'
  | 'ru'
  | 'uk'
  | 'ja'
  | 'ko'
  | 'zh'
  | 'th'
  | 'id';

/** Variant descriptor for a manual card (stamp type, foil pattern, etc.). */
export interface ManualCardVariant {
  type: string;
  stamp?: string;
  foilPattern?: string;
}

/** Localized Pokémon names; keys are ManualCardLocaleCode. */
export type ManualCardPokemonNames = Partial<Record<ManualCardLocaleCode, string>>;

export interface ManualCard {
  /** Stable id for this manual card (required, unique). */
  manualId: string;
  /** Optional link to TCGdex card id (setId-localId) for dedupe/merge. */
  tcgdexId?: string;
  /** Set group (e.g. "Trick or Trade", "Advent Calendar"). */
  setGroup: string;
  /** Subset within the group (e.g. "2023", "Pokemon Center"). */
  subSet: string;
  /** Collection number within the set (numeric for sorting). */
  number: number;
  /** Optional display number when different from numeric (e.g. "W001", "S-P 001"). */
  numberDisplay?: string;
  /** Pokémon names by locale. */
  pokemon: ManualCardPokemonNames;
  /** Locales this printing is available in. */
  languagesAvailable: string[];
  /** Variant (stamp, foil, etc.). */
  variant: ManualCardVariant;
  /** Optional provenance note (e.g. "Generated from Bulbapedia..."). */
  sourceNote?: string;
}

/** Filters for listManualCards(). */
export interface ManualCardListFilters {
  setGroup?: string;
  subSet?: string;
  tcgdexId?: string;
  /** If set, only cards with this manualId are excluded (e.g. when merging to avoid duplicate). */
  excludeManualIds?: string[];
}

/** Stored file shape: seed categories (setGroup -> subSets) + cards array. */
export interface ManualCardsStorage {
  /** Defines setGroup -> subSet[] for UI grouping order. */
  setGroupSubSets: Record<string, string[]>;
  cards: ManualCard[];
}

/** Default set group / subSet seed categories. */
export const MANUAL_CARD_SEED_SET_GROUPS: Record<string, string[]> = {
  'Trick or Trade': ['2022', '2023', '2024', '2025'],
  'Advent Calendar': ['2023', '2024', '2025'],
  'Holiday Calendar': ['2022', '2023', '2024', '2025'],
  'Stamped Promos': ['Pokemon Center', 'Prerelease', 'League', 'Staff', 'Store'],
};

/** Locale codes that manual cards support (for validation/UI). */
export const MANUAL_CARD_LOCALE_CODES: ManualCardLocaleCode[] = [
  'en', 'da', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'sv', 'no', 'fi', 'pl',
  'cs', 'hu', 'ro', 'bg', 'el', 'tr', 'ru', 'uk', 'ja', 'ko', 'zh', 'th', 'id',
];

function isNonEmptyString(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0;
}

function isNonNegativeNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

/**
 * Validates a manual card. Returns null if valid, or an error message.
 */
export function validateManualCard(card: unknown): string | null {
  if (card == null || typeof card !== 'object') return 'Card must be an object';
  const c = card as Record<string, unknown>;

  if (!isNonEmptyString(c.manualId)) return 'manualId is required and must be a non-empty string';
  if (c.tcgdexId !== undefined && !isNonEmptyString(c.tcgdexId)) return 'tcgdexId must be a non-empty string if set';
  if (!isNonEmptyString(c.setGroup)) return 'setGroup is required';
  if (!isNonEmptyString(c.subSet)) return 'subSet is required';
  if (!isNonNegativeNumber(c.number)) return 'number is required and must be a non-negative number';

  if (c.pokemon == null || typeof c.pokemon !== 'object') return 'pokemon (localized names) is required';
  const pokemon = c.pokemon as Record<string, unknown>;
  for (const [k, v] of Object.entries(pokemon)) {
    if (typeof v !== 'string' && v != null) return `pokemon.${k} must be a string`;
  }

  if (!Array.isArray(c.languagesAvailable)) return 'languagesAvailable must be an array';
  if (c.variant == null || typeof c.variant !== 'object') return 'variant is required';
  const v = c.variant as Record<string, unknown>;
  if (typeof v.type !== 'string') return 'variant.type is required';

  return null;
}

/** One group for UI: setGroup -> subSet -> cards sorted by number. */
export interface ManualCardGroup {
  setGroup: string;
  subSet: string;
  cards: ManualCard[];
}

// --- Trick or Trade import (external JSON shape) ---

export interface TrickOrTradeCardItem {
  name: string;
  number: string;
  languages: string[];
  sourceSet?: string;
}

export interface TrickOrTradeSet {
  set: string;
  releaseDate: string;
  cards: TrickOrTradeCardItem[];
}

export interface TrickOrTradeJson {
  series: string;
  pattern?: string;
  defaultLanguages: string[];
  sets: TrickOrTradeSet[];
}

// --- Stamped promos import (Bulbapedia scraper output) ---

export interface StampedPromosCardItem {
  manualId: string;
  tcgdexId?: string | null;
  setGroup: string;
  subSet: string;
  number: string;
  pokemon: ManualCardPokemonNames;
  languagesAvailable: string[];
  variant: { type: string; stamp?: string };
  sourceNote?: string;
}

export interface StampedPromosJson {
  schemaVersion?: number;
  generatedAt?: string;
  exclusions?: string[];
  setsParsed?: { subSet: string; count: number }[];
  cards: StampedPromosCardItem[];
}
