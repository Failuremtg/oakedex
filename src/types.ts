/**
 * Oakedex data model – binders, slots, card references.
 */

export type BinderType =
  | 'collect_them_all'
  | 'master_dex'
  | 'master_set'
  | 'single_pokemon'
  | 'by_set'
  | 'custom'
  | 'graded';

/** Options when creating a Master Set (one of each Pokémon). All true = Grandmaster Collection. */
export interface MasterSetOptions {
  regionalForms?: boolean;
  /** @deprecated Use variationGroups instead. When true, adds Unown. */
  variations?: boolean;
  /** Selected variation groups (e.g. 'unown', 'tauros_forms', 'castform', …). */
  variationGroups?: string[];
  megas?: boolean;
  gmax?: boolean;
}

export type CardVariant = 'normal' | 'reverse' | 'holo' | 'firstEdition' | 'wPromo' | 'masterBall';

export const CARD_VARIANTS: CardVariant[] = ['normal', 'reverse', 'holo', 'firstEdition', 'wPromo', 'masterBall'];

/** Slot key for a specific card + variant (single_pokemon and by_set). */
export function cardSlotKey(cardId: string, variant: CardVariant): string {
  return `${cardId}-${variant}`;
}

/** List of variants that exist for a card (from TCGdex variants object). Only includes variants the API marks as true. */
export function getVariantsFromCard(card: { variants?: Record<string, boolean> | null } | null): CardVariant[] {
  const v = card?.variants;
  if (!v || typeof v !== 'object') return ['normal'];
  const list = CARD_VARIANTS.filter((variant) => v[variant] === true);
  return list.length > 0 ? list : ['normal'];
}

/** Names that typically have only one version per set (no reverse/holo in pack). */
const SINGLE_VERSION_NAME_SUFFIX = /\s(V|ex|GX|VMAX|VSTAR)$/i;

/** True if this card name indicates a single-version card (V, ex, GX, etc.) in the set. */
export function isSingleVersionCard(card: { name?: string } | null): boolean {
  const name = card?.name?.trim();
  return !!name && SINGLE_VERSION_NAME_SUFFIX.test(name);
}

/** Variants to show for this card. Single-version cards (V, EX, GX, etc.) only show normal. */
export function getDisplayVariants(card: { name?: string; variants?: Record<string, boolean> | null } | null): CardVariant[] {
  const variants = getVariantsFromCard(card);
  const single = isSingleVersionCard(card);
  return !single ? variants : (variants.includes('normal') ? ['normal'] : variants);
}

/**
 * Set-level variant counts from TCGdex (cardCount on set). When a variant count is 0,
 * the set may have no cards in that variant – we use this to avoid showing e.g. holo when the set has none.
 */
export interface SetCardCountVariant {
  firstEd?: number;
  holo?: number;
  normal?: number;
  reverse?: number;
}

/**
 * Filter variant list by set cardCount: remove a variant when the set explicitly
 * reports 0 for that variant (no cards in set have that version). Only list e.g. normal
 * if the API (card) has it and the set doesn’t say 0 for that variant.
 */
export function filterVariantsBySetCardCount(
  variants: CardVariant[],
  setCardCount: SetCardCountVariant | null | undefined
): CardVariant[] {
  if (!setCardCount || typeof setCardCount !== 'object') return variants;
  const out = variants.filter((v) => {
    if (v === 'normal' && setCardCount.normal === 0) return false;
    if (v === 'reverse' && setCardCount.reverse === 0) return false;
    if (v === 'holo' && setCardCount.holo === 0) return false;
    if (v === 'firstEdition' && setCardCount.firstEd === 0) return false;
    return true;
  });
  return out.length > 0 ? out : variants;
}

/**
 * Source of truth for when "1st Edition" should be selectable in UI.
 * This does NOT remove sets/cards; it only controls whether the variant option is available.
 */
const FIRST_EDITION_ENGLISH_SETS = new Set([
  'base set',
  'jungle',
  'fossil',
  'team rocket',
  'gym heroes',
  'gym challenge',
  'neo genesis',
  'neo discovery',
  'neo revelation',
  'neo destiny',
]);

const FIRST_EDITION_EUROPEAN: Record<string, Set<string>> = {
  // Base/Jungle/Fossil: de, fr, it, es, nl (nl not currently supported as an app language)
  'base set': new Set(['de', 'fr', 'it', 'es', 'nl']),
  jungle: new Set(['de', 'fr', 'it', 'es', 'nl']),
  fossil: new Set(['de', 'fr', 'it', 'es', 'nl']),

  // Team Rocket: de, fr, it, es
  'team rocket': new Set(['de', 'fr', 'it', 'es']),

  // Gym Heroes / Gym Challenge: de, fr
  'gym heroes': new Set(['de', 'fr']),
  'gym challenge': new Set(['de', 'fr']),
};

function normalizeSetNameForEdition(setName: string): string {
  return setName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '');
}

function normalizeLangCodeForEdition(language: string): string {
  return language.trim().toLowerCase();
}

/**
 * True only when the set/language combination is known to have a 1st Edition print run.
 * If we can't identify the set name or language, we default to false (conservative).
 */
export function hasFirstEditionOption(
  setName: string | null | undefined,
  language: string | null | undefined
): boolean {
  if (!setName || !language) return false;
  const s = normalizeSetNameForEdition(setName);
  const lang = normalizeLangCodeForEdition(language);

  if (lang === 'en') return FIRST_EDITION_ENGLISH_SETS.has(s);
  const supportedLangs = FIRST_EDITION_EUROPEAN[s];
  return supportedLangs ? supportedLangs.has(lang) : false;
}

/** Remove firstEdition from variant list when not available for this set/language. */
export function filterVariantsBySetAndLanguage(
  variants: CardVariant[],
  setName: string | null | undefined,
  language: string | null | undefined
): CardVariant[] {
  if (hasFirstEditionOption(setName, language)) return variants;
  return variants.filter((v) => v !== 'firstEdition');
}

/** Display label for variant (e.g. "1st Edition" for firstEdition). */
export function getVariantLabel(v: CardVariant): string {
  if (v === 'firstEdition') return '1st Edition';
  if (v === 'wPromo') return 'W Promo';
  if (v === 'masterBall') return 'Master Ball';
  if (v === 'normal') return 'Normal';
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/**
 * Return a variant safe for display: the requested variant if the card has it,
 * otherwise 'normal' (or first available). Use when displaying slot variant so we
 * never show "holo" (or other) when the card only has normal/reverse.
 */
export function getValidVariantForDisplay(
  card: { variants?: Record<string, boolean> | null } | null,
  requestedVariant: CardVariant
): CardVariant {
  const valid = getVariantsFromCard(card);
  return valid.includes(requestedVariant) ? requestedVariant : (valid[0] ?? 'normal');
}

/** Filter for 1st Edition vs Unlimited when creating a binder. Default 'all'. */
export type EditionFilter = '1stEditionOnly' | 'unlimitedOnly' | 'all';

const UNLIMITED_VARIANTS: CardVariant[] = ['normal', 'reverse', 'holo', 'masterBall'];

/** Filter variant list by edition preference. Returns only variants that match the filter. */
export function filterVariantsByEdition(variants: CardVariant[], editionFilter: EditionFilter | undefined): CardVariant[] {
  const filter = editionFilter ?? 'all';
  if (filter === 'all') return variants;
  if (filter === '1stEditionOnly') return variants.filter((v) => v === 'firstEdition');
  if (filter === 'unlimitedOnly') return variants.filter((v) => UNLIMITED_VARIANTS.includes(v));
  return variants;
}

/** Reference to a card: TCGdex id + which variant the user has. */
export interface SlotCard {
  cardId: string;
  variant: CardVariant;
  /** For Single-Pokemon multi-language: language code (e.g. 'en'). */
  language?: string;
  /**
   * Optional visual override: when true, render holo gradient overlay;
   * when false, suppress it even if variant is holo/reverse.
   * Undefined means "auto" (based on variant).
   */
  holoEffect?: boolean;
}

/**
 * One "slot" in a binder: either one card per Pokemon (CTA/Master Dex)
 * or one entry per printing (Single Pokemon).
 */
export interface Slot {
  /** For CTA: national dex number. For Master Dex: form key. For Single Pokemon: cardId. */
  key: string;
  card: SlotCard | null;
}

/** Binder cover accent color (hex). Used for the Poke Ball half on the spine. */
export type BinderColorId = string;

/** A collection (binder) with a type and its slots. */
export interface Collection {
  id: string;
  name: string;
  type: BinderType;
  /** For single_pokemon: chosen Pokemon dex id and display name. */
  singlePokemonDexId?: number;
  singlePokemonName?: string;
  /** For single_pokemon: if false, only base-form cards (exact name match). Default true. */
  includeRegionalForms?: boolean;
  /** Selected languages for Single Pokemon or Master Set (e.g. ['en', 'ja']). */
  languages?: string[];
  /** For master_set: which variants to include. All true = Grandmaster Collection. */
  masterSetOptions?: MasterSetOptions;
  /** 1st Edition only, Unlimited only, or Include all. Default 'all'. */
  editionFilter?: EditionFilter;
  /** For by_set: TCGdex set id, name, and symbol image URL. */
  setId?: string;
  setName?: string;
  setSymbol?: string;
  /** For custom multi-Pokémon: chosen Pokémon dex ids and display names. Empty custom has neither. */
  customPokemonIds?: number[];
  customPokemonNames?: string[];
  /** Binder spine accent color (id from BINDER_COLOR_OPTIONS or hex). */
  binderColor?: string;
  slots: Slot[];
  /** Local-only: display name, set name, optional collector number; optional slotKey for version-choice cards (master/set); optional variant. */
  userCards?: Record<
    string,
    {
      name: string;
      setName: string;
      localId?: string;
      /**
       * For graded collections.
       * - gradingService: PSA, CGC, BGS, etc. (free text for now)
       * - grade: PSA scale option (e.g. "10", "8.5", "Authentic")
       */
      gradingService?: string;
      grade?: string;
      /** Back-compat from early graded prototype. Prefer gradingService+grade. */
      grading?: string;
      slotKey?: string;
      variant?: CardVariant;
    }
  >;
  createdAt: number;
  updatedAt: number;
}

/** Summary of a Pokemon for lists (from PokeAPI or TCGdex). */
export interface PokemonSummary {
  dexId: number;
  name: string;
  form?: string;
}

/** Unique slot key for master set grid (base species = dexId, forms = dexId-form). */
export function getSlotKey(p: PokemonSummary): string {
  return p.form ? `${p.dexId}-${p.form}` : String(p.dexId);
}

/** App-facing card model (from TCGdex). */
export interface AppCard {
  id: string;
  name: string;
  localId: string;
  image: string | null;
  set: { id: string; name: string };
  dexId: number[] | null;
  category: 'Pokemon' | 'Trainer' | 'Energy';
  variants: {
    normal: boolean;
    reverse: boolean;
    holo: boolean;
    firstEdition: boolean;
    wPromo?: boolean;
  };
}

/** Card brief for list views (from TCGdex set.cards or card list). */
export interface AppCardBrief {
  id: string;
  name: string;
  localId: string;
  image: string | null;
  /** Set info when available (e.g. from getCard). Otherwise setId can be derived from id (setId-localId). */
  set?: { id: string; name?: string };
}

/** Admin-defined default card to show for a slot when no card is collected (e.g. CTA). */
export type DefaultCardOverrides = Record<string, string>;

/** Variants object like TCGdex (which variants the card has). */
export interface CardVariantsMap {
  /** Allow safe indexing (treat unknown keys as absent). */
  [key: string]: boolean | undefined;
  normal: boolean;
  reverse: boolean;
  holo: boolean;
  firstEdition: boolean;
  /** Wizards stamped promo; optional for backward compatibility. */
  wPromo?: boolean;
}

/**
 * Admin-added custom card (e.g. extra Unown). Behaves like an API card: same show/hide rules,
 * no image = same as API cards with no image. Stored in Firestore config.
 */
export interface CustomCard {
  id: string;
  /** Slot key in CTA/master set (e.g. "201-unown-exclaim"). Must be unique. */
  slotKey: string;
  name: string;
  /** For ordering in the list (e.g. 201 for Unown). */
  dexId: number;
  localId: string;
  setId: string;
  setName: string;
  /** Optional; if null, behaves like API cards with no image. */
  image: string | null;
  variants: CardVariantsMap;
  createdAt?: number;
}

/** Entry in CTA / Master Set list: Pokémon (from API), admin custom card, or user-added local card. */
export type MasterListEntry =
  | PokemonSummary
  | { type: 'custom'; slotKey: string; name: string; dexId: number; card: CustomCard }
  | { type: 'user'; slotKey: string; name: string; cardId: string };

/** Get slot key for list item (Pokémon, custom, or user). */
export function getSlotKeyForEntry(entry: MasterListEntry): string {
  if ('type' in entry && (entry.type === 'custom' || entry.type === 'user')) return entry.slotKey;
  return getSlotKey(entry);
}
