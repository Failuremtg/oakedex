/**
 * Card data cache – download sets + species on first app open and refresh when
 * the user opens the app so new cards/sets are available.
 * Uses AsyncStorage; sync runs from tabs layout on mount and when app becomes active.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TCGdexSetBrief, TCGdexSet, TCGdexCard, TCGdexCardBrief } from './tcgdex';
import { SET_IDS_WITHOUT_CARDS, isPocketSet } from './tcgdex';
import type { PokemonSummary } from '@/src/types';

const PREFIX = '@oakedex/cardcache/';
const KEY_LAST_SYNC = `${PREFIX}lastSyncAt`;
const KEY_SETS = `${PREFIX}sets_en`;
const KEY_POCKET_SET_IDS = `${PREFIX}pocketSetIds`;
const KEY_EXCLUDED_SET_IDS = `${PREFIX}excludedSetIds`;
const KEY_SPECIES = `${PREFIX}species`;
const KEY_SET_PREFIX = `${PREFIX}set_`;
const KEY_CARD_PREFIX = `${PREFIX}card_`;
const KEY_CARDS_BY_NAME_PREFIX = `${PREFIX}name_`;

/** Sanitize for AsyncStorage key (cardId may contain chars we keep, e.g. hyphen). */
function cardKey(lang: string, cardId: string): string {
  return KEY_CARD_PREFIX + lang + '_' + cardId.replace(/[^a-zA-Z0-9-]/g, '_');
}

function nameSearchKey(lang: string, name: string, exact: boolean): string {
  const safe = encodeURIComponent(name).slice(0, 120);
  return KEY_CARDS_BY_NAME_PREFIX + lang + '_' + (exact ? '1' : '0') + '_' + safe;
}

/** Consider cache stale after this many ms (e.g. refresh on next app open). */
export const CACHE_STALE_MS = 24 * 60 * 60 * 1000; // 24h

export function getLastSyncAt(): Promise<number | null> {
  return AsyncStorage.getItem(KEY_LAST_SYNC).then((s) => (s != null ? Number(s) : null));
}

export function setLastSyncAt(ms: number): Promise<void> {
  return AsyncStorage.setItem(KEY_LAST_SYNC, String(ms));
}

export async function getCachedSets(): Promise<TCGdexSetBrief[] | null> {
  const raw = await AsyncStorage.getItem(KEY_SETS);
  if (raw == null) return null;
  try {
    const arr = JSON.parse(raw) as TCGdexSetBrief[];
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

export async function setCachedSets(sets: TCGdexSetBrief[]): Promise<void> {
  await AsyncStorage.setItem(KEY_SETS, JSON.stringify(sets));
}

export async function getCachedPocketSetIds(): Promise<string[] | null> {
  const raw = await AsyncStorage.getItem(KEY_POCKET_SET_IDS);
  if (raw == null) return null;
  try {
    const arr = JSON.parse(raw) as string[];
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

export async function setCachedPocketSetIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(KEY_POCKET_SET_IDS, JSON.stringify(ids));
}

export async function getCachedSpecies(): Promise<PokemonSummary[] | null> {
  const raw = await AsyncStorage.getItem(KEY_SPECIES);
  if (raw == null) return null;
  try {
    const arr = JSON.parse(raw) as PokemonSummary[];
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

export async function setCachedSpecies(species: PokemonSummary[]): Promise<void> {
  await AsyncStorage.setItem(KEY_SPECIES, JSON.stringify(species));
}

export async function getCachedSetCards(setId: string): Promise<TCGdexSet | null> {
  const raw = await AsyncStorage.getItem(KEY_SET_PREFIX + setId);
  if (raw == null) return null;
  try {
    const obj = JSON.parse(raw) as TCGdexSet;
    return obj?.id != null && Array.isArray(obj?.cards) ? obj : null;
  } catch {
    return null;
  }
}

export async function setCachedSetCards(setData: TCGdexSet): Promise<void> {
  await AsyncStorage.setItem(KEY_SET_PREFIX + setData.id, JSON.stringify(setData));
}

/** Single card by lang + cardId (full TCGdex card with image, variants, set). */
export async function getCachedCard(lang: string, cardId: string): Promise<TCGdexCard | null> {
  const raw = await AsyncStorage.getItem(cardKey(lang, cardId));
  if (raw == null) return null;
  try {
    const obj = JSON.parse(raw) as TCGdexCard;
    return obj?.id != null ? obj : null;
  } catch {
    return null;
  }
}

export async function setCachedCard(lang: string, cardId: string, card: TCGdexCard): Promise<void> {
  await AsyncStorage.setItem(cardKey(lang, cardId), JSON.stringify(card));
}

/** Cards-by-name search result (briefs). */
export async function getCachedCardsByName(
  lang: string,
  name: string,
  exact: boolean
): Promise<TCGdexCardBrief[] | null> {
  const raw = await AsyncStorage.getItem(nameSearchKey(lang, name, exact));
  if (raw == null) return null;
  try {
    const arr = JSON.parse(raw) as TCGdexCardBrief[];
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

export async function setCachedCardsByName(
  lang: string,
  name: string,
  exact: boolean,
  cards: TCGdexCardBrief[]
): Promise<void> {
  await AsyncStorage.setItem(nameSearchKey(lang, name, exact), JSON.stringify(cards));
}

/** Set IDs to hide from set picker (no card list in API). Merges constant list with any discovered and stored. */
export async function getExcludedSetIds(): Promise<string[]> {
  const stored = await AsyncStorage.getItem(KEY_EXCLUDED_SET_IDS);
  let ids: string[] = [];
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed)) ids = parsed;
    } catch {}
  }
  const combined = new Set([...SET_IDS_WITHOUT_CARDS, ...ids]);
  return [...combined];
}

/** Call when a set returns no cards so we hide it from the set picker next time. */
export async function addExcludedSetId(setId: string): Promise<void> {
  const current = await getExcludedSetIds();
  if (current.includes(setId)) return;
  await AsyncStorage.setItem(KEY_EXCLUDED_SET_IDS, JSON.stringify([...current, setId]));
}

/** Returns true if cache is missing or older than CACHE_STALE_MS. */
export async function isCacheStale(): Promise<boolean> {
  const at = await getLastSyncAt();
  if (at == null) return true;
  return Date.now() - at > CACHE_STALE_MS;
}

/**
 * Fetch sets (en) and species list and write to cache. Call on app open so
 * first-time users get data and returning users get new cards/sets.
 */
export async function syncCardData(): Promise<void> {
  await syncCardDataWithProgress(() => {});
}

export type SyncProgressCallback = (progress: number, message: string) => void;

/**
 * Same as syncCardData but calls onProgress(0–1, message) so the UI can show a loading bar and status.
 */
export async function syncCardDataWithProgress(onProgress: SyncProgressCallback): Promise<void> {
  const [getSetsRaw, getSpeciesList] = await Promise.all([
    import('./tcgdex').then((m) => m.getSetsRaw),
    import('./pokeapi').then((m) => m.getSpeciesList),
  ]);
  try {
    onProgress(0.1, 'Loading card sets...');
    const rawSets = await getSetsRaw('en');
    const pocketIds = rawSets.filter((s) => isPocketSet(s)).map((s) => s.id);
    const sets = rawSets.filter((s) => !isPocketSet(s));
    onProgress(0.4, 'Saving sets...');
    await Promise.all([setCachedSets(sets), setCachedPocketSetIds(pocketIds)]);

    onProgress(0.5, 'Loading Pokémon list...');
    const species = await getSpeciesList(1025, 0);
    onProgress(0.85, 'Saving data...');
    await setCachedSpecies(species);
    await setLastSyncAt(Date.now());
    onProgress(1, 'Ready!');
  } catch {
    onProgress(1, 'Using cached data');
    // Keep existing cache on network error
  }
}

/**
 * Get sets list: use cache if available (instant), and refresh in background if stale.
 * First time: fetches and caches then returns.
 */
export async function getSetsWithCache(): Promise<TCGdexSetBrief[]> {
  const cached = await getCachedSets();
  const stale = await isCacheStale();
  if (stale) {
    syncCardData().catch(() => {});
  }
  if (cached != null && cached.length > 0) {
    return cached.filter((s) => !isPocketSet(s));
  }
  const { getSetsRaw } = await import('./tcgdex');
  const rawSets = await getSetsRaw('en');
  const pocketIds = rawSets.filter((s) => isPocketSet(s)).map((s) => s.id);
  const sets = rawSets.filter((s) => !isPocketSet(s));
  await Promise.all([setCachedSets(sets), setCachedPocketSetIds(pocketIds)]);
  if (stale) await setLastSyncAt(Date.now());
  return sets;
}

/**
 * Set IDs for Pokémon TCG Pocket (tcgp). Used to hide Pocket sets/cards everywhere.
 * Returns empty array until sets have been synced at least once.
 */
export async function getPocketSetIds(): Promise<string[]> {
  const cached = await getCachedPocketSetIds();
  if (cached != null) return cached;
  const { getSetsRaw } = await import('./tcgdex');
  const rawSets = await getSetsRaw('en');
  const ids = rawSets.filter((s) => isPocketSet(s)).map((s) => s.id);
  await setCachedPocketSetIds(ids).catch(() => {});
  return ids;
}

/**
 * Get species list: use cache if available, refresh in background if stale.
 */
export async function getSpeciesWithCache(): Promise<PokemonSummary[]> {
  const cached = await getCachedSpecies();
  const stale = await isCacheStale();
  if (stale) {
    syncCardData().catch(() => {});
  }
  if (cached != null && cached.length > 0) {
    return cached;
  }
  const { getSpeciesList } = await import('./pokeapi');
  const species = await getSpeciesList(1025, 0);
  await setCachedSpecies(species);
  if (stale) await setLastSyncAt(Date.now());
  return species;
}

/**
 * Get one set with cards: use cache if available, then refresh in background.
 */
export async function getSetWithCache(
  setId: string,
  lang: 'en' = 'en'
): Promise<TCGdexSet> {
  const cached = await getCachedSetCards(setId);
  if (cached != null) {
    import('./tcgdex').then((m) => m.getSet(lang, setId)).then((fresh) => {
      setCachedSetCards(fresh).catch(() => {});
    }).catch(() => {});
    return cached;
  }
  const { getSet } = await import('./tcgdex');
  const setData = await getSet(lang, setId);
  await setCachedSetCards(setData);
  return setData;
}
