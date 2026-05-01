/**
 * TCGdex API client – cards, sets, by language.
 * Base: https://api.tcgdex.net/v2/{lang}/
 */

const BASE = 'https://api.tcgdex.net/v2';

export type TCGdexLang = 'en' | 'fr' | 'de' | 'es' | 'it' | 'pt' | 'ja' | 'zh-TW' | 'id' | 'th';

/** TCGdex API uses lowercase in paths (e.g. zh-tw not zh-TW). Use this when building API URLs. */
export function toTcgdexApiLang(lang: TCGdexLang): string {
  return lang === 'zh-TW' ? 'zh-tw' : lang;
}

/** Language options for binder creation (id = TCGdex lang code). Includes Chinese (TW) and Thai. */
export const LANGUAGE_OPTIONS: { id: TCGdexLang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'ja', label: 'Japanese' },
  { id: 'zh-TW', label: 'Chinese (TW)' },
  { id: 'th', label: 'Thai' },
  { id: 'fr', label: 'French' },
  { id: 'de', label: 'German' },
  { id: 'es', label: 'Spanish' },
  { id: 'it', label: 'Italian' },
  { id: 'pt', label: 'Portuguese' },
  { id: 'id', label: 'Indonesian' },
];

/** Set IDs that the API lists but returns no cards for – hidden from set picker. */
export const SET_IDS_WITHOUT_CARDS: string[] = ['wp', 'jumbo'];

/** Serie id for Pokémon TCG Pocket – sets with this serie (or /tcgp/ in logo/symbol URL) are excluded from the set picker. */
export const SERIE_ID_TCG_POCKET = 'tcgp';

/** Returns true if this set is from Pokémon TCG Pocket (mobile game). We exclude these from the set list. */
export function isPocketSet(set: { logo?: string; symbol?: string; serie?: { id?: string } }): boolean {
  if (set.serie?.id === SERIE_ID_TCG_POCKET) return true;
  const logo = set.logo ?? '';
  const symbol = set.symbol ?? '';
  return logo.includes('/tcgp/') || symbol.includes('/tcgp/');
}

/** Returns true if this set should be shown in the set picker (has card list in API). */
export function isSetWithCards(setId: string): boolean {
  return !SET_IDS_WITHOUT_CARDS.includes(setId);
}

/** TCGdex set brief (from /sets list). */
export interface TCGdexSetBrief {
  id: string;
  name: string;
  /** yyyy-mm-dd (ISO). Used for sorting cards by set release. */
  releaseDate?: string;
  logo?: string;
  symbol?: string;
  cardCount?: { total: number; official: number };
  /** Optional in list response; used to exclude Pokémon TCG Pocket. */
  serie?: { id?: string; name?: string };
}

/** TCGdex set with cards array (from /sets/{id}). */
export interface TCGdexSet {
  id: string;
  name: string;
  /** yyyy-mm-dd (ISO). */
  releaseDate?: string;
  cards: Array<{ id: string; name: string; localId: string; image?: string }>;
  /** API may include variant counts: 0 = no cards in set have that variant (e.g. Ascended Heroes has no holo). */
  cardCount?: {
    total: number;
    official: number;
    firstEd?: number;
    holo?: number;
    normal?: number;
    reverse?: number;
  };
}

/** TCGdex card brief. */
export interface TCGdexCardBrief {
  id: string;
  localId: string;
  name: string;
  image?: string | null;
  /**
   * Some endpoints/variants include set info in brief responses; keep optional so callers can display set name when present.
   */
  set?: { id: string; name?: string };
}

/** TCGdex pricing – Cardmarket (EUR) and TCGplayer (USD). Included in card response. */
export interface TCGdexCardmarketPricing {
  updated?: string;
  unit: string;
  avg?: number;
  low?: number;
  trend?: number;
  avg1?: number;
  avg7?: number;
  avg30?: number;
  'avg-holo'?: number;
  'low-holo'?: number;
  'trend-holo'?: number;
}

export interface TCGdexTcgplayerVariant {
  lowPrice?: number;
  midPrice?: number;
  highPrice?: number;
  marketPrice?: number;
  directLowPrice?: number;
}

export interface TCGdexTcgplayerPricing {
  updated?: string;
  unit: string;
  normal?: TCGdexTcgplayerVariant;
  reverse?: TCGdexTcgplayerVariant;
  holofoil?: TCGdexTcgplayerVariant;
  '1stEdition'?: TCGdexTcgplayerVariant;
}

export interface TCGdexPricing {
  cardmarket?: TCGdexCardmarketPricing;
  tcgplayer?: TCGdexTcgplayerPricing;
}

/** TCGdex full card (Pokemon). Includes pricing when returned by API. */
export interface TCGdexCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
  category: string;
  set: { id: string; name: string; cardCount?: { official: number; total: number } };
  /** normal, reverse, holo, firstEdition; API may also include wPromo (Wizards stamped promo). */
  variants: { normal: boolean; reverse: boolean; holo: boolean; firstEdition: boolean; wPromo?: boolean };
  dexId?: number[];
  hp?: number;
  types?: string[];
  evolveFrom?: string;
  stage?: string;
  /** Market prices (Cardmarket EUR, TCGplayer USD). Present in API response. */
  pricing?: TCGdexPricing;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(h: string | null): number | null {
  if (!h) return null;
  const seconds = Number(h);
  if (!Number.isNaN(seconds) && seconds > 0) return Math.min(seconds * 1000, 30_000);
  const dt = Date.parse(h);
  if (!Number.isNaN(dt)) return Math.min(Math.max(dt - Date.now(), 0), 30_000);
  return null;
}

async function fetchJson<T>(
  url: string,
  options?: { timeoutMs?: number; retries?: number }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options?.retries ?? DEFAULT_RETRIES;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) return res.json() as Promise<T>;

      const retryable = res.status === 429 || res.status >= 500;
      const hint = `TCGdex ${res.status}: ${url}`;
      if (!retryable || attempt === retries) throw new Error(hint);

      const retryAfter = parseRetryAfterMs(res.headers.get('retry-after'));
      const backoff = retryAfter ?? Math.min(500 * Math.pow(2, attempt), 4_000);
      await sleep(backoff);
    } catch (e) {
      lastError = e;
      const isAbort = e instanceof Error && e.name === 'AbortError';
      if (attempt === retries) {
        if (isAbort) throw new Error(`TCGdex timeout after ${timeoutMs}ms: ${url}`);
        throw e;
      }
      const backoff = Math.min(500 * Math.pow(2, attempt), 4_000);
      await sleep(backoff);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`TCGdex request failed: ${url}`);
}

/**
 * TCGdex asset URLs often have no file extension. Card images need /high.png;
 * symbols/logos need .png. Use for set symbols/logos and card images.
 * @see https://tcgdex.dev/assets
 */
export function normalizeTcgdexImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim();
  if (!u.includes('tcgdex.net')) return u;
  if (/\.(png|webp|jpg|jpeg|gif|svg)(\?|$)/i.test(u)) return u;
  const base = u.replace(/\?.*$/, '');
  const pathPart = (base.split('/').pop() ?? '').toLowerCase();
  const isSymbolOrLogo = pathPart === 'symbol' || pathPart === 'logo';
  return isSymbolOrLogo ? `${base}.png` : `${base}/high.png`;
}

const ASSETS_BASE = 'https://assets.tcgdex.net';

/**
 * Build card image URL from card id and language when the API omits image.
 * Card id is "{setId}-{localId}" (e.g. base1-4, sm7.5-3). Asset path is /{lang}/{setFolder}/{setId}/{localId}.
 */
export function cardImageUrlFromId(lang: TCGdexLang, cardId: string, localId?: string): string {
  const dash = cardId.lastIndexOf('-');
  const setId = dash >= 0 ? cardId.slice(0, dash) : cardId;
  const local = localId ?? (dash >= 0 ? cardId.slice(dash + 1) : '');
  const setFolder = (setId.match(/^[a-z]+/i)?.[0] ?? setId).toLowerCase();
  const apiLang = toTcgdexApiLang(lang);
  return `${ASSETS_BASE}/${apiLang}/${setFolder}/${setId}/${local}`;
}

/** List all sets for a language. Excludes Pokémon TCG Pocket sets. */
export async function getSets(lang: TCGdexLang = 'en'): Promise<TCGdexSetBrief[]> {
  const list = await getSetsRaw(lang);
  return list.filter((s) => !isPocketSet(s));
}

/** List all sets for a language (no Pocket filter). Used to derive Pocket set IDs for filtering elsewhere. */
export async function getSetsRaw(lang: TCGdexLang = 'en'): Promise<TCGdexSetBrief[]> {
  return fetchJson<TCGdexSetBrief[]>(`${BASE}/${toTcgdexApiLang(lang)}/sets`);
}

/** Get one set with its cards (briefs). */
export async function getSet(lang: TCGdexLang, setId: string): Promise<TCGdexSet> {
  return fetchJson<TCGdexSet>(`${BASE}/${toTcgdexApiLang(lang)}/sets/${setId}`);
}

async function fillCardImage(lang: TCGdexLang, card: TCGdexCard): Promise<void> {
  if (card.image) return;
  const constructedUrl = normalizeTcgdexImageUrl(cardImageUrlFromId(lang, card.id, card.localId)) ?? cardImageUrlFromId(lang, card.id, card.localId);
  try {
    const { getFallbackCardImageUrl } = await import('./pokemonTcgApi');
    const fallbackUrl = await getFallbackCardImageUrl(card.id);
    card.image = fallbackUrl ?? constructedUrl;
  } catch {
    card.image = constructedUrl;
  }
}

/** Get a single card by id (full details including dexId and variants). Uses persistent cache so revisiting a binder or search is instant. When TCGdex has no image, tries constructed TCGdex asset URL then Pokémon TCG API (pokemontcg.io) if available. */
export async function getCard(lang: TCGdexLang, cardId: string): Promise<TCGdexCard> {
  const { getCachedCard, setCachedCard } = await import('./cardDataCache');
  const cached = await getCachedCard(toTcgdexApiLang(lang), cardId);
  if (cached != null) {
    if (!cached.image) {
      await fillCardImage(lang, cached);
      await setCachedCard(toTcgdexApiLang(lang), cardId, cached).catch(() => {});
    }
    return cached;
  }
  const card = await fetchJson<TCGdexCard>(`${BASE}/${toTcgdexApiLang(lang)}/cards/${cardId}`);
  await fillCardImage(lang, card);
  await setCachedCard(toTcgdexApiLang(lang), cardId, card).catch(() => {});
  return card;
}

/**
 * Search cards by name (lax match). Returns card briefs.
 * Use strict match with eq: for exact name (e.g. "Charizard" only).
 * Results are cached so repeat searches (e.g. same Pokémon in another binder) load instantly.
 */
export async function getCardsByName(
  lang: TCGdexLang,
  name: string,
  options?: { exact?: boolean; page?: number; itemsPerPage?: number }
): Promise<TCGdexCardBrief[]> {
  const exact = options?.exact ?? false;
  const page = options?.page;
  const itemsPerPage = options?.itemsPerPage;
  const apiLang = toTcgdexApiLang(lang);
  const { getCachedCardsByName, setCachedCardsByName } = await import('./cardDataCache');
  const canUseCache = page == null && itemsPerPage == null;
  const cached = canUseCache ? await getCachedCardsByName(apiLang, name, exact) : null;
  if (cached != null) return cached;
  const filter = exact ? `name=eq:${encodeURIComponent(name)}` : `name=${encodeURIComponent(name)}`;
  const paginationParts: string[] = [];
  if (page != null) paginationParts.push(`pagination:page=${encodeURIComponent(String(page))}`);
  if (itemsPerPage != null) paginationParts.push(`pagination:itemsPerPage=${encodeURIComponent(String(itemsPerPage))}`);
  const pagination = paginationParts.length ? `&${paginationParts.join('&')}` : '';
  const url = `${BASE}/${apiLang}/cards?${filter}${pagination}`;
  const cards = await fetchJson<TCGdexCardBrief[]>(url);
  if (canUseCache) await setCachedCardsByName(apiLang, name, exact, cards).catch(() => {});
  return cards;
}

/**
 * Filter card briefs so only names that match the intended species/entry are kept.
 * Keeps exact match or "SearchName " prefix (e.g. "Abra" matches "Abra", "Abra ex"; rejects "Kadabra").
 * Use when loading cards for a specific slot to avoid substring matches (Abra vs Kadabra).
 */
export function filterCardsByNameStrict<T extends { name?: string | null }>(
  cards: T[],
  searchName: string
): T[] {
  const s = (searchName ?? '').trim();
  if (!s) return cards;
  const prefix = s + ' ';
  return cards.filter((c) => {
    const n = (c.name ?? '').trim();
    return n === s || n.startsWith(prefix);
  });
}

/**
 * Fetch full card details for each brief to get dexId and variants.
 * Use when we need to show variant options or dexId.
 */
export async function getCardsFull(lang: TCGdexLang, cardIds: string[]): Promise<TCGdexCard[]> {
  const results = await Promise.all(cardIds.slice(0, 50).map((id) => getCard(lang, id)));
  return results;
}

const CARDS_BY_ID_BATCH = 25;

/**
 * Fetch card briefs by id for a language. Used to show the same printings in multiple languages
 * (each language has its own name/image). Cards missing in that language are skipped.
 */
export async function getCardsByIds(
  lang: TCGdexLang,
  cardIds: string[]
): Promise<AppCardBrief[]> {
  const out: AppCardBrief[] = [];
  for (let i = 0; i < cardIds.length; i += CARDS_BY_ID_BATCH) {
    const batch = cardIds.slice(i, i + CARDS_BY_ID_BATCH);
    const results = await Promise.all(
      batch.map((id) => getCard(lang, id).catch(() => null))
    );
    for (const card of results) {
      if (card) {
        out.push({
          id: card.id,
          name: card.name,
          localId: card.localId,
          image: card.image ?? null,
          set: card.set ? { id: card.set.id, name: card.set.name } : undefined,
        });
      }
    }
  }
  return out;
}

import type { AppCard, AppCardBrief } from '@/src/types';

/** Map TCGdex card to app model. */
export function toAppCard(c: TCGdexCard): AppCard {
  return {
    id: c.id,
    name: c.name,
    localId: c.localId,
    image: c.image ?? null,
    set: c.set,
    dexId: c.dexId ?? null,
    category: c.category as 'Pokemon' | 'Trainer' | 'Energy',
    variants: c.variants,
  };
}

export function toAppCardBrief(c: TCGdexCardBrief): AppCardBrief {
  return {
    id: c.id,
    name: c.name,
    localId: c.localId,
    image: c.image ?? null,
  };
}
