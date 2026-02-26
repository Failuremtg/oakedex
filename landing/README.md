# Oakedex landing page

A standalone promo landing page for the Oakedex app.

## View locally

- **Option A:** Open `index.html` in a browser. All assets (logo, screenshots) live inside the `landing` folder.
- **Option B:** From the **oakedex** folder run a static server, then open the landing page:
  ```bash
  npx serve -p 3000
  ```
  Then go to http://localhost:3000/landing/

## Deploy to Vercel (public site)

The landing is self-contained so you can deploy it as your main site.

1. **Push your repo to GitHub** (if it isn’t already).
2. Go to [vercel.com](https://vercel.com), sign in, and click **Add New… → Project**.
3. **Import** your repository (e.g. `appdev-all` or `oakedex`).
4. **Set the Root Directory** so Vercel uses only the landing:
   - If the repo is **oakedex** (this project only): set Root Directory to **`landing`**.
   - If the repo is **appdev-all** (monorepo): set Root Directory to **`apps-dev/oakedex/landing`**.
5. Leave **Framework Preset** as “Other” and **Build Command** / **Output Directory** empty.
6. Click **Deploy**.

Your site will be live at `https://your-project.vercel.app`. You can add a custom domain in the Vercel project settings (e.g. `oakedex.com`).

## Assets

- Logo: `assets/oakedex-logo.svg` (copy from project root; also kept in `landing/assets/` for deployment).
- Screenshots: `assets/screenshots/` — already populated with the six app screenshots. To replace them, see `assets/screenshots/README.md`.

## Sign-up form (news & beta)

Signups are stored in Firestore collection `landingSignups`. Firebase config is inlined in `landing/index.html`; no separate `firebase-config.js` is required for deploy.

1. **Firestore rules**  
   Deploy rules so the collection exists and only accepts creates (no public read):
   ```bash
   firebase deploy --only firestore:rules
   ```
   The repo’s `firestore.rules` already includes `landingSignups` (create-only).

2. **Export all signups to CSV**  
   From the project root, with a service account (Firebase Console → Project settings → Service accounts → Generate new private key):
   ```bash
   npm install
   set GOOGLE_APPLICATION_CREDENTIALS=path\to\service-account.json
   npm run export-signups -- --output landing-signups.csv
   ```
   Or on Mac/Linux: `GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run export-signups -- --output landing-signups.csv`  
   Open `landing-signups.csv` to get all emails (and beta/source/createdAt) for inviting testers.

The form sends `email`, `beta` (yes if “I’m interested in beta testing” is checked), and `source` (hero/cta).

## Deploy

The landing folder is self-contained and ready for any static host. For **Vercel**, see “Deploy to Vercel” above. For others, upload the contents of `landing/` and point the site at the directory that contains `index.html`.
