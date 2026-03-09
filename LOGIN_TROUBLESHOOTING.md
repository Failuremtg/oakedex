# Login troubleshooting – step by step

When sign-in fails, the app shows a **Sign-in message** with a short description and an **error code in parentheses**, e.g. `(auth/invalid-api-key)` or `(NO_FIREBASE_CONFIG)`. Use this doc to find the code and fix the cause.

---

## Error codes you might see

| Code | Meaning | What to do |
|------|--------|------------|
| **NO_FIREBASE_CONFIG** | Firebase did not initialize (missing or invalid config in the app). | 1. Ensure EAS has all `EXPO_PUBLIC_FIREBASE_*` vars for the build’s environment (run `npm run eas:set-firebase`). 2. Create a **new** build and install it. 3. Check [Step 2](#step-2-firebase-config-in-the-app-build) below. |
| **auth/invalid-api-key** | Firebase rejected the API key (wrong key or key restricted and app not allowed). | 1. In [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials, open the **API key** used by your Firebase Web app. 2. If **Application restrictions** = “Android apps”, add your app: package name `com.oakedex.app` and the **SHA-1** from EAS (expo.dev → project → Credentials → Android). Or set restrictions to “None” to test. 3. Confirm the key matches Firebase Console → Project settings → Your apps → Web app. 4. Create a new build if you changed config. |
| **auth/api-key-not-valid** | Same as above – API key not accepted. | Same as **auth/invalid-api-key**. |
| **auth/configuration-not-found** | Firebase project or app config not found. | Check Firebase project ID and that the Web app exists. Re-push env to EAS and create a new build. |
| **auth/invalid-credential** or **auth/wrong-password** | Email/password don’t match or account doesn’t exist. | Use the correct email and password, or sign up. |
| **auth/network-request-failed** | Request to Firebase failed (no internet or blocked). | Check device internet; try Wi‑Fi vs mobile data. |
| **auth/too-many-requests** | Too many failed attempts. | Wait a bit, then try again. |
| **auth/operation-not-allowed** | Email/Password or Google sign-in not enabled in Firebase. | Firebase Console → Authentication → Sign-in method → enable **Email/Password** and/or **Google**. |
| **auth/user-disabled** | Account was disabled. | Use another account or re-enable in Firebase Auth. |
| (no code) | Unknown error. | Check the full message; ensure network and Firebase project are correct. |

---

## Step-by-step checklist (in order)

### Step 1: Firebase project and Auth

- [ ] **Firebase project** exists and is the one you use in `.env` / EAS (same project ID).
- [ ] **Authentication** is enabled: Firebase Console → [Authentication](https://console.firebase.google.com) → Sign-in method.
- [ ] **Email/Password** is enabled if you use email sign-in.
- [ ] **Google** is enabled if you use Google sign-in.
- [ ] **Project settings** → Your apps → **Web app** exists; note the **API Key**, **Project ID**, **App ID** (they must match what the app uses).

### Step 2: Firebase config in the app build

The app needs the Firebase config at **build time** (EAS does not use your local `.env`).

- [ ] **EAS environment variables** are set for the **environment** your build uses (e.g. `production` or `preview`):
  - `EXPO_PUBLIC_FIREBASE_API_KEY`
  - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
  - `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `EXPO_PUBLIC_FIREBASE_APP_ID`
- [ ] Run from project root: `npm run eas:set-firebase` (with `.env` filled from Firebase Console). This pushes the vars to EAS for preview and production.
- [ ] The build you are testing was created **after** these vars were set (and after any fix to `src/lib/firebase.ts`). Old builds have old or missing config.
- [ ] In [expo.dev](https://expo.dev) → your project → **Environment variables**, confirm the **production** (and **preview** if you use it) environment lists the Firebase vars.

### Step 3: API key restrictions (fixes auth/invalid-api-key)

- [ ] Open [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**.
- [ ] Find the **API key** used by your Firebase Web app (same as in Firebase Project settings → Your apps → Web app).
- [ ] Open that key. Under **Application restrictions**:
  - If it’s **“None”**: key is not restricted; if you still get `auth/invalid-api-key`, the key value may be wrong (see Step 2).
  - If it’s **“Android apps”**: add an item with **Package name** `com.oakedex.app` and **SHA-1** = the fingerprint of the keystore that signed the build. Get SHA-1 from expo.dev → project → Credentials → Android (or from the EAS build’s signing info). Save.
- [ ] Wait a minute and try sign-in again (no new build needed for restriction changes).

### Step 4: Google sign-in only (if you use “Sign in with Google”)

- [ ] **EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID** is set in EAS for the same environment as the build (run `npm run eas:set-firebase` if it’s in `.env`).
- [ ] **Google Cloud Console** → Credentials → your **OAuth 2.0 Client ID** (Web application) → **Authorized redirect URIs** includes:
  - `https://auth.expo.io/@failuremtg/oakedex` (replace `failuremtg` with your Expo username if different).
- [ ] New build created after setting the client ID.

### Step 5: Local .env (for local dev only)

- [ ] For **local** runs (`npx expo start`), `.env` in the project root has all `EXPO_PUBLIC_FIREBASE_*` (and optionally `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`). EAS builds ignore `.env` and use EAS env vars only.

### Step 6: Build and install

- [ ] You installed a build that was **created after** the latest config/code changes.
- [ ] You are not testing an old APK/AAB from the store or an old download.

---

## Quick “login used to work, now it doesn’t” checklist

1. **New build** – Create a new EAS build and test with that. Old builds may have wrong or missing config.
2. **API key restrictions** – If the error code is `auth/invalid-api-key` or `auth/api-key-not-valid`, add your app’s package name and SHA-1 to the API key in Google Cloud (Step 3) or set restrictions to “None” to test.
3. **EAS env** – In expo.dev → Environment variables, confirm **production** (and **preview** if used) has all Firebase vars. Re-run `npm run eas:set-firebase` if needed, then create a new build.
4. **Firebase Auth** – In Firebase Console, confirm Email/Password and Google are still enabled and the project is the correct one.

---

## Where to get SHA-1 for Android

- **expo.dev** → your project → **Credentials** → Android (upload keystore or default) → SHA-1.
- Or: EAS build page → build details / Credentials.

Use that exact SHA-1 in Google Cloud Console when adding an Android app restriction for the API key.
