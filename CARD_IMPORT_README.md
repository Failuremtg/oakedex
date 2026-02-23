# Card import (Excel / CSV)

You can bulk-add cards to a **Single Pokémon** or **Set** binder by uploading a spreadsheet.

## Template

Use **`assets/templates/card-import-template.csv`** (or create your own with the same columns).

Open it in Excel, Google Sheets, or any spreadsheet app. Fill in one row per card you want to mark as collected.

### Columns

| Column       | Required | Description | Example |
|-------------|----------|-------------|---------|
| **Set ID**  | Yes      | TCGdex set id (lowercase, no spaces) | `base1`, `swsh12`, `sv6` |
| **Card Number** | Yes | Collector number in that set (number on the card) | `4`, `123` |
| **Language** | No   | Language code. Default: `en` | `en`, `ja`, `de`, `fr` |
| **Variant** | No   | Print variant. Default: `normal` | `normal`, `reverse`, `holo`, `firstEdition` |

- **Set ID**: Find it on [TCGdex](https://tcgdex.dev) (set page URL or set list). Examples: `base1` (Base Set), `swsh12` (Fusion Strike), `sv6` (Twilight Masquerade).
- **Card Number**: The number on the bottom of the card (e.g. 4/102).
- **Language**: Use `en` for English, `ja` for Japanese, `de` for German, etc.
- **Variant**: Use `normal` for regular, `reverse` for reverse holo, `holo` for holo, `firstEdition` for 1st Edition.

### Saving from Excel

- **Excel**: Save As → **CSV (Comma delimited) (*.csv)** or **Excel Workbook (*.xlsx)**. Both work.
- **Google Sheets**: File → Download → **Comma Separated Values (.csv)** or **Microsoft Excel (.xlsx)**.

## How to import in the app (admin – global for all users)

Import is **admin-only** and **permanent for all users and devices**.

1. **Sign in as an admin** (your email or UID in Firestore `config/admins`).
2. Open the **binder** you want to fill (Single Pokémon or Set binder).
3. Tap **Edit**, then **Import** in the header (only visible to admins).
4. Choose your filled template (CSV or Excel file).
5. The app will match each row to a slot in that binder and mark those cards as collected. Any row that doesn’t match a slot in the current binder is skipped.

Only rows that match a card slot in **this** binder will be applied. Use the correct binder type (e.g. a Pikachu Single Pokémon binder only has Pikachu cards; a Fusion Strike set binder only has cards from that set).
