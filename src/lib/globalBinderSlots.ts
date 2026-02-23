/**
 * Global binder slots – admin-defined slot data shown for all users.
 * Stored in Firestore at config/globalBinderSlots. Only admins can write.
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase';
import { isFirebaseConfigured } from './firebase';
import type { Slot } from '@/src/types';

const CONFIG_COLLECTION = 'config';
const GLOBAL_BINDER_SLOTS_DOC = 'globalBinderSlots';

function getDb() {
  if (!isFirebaseConfigured()) return null;
  return getFirebaseFirestore();
}

/** Key for a set binder: by_set:setId */
export function globalKeyBySet(setId: string): string {
  return `by_set:${setId}`;
}

/** Key for a single Pokémon binder: single_pokemon:slug (lowercase, hyphenated name). */
export function globalKeySinglePokemon(pokemonName: string): string {
  const slug = (pokemonName ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `single_pokemon:${slug}`;
}

/** Get global slots for a binder key. Returns null if none or error. */
export async function getGlobalBinderSlots(binderKey: string): Promise<Slot[] | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const ref = doc(db, CONFIG_COLLECTION, GLOBAL_BINDER_SLOTS_DOC);
    const snap = await getDoc(ref);
    const data = snap.data();
    const map = data?.slotsByKey;
    if (!map || typeof map !== 'object' || Array.isArray(map)) return null;
    const slots = map[binderKey];
    if (!Array.isArray(slots)) return null;
    return slots.filter(
      (s): s is Slot =>
        s &&
        typeof s === 'object' &&
        typeof s.key === 'string' &&
        (s.card === null || (typeof s.card === 'object' && typeof s.card.cardId === 'string' && typeof s.card.variant === 'string'))
    );
  } catch {
    return null;
  }
}

/** Set global slots for a binder key (admin only). Overwrites existing. */
export async function setGlobalBinderSlots(binderKey: string, slots: Slot[]): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, CONFIG_COLLECTION, GLOBAL_BINDER_SLOTS_DOC);
  const snap = await getDoc(ref);
  const current = (snap.data()?.slotsByKey as Record<string, Slot[]> | undefined) ?? {};
  const next = { ...current, [binderKey]: slots };
  await setDoc(ref, { slotsByKey: next, updatedAt: serverTimestamp() });
}
