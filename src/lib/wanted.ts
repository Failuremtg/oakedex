/**
 * Wanted Lists + items persistence.
 * When a user is signed in and Firestore is configured, data is stored in Firestore (per user).
 * Otherwise data is stored in AsyncStorage (local only).
 *
 * Migration:
 * - Older versions stored a single flat list in '@oakedex/wanted'. We migrate that into a default Wanted List.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseFirestore } from '@/src/lib/firebase';
import { getSyncUserId } from '@/src/lib/syncUser';
import type { WantedItem, WantedIntent, WantedList } from '@/src/lib/wantedTypes';
import type { CardVariant } from '@/src/types';
import {
  deleteWantedListFromFirestore,
  loadWantedItemsFromFirestore,
  loadWantedListsFromFirestore,
  saveWantedItemsToFirestore,
  saveWantedListsToFirestore,
} from '@/src/lib/wantedListsFirestore';

const OLD_STORAGE_KEY = '@oakedex/wanted';
const LISTS_KEY = '@oakedex/wantedLists';
const ITEMS_KEY_PREFIX = '@oakedex/wantedItems/';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function loadWantedLocal(): Promise<WantedItem[]> {
  try {
    const raw = await AsyncStorage.getItem(OLD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as WantedItem[]) : [];
  } catch {
    return [];
  }
}

async function loadListsLocal(): Promise<WantedList[]> {
  try {
    const raw = await AsyncStorage.getItem(LISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as WantedList[]) : [];
  } catch {
    return [];
  }
}

async function saveListsLocal(lists: WantedList[]): Promise<void> {
  await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists));
}

async function loadItemsLocal(listId: string): Promise<WantedItem[]> {
  try {
    const raw = await AsyncStorage.getItem(ITEMS_KEY_PREFIX + listId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as WantedItem[]) : [];
  } catch {
    return [];
  }
}

async function saveItemsLocal(listId: string, items: WantedItem[]): Promise<void> {
  await AsyncStorage.setItem(ITEMS_KEY_PREFIX + listId, JSON.stringify(items));
}

async function deleteItemsLocal(listId: string): Promise<void> {
  await AsyncStorage.removeItem(ITEMS_KEY_PREFIX + listId);
}

function defaultList(now: number): WantedList {
  return { id: 'default', name: 'Wanted', count: 0, createdAt: now, updatedAt: now };
}

async function migrateLocalIfNeeded(): Promise<void> {
  const lists = await loadListsLocal();
  if (lists.length > 0) return;
  const old = await loadWantedLocal();
  if (old.length === 0) return;
  const now = Date.now();
  const list = defaultList(now);
  const migrated = old.map((x) => ({ ...x, listId: list.id }));
  list.count = migrated.length;
  await saveListsLocal([list]);
  await saveItemsLocal(list.id, migrated);
  // Keep old key for safety, but we no longer read from it once lists exist.
}

export async function loadWantedLists(): Promise<WantedList[]> {
  await migrateLocalIfNeeded();
  const uid = getSyncUserId();
  const db = getFirebaseFirestore();
  if (uid && db) {
    try {
      const fromCloud = await loadWantedListsFromFirestore(db, uid);
      if (fromCloud.length > 0) return fromCloud;
      // One-time migration: upload local lists/items if cloud empty
      const localLists = await loadListsLocal();
      if (localLists.length > 0) {
        await saveWantedListsToFirestore(db, uid, localLists);
        for (const l of localLists) {
          const items = await loadItemsLocal(l.id);
          await saveWantedItemsToFirestore(db, uid, l.id, items);
        }
        return localLists;
      }
      return [];
    } catch {
      return loadListsLocal();
    }
  }
  const localLists = await loadListsLocal();
  if (localLists.length > 0) return localLists;
  // fallback: create default list for fresh installs
  const now = Date.now();
  const list = defaultList(now);
  await saveListsLocal([list]);
  await saveItemsLocal(list.id, []);
  return [list];
}

export async function loadWantedItems(listId: string): Promise<WantedItem[]> {
  const uid = getSyncUserId();
  const db = getFirebaseFirestore();
  if (uid && db) {
    try {
      return await loadWantedItemsFromFirestore(db, uid, listId);
    } catch {
      return loadItemsLocal(listId);
    }
  }
  return loadItemsLocal(listId);
}

async function saveWantedLists(lists: WantedList[]): Promise<void> {
  const uid = getSyncUserId();
  const db = getFirebaseFirestore();
  if (uid && db) {
    try {
      await saveWantedListsToFirestore(db, uid, lists);
      return;
    } catch {
      // fall through to local
    }
  }
  await saveListsLocal(lists);
}

async function saveWantedItems(listId: string, items: WantedItem[]): Promise<void> {
  const uid = getSyncUserId();
  const db = getFirebaseFirestore();
  if (uid && db) {
    try {
      await saveWantedItemsToFirestore(db, uid, listId, items);
      return;
    } catch {
      // fall through to local
    }
  }
  await saveItemsLocal(listId, items);
}

export async function createWantedList(name: string): Promise<WantedList> {
  const lists = await loadWantedLists();
  const now = Date.now();
  const list: WantedList = {
    id: generateId(),
    name: name.trim() || 'Wanted list',
    count: 0,
    createdAt: now,
    updatedAt: now,
  };
  const next = [list, ...lists];
  await saveWantedLists(next);
  await saveWantedItems(list.id, []);
  return list;
}

export async function addWantedItem(input: {
  listId: string;
  cardId: string;
  variant: CardVariant;
  name: string;
  setName?: string;
  localId?: string;
  image?: string | null;
  intent?: WantedIntent;
  note?: string;
}): Promise<WantedItem> {
  const items = await loadWantedItems(input.listId);
  const now = Date.now();
  const item: WantedItem = {
    id: generateId(),
    listId: input.listId,
    cardId: input.cardId,
    variant: input.variant,
    name: input.name,
    setName: input.setName,
    localId: input.localId,
    image: input.image ?? null,
    intent: input.intent ?? 'either',
    note: input.note,
    createdAt: now,
    updatedAt: now,
  };
  items.unshift(item);
  await saveWantedItems(input.listId, items);

  const lists = await loadWantedLists();
  const updatedLists = lists.map((l) =>
    l.id === input.listId ? { ...l, count: items.length, updatedAt: now } : l
  );
  await saveWantedLists(updatedLists);
  return item;
}

export async function removeWantedItem(listId: string, itemId: string): Promise<void> {
  const items = await loadWantedItems(listId);
  const next = items.filter((x) => x.id !== itemId);
  await saveWantedItems(listId, next);

  const lists = await loadWantedLists();
  const now = Date.now();
  const updatedLists = lists.map((l) =>
    l.id === listId ? { ...l, count: next.length, updatedAt: now } : l
  );
  await saveWantedLists(updatedLists);
}

export async function updateWantedItem(
  listId: string,
  itemId: string,
  updates: Partial<Pick<WantedItem, 'intent' | 'note'>>
): Promise<void> {
  const items = await loadWantedItems(listId);
  const now = Date.now();
  const updated = items.map((x) => (x.id === itemId ? { ...x, ...updates, updatedAt: now } : x));
  await saveWantedItems(listId, updated);
}

export async function deleteWantedList(listId: string): Promise<void> {
  const uid = getSyncUserId();
  const db = getFirebaseFirestore();

  // Remove list + items in the primary storage first
  if (uid && db) {
    try {
      await deleteWantedListFromFirestore(db, uid, listId);
    } catch {
      // fall through to local cleanup
    }
  }

  // Always clean local cache so guest mode stays consistent too.
  const lists = await loadWantedLists();
  const nextLists = lists.filter((l) => l.id !== listId);
  await saveListsLocal(nextLists);
  await deleteItemsLocal(listId);
}

