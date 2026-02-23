# Building Oakedex for the Android Store

## Quick: Build AAB for Google Play

To produce an **Android App Bundle (.aab)** for Play Store upload:

```bash
cd apps-dev/oakedex
npm install
npx eas build --platform android --profile production
```

The **production** profile in `eas.json` uses `buildType: "app-bundle"`, so the build output is an AAB. Download it from [expo.dev](https://expo.dev) → your project → **Builds** → select the build → **Download**, then upload that AAB in [Google Play Console](https://play.google.com/console) (Test and release → Create new release → Upload).

Before building, ensure **Firebase** and (optional) **Google Sign-In** env vars are set in EAS (see below).

---

## Google Sign-In: Connect Google Cloud so users can log in with Google

To enable **Sign in with Google** in the app (so the Google button works in login/signup):

### 1. Firebase

- **Firebase Console** → [console.firebase.google.com](https://console.firebase.google.com) → your project.
- **Authentication** → **Sign-in method** → enable **Google** (and configure if prompted).
- **Project settings** (gear) → **Your apps** → **Web app** → copy the **Web client ID** (sometimes labeled “Client ID” under OAuth 2.0).

### 2. Google Cloud Console (redirect URIs)

- Open [Google Cloud Console](https://console.cloud.google.com) → same project as Firebase (or the linked project).
- **APIs & Services** → **Credentials** → open your **OAuth 2.0 Client ID** of type **Web application** (the one whose Client ID you copied).
- Under **Authorized redirect URIs** add:
  - **Production AAB / dev build:** `oakedex://redirect`
  - **Expo Go (optional):** `https://auth.expo.io/@failuremtg/oakedex`  
  (Replace `failuremtg` with your Expo username if different; see `app.json` → `extra.eas` / owner.)
- Save.

### 3. Put the Web Client ID in the app

- In your project root, copy `.env.example` to `.env` if you don’t have `.env` yet.
- Set:
  - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=` **your Web client ID** (from Firebase / Google Cloud).
  - All `EXPO_PUBLIC_FIREBASE_*` variables (from Firebase → Project settings → Your apps → Web app).
- Push to EAS so the **production** build has Google + Firebase config:
  ```bash
  cd apps-dev/oakedex
  eas login
  npm run eas:set-firebase
  ```
- Create a **new** production build after that:
  ```bash
  npx eas build --platform android --profile production
  ```

If `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is not set in EAS, the Google button on login will be disabled and show a short hint.

---

## Full card data (TCGdex API)

The app already uses the **full public TCGdex API** – there is no separate “test” vs “full” API.

- **Base URL:** `https://api.tcgdex.net/v2`
- **No API key** required; no sign-up.
- Cards, sets, and images are fetched at runtime when you open a binder or pick a set.

You don’t need to “download the full API” to try the app or to ship a Play Store build. The same API is used in development and in production. For a release build, ensure the app has **network permission** (Expo/React Native include this by default for Android).

If you want **offline card data** later, that would be a separate feature (e.g. cache sets/cards on first use or a “Download for offline” flow). The current design is online-only for card data.

---

## Firebase: use a real (non–test) project for the store

For a **Play Store build**, use a **production Firebase project**, not the temporary test mode.

### 1. Create or use a real Firebase project

- Go to [Firebase Console](https://console.firebase.google.com).
- Create a project (e.g. “Oakedex”) or use an existing one.
- Do **not** use the default “test mode” rules that allow unauthenticated read/write for 30 days.

### 2. Security rules (production-ready)

This repo’s **`firestore.rules`** are already suitable for production:

- Only **signed-in users** can read/write.
- Each user can only access their own data under `users/{userId}/...`.

Deploy them:

```bash
cd apps-dev/oakedex
npx firebase use <your-project-id>
npx firebase deploy --only firestore:rules
```

Or paste the contents of `firestore.rules` into Firestore → Rules in the console.

### 3. Enable Auth and Firestore

- **Authentication** → Sign-in method → enable **Email/Password** (and optionally Google).
- **Firestore Database** → Create database (production mode). Use the same rules as above.

### 4. Firebase config in the **built** app (EAS Build)

If the built app shows **"Add Firebase config to enable sign-in"**, the build profile did not have the Firebase env vars set—EAS Build does not use your local `.env`.

- Add an **Android app** to the Firebase project (or use the existing one).

The app needs Firebase config at **build time**. EAS Build runs in the cloud and does **not** use your local `.env`, so you must add the same variables as **EAS environment variables** for the build that produces your APK/AAB.

**Easiest: push from your local `.env`** (after filling it from Firebase Console):

```bash
cd apps-dev/oakedex
eas login
# Copy .env.example to .env and fill EXPO_PUBLIC_FIREBASE_* from Firebase Console → Project settings → Your apps (Web).
npm run eas:set-firebase
```

This runs `scripts/set-eas-firebase-env.js`, which reads `.env` and creates the six Firebase variables in EAS for the **production** environment. To use another build profile (e.g. preview), run `EAS_PROFILE=preview npm run eas:set-firebase` (Windows: `set EAS_PROFILE=preview` then `npm run eas:set-firebase`).

**Or add vars manually** (run from `apps-dev/oakedex`; use `eas login` first):

```bash
npx eas env:create --environment production --name EXPO_PUBLIC_FIREBASE_API_KEY --value "YOUR_API_KEY" --type string --visibility plaintext --non-interactive
npx eas env:create --environment production --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "YOUR_PROJECT_ID.firebaseapp.com" --type string --visibility plaintext --non-interactive
npx eas env:create --environment production --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "YOUR_PROJECT_ID" --type string --visibility plaintext --non-interactive
npx eas env:create --environment production --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "YOUR_PROJECT_ID.appspot.com" --type string --visibility plaintext --non-interactive
npx eas env:create --environment production --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "YOUR_SENDER_ID" --type string --visibility plaintext --non-interactive
npx eas env:create --environment production --name EXPO_PUBLIC_FIREBASE_APP_ID --value "YOUR_APP_ID" --type string --visibility plaintext --non-interactive
```

Get the values from [Firebase Console](https://console.firebase.google.com) → your project → **Project settings** (gear) → **Your apps** → Web app config (or the same values from your `.env`). If a variable already exists in EAS, update it in the [Expo dashboard](https://expo.dev) (Project → Environment variables) or delete it and re-run the script.

Then run a **new** build. The new APK will have Firebase config and login will work:

```bash
npx eas build --platform android --profile production
```

To build an **APK** instead of an AAB (same production env/Firebase):

```bash
npx eas build --platform android --profile production-apk
```

For **local dev** you can keep using **`.env`** (same variable names); that file is only used when you run `expo start` / `npm run android`, not by EAS Build.

### Summary

| Use case              | Firebase setup                                      |
|------------------------|-----------------------------------------------------|
| Local dev / try-out    | Optional; can use AsyncStorage only (no Firebase).  |
| Dev with cloud sync    | One Firebase project + Auth + Firestore + rules.    |
| **Play Store build**   | **Same project, but ensure rules are deployed** (no test-mode open access). |

You do **not** need a separate “test” vs “production” database: one Firestore database with the repo’s rules is enough. Just avoid leaving the database in the default 30-day test rules when you ship.

### Google sign-in (optional)

To enable **Sign in with Google** on the app:

1. **Firebase Console** → Authentication → Sign-in method → enable **Google**.
2. **Firebase Console** → Project settings → Your apps → Web app → copy the **Web client ID** (or Web API Key).
3. In **.env**, set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=` to that value.
4. **Google Cloud Console** → APIs & Services → Credentials → your OAuth 2.0 Client (Web) → **Authorized redirect URIs** → add:
   - Expo Go: `https://auth.expo.io/@YOUR_EXPO_USERNAME/oakedex`
   - Dev/build: `oakedex://redirect` (or the exact URI shown in the app if different).
5. For **EAS builds**: add the same variable in EAS (run `npm run eas:set-firebase` after setting it in .env—the script now pushes `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` if present).

If `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is not set, the login screen shows the Google button as disabled with a short hint instead of an error.

---

## Building the Android app (Expo)

From the repo root:

```bash
cd apps-dev/oakedex
npm install
npx eas build --platform android --profile production
```

If you haven’t used EAS yet:

```bash
npm install -g eas-cli
eas login
eas build:configure
```

Then run the build again. Use the same Firebase project and env config (via `.env` or EAS secrets) so the store build uses your production Firebase and the full TCGdex API.

---

## Uploading to the Play Store

After you have a **production** AAB from EAS (`npx eas build --platform android --profile production`), you can get it onto the Play Store in two ways.

### Option A: Upload in Play Console (manual)

1. In [Google Play Console](https://play.google.com/console), open your app **Oakedex**.
2. In the left menu, go to **Test and release** (or **Release** → **Production** / **Testing**).
3. Choose a track:
   - **Internal testing** – fastest; for you and a few testers. Builds appear in minutes.
   - **Closed testing** – for a larger test group before production.
   - **Production** – for everyone (requires completed store listing, policy forms, and usually at least one closed test).
4. Click **Create new release** (or **Release** on that track).
5. Upload your **Android App Bundle (.aab)**:
   - Download it from [expo.dev](https://expo.dev) → your project → **Builds** → select the build → **Download**.
   - In Play Console, drag the AAB into the “App bundles” area or click **Upload** and select the file.
6. Add **Release name** (e.g. “1.0.0 (42)”) and **Release notes**, then **Save** and **Review release** → **Start rollout** (or **Save** and finish the flow for that track).

For the first release, complete **Finish setting up your app** (Dashboard) and the required policy/questionnaire steps; Production also needs you to complete a closed test and apply for production access when prompted.

### Option B: EAS Submit (send latest build to Play Console)

If you’re already logged in to EAS and have a **production** Android build, you can submit that build to the Play Store from the CLI:

```bash
cd apps-dev/oakedex
npx eas submit --platform android --profile production --latest
```

The first time, EAS will ask you to link a **Google Service Account** (JSON key) with Play Console API access so it can upload on your behalf. [Expo’s docs](https://docs.expo.dev/submit/android/#credentials) explain how to create the service account and grant access in Play Console. After that, `eas submit --latest` uploads the most recent production build to your **internal testing** track by default (you can change the track in `eas.json` under `submit.production` if needed).
