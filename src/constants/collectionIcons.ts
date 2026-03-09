/**
 * URLs for collection type icons on the Edit (binders) tab.
 * - Collect Them All / Master Set / Grandmaster → Master Ball (UI adds a star badge for Grandmaster)
 * - Single Pokémon → PokeAPI official artwork by dex id
 */

import { FORM_SPRITE_IDS } from '@/src/constants/formSpriteIds';

const POKESPRITE_BALL =
  'https://raw.githubusercontent.com/msikma/pokesprite/master/items-outline/ball';

/** Master Ball for "Collect Them All" and Master Set binders (including Grandmaster; UI overlays star). */
export const MASTER_BALL_ICON = `${POKESPRITE_BALL}/master.png`;

/** Fallback when single Pokémon binder has no dex id. */
export const POKE_BALL_ICON = `${POKESPRITE_BALL}/poke.png`;

/** Premier Ball for custom binders (empty or multi-Pokémon). */
export const PREMIER_BALL_ICON = `${POKESPRITE_BALL}/premier.png`;

/** Sentinel: when getCollectionIconUri returns this, use require('@/assets/images/pokeball-bw.png') for the B&W Poké Ball (sets with no symbol/logo). */
export const POKE_BALL_ICON_BW_SENTINEL = '__POKEBALL_BW__';

/** Pokémon TCG Base Set symbol. */
export const BASE_SET_ICON = 'https://assets.tcgdex.net/univ/base/base1/symbol.png';

/** Jungle set symbol – used for Specific Set Collection menu icon. */
export const JUNGLE_SET_ICON = 'https://assets.tcgdex.net/univ/base/base2/symbol.png';

const OFFICIAL_ARTWORK_BASE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';

/** Official artwork by national dex number. When form is set (Mega, Unown, regional, etc.), uses form-specific sprite if available. */
export function getPokemonSpriteUrl(dexId: number, form?: string): string {
  const spriteId =
    form != null && form !== ''
      ? FORM_SPRITE_IDS[`${dexId}-${form}`] ?? dexId
      : dexId;
  return `${OFFICIAL_ARTWORK_BASE}/${spriteId}.png`;
}
