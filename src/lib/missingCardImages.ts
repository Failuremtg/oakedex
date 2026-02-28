/**
 * List cards that have no image in TCGdex (English sets).
 * Used by the admin "missing images" binder so admins can upload images for all users.
 */

import { getSet, getSetsRaw, isPocketSet, SET_IDS_WITHOUT_CARDS, type TCGdexLang } from './tcgdex';

export type MissingImageCard = {
  cardId: string;
  name: string;
  setId: string;
  setName: string;
  localId: string;
};

const LANG: TCGdexLang = 'en';

/**
 * Fetches all English sets (excluding Pocket and empty-card sets), then for each set
 * loads its cards and returns those with no image in the API.
 * Cards that already have an admin image in the cloud should be filtered out by the caller
 * using listCloudAdminCardIds().
 */
export async function getMissingImageCards(): Promise<MissingImageCard[]> {
  const sets = await getSetsRaw(LANG);
  const filtered = sets.filter(
    (s) => !SET_IDS_WITHOUT_CARDS.includes(s.id) && !isPocketSet(s)
  );

  const missing: MissingImageCard[] = [];
  for (const set of filtered) {
    try {
      const setData = await getSet(LANG, set.id);
      const cards = setData.cards ?? [];
      const setName = setData.name ?? set.name ?? set.id;
      for (const card of cards) {
        const hasImage = card.image != null && String(card.image).trim().length > 0;
        if (!hasImage) {
          missing.push({
            cardId: card.id,
            name: card.name ?? card.id,
            setId: set.id,
            setName,
            localId: card.localId ?? '',
          });
        }
      }
    } catch {
      // skip set on error
    }
  }
  return missing;
}
