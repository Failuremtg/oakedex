/**
 * Extra printings from bundled JSON (Trick or Trade, Holiday Calendar, etc.).
 * These appear in card version select, single/multi binders, and empty binder search
 * so stamped and other promo variants are selectable alongside TCGdex results.
 */

import type { AppCardBrief } from '@/src/types';
import type { CardVariant } from '@/src/types';

export type ExtraPrintingBrief = AppCardBrief & { variant: CardVariant };

interface JsonCard {
  name: string;
  number: string;
  languages?: string[];
}

interface JsonSet {
  set: string;
  releaseDate?: string;
  cards: JsonCard[];
}

interface SeriesJson {
  series: string;
  pattern?: string;
  sets: JsonSet[];
}

/** Stamped promos JSON (Staff, League, Pokemon Center, etc.) – different schema. */
interface StampedPromosCardItem {
  manualId: string;
  tcgdexId?: string | null;
  setGroup: string;
  subSet: string;
  number: string;
  pokemon: { en?: string; [lang: string]: string | undefined };
  languagesAvailable?: string[];
  variant?: { type?: string; stamp?: string };
}
interface StampedPromosJson {
  cards?: StampedPromosCardItem[];
}

/** Slug for stable id (e.g. "Trick or Trade 2022" -> "tot-2022"). */
function setToSlug(setName: string): string {
  const s = setName
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  if (s.includes('trick') && s.includes('trade')) return 'tot-' + (s.match(/\d{4}/)?.[0] ?? '');
  if (s.includes('holiday') && s.includes('calendar')) return 'hc-' + (s.match(/\d{4}/)?.[0] ?? '');
  return s.slice(0, 24) || 'extra';
}

/** Normalize number to localId (e.g. "015/192" -> "015", "SWSH153" -> "SWSH153"). */
function numberToLocalId(num: string): string {
  const n = (num ?? '').trim();
  const slash = n.indexOf('/');
  return slash >= 0 ? n.slice(0, slash).trim() : n;
}

/** Build stable extra card id (used for slots and dedupe). */
export function extraPrintingId(setSlug: string, localId: string): string {
  return `extra-${setSlug}-${localId.replace(/[^a-zA-Z0-9-]/g, '-')}`;
}

let cached: ExtraPrintingBrief[] | null = null;

function loadFromJson(): ExtraPrintingBrief[] {
  if (cached) return cached;
  const out: ExtraPrintingBrief[] = [];
  const variant: CardVariant = 'wPromo';

  // Metro requires static require() paths – no variables
  let tot: SeriesJson | null = null;
  let hc: SeriesJson | null = null;
  let stamped: StampedPromosJson | null = null;
  try {
    tot = require('../data/trick_or_trade.json') as SeriesJson;
  } catch {
    // ignore
  }
  try {
    hc = require('../data/holiday_calendar.json') as SeriesJson;
  } catch {
    // ignore
  }
  try {
    stamped = require('../data/stamped_promos_no_blackstar_no_calendar.json') as StampedPromosJson;
  } catch {
    // ignore
  }

  if (tot?.sets && Array.isArray(tot.sets)) {
    for (const s of tot.sets) {
      const setSlug = setToSlug(s.set);
      const setName = s.set;
      for (const c of s.cards ?? []) {
        const localId = numberToLocalId(c.number);
        const id = extraPrintingId(setSlug, localId);
        out.push({
          id,
          name: (c.name ?? '').trim(),
          localId,
          image: null,
          set: { id: setSlug, name: setName },
          variant,
        });
      }
    }
  }

  if (hc?.sets && Array.isArray(hc.sets)) {
    for (const s of hc.sets) {
      const setSlug = setToSlug(s.set);
      const setName = s.set;
      for (const c of s.cards ?? []) {
        const localId = numberToLocalId(c.number);
        const id = extraPrintingId(setSlug, localId);
        out.push({
          id,
          name: (c.name ?? '').trim(),
          localId,
          image: null,
          set: { id: setSlug, name: setName },
          variant,
        });
      }
    }
  }

  // Stamped promos (Staff, League, Pokemon Center, Prerelease, Store)
  if (stamped?.cards && Array.isArray(stamped.cards)) {
    for (const c of stamped.cards) {
      const name = (c.pokemon?.en ?? c.pokemon?.ja ?? Object.values(c.pokemon ?? {})[0] ?? c.manualId).trim();
      const setLabel = [c.setGroup, c.subSet].filter(Boolean).join(' – ');
      const setSlug = setLabel.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'stamped';
      out.push({
        id: c.manualId,
        name: name || c.manualId,
        localId: (c.number ?? '').trim(),
        image: null,
        set: { id: setSlug, name: setLabel },
        variant,
      });
    }
  }

  cached = out;
  return out;
}

/** All extra printings (stamped/promo from JSON). */
export function getAllExtraPrintings(): ExtraPrintingBrief[] {
  return [...loadFromJson()];
}

/** Map of extra set id (slug) → real display name. Use to show "Trick or Trade 2022" instead of "tot-2022". */
export function getExtraSetNamesById(): Record<string, string> {
  const all = loadFromJson();
  const out: Record<string, string> = {};
  for (const c of all) {
    if (c.set?.id && c.set?.name && !out[c.set.id]) out[c.set.id] = c.set.name;
  }
  return out;
}

/** Extra printings whose name matches (case-insensitive). For exact match, pass options.exact. When exact is false, matches exact or "name " prefix so e.g. "Abra" does not match "Kadabra". */
export function getExtraPrintingsForName(
  name: string,
  options?: { exact?: boolean }
): ExtraPrintingBrief[] {
  const all = loadFromJson();
  const q = (name ?? '').trim().toLowerCase();
  if (!q) return [];
  const exact = options?.exact ?? false;
  const prefix = q + ' ';
  return all.filter((c) => {
    const n = (c.name ?? '').trim().toLowerCase();
    return exact ? n === q : n === q || n.startsWith(prefix);
  });
}

/** Search: extra printings whose name matches query (exact or "query " prefix) so e.g. "Abra" does not match "Kadabra". */
export function searchExtraPrintings(query: string): ExtraPrintingBrief[] {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return [];
  const prefix = q + ' ';
  return loadFromJson().filter((c) => {
    const n = (c.name ?? '').toLowerCase();
    return n === q || n.startsWith(prefix);
  });
}
