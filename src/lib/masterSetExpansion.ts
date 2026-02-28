/**
 * Master set expansion: add Mega, Gmax, regional forms, and variations to the
 * base PokeAPI species list so Grandmaster Set shows all collectible entries.
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

// Unown variations (28: A–Z, !, ?). Only these – base not included. dexId 201 = Unown
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

// Tauros Paldean forms – 3 (exclude base). Combat, Blaze, Aqua Breed
const TAUROS_FORMS: ExtraEntry[] = [
  { baseDexId: 128, name: 'Tauros (Combat Breed)', form: 'combat' },
  { baseDexId: 128, name: 'Tauros (Blaze Breed)', form: 'blaze' },
  { baseDexId: 128, name: 'Tauros (Aqua Breed)', form: 'aqua' },
];

// Castform weather forms – 3 extra only (exclude base). Sunny, Rainy, Snowy
const CASTFORM_FORMS: ExtraEntry[] = [
  { baseDexId: 351, name: 'Castform Sunny Form', form: 'sunny' },
  { baseDexId: 351, name: 'Castform Rainy Form', form: 'rainy' },
  { baseDexId: 351, name: 'Castform Snowy Form', form: 'snowy' },
];

// Deoxys forms – 3 (Attack, Defense, Speed). Exclude base
const DEOXYS_FORMS: ExtraEntry[] = [
  { baseDexId: 386, name: 'Deoxys Attack Forme', form: 'attack' },
  { baseDexId: 386, name: 'Deoxys Defense Forme', form: 'defense' },
  { baseDexId: 386, name: 'Deoxys Speed Forme', form: 'speed' },
];

// Burmy coats – 3 only (exclude normal Burmy). Plant, Sandy, Trash
const BURMY_FORMS: ExtraEntry[] = [
  { baseDexId: 412, name: 'Burmy Plant Cloak', form: 'plant' },
  { baseDexId: 412, name: 'Burmy Sandy Cloak', form: 'sandy' },
  { baseDexId: 412, name: 'Burmy Trash Cloak', form: 'trash' },
];

// Wormadam coats – 3 (exclude base). Same coats as Burmy
const WORMADAM_FORMS: ExtraEntry[] = [
  { baseDexId: 413, name: 'Wormadam Plant Cloak', form: 'plant' },
  { baseDexId: 413, name: 'Wormadam Sandy Cloak', form: 'sandy' },
  { baseDexId: 413, name: 'Wormadam Trash Cloak', form: 'trash' },
];

// Rotom forms – 8 (exclude base): Heat, Frost, Fan, Mow, Bike, Dex, Drone, Phone
const ROTOM_FORMS: ExtraEntry[] = [
  { baseDexId: 479, name: 'Heat Rotom', form: 'heat' },
  { baseDexId: 479, name: 'Frost Rotom', form: 'frost' },
  { baseDexId: 479, name: 'Fan Rotom', form: 'fan' },
  { baseDexId: 479, name: 'Mow Rotom', form: 'mow' },
  { baseDexId: 479, name: 'Rotom (Bike)', form: 'bike' },
  { baseDexId: 479, name: 'Rotom (Dex)', form: 'dex' },
  { baseDexId: 479, name: 'Rotom (Drone)', form: 'drone' },
  { baseDexId: 479, name: 'Rotom (Phone)', form: 'phone' },
];

// Basculin stripes – 3 (exclude base). Red, Blue, White
const BASCULIN_FORMS: ExtraEntry[] = [
  { baseDexId: 550, name: 'Basculin Red-Striped Form', form: 'red' },
  { baseDexId: 550, name: 'Basculin Blue-Striped Form', form: 'blue' },
  { baseDexId: 550, name: 'Basculin White-Striped Form', form: 'white' },
];

// Darmanitan Zen Mode – 1 (standard)
const DARMANITAN_ZEN_FORMS: ExtraEntry[] = [
  { baseDexId: 555, name: 'Darmanitan Zen Mode', form: 'zen' },
];

// Galarian Darmanitan Zen Mode – 1
const DARMANITAN_GALAR_ZEN_FORMS: ExtraEntry[] = [
  { baseDexId: 555, name: 'Galarian Darmanitan Zen Mode', form: 'galar-zen' },
];

// Deerling seasons – 4 (exclude base). Spring, Summer, Autumn, Winter
const DEERLING_FORMS: ExtraEntry[] = [
  { baseDexId: 585, name: 'Deerling Spring Form', form: 'spring' },
  { baseDexId: 585, name: 'Deerling Summer Form', form: 'summer' },
  { baseDexId: 585, name: 'Deerling Autumn Form', form: 'autumn' },
  { baseDexId: 585, name: 'Deerling Winter Form', form: 'winter' },
];

// Sawsbuck seasons – 4 (exclude base)
const SAWSBUCK_FORMS: ExtraEntry[] = [
  { baseDexId: 586, name: 'Sawsbuck Spring Form', form: 'spring' },
  { baseDexId: 586, name: 'Sawsbuck Summer Form', form: 'summer' },
  { baseDexId: 586, name: 'Sawsbuck Autumn Form', form: 'autumn' },
  { baseDexId: 586, name: 'Sawsbuck Winter Form', form: 'winter' },
];

// Tornadus, Thundurus, Landorus – 1 choice = Therian form for each (3 entries)
const FORCES_OF_NATURE_THERIAN: ExtraEntry[] = [
  { baseDexId: 641, name: 'Tornadus Therian Forme', form: 'therian' },
  { baseDexId: 642, name: 'Thundurus Therian Forme', form: 'therian' },
  { baseDexId: 645, name: 'Landorus Therian Forme', form: 'therian' },
];

// Keldeo Resolute – 1
const KELDEO_FORMS: ExtraEntry[] = [
  { baseDexId: 647, name: 'Keldeo Resolute Form', form: 'resolute' },
];

// Meloetta – 1 extra (Pirouette). Base = Aria
const MELOETTA_FORMS: ExtraEntry[] = [
  { baseDexId: 648, name: 'Meloetta Pirouette Forme', form: 'pirouette' },
];

// Vivillon patterns – 20 (or 3 if you restrict). Keeping full list; base stays in list
const VIVILLON_PATTERNS = [
  'Archipelago', 'Continental', 'Elegant', 'Garden', 'High Plains', 'Icy Snow',
  'Jungle', 'Marine', 'Meadow', 'Modern', 'Monsoon', 'Ocean', 'Polar', 'River',
  'Sandstorm', 'Savanna', 'Sun', 'Tundra', 'Fancy', 'Poké Ball',
];
const VIVILLON_FORMS: ExtraEntry[] = VIVILLON_PATTERNS.map((pattern) => ({
  baseDexId: 666,
  name: pattern === 'Poké Ball' ? 'Vivillon (Poké Ball)' : `Vivillon (${pattern})`,
  form: pattern.toLowerCase().replace(/\s/g, '-').replace('é', 'e'),
}));

// Hoopa Unbound – 1 (Confined = base)
const HOOPA_FORMS: ExtraEntry[] = [
  { baseDexId: 720, name: 'Hoopa Unbound', form: 'unbound' },
];

// Oricorio styles – 4 including base: Baile, Pom-Pom, Pa'u, Sensu (add all 4; base can stay so we add 4 and don't exclude, or add 3 and keep base – user said "4 including base" so 3 extra)
const ORICORIO_FORMS: ExtraEntry[] = [
  { baseDexId: 741, name: 'Oricorio Baile Style', form: 'baile' },
  { baseDexId: 741, name: 'Oricorio Pom-Pom Style', form: 'pompom' },
  { baseDexId: 741, name: "Oricorio Pa'u Style", form: 'pau' },
  { baseDexId: 741, name: 'Oricorio Sensu Style', form: 'sensu' },
];

// Lycanroc – 3 including base (Midday, Midnight, Dusk). 2 extra
const LYCANROC_FORMS: ExtraEntry[] = [
  { baseDexId: 745, name: 'Lycanroc Midday Form', form: 'midday' },
  { baseDexId: 745, name: 'Lycanroc Midnight Form', form: 'midnight' },
  { baseDexId: 745, name: 'Lycanroc Dusk Form', form: 'dusk' },
];

// Wishiwashi School – 1
const WISHIWASHI_FORMS: ExtraEntry[] = [
  { baseDexId: 746, name: 'Wishiwashi School Form', form: 'school' },
];

// Urshifu – 2 including base (Single Strike, Rapid Strike). 1 extra
const URSHIFU_FORMS: ExtraEntry[] = [
  { baseDexId: 892, name: 'Urshifu Single Strike Style', form: 'single' },
  { baseDexId: 892, name: 'Urshifu Rapid Strike Style', form: 'rapid' },
];

// Calyrex – 2 riders (exclude base). Ice Rider, Shadow Rider
const CALYREX_FORMS: ExtraEntry[] = [
  { baseDexId: 898, name: 'Calyrex Ice Rider', form: 'ice' },
  { baseDexId: 898, name: 'Calyrex Shadow Rider', form: 'shadow' },
];

// Oinkologne – 2 including base (Male, Female). 1 extra
const OINKOLOGNE_FORMS: ExtraEntry[] = [
  { baseDexId: 916, name: 'Oinkologne Male', form: 'male' },
  { baseDexId: 916, name: 'Oinkologne Female', form: 'female' },
];

// Maushold – 2 including base (Family of Four, Family of Three). 1 extra
const MAUSHOLD_FORMS: ExtraEntry[] = [
  { baseDexId: 925, name: 'Maushold Family of Four', form: 'four' },
  { baseDexId: 925, name: 'Maushold Family of Three', form: 'three' },
];

// Palafin – 2 including base (Zero, Hero). 1 extra
const PALAFIN_FORMS: ExtraEntry[] = [
  { baseDexId: 964, name: 'Palafin Zero Form', form: 'zero' },
  { baseDexId: 964, name: 'Palafin Hero Form', form: 'hero' },
];

// Ogerpon masks – 4 including base. Teal, Wellspring, Hearthflame, Cornerstone
const OGERPON_FORMS: ExtraEntry[] = [
  { baseDexId: 1017, name: 'Ogerpon Teal Mask', form: 'teal' },
  { baseDexId: 1017, name: 'Ogerpon Wellspring Mask', form: 'wellspring' },
  { baseDexId: 1017, name: 'Ogerpon Hearthflame Mask', form: 'hearthflame' },
  { baseDexId: 1017, name: 'Ogerpon Cornerstone Mask', form: 'cornerstone' },
];

// Terapagos – 3 including base (Normal, Terastal, Stellar). 2 extra
const TERAPAGOS_FORMS: ExtraEntry[] = [
  { baseDexId: 1025, name: 'Terapagos Normal Form', form: 'normal' },
  { baseDexId: 1025, name: 'Terapagos Terastal Form', form: 'terastal' },
  { baseDexId: 1025, name: 'Terapagos Stellar Form', form: 'stellar' },
];

/** Variation group id → dex IDs to remove from base list when this group is selected (only these forms are used). */
const VARIATION_EXCLUDE_BASE: Record<string, number[]> = {
  unown: [201],
  tauros_forms: [128],
  castform: [351],
  deoxys: [386],
  burmy: [412],
  wormadam: [413],
  rotom: [479],
  basculin: [550],
  deerling: [585],
  sawsbuck: [586],
  calyrex: [898],
};

/** Variation group id → display label for the Add variations picker. */
export const VARIATION_GROUPS: { id: string; label: string }[] = [
  { id: 'unown', label: 'Unown (28 forms)' },
  { id: 'tauros_forms', label: 'Tauros Paldean (3 breeds)' },
  { id: 'castform', label: 'Castform weather (3)' },
  { id: 'deoxys', label: 'Deoxys forms (3)' },
  { id: 'burmy', label: 'Burmy coats (3)' },
  { id: 'wormadam', label: 'Wormadam coats (3)' },
  { id: 'rotom', label: 'Rotom forms (8)' },
  { id: 'basculin', label: 'Basculin stripes (3)' },
  { id: 'darmanitan_zen', label: 'Darmanitan Zen Mode (1)' },
  { id: 'darmanitan_galar_zen', label: 'Galarian Darmanitan Zen (1)' },
  { id: 'deerling', label: 'Deerling seasons (4)' },
  { id: 'sawsbuck', label: 'Sawsbuck seasons (4)' },
  { id: 'forces_of_nature', label: 'Tornadus/Thundurus/Landorus (3)' },
  { id: 'keldeo', label: 'Keldeo Resolute (1)' },
  { id: 'meloetta', label: 'Meloetta Pirouette (1)' },
  { id: 'vivillon', label: 'Vivillon patterns (20)' },
  { id: 'hoopa', label: 'Hoopa Unbound (1)' },
  { id: 'oricorio', label: 'Oricorio styles (4)' },
  { id: 'lycanroc', label: 'Lycanroc forms (3)' },
  { id: 'wishiwashi', label: 'Wishiwashi School (1)' },
  { id: 'urshifu', label: 'Urshifu styles (2)' },
  { id: 'calyrex', label: 'Calyrex riders (2)' },
  { id: 'oinkologne', label: 'Oinkologne Male/Female (2)' },
  { id: 'maushold', label: 'Maushold family (2)' },
  { id: 'palafin', label: 'Palafin Zero/Hero (2)' },
  { id: 'ogerpon', label: 'Ogerpon masks (4)' },
  { id: 'terapagos', label: 'Terapagos forms (3)' },
];

/** How many extra slots each variation group adds. Use for admin/reference. */
export const VARIATION_GROUP_SLOT_COUNTS: Record<string, number> = {
  unown: UNOWN_FORMS.length,
  tauros_forms: TAUROS_FORMS.length,
  castform: CASTFORM_FORMS.length,
  deoxys: DEOXYS_FORMS.length,
  burmy: BURMY_FORMS.length,
  wormadam: WORMADAM_FORMS.length,
  rotom: ROTOM_FORMS.length,
  basculin: BASCULIN_FORMS.length,
  darmanitan_zen: DARMANITAN_ZEN_FORMS.length,
  darmanitan_galar_zen: DARMANITAN_GALAR_ZEN_FORMS.length,
  deerling: DEERLING_FORMS.length,
  sawsbuck: SAWSBUCK_FORMS.length,
  forces_of_nature: FORCES_OF_NATURE_THERIAN.length,
  keldeo: KELDEO_FORMS.length,
  meloetta: MELOETTA_FORMS.length,
  vivillon: VIVILLON_FORMS.length,
  hoopa: HOOPA_FORMS.length,
  oricorio: ORICORIO_FORMS.length,
  lycanroc: LYCANROC_FORMS.length,
  wishiwashi: WISHIWASHI_FORMS.length,
  urshifu: URSHIFU_FORMS.length,
  calyrex: CALYREX_FORMS.length,
  oinkologne: OINKOLOGNE_FORMS.length,
  maushold: MAUSHOLD_FORMS.length,
  palafin: PALAFIN_FORMS.length,
  ogerpon: OGERPON_FORMS.length,
  terapagos: TERAPAGOS_FORMS.length,
};

const VARIATION_ENTRIES: Record<string, ExtraEntry[]> = {
  unown: UNOWN_FORMS,
  tauros_forms: TAUROS_FORMS,
  castform: CASTFORM_FORMS,
  deoxys: DEOXYS_FORMS,
  burmy: BURMY_FORMS,
  wormadam: WORMADAM_FORMS,
  rotom: ROTOM_FORMS,
  basculin: BASCULIN_FORMS,
  darmanitan_zen: DARMANITAN_ZEN_FORMS,
  darmanitan_galar_zen: DARMANITAN_GALAR_ZEN_FORMS,
  deerling: DEERLING_FORMS,
  sawsbuck: SAWSBUCK_FORMS,
  forces_of_nature: FORCES_OF_NATURE_THERIAN,
  keldeo: KELDEO_FORMS,
  meloetta: MELOETTA_FORMS,
  vivillon: VIVILLON_FORMS,
  hoopa: HOOPA_FORMS,
  oricorio: ORICORIO_FORMS,
  lycanroc: LYCANROC_FORMS,
  wishiwashi: WISHIWASHI_FORMS,
  urshifu: URSHIFU_FORMS,
  calyrex: CALYREX_FORMS,
  oinkologne: OINKOLOGNE_FORMS,
  maushold: MAUSHOLD_FORMS,
  palafin: PALAFIN_FORMS,
  ogerpon: OGERPON_FORMS,
  terapagos: TERAPAGOS_FORMS,
};

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
  const groups = options.variationGroups ?? (options.variations ? ['unown'] : []);
  for (const groupId of groups) {
    const excludeDexIds = VARIATION_EXCLUDE_BASE[groupId];
    if (excludeDexIds?.length) {
      const excludeSet = new Set(excludeDexIds);
      for (let i = out.length - 1; i >= 0; i--) {
        const p = out[i];
        if (excludeSet.has(p.dexId) && !p.form) out.splice(i, 1);
      }
    }
    const entries = VARIATION_ENTRIES[groupId];
    if (entries) for (const e of entries) out.push(extraToSummary(e));
  }

  // Keep stable order: base by dexId, then extras by baseDexId then form
  return out.sort((a, b) => {
    const aKey = a.form ? `${a.dexId}-${a.form}` : `${a.dexId}`;
    const bKey = b.form ? `${b.dexId}-${b.form}` : `${b.dexId}`;
    return aKey.localeCompare(bKey, undefined, { numeric: true });
  });
}
