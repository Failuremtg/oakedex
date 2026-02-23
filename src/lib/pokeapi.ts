/**
 * PokeAPI – list of Pokemon species for Collect Them All checklist.
 * Used to show all Pokemon; we then look up cards by name via TCGdex.
 */

import type { PokemonSummary } from '@/src/types';

const BASE = 'https://pokeapi.co/api/v2';

export interface PokeApiSpeciesResult {
  count: number;
  results: Array<{ name: string; url: string }>;
}

export interface PokeApiSpecies {
  id: number;
  name: string;
  names?: Array<{ language: { name: string }; name: string }>;
}

/** Fetch species list (paginated). Default limit 1025 to get all. */
export async function getSpeciesList(limit = 1025, offset = 0): Promise<PokemonSummary[]> {
  const url = `${BASE}/pokemon-species?limit=${limit}&offset=${offset}`;
  const data = await fetch(url).then((r) => r.json()) as PokeApiSpeciesResult;
  if (!data.results) return [];

  const out: PokemonSummary[] = [];
  for (const r of data.results) {
    const match = r.url.match(/pokemon-species\/(\d+)\//);
    const dexId = match ? parseInt(match[1], 10) : 0;
    const name = r.name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    out.push({ dexId, name });
  }
  return out.sort((a, b) => a.dexId - b.dexId);
}

/** Get species by id for localized names. Returns null on any failure. */
export async function getSpecies(dexId: number): Promise<PokeApiSpecies | null> {
  try {
    const res = await fetch(`${BASE}/pokemon-species/${dexId}`);
    if (!res.ok) return null;
    const data = (await res.json()) as PokeApiSpecies;
    return data?.id != null ? data : null;
  } catch {
    return null;
  }
}

/** PokeAPI language code for each TCGdex lang (for species names). Fallback: en. */
const POKEAPI_LANG_FOR_TCGDEX: Record<string, string> = {
  en: 'en',
  ja: 'ja',
  fr: 'fr',
  de: 'de',
  es: 'es',
  it: 'it',
  pt: 'pt',
  'zh-TW': 'zh-hant',
  id: 'id',
  th: 'th',
};

/**
 * Get the Pokémon name in the given TCGdex language from PokeAPI species.
 * Used so we can search TCGdex by localized name (e.g. ピカチュウ for ja).
 */
export function getSpeciesNameForLang(species: PokeApiSpecies | null, tcgdexLang: string): string | null {
  if (!species?.names?.length) return null;
  const pokeApiLang = POKEAPI_LANG_FOR_TCGDEX[tcgdexLang] ?? tcgdexLang;
  const entry = species.names.find((n) => n.language?.name === pokeApiLang);
  if (entry?.name) return entry.name;
  const en = species.names.find((n) => n.language?.name === 'en');
  return en?.name ?? species.name ?? null;
}
