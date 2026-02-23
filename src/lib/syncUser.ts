/**
 * Current user id for Firestore sync. Set by AuthContext when auth state changes.
 * collections.ts uses this to decide whether to read/write Firestore or AsyncStorage.
 */

let currentSyncUserId: string | null = null;

export function getSyncUserId(): string | null {
  return currentSyncUserId;
}

export function setSyncUserId(uid: string | null): void {
  currentSyncUserId = uid;
}
