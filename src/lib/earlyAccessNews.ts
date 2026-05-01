import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Early access "news" popup cadence:
 * - Show the first time a user logs in (no lastShownAt yet).
 * - Then show at most once every 48h when opening the app.
 * - If we change the copy and bump EARLY_ACCESS_NEWS_VERSION, the cooldown is ignored
 *   and it will show on next app open.
 */

const COOLDOWN_MS = 48 * 60 * 60 * 1000;

// Bump this when you edit the popup info and want it to reappear immediately.
export const EARLY_ACCESS_NEWS_VERSION = '1.0.0';

function keyLastShown(uid: string) {
  return `@oakedex/early_access_last_shown_at/${uid}`;
}
function keyLastVersion(uid: string) {
  return `@oakedex/early_access_last_version/${uid}`;
}

export async function shouldShowEarlyAccessNews(uid: string): Promise<boolean> {
  try {
    const [rawAt, lastVersion] = await Promise.all([
      AsyncStorage.getItem(keyLastShown(uid)),
      AsyncStorage.getItem(keyLastVersion(uid)),
    ]);

    // If copy changed, show again immediately.
    if ((lastVersion ?? '') < EARLY_ACCESS_NEWS_VERSION) return true;

    // First login: never shown.
    if (!rawAt) return true;

    const at = Number(rawAt);
    if (!Number.isFinite(at) || at <= 0) return true;
    return Date.now() - at >= COOLDOWN_MS;
  } catch {
    return true;
  }
}

export async function setEarlyAccessNewsShown(uid: string): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [keyLastShown(uid), String(Date.now())],
      [keyLastVersion(uid), EARLY_ACCESS_NEWS_VERSION],
    ]);
  } catch {
    // ignore
  }
}

