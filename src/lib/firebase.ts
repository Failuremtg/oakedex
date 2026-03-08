/**
 * Firebase – Auth and Firestore.
 * Config is read from Constants.expoConfig.extra.firebase first (baked in at build time by app.config.js),
 * then from process.env, so the built app always uses the config that was embedded when EAS built it.
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const extraFirebase = (Constants.expoConfig as { extra?: { firebase?: Record<string, string> } } | null)?.extra?.firebase;

function getConfigValue(
  key: keyof NonNullable<typeof extraFirebase>,
  envValue: string | undefined
): string {
  const fromExtra = extraFirebase?.[key];
  const fromEnv = envValue ?? '';
  return (fromExtra && String(fromExtra).trim() !== '') ? String(fromExtra) : fromEnv;
}

const firebaseConfig = {
  apiKey: getConfigValue('apiKey', process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
  authDomain: getConfigValue('authDomain', process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: getConfigValue('projectId', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: getConfigValue('storageBucket', process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: getConfigValue('messagingSenderId', process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: getConfigValue('appId', process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
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
