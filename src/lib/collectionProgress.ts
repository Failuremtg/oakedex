/**
 * Collection progress – filled vs total slots for stats (e.g. Trainer ID page).
 */

import type { Collection } from '@/src/types';
import { filterVariantsByEdition, getDisplayVariants } from '@/src/types';
import { getCustomCards } from '@/src/lib/adminBinderConfig';
import { getPocketSetIds, getSetWithCache, getSpeciesWithCache } from '@/src/lib/cardDataCache';
import { addMasterBallIfEligible } from '@/src/lib/masterBallSets';
import { getExpandedSpeciesList, getTcgSearchName } from '@/src/lib/masterSetExpansion';
import { getSpecies, getSpeciesNameForLang } from '@/src/lib/pokeapi';
import { getCard, getCardsByName, getCardsFull, type TCGdexLang } from '@/src/lib/tcgdex';

function setIdFromCardId(cardId: string): string {
  const i = cardId.lastIndexOf('-');
  return i >= 0 ? cardId.slice(0, i) : cardId;
}

export interface CollectionProgress {
  filled: number;
  total: number | null;
}

function filledCount(c: Collection): number {
  return c.slots.filter((s) => s.card != null).length;
}

/** Count total slots for a single_pokemon collection (all printings × variants across selected languages). Excludes Pokémon TCG Pocket sets. */
async function getSinglePokemonTotal(c: Collection): Promise<number | null> {
  if (c.type !== 'single_pokemon' || !c.singlePokemonName) return null;
  const pocketIds = await getPocketSetIds();
  const pocketSet = new Set(pocketIds);
  const langs = (c.languages?.length ? c.languages : ['en']) as TCGdexLang[];
  const includeRegional = c.includeRegionalForms !== false;
  const editionFilter = c.editionFilter ?? 'all';
  let total = 0;
  try {
    let species: Awaited<ReturnType<typeof getSpecies>> = null;
    if (c.singlePokemonDexId != null && c.singlePokemonDexId > 0) {
      try {
        species = await getSpecies(c.singlePokemonDexId);
      } catch {
        species = null;
      }
    }
    const singleSummary = {
      dexId: c.singlePokemonDexId ?? 0,
      name: c.singlePokemonName,
      form: c.singlePokemonName?.startsWith('Gigantamax ') ? 'gmax' as const : undefined,
    };
    for (const lang of langs) {
      const searchName =
        singleSummary.name && singleSummary.form
          ? getTcgSearchName(singleSummary)
          : (getSpeciesNameForLang(species, lang) ?? c.singlePokemonName!);
      let briefs = await getCardsByName(lang, searchName, { exact: !includeRegional });
      briefs = (briefs ?? []).filter((b) => !pocketSet.has(setIdFromCardId(b.id)));
      if (briefs.length === 0 && lang !== 'en' && searchName) {
        const enBriefs = await getCardsByName('en', searchName, { exact: !includeRegional });
        const cardIds = (enBriefs ?? []).filter((b) => !pocketSet.has(setIdFromCardId(b.id))).map((x) => x.id);
        for (let i = 0; i < cardIds.length; i += 50) {
          const batch = cardIds.slice(i, i + 50);
          const fullCards = await getCardsFull(lang, batch);
          for (const full of fullCards) {
            if (!full?.variants || pocketSet.has(full.set?.id ?? setIdFromCardId(full.id))) continue;
            const withMasterBall = addMasterBallIfEligible(getDisplayVariants(full), full.set?.id ?? setIdFromCardId(full.id), full.localId, full);
            const variants = filterVariantsByEdition(withMasterBall, editionFilter);
            total += variants.length;
          }
        }
      } else {
        const cardIds = (briefs ?? []).map((x) => x.id);
        for (let i = 0; i < cardIds.length; i += 50) {
          const batch = cardIds.slice(i, i + 50);
          const fullCards = await getCardsFull(lang, batch);
          for (const full of fullCards) {
            if (!full?.variants || pocketSet.has(full.set?.id ?? setIdFromCardId(full.id))) continue;
            const withMasterBall = addMasterBallIfEligible(getDisplayVariants(full), full.set?.id ?? setIdFromCardId(full.id), full.localId, full);
            const variants = filterVariantsByEdition(withMasterBall, editionFilter);
            total += variants.length;
          }
        }
      }
    }
    return total;
  } catch {
    return null;
  }
}

/**
 * Get filled count and total slot count for a collection.
 * total is null when not easily available.
 */
export async function getCollectionProgress(c: Collection): Promise<CollectionProgress> {
  const filled = filledCount(c);

  if (c.type === 'by_set' && c.setId) {
    const pocketIds = await getPocketSetIds();
    if (pocketIds.includes(c.setId)) return { filled, total: 0 };
    try {
      const setData = await getSetWithCache(c.setId);
      const total = setData.cards?.length ?? 0;
      return { filled, total };
    } catch {
      return { filled, total: null };
    }
  }

  if (c.type === 'collect_them_all' || c.type === 'master_set' || c.type === 'master_dex') {
    try {
      const [base, customCards] = await Promise.all([
        getSpeciesWithCache(),
        getCustomCards(),
      ]);
      const species =
        c.type === 'master_set' || c.type === 'master_dex'
          ? getExpandedSpeciesList(base, c.masterSetOptions)
          : base;
      const total = species.length + customCards.length;
      return { filled, total };
    } catch {
      return { filled, total: null };
    }
  }

  if (c.type === 'single_pokemon') {
    try {
      const total = await getSinglePokemonTotal(c);
      return { filled, total: total ?? null };
    } catch {
      return { filled, total: null };
    }
  }

  if (c.type === 'custom') {
    return { filled, total: c.slots.length };
  }

  return { filled, total: null };
}
