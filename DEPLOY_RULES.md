# Deploying Firebase rules

## 1. Install Firebase CLI (if needed)

```bash
npm install -g firebase-tools
```

## 2. Log in and link the project

```bash
firebase login
cd path/to/oakedex
firebase use --add
```

Choose your Firebase project when prompted.

## 3. Deploy rules

Deploy both Firestore and Storage rules:

```bash
firebase deploy
```

Or only rules (no hosting/functions):

```bash
firebase deploy --only firestore,storage
```

You should see something like:

- `firestore: released rules firestore.rules`
- `storage: released rules storage.rules`

## 4. Enable Storage (first time)

If you haven’t used Storage yet:

1. Open [Firebase Console](https://console.firebase.google.com/) → your project.
2. Build → **Storage** → **Get started**.
3. Choose a location and confirm. You can leave security rules as-is and then deploy your `storage.rules` with the CLI (step 3).

---

## How the app knows you are an admin

The app checks a **Firestore document** to see who is an admin:

1. In [Firebase Console](https://console.firebase.google.com/) → your project → **Firestore Database**.
2. Start a **collection** (if needed) and add a document:
   - Document path: **`config/admins`** (collection `config`, document id `admins`).
   - Add a field:
     - **`emails`** (type: array) → add your login email(s), e.g. `["you@example.com"]`
     - or **`uids`** (type: array) → add Firebase Auth UIDs if you prefer.
3. Save.

Only users whose **email** (or **uid**) is in that list will see **“Card image admin”** in Settings and can open the admin screen. Everyone else stays a normal user. You can add or remove emails in the Console anytime; the app caches the list briefly, so changes may take a moment to apply.
