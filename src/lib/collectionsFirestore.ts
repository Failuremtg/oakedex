/**
 * Firestore persistence for collections and binder order (per user).
 * Paths: users/{uid}/collections/{collectionId}, users/{uid}/binderOrder.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import type { Collection } from '@/src/types';

const BINDER_ORDER_DOC = 'binderOrder';

export async function loadCollectionsFromFirestore(
  db: Firestore,
  uid: string
): Promise<Collection[]> {
  try {
    const colRef = collection(db, 'users', uid, 'collections');
    const snapshot = await getDocs(colRef);
    const collections: Collection[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as unknown;
      if (data && typeof data === 'object' && 'id' in data && 'name' in data && 'slots' in data) {
        collections.push(data as Collection);
      }
    });
    return collections;
  } catch {
    return [];
  }
}

export async function saveCollectionsToFirestore(
  db: Firestore,
  uid: string,
  collections: Collection[]
): Promise<void> {
  const colRef = collection(db, 'users', uid, 'collections');
  for (const c of collections) {
    const docRef = doc(colRef, c.id);
    await setDoc(docRef, c);
  }
  // Remove any docs that are no longer in the list (e.g. deleted collection)
  const snapshot = await getDocs(colRef);
  const ids = new Set(collections.map((x) => x.id));
  const toRemove: Promise<void>[] = [];
  snapshot.forEach((d) => {
    if (!ids.has(d.id)) toRemove.push(deleteDoc(d.ref));
  });
  await Promise.all(toRemove);
}

export async function loadBinderOrderFromFirestore(
  db: Firestore,
  uid: string
): Promise<string[]> {
  try {
    const docRef = doc(db, 'users', uid, BINDER_ORDER_DOC);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return [];
    const data = snap.data();
    const order = data?.order;
    return Array.isArray(order) ? order.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export async function saveBinderOrderToFirestore(
  db: Firestore,
  uid: string,
  order: string[]
): Promise<void> {
  const docRef = doc(db, 'users', uid, BINDER_ORDER_DOC);
  await setDoc(docRef, { order });
}
