/**
 * Firestore persistence for Wanted Lists + items (per user).
 * Lists: users/{uid}/wantedLists/{listId}
 * Items: users/{uid}/wantedLists/{listId}/items/{itemId}
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  type Firestore,
} from 'firebase/firestore';

import type { WantedItem, WantedList } from '@/src/lib/wantedTypes';

export async function loadWantedListsFromFirestore(db: Firestore, uid: string): Promise<WantedList[]> {
  try {
    const colRef = collection(db, 'users', uid, 'wantedLists');
    const snapshot = await getDocs(colRef);
    const lists: WantedList[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as unknown;
      if (data && typeof data === 'object' && 'id' in data && 'name' in data) {
        lists.push(data as WantedList);
      }
    });
    return lists;
  } catch {
    return [];
  }
}

export async function saveWantedListsToFirestore(db: Firestore, uid: string, lists: WantedList[]): Promise<void> {
  const colRef = collection(db, 'users', uid, 'wantedLists');
  for (const list of lists) {
    const docRef = doc(colRef, list.id);
    await setDoc(docRef, list);
  }
  const snapshot = await getDocs(colRef);
  const ids = new Set(lists.map((x) => x.id));
  const toRemove: Promise<void>[] = [];
  snapshot.forEach((d) => {
    if (!ids.has(d.id)) toRemove.push(deleteDoc(d.ref));
  });
  await Promise.all(toRemove);
}

export async function loadWantedItemsFromFirestore(db: Firestore, uid: string, listId: string): Promise<WantedItem[]> {
  try {
    const colRef = collection(db, 'users', uid, 'wantedLists', listId, 'items');
    const snapshot = await getDocs(colRef);
    const items: WantedItem[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as unknown;
      if (data && typeof data === 'object' && 'id' in data && 'cardId' in data) {
        items.push(data as WantedItem);
      }
    });
    return items;
  } catch {
    return [];
  }
}

export async function saveWantedItemsToFirestore(
  db: Firestore,
  uid: string,
  listId: string,
  items: WantedItem[]
): Promise<void> {
  const colRef = collection(db, 'users', uid, 'wantedLists', listId, 'items');
  for (const item of items) {
    const docRef = doc(colRef, item.id);
    await setDoc(docRef, item);
  }
  const snapshot = await getDocs(colRef);
  const ids = new Set(items.map((x) => x.id));
  const toRemove: Promise<void>[] = [];
  snapshot.forEach((d) => {
    if (!ids.has(d.id)) toRemove.push(deleteDoc(d.ref));
  });
  await Promise.all(toRemove);
}

export async function deleteWantedListFromFirestore(db: Firestore, uid: string, listId: string): Promise<void> {
  // Delete items subcollection first (Firestore doesn't cascade deletes).
  const itemsCol = collection(db, 'users', uid, 'wantedLists', listId, 'items');
  const snapshot = await getDocs(itemsCol);
  const deletions: Promise<void>[] = [];
  snapshot.forEach((d) => deletions.push(deleteDoc(d.ref)));
  await Promise.all(deletions);

  const listDoc = doc(db, 'users', uid, 'wantedLists', listId);
  await deleteDoc(listDoc);
}

