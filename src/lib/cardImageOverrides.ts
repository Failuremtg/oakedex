/**
 * Local card image overrides – user uploads (this device only) and admin uploads
 * (canonical overrides for the app). Stored on device only; not synced.
 */

import { Platform } from 'react-native';
import {
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  copyAsync,
  deleteAsync,
  readDirectoryAsync,
} from 'expo-file-system/legacy';

const OVERRIDES_DIR = 'oakedex-card-overrides';
const USER_DIR = 'user';
const ADMIN_DIR = 'admin';

function isAvailable(): boolean {
  return Platform.OS !== 'web' && documentDirectory != null && documentDirectory.length > 0;
}

/** Safe filename from cardId (e.g. base1-4 -> base1-4, sm7.5-3 -> sm7.5-3). */
function safeFileName(cardId: string): string {
  return cardId.replace(/[/\\?:*"<>|]/g, '-').slice(0, 120) || 'card';
}

function dirFor(type: 'user' | 'admin'): string | null {
  if (!documentDirectory) return null;
  const sub = type === 'admin' ? ADMIN_DIR : USER_DIR;
  return `${documentDirectory}${OVERRIDES_DIR}/${sub}/`;
}

export type OverrideType = 'user' | 'admin';

/**
 * Get the local file URI for an override if it exists.
 * Check admin first, then user.
 */
export async function getOverrideUri(cardId: string, type: OverrideType): Promise<string | null> {
  if (!isAvailable() || !cardId) return null;
  const dir = dirFor(type);
  if (!dir) return null;
  const path = `${dir}${safeFileName(cardId)}.jpg`;
  try {
    const info = await getInfoAsync(path, { size: false });
    return info.exists ? path : null;
  } catch {
    return null;
  }
}

/**
 * Get the best available override URI (admin first, then user).
 */
export async function getAnyOverrideUri(cardId: string): Promise<string | null> {
  const admin = await getOverrideUri(cardId, 'admin');
  if (admin) return admin;
  return getOverrideUri(cardId, 'user');
}

/**
 * Save an image as override. Copies from sourceUri (e.g. from image picker) to app storage.
 */
export async function setOverride(
  cardId: string,
  sourceUri: string,
  type: OverrideType
): Promise<string> {
  if (!isAvailable()) throw new Error('Storage not available');
  const dir = dirFor(type);
  if (!dir) throw new Error('Storage not available');
  await makeDirectoryAsync(dir, { intermediates: true });
  const destUri = `${dir}${safeFileName(cardId)}.jpg`;
  await copyAsync({ from: sourceUri, to: destUri });
  return destUri;
}

/**
 * Remove a user override (admin overrides are managed in admin screen).
 */
export async function removeUserOverride(cardId: string): Promise<void> {
  if (!isAvailable()) return;
  const dir = dirFor('user');
  if (!dir) return;
  const path = `${dir}${safeFileName(cardId)}.jpg`;
  try {
    await deleteAsync(path, { idempotent: true });
  } catch {
    /* ignore */
  }
}

/**
 * Remove an admin override.
 */
export async function removeAdminOverride(cardId: string): Promise<void> {
  if (!isAvailable()) return;
  const dir = dirFor('admin');
  if (!dir) return;
  const path = `${dir}${safeFileName(cardId)}.jpg`;
  try {
    await deleteAsync(path, { idempotent: true });
  } catch {
    /* ignore */
  }
}

/**
 * List card IDs that have user overrides (for this device).
 */
export async function listUserOverrideCardIds(): Promise<string[]> {
  if (!isAvailable()) return [];
  const dir = dirFor('user');
  if (!dir) return [];
  try {
    const names = await readDirectoryAsync(dir);
    return names
      .filter((n) => n.endsWith('.jpg'))
      .map((n) => n.slice(0, -4));
  } catch {
    return [];
  }
}

/**
 * List card IDs that have admin overrides.
 */
export async function listAdminOverrideCardIds(): Promise<string[]> {
  if (!isAvailable()) return [];
  const dir = dirFor('admin');
  if (!dir) return [];
  try {
    const names = await readDirectoryAsync(dir);
    return names
      .filter((n) => n.endsWith('.jpg'))
      .map((n) => n.slice(0, -4));
  } catch {
    return [];
  }
}
