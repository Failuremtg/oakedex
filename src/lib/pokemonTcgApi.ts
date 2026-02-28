/**
 * Pokémon TCG API (pokemontcg.io) v2 – secondary source for card images and data.
 * Used when TCGdex has no image or image fails to load.
 * Free tier: 1,000 req/day, 30/min. With API key (X-Api-Key): 20,000/day.
 * @see https://docs.pokemontcg.io/
 */

const BASE = 'https://api.pokemontcg.io/v2';

export interface PokemonTcgApiCard {
  id: string;
  name?: string;
  number?: string;
  set?: { id: string; name: string };
  images?: { small?: string; large?: string };
}

export interface PokemonTcgApiCardResponse {
  data?: PokemonTcgApiCard;
}

const memoryCache = new Map<string, { imageLarge: string; imageSmall: string; name?: string; set?: { id: string; name: string } }>();
const CACHE_KEY_PREFIX = '@oakedex/ptcgio/';
const CACHE_STALE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getApiKey(): string | undefined {
  try {
    return process.env.EXPO_PUBLIC_POKEMON_TCG_API_KEY;
  } catch {
    return undefined;
  }
}

async function getCachedFallback(cardId: string): Promise<{ imageLarge: string; imageSmall: string; name?: string; set?: { id: string; name: string } } | null> {
  const cached = memoryCache.get(cardId);
  if (cached) return cached;
  try {
    const { AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const raw = await AsyncStorage.getItem(CACHE_KEY_PREFIX + cardId.replace(/[^a-zA-Z0-9-]/g, '_'));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { imageLarge: string; imageSmall: string; name?: string; set?: { id: string; name: string }; ts: number };
    if (parsed.ts && Date.now() - parsed.ts > CACHE_STALE_MS) return null;
    const result = { imageLarge: parsed.imageLarge, imageSmall: parsed.imageSmall, name: parsed.name, set: parsed.set };
    memoryCache.set(cardId, result);
    return result;
  } catch {
    return null;
  }
}

async function setCachedFallback(
  cardId: string,
  data: { imageLarge: string; imageSmall: string; name?: string; set?: { id: string; name: string } }
): Promise<void> {
  memoryCache.set(cardId, data);
  try {
    const { AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const key = CACHE_KEY_PREFIX + cardId.replace(/[^a-zA-Z0-9-]/g, '_');
    await AsyncStorage.setItem(key, JSON.stringify({ ...data, ts: Date.now() }));
  } catch {
    // ignore
  }
}

/**
 * Fetch a single card by id from Pokémon TCG API.
 * Card id format matches TCGdex: setId-localId (e.g. base1-1, swsh4-25).
 * Returns image URLs and optional name/set; null if not found or error.
 */
export async function getCardById(
  cardId: string
): Promise<{ imageLarge: string; imageSmall: string; name?: string; set?: { id: string; name: string } } | null> {
  const cached = await getCachedFallback(cardId);
  if (cached) return cached;

  const apiKey = getApiKey();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiKey) headers['X-Api-Key'] = apiKey;

  const url = `${BASE}/cards/${encodeURIComponent(cardId)}?select=id,name,number,set,images`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const json = (await res.json()) as PokemonTcgApiCardResponse;
    const data = json?.data;
    if (!data?.images?.large && !data?.images?.small) return null;
    const imageLarge = data.images?.large ?? data.images?.small ?? '';
    const imageSmall = data.images?.small ?? data.images?.large ?? '';
    const result = {
      imageLarge,
      imageSmall,
      name: data.name,
      set: data.set ? { id: data.set.id, name: data.set.name } : undefined,
    };
    await setCachedFallback(cardId, result);
    return result;
  } catch {
    return null;
  }
}

/**
 * Returns the best available image URL for a card from the Pokémon TCG API, or null.
 * Prefer this when TCGdex image is missing or failed to load.
 */
export async function getFallbackCardImageUrl(cardId: string): Promise<string | null> {
  const card = await getCardById(cardId);
  return card?.imageLarge ?? card?.imageSmall ?? null;
}
