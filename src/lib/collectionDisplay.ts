/**
 * Display helpers for collections: title, subtitle (type label), and icon.
 */

import {
  MASTER_BALL_ICON,
  POKE_BALL_ICON,
  POKE_BALL_ICON_BW_SENTINEL,
  getPokemonSpriteUrl,
} from '@/src/constants/collectionIcons';
import { normalizeTcgdexImageUrl } from '@/src/lib/tcgdex';
import type { Collection } from '@/src/types';

/** Whether a master_set has all options enabled (True Master Collection). */
export function isTrueMasterCollection(c: Collection): boolean {
  if (c.type !== 'master_set' && c.type !== 'master_dex') return false;
  const opts = c.masterSetOptions;
  if (!opts) return false;
  return !!(opts.regionalForms && opts.variations && opts.megas && opts.gmax);
}

/** Display name for the binder (title on cover/ribbon). */
export function getCollectionDisplayName(c: Collection): string {
  if (c.type === 'collect_them_all') return 'Collect Them All';
  if (c.type === 'master_set' || c.type === 'master_dex') return c.name || 'Master Set';
  if (c.type === 'single_pokemon') return c.singlePokemonName ?? c.name ?? 'Binder';
  if (c.type === 'by_set') return c.setName ?? c.name ?? 'Set';
  return c.name || 'Binder';
}

/** Subtitle shown under the binder name: "Master Collection", "True Master Collection", "Bulbasaur Collection", "Scarlet & Violet Collection". */
export function getCollectionSubtitle(c: Collection): string {
  if (c.type === 'collect_them_all') return 'Master Collection';
  if (c.type === 'master_set' || c.type === 'master_dex') {
    return isTrueMasterCollection(c) ? 'True Master Collection' : 'Master Collection';
  }
  if (c.type === 'single_pokemon') {
    const name = c.singlePokemonName ?? c.name ?? 'Pokémon';
    return `${name} Collection`;
  }
  if (c.type === 'by_set') {
    const name = c.setName ?? c.name ?? 'Set';
    return `${name} Collection`;
  }
  return 'Collection';
}

/** Icon URI for ribbon/sticker: Master Ball for master/True Master (UI adds star for True Master), set symbol for by_set, sprite for single. */
export function getCollectionIconUri(c: Collection): string {
  if (c.type === 'collect_them_all') return MASTER_BALL_ICON;
  if (c.type === 'master_set' || c.type === 'master_dex') return MASTER_BALL_ICON;
  if (c.type === 'single_pokemon' && c.singlePokemonDexId != null) {
    return getPokemonSpriteUrl(c.singlePokemonDexId);
  }
  if (c.type === 'by_set') return normalizeTcgdexImageUrl(c.setSymbol) ?? POKE_BALL_ICON_BW_SENTINEL;
  return POKE_BALL_ICON;
}
