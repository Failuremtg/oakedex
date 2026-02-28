/**
 * Collections (binders) and slots – persistence and helpers.
 * When a user is signed in and Firestore is configured, data is stored in Firestore (per user).
 * Otherwise data is stored in AsyncStorage (local only).
 * In-memory cache of display-ordered collections is filled at app startup (during sync screen) for instant binder list and faster binder open.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Collection, Slot, SlotCard, BinderType, EditionFilter, MasterSetOptions } from '@/src/types';
import {
  loadBinderOrderFromFirestore,
  loadCollectionsFromFirestore,
  saveBinderOrderToFirestore,
  saveCollectionsToFirestore,
} from '@/src/lib/collectionsFirestore';
import { getFirebaseFirestore } from '@/src/lib/firebase';
import { getSyncUserId } from '@/src/lib/syncUser';
import { getPocketSetIds } from '@/src/lib/cardDataCache';

export type { Collection };

const STORAGE_KEY = '@oakedex/collections';
const BINDER_ORDER_KEY = '@oakedex/binderOrder';

/** In-memory cache: display-ordered collections. Set during startup preload and when any screen loads collections. */
let cachedCollectionsOrdered: Collection[] | null = null;

/** Returns the last cached display-ordered list, or null. Use for instant shelf/binder list and faster binder open. */
export function getCachedCollections(): Collection[] | null {
  return cachedCollectionsOrdered;
}

/** Set the cache (e.g. after preload or after loading collections). */
export function setCachedCollections(ordered: Collection[]): void {
  cachedCollectionsOrdered = ordered;
}

/** Find a collection by id in the cache. Returns null if not cached or not found. */
export function getCollectionByIdFromCache(id: string): Collection | null {
  const list = cachedCollectionsOrdered;
  if (!list) return null;
  return list.find((c) => c.id === id) ?? null;
}

/** Load collections for display, get display order, cache and return. Call during app startup (sync screen) to preload binders. Does not auto-create any binder. */
export async function preloadCollectionsForDisplay(): Promise<Collection[]> {
  const list = await loadCollectionsForDisplay();
  const ordered = await getCollectionsInDisplayOrder(list);
  setCachedCollections(ordered);
  return ordered;
}

/** Update cache from a raw collection list (e.g. after loadCollections()). Call to keep cache fresh after loading. */
export async function refreshCollectionsCache(collections: Collection[]): Promise<void> {
  const ordered = await getCollectionsInDisplayOrder(collections);
  setCachedCollections(ordered);
}

export async function loadCollections(): Promise<Collection[]> {
  const uid = getSyncUserId();
  const db = getFirebaseFirestore();
  if (uid && db) {
    try {
      const fromCloud = await loadCollectionsFromFirestore(db, uid);
      if (fromCloud.length > 0) return fromCloud;
      // One-time migration: if cloud is empty, upload local data if any
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Collection[];
        const local = Array.isArray(parsed) ? parsed : [];
        if (local.length > 0) {
          await saveCollectionsToFirestore(db, uid, local);
          const orderRaw = await AsyncStorage.getItem(BINDER_ORDER_KEY);
          const order = orderRaw
            ? (JSON.parse(orderRaw) as unknown)
            : [];
          const orderArr = Array.isArray(order) ? order.filter((id): id is string => typeof id === 'string') : [];
          if (orderArr.length > 0) await saveBinderOrderToFirestore(db, uid, orderArr);
          return local;
        }
      }
      return fromCloud;
    } catch {
      // Permission denied or network error: fall back to local data and never throw
      try {
        return await loadCollectionsLocal();
      } catch {
        return [];
      }
    }
  }
  try {
    return await loadCollectionsLocal();
  } catch {
    return [];
  }
}

async function loadCollectionsLocal(): Promise<Collection[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Collection[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Like loadCollections but excludes by_set binders whose set is Pokémon TCG Pocket (tcgp). Use for any UI that lists binders. */
export async function loadCollectionsForDisplay(): Promise<Collection[]> {
  const list = await loadCollections();
  const pocketIds = await getPocketSetIds();
  if (pocketIds.length === 0) return list;
  const set = new Set(pocketIds);
  return list.filter((c) => c.type !== 'by_set' || !c.setId || !set.has(c.setId));
}

export async function saveCollections(collections: Collection[]): Promise<void> {
  const uid = getSyncUserId();
  const db = getFirebaseFirestore();
  if (uid && db) {
    try {
      await saveCollectionsToFirestore(db, uid, collections);
      return;
    } catch {
      // fall through to local
    }
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function createCollection(
  type: BinderType,
  name: string,
  options?: {
    singlePokemonDexId?: number;
    singlePokemonName?: string;
    includeRegionalForms?: boolean;
    languages?: string[];
    binderColor?: string;
    masterSetOptions?: MasterSetOptions;
    editionFilter?: EditionFilter;
    setId?: string;
    setName?: string;
    setSymbol?: string;
    customPokemonIds?: number[];
    customPokemonNames?: string[];
  }
): Promise<Collection> {
  const collections = await loadCollections();
  const now = Date.now();
  const coll: Collection = {
    id: generateId(),
    name,
    type,
    slots: [],
    createdAt: now,
    updatedAt: now,
    ...(options?.singlePokemonDexId != null && { singlePokemonDexId: options.singlePokemonDexId }),
    ...(options?.singlePokemonName != null && { singlePokemonName: options.singlePokemonName }),
    ...(options?.includeRegionalForms !== undefined && { includeRegionalForms: options.includeRegionalForms }),
    ...(options?.languages?.length && { languages: options.languages }),
    ...(options?.binderColor != null && { binderColor: options.binderColor }),
    ...(options?.masterSetOptions && { masterSetOptions: options.masterSetOptions }),
    ...(options?.editionFilter != null && { editionFilter: options.editionFilter }),
    ...(options?.setId != null && { setId: options.setId }),
    ...(options?.setName != null && { setName: options.setName }),
    ...(options?.setSymbol != null && { setSymbol: options.setSymbol }),
    ...(options?.customPokemonIds?.length && { customPokemonIds: options.customPokemonIds }),
    ...(options?.customPokemonNames?.length && { customPokemonNames: options.customPokemonNames }),
  };
  collections.push(coll);
  await saveCollections(collections);
  return coll;
}

export async function updateCollection(
  id: string,
  updates: Partial<Pick<Collection, 'name' | 'languages' | 'binderColor' | 'masterSetOptions' | 'editionFilter' | 'userCards'>>
): Promise<Collection | null> {
  const collections = await loadCollections();
  const idx = collections.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  collections[idx] = { ...collections[idx], ...updates, updatedAt: Date.now() };
  await saveCollections(collections);
  return collections[idx];
}

export async function deleteCollection(id: string): Promise<boolean> {
  const collections = await loadCollections().then((c) => c.filter((x) => x.id !== id));
  await saveCollections(collections);
  return true;
}

export function getSlot(collection: Collection, key: string): Slot | undefined {
  return collection.slots.find((s) => s.key === key);
}

export function getSlotCard(collection: Collection, key: string): SlotCard | null {
  const slot = getSlot(collection, key);
  return slot?.card ?? null;
}

/** Set or clear the card for a slot. */
export async function setSlot(
  collectionId: string,
  key: string,
  card: SlotCard | null
): Promise<Collection | null> {
  const collections = await loadCollections();
  const coll = collections.find((c) => c.id === collectionId);
  if (!coll) return null;

  const existing = coll.slots.findIndex((s) => s.key === key);
  const newSlot: Slot = { key, card };

  let slots: Slot[];
  if (existing >= 0) {
    slots = [...coll.slots];
    slots[existing] = newSlot;
  } else {
    slots = [...coll.slots, newSlot];
  }

  const updated: Collection = {
    ...coll,
    slots,
    updatedAt: Date.now(),
  };
  const idx = collections.findIndex((c) => c.id === collectionId);
  collections[idx] = updated;
  await saveCollections(collections);
  return updated;
}

/** Get the default "Collect Them All" collection or null. */
export async function getCollectThemAllCollection(): Promise<Collection | null> {
  const collections = await loadCollections();
  return collections.find((c) => c.type === 'collect_them_all') ?? null;
}

/** Ensure a single Collect Them All binder exists; return it. */
export async function ensureCollectThemAllBinder(): Promise<Collection> {
  let coll = await getCollectThemAllCollection();
  if (coll) return coll;
  coll = await createCollection('collect_them_all', 'Collect Them All', {
    binderColor: 'purple',
  });
  return coll;
}

/** Load saved binder display order (array of collection ids). */
export async function getBinderOrder(): Promise<string[]> {
  const uid = getSyncUserId();
  const db = getFirebaseFirestore();
  if (uid && db) {
    try {
      return await loadBinderOrderFromFirestore(db, uid);
    } catch {
      // Permission denied or network error: fall back to local
    }
  }
  try {
    const raw = await AsyncStorage.getItem(BINDER_ORDER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/** Save binder display order. */
export async function saveBinderOrder(orderedIds: string[]): Promise<void> {
  const uid = getSyncUserId();
  const db = getFirebaseFirestore();
  if (uid && db) {
    try {
      await saveBinderOrderToFirestore(db, uid, orderedIds);
      return;
    } catch {
      // fall through to local
    }
  }
  await AsyncStorage.setItem(BINDER_ORDER_KEY, JSON.stringify(orderedIds));
}

/** Load collections and return them in the user's display order (CTA first by default, then by saved order). If collections are provided, use that list (e.g. from loadCollectionsForDisplay); otherwise load from storage. */
export async function getCollectionsInDisplayOrder(collections?: Collection[]): Promise<Collection[]> {
  const list = collections ?? await loadCollections();
  const order = await getBinderOrder();
  const byId = new Map(list.map((c) => [c.id, c]));
  const masterTypes = list.filter((c) =>
    c.type === 'collect_them_all' || c.type === 'master_set' || c.type === 'master_dex'
  );
  const singles = list.filter((c) => c.type === 'single_pokemon');
  const bySet = list.filter((c) => c.type === 'by_set');
  const custom = list.filter((c) => c.type === 'custom');
  const rest = [...masterTypes, ...singles, ...bySet, ...custom];

  if (order.length === 0) {
    const cta = list.find((c) => c.type === 'collect_them_all');
    const otherMaster = masterTypes.filter((c) => c.type !== 'collect_them_all').sort((a, b) => a.createdAt - b.createdAt);
    const sortedSingles = [...singles].sort((a, b) => a.createdAt - b.createdAt);
    const sortedBySet = [...bySet].sort((a, b) => a.createdAt - b.createdAt);
    const sortedCustom = [...custom].sort((a, b) => a.createdAt - b.createdAt);
    return [...(cta ? [cta] : []), ...otherMaster, ...sortedSingles, ...sortedBySet, ...sortedCustom];
  }

  const ordered: Collection[] = [];
  const seen = new Set<string>();
  for (const id of order) {
    const c = byId.get(id);
    if (c) {
      ordered.push(c);
      seen.add(id);
    }
  }
  for (const c of rest) {
    if (c && !seen.has(c.id)) ordered.push(c);
  }
  return ordered;
}
