# Web demos roadmap (See it in action)

**Status: Implemented.** The landing page “See it in action” section now links to three try-it demos:

- **Collection** (`demo/collection.html`) – Sample Master collection; tap cards to mark owned, progress bar, search.
- **Edit binder** (`demo/edit.html`) – Drag to reorder cards; order saved in sessionStorage for the session.
- **Card Dex** (`demo/dex.html`) – Search and browse cards; pick a set from the dropdown, filter by name.

All demos use the TCGdex API, share `demo/demo.css`, and open in a new tab. They are demo-only (no sign-in, no sync to the real app).

---

Original plan (for reference):

## 1. Collection page demo

- **What:** A web version of the collection view (e.g. Master collection or a single binder).
- **Experience:** Browse a sample collection: grid of cards, progress bar, search/filter. Read-only or with local-only state (e.g. “mark as owned” in sessionStorage, reset on refresh).
- **Data:** Use TCGdex API (or pre-built JSON) for cards/sets; PokeAPI for Pokémon list if needed. Demo uses a fixed sample binder (e.g. “Collect Them All” with a subset of Pokémon, or one Single Pokémon binder).
- **Tech:** Static HTML/JS or a small framework; fetch from TCGdex; optional React/Vue if the rest of the site stays static.

## 2. Edit page demo (open binder)

- **What:** Web version of the edit experience when a binder is open—reorder slots, maybe add/remove cards from a limited pool.
- **Experience:** Open a sample binder, drag to reorder, optionally tap a slot to “add card” from a small list. State only in memory or sessionStorage; no backend.
- **Data:** Same as above; limited set of cards/slots so the demo stays fast and understandable.
- **Tech:** Drag-and-drop (e.g. native HTML5, or a small library); same data layer as collection demo.

## 3. Card Dex demo

- **What:** Web version of the Dex: search and browse cards.
- **Experience:** Search by name or set, filter by language, see card images and details. “Add to binder” could be disabled or show a “Available in the app” tooltip.
- **Data:** TCGdex API (cards, sets, images). Cache or limit results for performance.
- **Tech:** Search UI + fetch to TCGdex; optional client-side cache.

## Implementation notes

- **Hosting:** Demos can live under the same site (e.g. `/landing/demo/collection`, `/landing/demo/edit`, `/landing/demo/dex`) or a subdomain.
- **No backend:** All demos can work with client-side only (TCGdex/public APIs + sessionStorage). No Firebase or user accounts in the demos.
- **Copy:** Clearly label each demo as “Try the experience” / “Demo only—your progress is not saved” so users know it’s not the real app.
- **Mobile-first:** Match the app’s layout and tap targets so the “try it” experience feels close to the app.

## Landing page

The “See it in action” section currently shows screenshots and a lead line: *“Try web demos of the collection view, binder edit, and Card Dex (coming soon)—no app install required.”* When demos are ready, replace the screenshot grid with links or embeds to each demo.
