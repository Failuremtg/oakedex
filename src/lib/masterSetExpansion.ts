/**
 * Master set expansion: add Mega, Gmax, regional forms, and variations to the
 * base PokeAPI species list so True Master Set shows all collectible entries.
 */

import type { MasterSetOptions, PokemonSummary } from '@/src/types';

/** Extra entries to merge: base dex id, display name, form key for slot. */
interface ExtraEntry {
  baseDexId: number;
  name: string;
  form: string;
}

// Mega Evolutions (base species dex id, full name, form key)
const MEGA_FORMS: ExtraEntry[] = [
  { baseDexId: 3, name: 'Mega Venusaur', form: 'mega' },
  { baseDexId: 6, name: 'Mega Charizard X', form: 'mega-x' },
  { baseDexId: 6, name: 'Mega Charizard Y', form: 'mega-y' },
  { baseDexId: 9, name: 'Mega Blastoise', form: 'mega' },
  { baseDexId: 15, name: 'Mega Beedrill', form: 'mega' },
  { baseDexId: 18, name: 'Mega Pidgeot', form: 'mega' },
  { baseDexId: 65, name: 'Mega Alakazam', form: 'mega' },
  { baseDexId: 80, name: 'Mega Slowbro', form: 'mega' },
  { baseDexId: 94, name: 'Mega Gengar', form: 'mega' },
  { baseDexId: 115, name: 'Mega Kangaskhan', form: 'mega' },
  { baseDexId: 127, name: 'Mega Pinsir', form: 'mega' },
  { baseDexId: 130, name: 'Mega Gyarados', form: 'mega' },
  { baseDexId: 142, name: 'Mega Aerodactyl', form: 'mega' },
  { baseDexId: 150, name: 'Mega Mewtwo X', form: 'mega-x' },
  { baseDexId: 150, name: 'Mega Mewtwo Y', form: 'mega-y' },
  { baseDexId: 181, name: 'Mega Ampharos', form: 'mega' },
  { baseDexId: 208, name: 'Mega Steelix', form: 'mega' },
  { baseDexId: 212, name: 'Mega Scizor', form: 'mega' },
  { baseDexId: 214, name: 'Mega Heracross', form: 'mega' },
  { baseDexId: 229, name: 'Mega Houndoom', form: 'mega' },
  { baseDexId: 248, name: 'Mega Tyranitar', form: 'mega' },
  { baseDexId: 254, name: 'Mega Sceptile', form: 'mega' },
  { baseDexId: 257, name: 'Mega Blaziken', form: 'mega' },
  { baseDexId: 260, name: 'Mega Swampert', form: 'mega' },
  { baseDexId: 282, name: 'Mega Gardevoir', form: 'mega' },
  { baseDexId: 302, name: 'Mega Sableye', form: 'mega' },
  { baseDexId: 303, name: 'Mega Mawile', form: 'mega' },
  { baseDexId: 306, name: 'Mega Aggron', form: 'mega' },
  { baseDexId: 308, name: 'Mega Medicham', form: 'mega' },
  { baseDexId: 310, name: 'Mega Manectric', form: 'mega' },
  { baseDexId: 319, name: 'Mega Sharpedo', form: 'mega' },
  { baseDexId: 323, name: 'Mega Camerupt', form: 'mega' },
  { baseDexId: 334, name: 'Mega Altaria', form: 'mega' },
  { baseDexId: 354, name: 'Mega Banette', form: 'mega' },
  { baseDexId: 359, name: 'Mega Absol', form: 'mega' },
  { baseDexId: 362, name: 'Mega Glalie', form: 'mega' },
  { baseDexId: 373, name: 'Mega Salamence', form: 'mega' },
  { baseDexId: 376, name: 'Mega Metagross', form: 'mega' },
  { baseDexId: 380, name: 'Mega Latias', form: 'mega' },
  { baseDexId: 381, name: 'Mega Latios', form: 'mega' },
  { baseDexId: 384, name: 'Mega Rayquaza', form: 'mega' },
  { baseDexId: 428, name: 'Mega Lopunny', form: 'mega' },
  { baseDexId: 445, name: 'Mega Garchomp', form: 'mega' },
  { baseDexId: 448, name: 'Mega Lucario', form: 'mega' },
  { baseDexId: 460, name: 'Mega Abomasnow', form: 'mega' },
  { baseDexId: 475, name: 'Mega Gallade', form: 'mega' },
  { baseDexId: 531, name: 'Mega Audino', form: 'mega' },
  { baseDexId: 719, name: 'Mega Diancie', form: 'mega' },
];

// Gigantamax forms (base dex id, full name, form key)
const GMAX_FORMS: ExtraEntry[] = [
  { baseDexId: 6, name: 'Gigantamax Charizard', form: 'gmax' },
  { baseDexId: 12, name: 'Gigantamax Butterfree', form: 'gmax' },
  { baseDexId: 25, name: 'Gigantamax Pikachu', form: 'gmax' },
  { baseDexId: 52, name: 'Gigantamax Meowth', form: 'gmax' },
  { baseDexId: 68, name: 'Gigantamax Machamp', form: 'gmax' },
  { baseDexId: 94, name: 'Gigantamax Gengar', form: 'gmax' },
  { baseDexId: 99, name: 'Gigantamax Kingler', form: 'gmax' },
  { baseDexId: 131, name: 'Gigantamax Lapras', form: 'gmax' },
  { baseDexId: 133, name: 'Gigantamax Eevee', form: 'gmax' },
  { baseDexId: 143, name: 'Gigantamax Snorlax', form: 'gmax' },
  { baseDexId: 569, name: 'Gigantamax Garbodor', form: 'gmax' },
  { baseDexId: 809, name: 'Gigantamax Melmetal', form: 'gmax' },
  { baseDexId: 812, name: 'Gigantamax Rillaboom', form: 'gmax' },
  { baseDexId: 815, name: 'Gigantamax Cinderace', form: 'gmax' },
  { baseDexId: 818, name: 'Gigantamax Inteleon', form: 'gmax' },
  { baseDexId: 834, name: 'Gigantamax Drednaw', form: 'gmax' },
  { baseDexId: 839, name: 'Gigantamax Coalossal', form: 'gmax' },
  { baseDexId: 841, name: 'Gigantamax Flapple', form: 'gmax' },
  { baseDexId: 842, name: 'Gigantamax Appletun', form: 'gmax' },
  { baseDexId: 844, name: 'Gigantamax Sandaconda', form: 'gmax' },
  { baseDexId: 849, name: 'Gigantamax Toxtricity', form: 'gmax' },
  { baseDexId: 851, name: 'Gigantamax Centiskorch', form: 'gmax' },
  { baseDexId: 858, name: 'Gigantamax Hatterene', form: 'gmax' },
  { baseDexId: 861, name: 'Gigantamax Grimmsnarl', form: 'gmax' },
  { baseDexId: 869, name: 'Gigantamax Alcremie', form: 'gmax' },
  { baseDexId: 879, name: 'Gigantamax Copperajah', form: 'gmax' },
  { baseDexId: 884, name: 'Gigantamax Duraludon', form: 'gmax' },
  { baseDexId: 892, name: 'Gigantamax Urshifu', form: 'gmax' },
  { baseDexId: 892, name: 'Gigantamax Urshifu Rapid Strike', form: 'gmax-rapid' },
  { baseDexId: 901, name: 'Gigantamax Ursaluna', form: 'gmax' },
];

// Regional forms (Alolan, Galarian, Hisuian, Paldean) – name as on TCG cards. One entry per form.
const REGIONAL_FORMS: ExtraEntry[] = [
  { baseDexId: 19, name: 'Alolan Rattata', form: 'alola' },
  { baseDexId: 20, name: 'Alolan Raticate', form: 'alola' },
  { baseDexId: 26, name: 'Alolan Raichu', form: 'alola' },
  { baseDexId: 27, name: 'Alolan Sandshrew', form: 'alola' },
  { baseDexId: 28, name: 'Alolan Sandslash', form: 'alola' },
  { baseDexId: 37, name: 'Alolan Vulpix', form: 'alola' },
  { baseDexId: 38, name: 'Alolan Ninetales', form: 'alola' },
  { baseDexId: 50, name: 'Alolan Diglett', form: 'alola' },
  { baseDexId: 51, name: 'Alolan Dugtrio', form: 'alola' },
  { baseDexId: 52, name: 'Alolan Meowth', form: 'alola' },
  { baseDexId: 53, name: 'Alolan Persian', form: 'alola' },
  { baseDexId: 74, name: 'Alolan Geodude', form: 'alola' },
  { baseDexId: 75, name: 'Alolan Graveler', form: 'alola' },
  { baseDexId: 76, name: 'Alolan Golem', form: 'alola' },
  { baseDexId: 88, name: 'Alolan Grimer', form: 'alola' },
  { baseDexId: 89, name: 'Alolan Muk', form: 'alola' },
  { baseDexId: 103, name: 'Alolan Exeggutor', form: 'alola' },
  { baseDexId: 105, name: 'Alolan Marowak', form: 'alola' },
  { baseDexId: 77, name: 'Galarian Ponyta', form: 'galar' },
  { baseDexId: 78, name: 'Galarian Rapidash', form: 'galar' },
  { baseDexId: 83, name: 'Galarian Farfetch\'d', form: 'galar' },
  { baseDexId: 110, name: 'Galarian Weezing', form: 'galar' },
  { baseDexId: 122, name: 'Galarian Mr. Mime', form: 'galar' },
  { baseDexId: 144, name: 'Galarian Articuno', form: 'galar' },
  { baseDexId: 145, name: 'Galarian Zapdos', form: 'galar' },
  { baseDexId: 146, name: 'Galarian Moltres', form: 'galar' },
  { baseDexId: 199, name: 'Galarian Slowking', form: 'galar' },
  { baseDexId: 222, name: 'Galarian Corsola', form: 'galar' },
  { baseDexId: 263, name: 'Galarian Zigzagoon', form: 'galar' },
  { baseDexId: 264, name: 'Galarian Linoone', form: 'galar' },
  { baseDexId: 554, name: 'Galarian Darumaka', form: 'galar' },
  { baseDexId: 555, name: 'Galarian Darmanitan', form: 'galar' },
  { baseDexId: 562, name: 'Galarian Yamask', form: 'galar' },
  { baseDexId: 618, name: 'Galarian Stunfisk', form: 'galar' },
  { baseDexId: 58, name: 'Hisuian Growlithe', form: 'hisui' },
  { baseDexId: 59, name: 'Hisuian Arcanine', form: 'hisui' },
  { baseDexId: 100, name: 'Hisuian Voltorb', form: 'hisui' },
  { baseDexId: 101, name: 'Hisuian Electrode', form: 'hisui' },
  { baseDexId: 157, name: 'Hisuian Typhlosion', form: 'hisui' },
  { baseDexId: 211, name: 'Hisuian Qwilfish', form: 'hisui' },
  { baseDexId: 215, name: 'Hisuian Sneasel', form: 'hisui' },
  { baseDexId: 503, name: 'Hisuian Samurott', form: 'hisui' },
  { baseDexId: 549, name: 'Hisuian Lilligant', form: 'hisui' },
  { baseDexId: 570, name: 'Hisuian Zorua', form: 'hisui' },
  { baseDexId: 571, name: 'Hisuian Zoroark', form: 'hisui' },
  { baseDexId: 628, name: 'Hisuian Braviary', form: 'hisui' },
  { baseDexId: 724, name: 'Hisuian Decidueye', form: 'hisui' },
  { baseDexId: 194, name: 'Paldean Wooper', form: 'paldea' },
  { baseDexId: 128, name: 'Paldean Tauros', form: 'paldea' },
];

// Unown variations (28: A–Z, !, ?). dexId 201 = Unown
const UNOWN_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '!', '?',
];
const UNOWN_FORMS: ExtraEntry[] = UNOWN_LETTERS.map((letter) => ({
  baseDexId: 201,
  name: `Unown ${letter}`,
  form: letter === '!' ? 'unown-exclaim' : letter === '?' ? 'unown-question' : `unown-${letter.toLowerCase()}`,
}));

function extraToSummary(e: ExtraEntry): PokemonSummary {
  return { dexId: e.baseDexId, name: e.name, form: e.form };
}

/**
 * Name to use when searching TCGdex for cards. In the TCG, Gigantamax Pokémon
 * are printed as "Pikachu VMAX", "Charizard VMAX", etc., not "Gigantamax Pikachu".
 */
export function getTcgSearchName(p: PokemonSummary): string {
  if (p.form === 'gmax' || p.form?.startsWith('gmax')) {
    const prefix = 'Gigantamax ';
    const base = p.name.startsWith(prefix) ? p.name.slice(prefix.length) : p.name;
    return `${base} VMAX`;
  }
  return p.name;
}

/**
 * Expand base species list with Mega, Gmax, regional forms, and variations
 * when the collection is master_set/master_dex and options are enabled.
 * collect_them_all is unchanged (base list only).
 */
export function getExpandedSpeciesList(
  baseList: PokemonSummary[],
  options: MasterSetOptions | undefined
): PokemonSummary[] {
  if (!options) return baseList;

  const out = [...baseList];

  if (options.megas) {
    for (const e of MEGA_FORMS) out.push(extraToSummary(e));
  }
  if (options.gmax) {
    for (const e of GMAX_FORMS) out.push(extraToSummary(e));
  }
  if (options.regionalForms) {
    for (const e of REGIONAL_FORMS) out.push(extraToSummary(e));
  }
  if (options.variations) {
    for (const e of UNOWN_FORMS) out.push(extraToSummary(e));
  }

  // Keep stable order: base by dexId, then extras by baseDexId then form
  return out.sort((a, b) => {
    const aKey = a.form ? `${a.dexId}-${a.form}` : `${a.dexId}`;
    const bKey = b.form ? `${b.dexId}-${b.form}` : `${b.dexId}`;
    return aKey.localeCompare(bKey, undefined, { numeric: true });
  });
}
