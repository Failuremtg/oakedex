/**
 * Manual cards layer – CRUD, storage, merge with TCGdex, and UI grouping.
 * Storage: AsyncStorage with seed from manual_cards.json when empty.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ManualCard,
  ManualCardGroup,
  ManualCardListFilters,
  ManualCardsStorage,
  StampedPromosJson,
  TrickOrTradeJson,
} from '@/src/types/manualCards';
import {
  MANUAL_CARD_SEED_SET_GROUPS,
  validateManualCard,
} from '@/src/types/manualCards';

const STORAGE_KEY = '@oakedex/manual_cards';

/** Seed from repo JSON when storage is empty. Fallback to code default if require fails (e.g. tests). */
function getSeedStorage(): ManualCardsStorage {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const seed = require('@/src/data/manual_cards.json') as ManualCardsStorage;
    if (seed && typeof seed === 'object' && Array.isArray(seed.cards)) {
      const setGroupSubSets =
        seed.setGroupSubSets && typeof seed.setGroupSubSets === 'object'
          ? { ...MANUAL_CARD_SEED_SET_GROUPS, ...seed.setGroupSubSets }
          : MANUAL_CARD_SEED_SET_GROUPS;
      return { setGroupSubSets, cards: [...(seed.cards ?? [])] };
    }
  } catch {
    // ignore (e.g. path not bundled or tests)
  }
  return {
    setGroupSubSets: { ...MANUAL_CARD_SEED_SET_GROUPS },
    cards: [],
  };
}

async function loadStorage(): Promise<ManualCardsStorage> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ManualCardsStorage;
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.cards)) {
        const setGroupSubSets =
          parsed.setGroupSubSets && typeof parsed.setGroupSubSets === 'object'
            ? { ...MANUAL_CARD_SEED_SET_GROUPS, ...parsed.setGroupSubSets }
            : MANUAL_CARD_SEED_SET_GROUPS;
        return { setGroupSubSets, cards: parsed.cards };
      }
    }
  } catch {
    // ignore
  }
  return getSeedStorage();
}

async function saveStorage(data: ManualCardsStorage): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Generate a stable manualId (time + random). Caller can pass a custom manualId when adding. */
export function generateManualId(): string {
  return `manual_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Add a manual card. Validates before add. If card.manualId is missing, one is generated.
 */
export async function addManualCard(card: Omit<ManualCard, 'manualId'> & { manualId?: string }): Promise<ManualCard> {
  const err = validateManualCard(card);
  if (err) throw new Error(err);

  const manualId = card.manualId ?? generateManualId();
  const full: ManualCard = { ...card, manualId };

  const data = await loadStorage();
  if (data.cards.some((c) => c.manualId === manualId)) {
    throw new Error(`Manual card with manualId "${manualId}" already exists`);
  }
  data.cards.push(full);
  await saveStorage(data);
  return full;
}

/**
 * Update a manual card by manualId. Only provided fields are patched.
 */
export async function updateManualCard(
  manualId: string,
  patch: Partial<Omit<ManualCard, 'manualId'>>
): Promise<ManualCard> {
  const data = await loadStorage();
  const index = data.cards.findIndex((c) => c.manualId === manualId);
  if (index < 0) throw new Error(`Manual card not found: ${manualId}`);

  const updated = { ...data.cards[index], ...patch, manualId };
  const err = validateManualCard(updated);
  if (err) throw new Error(err);

  data.cards[index] = updated;
  await saveStorage(data);
  return updated;
}

/**
 * Delete a manual card by manualId.
 */
export async function deleteManualCard(manualId: string): Promise<void> {
  const data = await loadStorage();
  const before = data.cards.length;
  data.cards = data.cards.filter((c) => c.manualId !== manualId);
  if (data.cards.length === before) throw new Error(`Manual card not found: ${manualId}`);
  await saveStorage(data);
}

/**
 * Bulk add manual cards. Loads/saves storage once. Skips any card whose manualId already exists.
 * Returns counts { added, skipped }.
 */
export async function addManualCardsBulk(cards: ManualCard[]): Promise<{ added: number; skipped: number }> {
  const data = await loadStorage();
  const existingIds = new Set(data.cards.map((c) => c.manualId));
  let added = 0;
  let skipped = 0;
  for (const card of cards) {
    const err = validateManualCard(card);
    if (err) throw new Error(`Invalid card ${card.manualId}: ${err}`);
    if (existingIds.has(card.manualId)) {
      skipped += 1;
      continue;
    }
    existingIds.add(card.manualId);
    data.cards.push(card);
    added += 1;
  }
  if (added > 0) await saveStorage(data);
  return { added, skipped };
}

/**
 * Convert Trick or Trade JSON into ManualCard[] with deterministic manualIds (re-import skips duplicates).
 * - setGroup = series (e.g. "Trick or Trade")
 * - subSet = year from set name: "Trick or Trade 2022" -> "2022", "Trick or Trade 2025 (single promo card)" -> "2025"
 * - number = leading number from "015/192" -> 15
 * - variant = { type: "stamped", stamp: pattern or "Halloween Pikachu jack-o'-lantern" }
 */
export function trickOrTradeJsonToManualCards(
  json: TrickOrTradeJson,
  options?: { stampLabel?: string }
): ManualCard[] {
  const setGroup = json.series?.trim() || 'Trick or Trade';
  const stamp = options?.stampLabel ?? json.pattern ?? "Halloween Pikachu jack-o'-lantern stamp";
  const defaultLangs = json.defaultLanguages?.length ? json.defaultLanguages : ['en'];
  const out: ManualCard[] = [];

  for (const setBlock of json.sets ?? []) {
    const subSet = parseSubSetFromSetName(setBlock.set);
    for (const item of setBlock.cards ?? []) {
      const num = parseCollectionNumber(item.number);
      const name = (item.name ?? '').trim();
      const languages = item.languages?.length ? item.languages : defaultLangs;
      const manualId = `tot_${subSet}_${num}_${sanitizeIdPart(name)}`;
      out.push({
        manualId,
        setGroup,
        subSet,
        number: num,
        pokemon: { en: name },
        languagesAvailable: languages,
        variant: { type: 'stamped', stamp },
      });
    }
  }
  return out;
}

function parseSubSetFromSetName(setName: string, seriesPrefix?: string): string {
  const m = setName.match(/(\d{4})/);
  if (m) return m[1]!;
  const prefix = seriesPrefix ?? 'Trick or Trade';
  return setName.replace(new RegExp(`^${escapeRegex(prefix)}\\s*`, 'i'), '').trim() || 'unknown';
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse collection number: "015/192" -> 15, "SWSH153" -> 153. Uses first numeric part or trailing digits.
 */
function parseCollectionNumber(numStr: string): number {
  if (typeof numStr === 'number' && Number.isFinite(numStr)) return Math.max(0, Math.floor(numStr));
  const s = String(numStr).trim();
  const slash = s.indexOf('/');
  const first = slash >= 0 ? s.slice(0, slash).trim() : s;
  let n = parseInt(first, 10);
  if (Number.isNaN(n)) {
    const digits = first.match(/\d+/g);
    n = digits?.length ? parseInt(digits[digits.length - 1]!, 10) : 0;
  }
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

function sanitizeIdPart(name: string): string {
  return name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || 'card';
}

/**
 * Import Trick or Trade cards into the manual cards database. Uses bundled trick_or_trade.json if json not provided.
 * Re-running is safe: cards with the same deterministic manualId are skipped.
 */
export async function importTrickOrTradeFromJson(
  json?: TrickOrTradeJson
): Promise<{ added: number; skipped: number; total: number }> {
  const data: TrickOrTradeJson = json ?? (require('@/src/data/trick_or_trade.json') as TrickOrTradeJson);
  const cards = trickOrTradeJsonToManualCards(data);
  const { added, skipped } = await addManualCardsBulk(cards);
  return { added, skipped, total: cards.length };
}

/**
 * Convert Holiday Calendar JSON (same shape as Trick or Trade) into ManualCard[].
 * manualId prefix "hc_", variant stamp from json.pattern (e.g. "Snowflake stamp").
 */
export function holidayCalendarJsonToManualCards(
  json: TrickOrTradeJson,
  options?: { stampLabel?: string }
): ManualCard[] {
  const setGroup = json.series?.trim() || 'Holiday Calendar';
  const stamp = options?.stampLabel ?? json.pattern ?? 'Snowflake stamp';
  const defaultLangs = json.defaultLanguages?.length ? json.defaultLanguages : ['en'];
  const out: ManualCard[] = [];

  for (const setBlock of json.sets ?? []) {
    const subSet = parseSubSetFromSetName(setBlock.set, 'Holiday Calendar');
    for (const item of setBlock.cards ?? []) {
      const num = parseCollectionNumber(item.number);
      const name = (item.name ?? '').trim();
      const languages = item.languages?.length ? item.languages : defaultLangs;
      const manualId = `hc_${subSet}_${num}_${sanitizeIdPart(name)}`;
      out.push({
        manualId,
        setGroup,
        subSet,
        number: num,
        pokemon: { en: name },
        languagesAvailable: languages,
        variant: { type: 'stamped', stamp },
      });
    }
  }
  return out;
}

/**
 * Import Holiday Calendar cards into the manual cards database. Uses bundled holiday_calendar.json if json not provided.
 * Re-running is safe: cards with the same deterministic manualId are skipped.
 */
export async function importHolidayCalendarFromJson(
  json?: TrickOrTradeJson
): Promise<{ added: number; skipped: number; total: number }> {
  const data: TrickOrTradeJson = json ?? (require('@/src/data/holiday_calendar.json') as TrickOrTradeJson);
  const cards = holidayCalendarJsonToManualCards(data);
  const { added, skipped } = await addManualCardsBulk(cards);
  return { added, skipped, total: cards.length };
}

/**
 * Convert Stamped Promos JSON (Bulbapedia scraper output) into ManualCard[].
 * Preserves manualId, tcgdexId, numberDisplay (original number string), and sourceNote.
 */
export function stampedPromosJsonToManualCards(json: StampedPromosJson): ManualCard[] {
  const out: ManualCard[] = [];
  for (const c of json.cards ?? []) {
    const num = parseCollectionNumber(c.number);
    out.push({
      manualId: c.manualId,
      tcgdexId: c.tcgdexId ?? undefined,
      setGroup: c.setGroup,
      subSet: c.subSet,
      number: num,
      numberDisplay: c.number,
      pokemon: c.pokemon ?? { en: '' },
      languagesAvailable: c.languagesAvailable ?? ['en'],
      variant: c.variant ?? { type: 'promo' },
      sourceNote: c.sourceNote,
    });
  }
  return out;
}

/**
 * Import Stamped Promos (no Black Star / no calendar) into the manual cards database.
 * Uses bundled stamped_promos_no_blackstar_no_calendar.json if json not provided.
 * Run the Bulbapedia scraper script to generate that file, then replace or pass json.
 */
export async function importStampedPromosFromJson(
  json?: StampedPromosJson
): Promise<{ added: number; skipped: number; total: number }> {
  let data: StampedPromosJson;
  try {
    data = json ?? (require('@/src/data/stamped_promos_no_blackstar_no_calendar.json') as StampedPromosJson);
  } catch {
    data = { cards: [] };
  }
  const cards = stampedPromosJsonToManualCards(data);
  const { added, skipped } = await addManualCardsBulk(cards);
  return { added, skipped, total: cards.length };
}

/**
 * List manual cards with optional filters.
 */
export async function listManualCards(filters?: ManualCardListFilters): Promise<ManualCard[]> {
  const data = await loadStorage();
  let list = [...data.cards];

  if (filters) {
    if (filters.setGroup != null) list = list.filter((c) => c.setGroup === filters!.setGroup);
    if (filters.subSet != null) list = list.filter((c) => c.subSet === filters!.subSet);
    if (filters.tcgdexId != null) list = list.filter((c) => c.tcgdexId === filters!.tcgdexId);
    if (filters.excludeManualIds?.length)
      list = list.filter((c) => !filters!.excludeManualIds!.includes(c.manualId));
  }

  return list;
}

/**
 * Get the full storage (setGroupSubSets + cards) for UI that needs category structure.
 */
export async function getManualCardsStorage(): Promise<ManualCardsStorage> {
  return loadStorage();
}

/**
 * UI-friendly grouping: group by setGroup, then subSet, then sort by number ascending.
 * Order of setGroups/subSets follows setGroupSubSets from storage (seed categories first).
 */
export async function getManualCardsGrouped(): Promise<ManualCardGroup[]> {
  const data = await loadStorage();
  const groups: ManualCardGroup[] = [];
  const setGroupOrder = Object.keys(data.setGroupSubSets);

  for (const setGroup of setGroupOrder) {
    const subSets = data.setGroupSubSets[setGroup] ?? [];
    for (const subSet of subSets) {
      const cards = data.cards
        .filter((c) => c.setGroup === setGroup && c.subSet === subSet)
        .sort((a, b) => a.number - b.number);
      groups.push({ setGroup, subSet, cards });
    }
  }

  // Append any cards that don't match a known setGroup/subSet (custom categories)
  const knownKeys = new Set(setGroupOrder.flatMap((sg) => (data.setGroupSubSets[sg] ?? []).map((ss) => `${sg}\t${ss}`)));
  const rest = data.cards.filter((c) => !knownKeys.has(`${c.setGroup}\t${c.subSet}`));
  if (rest.length > 0) {
    const byGroup = new Map<string, Map<string, ManualCard[]>>();
    for (const c of rest) {
      if (!byGroup.has(c.setGroup)) byGroup.set(c.setGroup, new Map());
      const sub = byGroup.get(c.setGroup)!;
      if (!sub.has(c.subSet)) sub.set(c.subSet, []);
      sub.get(c.subSet)!.push(c);
    }
    for (const [sg, subMap] of byGroup) {
      for (const [ss, cards] of subMap) {
        groups.push({ setGroup: sg, subSet: ss, cards: cards.sort((a, b) => a.number - b.number) });
      }
    }
  }

  return groups;
}

/** Single card by manualId. */
export async function getManualCard(manualId: string): Promise<ManualCard | null> {
  const data = await loadStorage();
  return data.cards.find((c) => c.manualId === manualId) ?? null;
}

// --- Merge with TCGdex ---

/** Source label for merged list. */
export type CardSource = 'tcgdex' | 'manual';

/** A card in a merged list: either TCGdex or manual. */
export type MergedCardItem<T = unknown> =
  | { source: 'tcgdex'; card: T; manualId?: undefined }
  | { source: 'manual'; card: ManualCard; manualId: string };

/**
 * Merge TCGdex cards with manual cards.
 * - excludeTcgdexWhenManualLinked: when true, omit TCGdex rows that have a linked manual card (show manual instead).
 * - preferTcgdexWhenMatch: when true (default), omit manual rows whose tcgdexId appears in the TCGdex list
 *   (show API version instead of manual). Use this so "if the API has a version that matches our custom
 *   database, load the API one instead."
 */
export function mergeCardsWithManual<T extends { id?: string }>(
  tcgdexCards: T[],
  manualCards: ManualCard[],
  options?: { excludeTcgdexWhenManualLinked?: boolean; preferTcgdexWhenMatch?: boolean }
): MergedCardItem<T>[] {
  const manualByTcgdex = new Map<string, ManualCard>();
  for (const m of manualCards) {
    if (m.tcgdexId) manualByTcgdex.set(m.tcgdexId, m);
  }

  const tcgdexIds = new Set(tcgdexCards.map((c) => c.id).filter(Boolean) as string[]);
  const preferApi = options?.preferTcgdexWhenMatch !== false;

  const result: MergedCardItem<T>[] = [];

  if (options?.excludeTcgdexWhenManualLinked) {
    for (const c of tcgdexCards) {
      const id = c.id ?? (c as { id: string }).id;
      if (id && manualByTcgdex.has(id)) continue;
      result.push({ source: 'tcgdex', card: c });
    }
  } else {
    for (const c of tcgdexCards) {
      result.push({ source: 'tcgdex', card: c });
    }
  }

  for (const m of manualCards) {
    if (preferApi && m.tcgdexId && tcgdexIds.has(m.tcgdexId)) continue; // API has this card → use API version
    result.push({ source: 'manual', card: m, manualId: m.manualId });
  }

  return result;
}
