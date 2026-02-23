# Oakedex

A digital Pokémon TCG binder app – collect by Pokémon, not by set.

## Features (MVP)

- **Collect Them All** – One card per Pokémon; pick any printing and which version (normal, reverse, holo, 1st edition) you have.
- **Single Pokémon** – Create a binder for one Pokémon and track every printing; mark owned and variant per card.
- **Card version** – When adding a card, choose the exact variant (normal / reverse / holo / first edition).

Data is stored locally (AsyncStorage) or in Firestore when you’re signed in (per user).

## Tech

- **Expo** (React Native) with **expo-router**
- **TCGdex API** – cards, sets, multilingual (English used in MVP)
- **PokeAPI** – list of Pokémon species for Collect Them All
- **AsyncStorage** – local persistence when not signed in
- **Firebase** (optional) – Auth (email/password); Firestore for cloud sync of collections per user

## Run

From workspace root (**appdev-all**):

```bash
cd apps-dev/oakedex
npm install
npm run android   # or npm run ios / npm run web
```

### Optional: Firebase sign-in

1. Create a [Firebase](https://console.firebase.google.com) project and enable **Authentication → Sign-in method → Email/Password**.
2. Add a Web app in Project settings and copy the config.
3. Fill in `.env` with your Firebase Web app config: `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, etc. (A `.env` file is already set up; add your values from Firebase Console → Project settings → Your apps.)
4. Restart the dev server. The app will then require login before opening the main tabs; sign out is in Profile.
5. **Firestore**: In Firebase Console → Firestore Database → create database (if needed). Then deploy the project’s security rules:
   - **Option A (CLI):** From this directory run `npx firebase init firestore` (choose existing project, keep `firestore.rules`), then `npx firebase deploy --only firestore:rules`.
   - **Option B (Console):** In Firestore → Rules, paste the contents of `firestore.rules` from this repo.

When signed in, collections and binder order are stored under `users/{uid}/collections` and `users/{uid}/binderOrder`. On first sign-in, any existing local collections are uploaded once to Firestore.

For **building for the Android store** and using a **production Firebase project** (non–test DB), see [BUILD_ANDROID.md](./BUILD_ANDROID.md).

## Project layout

- `app/` – Screens: Home `(tabs)/index`, Binder `binder/[id]`, Card picker `card-picker`, New Single Pokémon `new-single`
- `src/types.ts` – Data model (Collection, Slot, BinderType, etc.)
- `src/lib/tcgdex.ts` – TCGdex API client
- `src/lib/collections.ts` – Load/save collections and slots
- `src/lib/pokeapi.ts` – Pokémon species list for Collect Them All

## Later (not in MVP)

- Master Dex (all forms per Pokémon)
- Multiple languages per binder
- Custom binder designs
- Real-time sync (listen to Firestore changes)
