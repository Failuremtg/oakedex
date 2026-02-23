/**
 * Cloud admin card images – Firebase Storage + Firestore.
 * Admin uploads here so ALL users and devices see the same image.
 */

import { readAsStringAsync } from 'expo-file-system/legacy';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { Platform } from 'react-native';
import { getFirebaseFirestore } from './firebase';
import { getFirebaseStorage } from './firebase';

const COLLECTION = 'cardImages';
const STORAGE_PREFIX = 'cardImages/';

function safePath(cardId: string): string {
  return cardId.replace(/[/\\?:*"<>|]/g, '-').slice(0, 120) || 'card';
}

const urlCache = new Map<string, string>();

/** Get image data as Blob or base64 for upload. fetch(fileUri) often fails on React Native. */
async function getImageDataForUpload(uri: string): Promise<{ blob?: Blob; base64?: string }> {
  const isFileUri = uri.startsWith('file://');
  if (Platform.OS !== 'web' && isFileUri) {
    const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
    return { base64 };
  }
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return { blob };
  } catch {
    if (Platform.OS !== 'web' && uri.startsWith('file://')) {
      const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
      return { base64 };
    }
    throw new Error('Could not read image file');
  }
}

/**
 * Upload a card image to Storage and save its URL in Firestore.
 * All users will see this image for the given cardId.
 */
export async function uploadCardImageToCloud(cardId: string, localFileUri: string): Promise<string> {
  const db = getFirebaseFirestore();
  const st = getFirebaseStorage();
  if (!db || !st) throw new Error('Firebase not configured');

  const path = STORAGE_PREFIX + safePath(cardId) + '.jpg';
  const storageRef = ref(st, path);

  const data = await getImageDataForUpload(localFileUri);
  if (data.base64) {
    await uploadString(storageRef, data.base64, 'base64');
  } else if (data.blob) {
    await uploadBytes(storageRef, data.blob);
  } else {
    throw new Error('Could not read image file');
  }
  const url = await getDownloadURL(storageRef);

  const docRef = doc(db, COLLECTION, cardId);
  await setDoc(docRef, { url, updatedAt: serverTimestamp() });
  urlCache.set(cardId, url);
  return url;
}

/**
 * Get the cloud admin image URL for a card, if any. Cached in memory.
 */
export async function getCloudAdminImageUrl(cardId: string): Promise<string | null> {
  const cached = urlCache.get(cardId);
  if (cached) return cached;

  const db = getFirebaseFirestore();
  if (!db) return null;

  const docRef = doc(db, COLLECTION, cardId);
  const snap = await getDoc(docRef);
  const data = snap.data();
  const url = typeof data?.url === 'string' ? data.url : null;
  if (url) urlCache.set(cardId, url);
  return url;
}

/**
 * Remove cloud admin image (Storage object + Firestore doc).
 */
export async function deleteCloudAdminImage(cardId: string): Promise<void> {
  const db = getFirebaseFirestore();
  const st = getFirebaseStorage();
  if (!db) return;

  const docRef = doc(db, COLLECTION, cardId);
  await deleteDoc(docRef);
  urlCache.delete(cardId);

  if (st) {
    const path = STORAGE_PREFIX + safePath(cardId) + '.jpg';
    try {
      await deleteObject(ref(st, path));
    } catch {
      /* object may already be gone */
    }
  }
}

/**
 * List all card IDs that have a cloud admin image.
 */
export async function listCloudAdminCardIds(): Promise<string[]> {
  const db = getFirebaseFirestore();
  if (!db) return [];

  const col = collection(db, COLLECTION);
  const snap = await getDocs(col);
  return snap.docs.map((d) => d.id);
}
