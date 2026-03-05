/**
 * Firebase config for landing signups and (when .env is missing) for the Expo app.
 * Same config as EXPO_PUBLIC_FIREBASE_* in .env.
 */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDJEsMub1NFQX-3y6sVqi5uh9iLd5201JE",
  authDomain: "oakedex.firebaseapp.com",
  projectId: "oakedex",
  storageBucket: "oakedex.firebasestorage.app",
  messagingSenderId: "154159149234",
  appId: "1:154159149234:web:c1092c6aad5312465bd9ab"
};
if (typeof window !== 'undefined') window.FIREBASE_CONFIG = FIREBASE_CONFIG;
if (typeof module !== 'undefined' && module.exports) module.exports = FIREBASE_CONFIG;
