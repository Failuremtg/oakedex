/**
 * Display helpers for collections: title, subtitle (type label), and icon.
 */

import {
  MASTER_BALL_ICON,
  POKE_BALL_ICON,
  POKE_BALL_ICON_BW_SENTINEL,
  PREMIER_BALL_ICON,
  getPokemonSpriteUrl,
} from '@/src/constants/collectionIcons';
import { VARIATION_GROUPS } from '@/src/lib/masterSetExpansion';
import { normalizeTcgdexImageUrl } from '@/src/lib/tcgdex';
import type { Collection } from '@/src/types';

/** Whether a master_set has all options enabled (Grandmaster Collection). */
export function isGrandmasterCollection(c: Collection): boolean {
  if (c.type !== 'master_set' && c.type !== 'master_dex') return false;
  const opts = c.masterSetOptions;
  if (!opts) return false;
  const allVariations =
    (opts.variationGroups?.length ?? 0) === VARIATION_GROUPS.length || opts.variations === true;
  return !!(opts.regionalForms && allVariations && opts.megas && opts.gmax);
}

/** Display name for the binder (title on cover/ribbon). */
export function getCollectionDisplayName(c: Collection): string {
  if (c.type === 'collect_them_all') return 'Collect Them All';
  if (c.type === 'master_set' || c.type === 'master_dex') return c.name || 'Master Set';
  if (c.type === 'single_pokemon') return c.singlePokemonName ?? c.name ?? 'Binder';
  if (c.type === 'by_set') return c.setName ?? c.name ?? 'Set';
  if (c.type === 'custom') return c.name || 'Custom binder';
  return c.name || 'Binder';
}

/** Subtitle shown under the binder name: "Master Collection", "Grandmaster Collection", "Bulbasaur Collection", "Scarlet & Violet Collection". */
export function getCollectionSubtitle(c: Collection): string {
  if (c.type === 'collect_them_all') return 'Master Collection';
  if (c.type === 'master_set' || c.type === 'master_dex') {
    return isGrandmasterCollection(c) ? 'Grandmaster Collection' : 'Master Collection';
  }
  if (c.type === 'single_pokemon') {
    const name = c.singlePokemonName ?? c.name ?? 'Pokémon';
    return `${name} Collection`;
  }
  if (c.type === 'by_set') {
    const name = c.setName ?? c.name ?? 'Set';
    return `${name} Collection`;
  }
  if (c.type === 'custom') {
    return (c.customPokemonNames?.length ?? 0) > 0 ? 'Multi-Pokémon custom' : 'Custom binder';
  }
  return 'Collection';
}

/** Icon URI for ribbon/sticker: Master Ball for master/Grandmaster (UI adds star for Grandmaster), set symbol for by_set, sprite for single. */
export function getCollectionIconUri(c: Collection): string {
  if (c.type === 'collect_them_all') return MASTER_BALL_ICON;
  if (c.type === 'master_set' || c.type === 'master_dex') return MASTER_BALL_ICON;
  if (c.type === 'single_pokemon' && c.singlePokemonDexId != null) {
    return getPokemonSpriteUrl(c.singlePokemonDexId);
  }
  if (c.type === 'by_set') return normalizeTcgdexImageUrl(c.setSymbol) ?? POKE_BALL_ICON_BW_SENTINEL;
  if (c.type === 'custom') return PREMIER_BALL_ICON;
  return POKE_BALL_ICON;
}
