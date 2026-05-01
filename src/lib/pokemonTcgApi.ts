/**
 * Pokémon TCG API (pokemontcg.io) v2 – secondary source for card images and data.
 * Used when TCGdex has no image or image fails to load.
 * Free tier: 1,000 req/day, 30/min. With API key (X-Api-Key): 20,000/day.
 * @see https://docs.pokemontcg.io/
 */

const BASE = 'https://api.pokemontcg.io/v2';
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(h: string | null): number | null {
  if (!h) return null;
  const seconds = Number(h);
  if (!Number.isNaN(seconds) && seconds > 0) return Math.min(seconds * 1000, 30_000);
  const dt = Date.parse(h);
  if (!Number.isNaN(dt)) return Math.min(Math.max(dt - Date.now(), 0), 30_000);
  return null;
}

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
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
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
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const key = CACHE_KEY_PREFIX + cardId.replace(/[^a-zA-Z0-9-]/g, '_');
    await AsyncStorage.setItem(key, JSON.stringify({ ...data, ts: Date.now() }));
  } catch {
    // ignore
  }
}

/**
 * TCGdex set ID -> Pokémon TCG API set ID for sets where the two APIs use different IDs.
 * Used when direct card lookup fails so we can still get images (e.g. Celebrations, Shining Legends).
 */
const TCGDEX_TO_PTCGIO_SET_ID: Record<string, string> = {
  slg: 'sm35',   // Shining Legends (TCGdex: slg, pokemontcg.io: sm35)
  cel: 'cel25c', // Celebrations (TCGdex: cel, pokemontcg.io: cel25c)
};

async function fetchCardById(
  cardId: string,
  headers: Record<string, string>
): Promise<{ imageLarge: string; imageSmall: string; name?: string; set?: { id: string; name: string } } | null> {
  const url = `${BASE}/cards/${encodeURIComponent(cardId)}?select=id,name,number,set,images`;
  let lastError: unknown;
  for (let attempt = 0; attempt <= DEFAULT_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      if (res.ok) {
        const json = (await res.json()) as PokemonTcgApiCardResponse;
        const data = json?.data;
        if (!data?.images?.large && !data?.images?.small) return null;
        const imageLarge = data.images?.large ?? data.images?.small ?? '';
        const imageSmall = data.images?.small ?? data.images?.large ?? '';
        return {
          imageLarge,
          imageSmall,
          name: data.name,
          set: data.set ? { id: data.set.id, name: data.set.name } : undefined,
        };
      }

      // Non-retryable: not found / bad request / unauthorized, etc.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) return null;

      if (attempt === DEFAULT_RETRIES) return null;
      const retryAfter = parseRetryAfterMs(res.headers.get('retry-after'));
      const backoff = retryAfter ?? Math.min(600 * Math.pow(2, attempt), 5_000);
      await sleep(backoff);
    } catch (e) {
      lastError = e;
      const isAbort = e instanceof Error && e.name === 'AbortError';
      if (attempt === DEFAULT_RETRIES) {
        // Timeout/network errors should not crash primary flow; fallback just returns null.
        void isAbort;
        return null;
      }
      const backoff = Math.min(600 * Math.pow(2, attempt), 5_000);
      await sleep(backoff);
    } finally {
      clearTimeout(timer);
    }
  }

  void lastError;
  return null;
}

/**
 * Fetch a single card by id from Pokémon TCG API.
 * Card id format matches TCGdex: setId-localId (e.g. base1-1, swsh4-25).
 * If direct lookup fails, tries mapped set ID for known sets (e.g. slg->sm35, cel->cel25c).
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

  try {
    let result = await fetchCardById(cardId, headers);
    if (result) {
      await setCachedFallback(cardId, result);
      return result;
    }
    const dash = cardId.lastIndexOf('-');
    if (dash >= 0) {
      const tcgdexSetId = cardId.slice(0, dash);
      const localId = cardId.slice(dash + 1);
      const ptcgioSetId = TCGDEX_TO_PTCGIO_SET_ID[tcgdexSetId];
      if (ptcgioSetId) {
        const altCardId = `${ptcgioSetId}-${localId}`;
        result = await fetchCardById(altCardId, headers);
        if (result) {
          await setCachedFallback(cardId, result);
          return result;
        }
      }
    }
    return null;
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
