/**
 * Admin config – who can use Card image admin.
 * Stored in Firestore at config/admins. You add admin emails (or UIDs) in Firebase Console.
 */

import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { getFirebaseFirestore } from './firebase';
import { isFirebaseConfigured } from './firebase';

const CONFIG_COLLECTION = 'config';
const ADMINS_DOC_ID = 'admins';

let cachedAdminEmails: string[] | null = null;
let cachedAdminUids: string[] | null = null;

/** Normalize Firestore field to string array (handles array or object-with-numeric-keys). */
function toEmailArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((e): e is string => typeof e === 'string').map((e) => e.toLowerCase().trim());
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => obj[k])
      .filter((e): e is string => typeof e === 'string')
      .map((e) => e.toLowerCase().trim());
  }
  return [];
}

function toUidArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((id): id is string => typeof id === 'string');
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => obj[k])
      .filter((id): id is string => typeof id === 'string');
  }
  return [];
}

/**
 * Returns true if the given user is in the admin list (by email or uid).
 * Admin list is in Firestore: collection "config", document "admins", fields { emails: string[], uids?: string[] }.
 */
export async function getIsAdmin(user: User | null): Promise<boolean> {
  if (!user || !isFirebaseConfigured()) return false;
  const db = getFirebaseFirestore();
  if (!db) return false;

  try {
    if (cachedAdminEmails === null || cachedAdminUids === null) {
      const ref = doc(db, CONFIG_COLLECTION, ADMINS_DOC_ID);
      const snap = await getDoc(ref);
      const data = snap.data();
      cachedAdminEmails = toEmailArray(data?.emails);
      cachedAdminUids = toUidArray(data?.uids);
    }
    const email = (user.email ?? '').toLowerCase().trim();
    if (email && cachedAdminEmails.includes(email)) return true;
    if (cachedAdminUids.includes(user.uid)) return true;
    return false;
  } catch {
    return false;
  }
}

/** Clear cached admin list (e.g. after you change it in Console). */
export function clearAdminCache(): void {
  cachedAdminEmails = null;
  cachedAdminUids = null;
}

/** Set cache from a successful fetch (so isAdmin can be set without re-reading). */
export function setAdminCache(emails: string[], uids: string[]): void {
  cachedAdminEmails = emails;
  cachedAdminUids = uids;
}

/**
 * Fetch admin config from Firestore for verification. Returns what the app read from config/admins.
 */
export async function fetchAdminConfig(): Promise<{
  ok: boolean;
  path: string;
  emails: string[];
  uids: string[];
  error?: string;
}> {
  const path = `${CONFIG_COLLECTION}/${ADMINS_DOC_ID}`;
  if (!isFirebaseConfigured()) {
    return { ok: false, path, emails: [], uids: [], error: 'Firebase not configured' };
  }
  const db = getFirebaseFirestore();
  if (!db) {
    return { ok: false, path, emails: [], uids: [], error: 'Firestore not available' };
  }
  try {
    const ref = doc(db, CONFIG_COLLECTION, ADMINS_DOC_ID);
    const snap = await getDoc(ref);
    const data = snap.data();
    const emails = toEmailArray(data?.emails);
    const uids = toUidArray(data?.uids);
    return { ok: true, path, emails, uids };
  } catch (e) {
    return {
      ok: false,
      path,
      emails: [],
      uids: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Hook: is the current user an admin? Only admins see Card image admin in Settings and can open the admin screen.
 */
export function useIsAdmin(user: User | null): { isAdmin: boolean; loading: boolean; refetch: () => Promise<void> } {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    if (!user || !isFirebaseConfigured()) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ok = await getIsAdmin(user);
    setIsAdmin(ok);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    check();
  }, [check]);

  const refetch = useCallback(async () => {
    await check();
  }, [check]);

  return { isAdmin, loading, refetch };
}
