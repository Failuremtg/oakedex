/**
 * Admin binder config – default card per slot (what to show when not collected),
 * custom cards (extra slots like new Unown), and excluded card versions (hide for all users).
 * Stored in Firestore config.
 *
 * Variation slots: The *number* of slots for variations (Unown, Burmy, Rotom, etc.) comes
 * from the code in masterSetExpansion.ts (one slot per form). The *specific card* shown
 * for each empty slot is set in Admin → Grandmaster Binder: tap a slot, pick a card,
 * and it’s saved as a default override (slotKey → cardId). That way the correct TCG
 * printing is known per variation slot.
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase';
import { isFirebaseConfigured } from './firebase';
import type { CustomCard, DefaultCardOverrides } from '@/src/types';
import type { CardVariant } from '@/src/types';

const CONFIG_COLLECTION = 'config';
const BINDER_DEFAULTS_DOC = 'binderDefaults';
const CUSTOM_CARDS_DOC = 'customCards';
const EXCLUDED_VERSIONS_DOC = 'excludedCardVersions';

/** Composite key for a card version (cardId + variant). */
export function cardVersionKey(cardId: string, variant: CardVariant): string {
  return `${cardId}|${variant}`;
}

function getDb() {
  if (!isFirebaseConfigured()) return null;
  return getFirebaseFirestore();
}

/** Load default card overrides (slotKey -> cardId). */
export async function getDefaultCardOverrides(): Promise<DefaultCardOverrides> {
  const db = getDb();
  if (!db) return {};
  try {
    const ref = doc(db, CONFIG_COLLECTION, BINDER_DEFAULTS_DOC);
    const snap = await getDoc(ref);
    const data = snap.data();
    const map = data?.defaultCardBySlotKey;
    if (map && typeof map === 'object' && !Array.isArray(map)) {
      return map as DefaultCardOverrides;
    }
    return {};
  } catch {
    return {};
  }
}

/** Set or clear the default card for a slot. cardId null = remove override. */
export async function setDefaultCardOverride(slotKey: string, cardId: string | null): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, CONFIG_COLLECTION, BINDER_DEFAULTS_DOC);
  const snap = await getDoc(ref);
  const current = (snap.data()?.defaultCardBySlotKey as DefaultCardOverrides) ?? {};
  const next = { ...current };
  if (cardId == null || cardId.trim() === '') {
    delete next[slotKey];
  } else {
    next[slotKey] = cardId.trim();
  }
  await setDoc(ref, { defaultCardBySlotKey: next, updatedAt: serverTimestamp() });
}

/** Replace all default card overrides at once (e.g. from admin grandmaster binder). Pushed to all users. */
export async function setDefaultCardOverrides(overrides: DefaultCardOverrides): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, CONFIG_COLLECTION, BINDER_DEFAULTS_DOC);
  await setDoc(ref, { defaultCardBySlotKey: overrides, updatedAt: serverTimestamp() });
}

/** Load all custom cards. */
export async function getCustomCards(): Promise<CustomCard[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const ref = doc(db, CONFIG_COLLECTION, CUSTOM_CARDS_DOC);
    const snap = await getDoc(ref);
    const arr = snap.data()?.cards;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (c): c is CustomCard =>
        c &&
        typeof c === 'object' &&
        typeof c.id === 'string' &&
        typeof c.slotKey === 'string' &&
        typeof c.name === 'string' &&
        typeof c.dexId === 'number' &&
        typeof c.localId === 'string' &&
        typeof c.setId === 'string' &&
        typeof c.setName === 'string' &&
        (c.image === null || typeof c.image === 'string') &&
        c.variants &&
        typeof c.variants === 'object'
    );
  } catch {
    return [];
  }
}

/** Add a custom card. */
export async function addCustomCard(card: Omit<CustomCard, 'createdAt'>): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, CONFIG_COLLECTION, CUSTOM_CARDS_DOC);
  const snap = await getDoc(ref);
  const cards: CustomCard[] = Array.isArray(snap.data()?.cards) ? [...(snap.data()?.cards as CustomCard[])] : [];
  if (cards.some((c) => c.id === card.id || c.slotKey === card.slotKey)) {
    throw new Error('A card with this id or slot key already exists');
  }
  const withTimestamp: CustomCard = { ...card, createdAt: Date.now() };
  cards.push(withTimestamp);
  await setDoc(ref, { cards, updatedAt: serverTimestamp() });
}

/** Remove a custom card by id. */
export async function removeCustomCard(id: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, CONFIG_COLLECTION, CUSTOM_CARDS_DOC);
  const snap = await getDoc(ref);
  const cards: CustomCard[] = Array.isArray(snap.data()?.cards) ? (snap.data()?.cards as CustomCard[]) : [];
  const next = cards.filter((c) => c.id !== id);
  if (next.length === cards.length) return;
  await setDoc(ref, { cards: next, updatedAt: serverTimestamp() });
}

/** Update a custom card. */
export async function updateCustomCard(id: string, patch: Partial<CustomCard>): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, CONFIG_COLLECTION, CUSTOM_CARDS_DOC);
  const snap = await getDoc(ref);
  const cards: CustomCard[] = Array.isArray(snap.data()?.cards) ? [...(snap.data()?.cards as CustomCard[])] : [];
  const idx = cards.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error('Custom card not found');
  cards[idx] = { ...cards[idx], ...patch };
  await setDoc(ref, { cards, updatedAt: serverTimestamp() });
}

/** Load set of excluded card version keys (cardId|variant). When a version is excluded, it is hidden for all users and devices. */
export async function getExcludedCardVersions(): Promise<Set<string>> {
  const db = getDb();
  if (!db) return new Set();
  try {
    const ref = doc(db, CONFIG_COLLECTION, EXCLUDED_VERSIONS_DOC);
    const snap = await getDoc(ref);
    const arr = snap.data()?.keys;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((k): k is string => typeof k === 'string'));
  } catch {
    return new Set();
  }
}

/** Add a card version to the global excluded list (admin). Removes it from all users' binders in the UI. */
export async function addExcludedCardVersion(cardId: string, variant: CardVariant): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, CONFIG_COLLECTION, EXCLUDED_VERSIONS_DOC);
  const snap = await getDoc(ref);
  const keys: string[] = Array.isArray(snap.data()?.keys) ? [...(snap.data()?.keys as string[])] : [];
  const key = cardVersionKey(cardId, variant);
  if (keys.includes(key)) return;
  keys.push(key);
  await setDoc(ref, { keys, updatedAt: serverTimestamp() });
}

/** Remove a card version from the excluded list (admin). */
export async function removeExcludedCardVersion(cardId: string, variant: CardVariant): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, CONFIG_COLLECTION, EXCLUDED_VERSIONS_DOC);
  const snap = await getDoc(ref);
  const keys: string[] = Array.isArray(snap.data()?.keys) ? (snap.data()?.keys as string[]) : [];
  const key = cardVersionKey(cardId, variant);
  const next = keys.filter((k) => k !== key);
  if (next.length === keys.length) return;
  await setDoc(ref, { keys: next, updatedAt: serverTimestamp() });
}
