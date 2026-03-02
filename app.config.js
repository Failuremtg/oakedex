/**
 * Expo app config (dynamic). Reads app.json values via the { config } argument
 * so expo doctor recognises the pattern and doesn't warn about unused app.json.
 * Firebase env vars are baked into extra so the app can read them at runtime.
 * Load .env from this package (oakedex) so it works even when run from monorepo root.
 */
const path = require('path');
try {
  const envPath = path.join(__dirname, '.env');
  require('dotenv').config({ path: envPath });
  if (!process.env.EXPO_PUBLIC_FIREBASE_API_KEY) {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  }
} catch {
  // dotenv optional
}

// Use env first; if still missing, use same Firebase config as landing (so sign-in works without .env)
let firebaseExtra = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};
if (!firebaseExtra.apiKey || !firebaseExtra.projectId) {
  try {
    const landingConfig = require(path.join(__dirname, 'landing', 'firebase-config.js'));
    if (landingConfig && landingConfig.apiKey && landingConfig.projectId) {
      firebaseExtra = landingConfig;
    }
  } catch {
    // ignore
  }
}

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    firebase: firebaseExtra,
  },
});
