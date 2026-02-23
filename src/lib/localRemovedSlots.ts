/**
 * Local-only "removed" slot keys per collection. When a user long-presses and chooses
 * "Remove from binder (local)", we add the slot key here so that slot displays as empty
 * on this device only. Never synced to Firestore.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@oakedex/localRemoved/';

function storageKey(collectionId: string): string {
  return KEY_PREFIX + collectionId;
}

/** Get the set of slot keys the user has removed locally for this collection. */
export async function getLocalRemovedSlotKeys(collectionId: string): Promise<Set<string>> {
  if (!collectionId) return new Set();
  try {
    const raw = await AsyncStorage.getItem(storageKey(collectionId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((k): k is string => typeof k === 'string'));
  } catch {
    return new Set();
  }
}

/** Mark a slot as removed locally (show as empty on this device only). */
export async function addLocalRemovedSlot(collectionId: string, slotKey: string): Promise<void> {
  if (!collectionId || !slotKey) return;
  const set = await getLocalRemovedSlotKeys(collectionId);
  set.add(slotKey);
  await AsyncStorage.setItem(storageKey(collectionId), JSON.stringify([...set]));
}

/** Remove a slot from the local-removed list (undo). */
export async function removeLocalRemovedSlot(collectionId: string, slotKey: string): Promise<void> {
  if (!collectionId || !slotKey) return;
  const set = await getLocalRemovedSlotKeys(collectionId);
  set.delete(slotKey);
  await AsyncStorage.setItem(storageKey(collectionId), JSON.stringify([...set]));
}
