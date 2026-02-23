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

The “Stay in the loop” section collects emails for news and beta testing. Submissions are sent via [Formspree](https://formspree.io) (free tier is enough to get started).

1. Create a Formspree account and add a new form.
2. Copy your form ID from the form’s endpoint (e.g. `https://formspree.io/f/abcdexyz` → `abcdexyz`).
3. In `landing/index.html`, replace `YOUR_FORM_ID` in the form `action` with your form ID:
   ```html
   action="https://formspree.io/f/abcdexyz"
   ```
4. In Formspree, turn on “Email notifications” so you get each sign-up by email. You can also see and export submissions in the dashboard. The form sends:
   - `email` – signer’s address  
   - `beta` – `"yes"` if they checked “I’m interested in beta testing”

If the form ID is left as `YOUR_FORM_ID`, the page still works but shows a “Sign-up is not configured yet” message on submit.

## Deploy

The landing folder is self-contained and ready for any static host. For **Vercel**, see “Deploy to Vercel” above. For others, upload the contents of `landing/` and point the site at the directory that contains `index.html`.
