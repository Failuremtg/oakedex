/**
 * Firebase – Auth and Firestore.
 * Add your config from Firebase Console → Project settings → Your apps.
 * For Expo, use app.config.js extra or env (e.g. EXPO_PUBLIC_FIREBASE_*).
 * On native, Auth uses React Native persistence (AsyncStorage) so login survives app restarts until the user signs out.
 * Config is read from process.env first, then from Constants.expoConfig.extra.firebase (baked in by app.config.js).
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const extraFirebase = (Constants.expoConfig as { extra?: { firebase?: Record<string, string> } } | null)?.extra?.firebase;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? extraFirebase?.apiKey ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? extraFirebase?.authDomain ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? extraFirebase?.projectId ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? extraFirebase?.storageBucket ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? extraFirebase?.messagingSenderId ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? extraFirebase?.appId ?? '',
};

function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    return null;
  }
  if (getApps().length === 0) {
    initializeApp(firebaseConfig);
  }
  return getApp();
}

let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!auth) {
    if (Platform.OS === 'web') {
      auth = getAuth(app);
    } else {
      const { initializeAuth, getReactNativePersistence } = require('@firebase/auth');
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
  }
  return auth;
}

export function getFirebaseFirestore(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!db) db = getFirestore(app);
  return db;
}

export function getFirebaseStorage(): FirebaseStorage | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!storage) storage = getStorage(app);
  return storage;
}

export function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}
