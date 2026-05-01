/**
 * Firestore persistence for Wanted list (per user).
 * Path: users/{uid}/wanted/{wantedId}
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  type Firestore,
} from 'firebase/firestore';

import type { WantedItem } from '@/src/lib/wantedTypes';

export async function loadWantedFromFirestore(db: Firestore, uid: string): Promise<WantedItem[]> {
  try {
    const colRef = collection(db, 'users', uid, 'wanted');
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

export async function saveWantedToFirestore(db: Firestore, uid: string, items: WantedItem[]): Promise<void> {
  const colRef = collection(db, 'users', uid, 'wanted');
  for (const item of items) {
    const docRef = doc(colRef, item.id);
    await setDoc(docRef, item);
  }
  // Remove stale docs
  const snapshot = await getDocs(colRef);
  const ids = new Set(items.map((x) => x.id));
  const toRemove: Promise<void>[] = [];
  snapshot.forEach((d) => {
    if (!ids.has(d.id)) toRemove.push(deleteDoc(d.ref));
  });
  await Promise.all(toRemove);
}

