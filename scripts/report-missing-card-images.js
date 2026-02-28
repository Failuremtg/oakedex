/**
 * Reports how many TCGdex cards (English sets) have no image in the API.
 * Run from repo root: node apps-dev/oakedex/scripts/report-missing-card-images.js
 * Or from oakedex: node scripts/report-missing-card-images.js
 *
 * Optionally checks Pokémon TCG API (fallback) for those cards: add --check-fallback
 */

const LANG = 'en';
const BASE_TCGDEX = 'https://api.tcgdex.net/v2';
const BASE_PTCG = 'https://api.pokemontcg.io/v2';
const SET_IDS_WITHOUT_CARDS = ['wp', 'jumbo'];

function isPocketSet(set) {
  if (set.serie?.id === 'tcgp') return true;
  const logo = set.logo ?? '';
  const symbol = set.symbol ?? '';
  return logo.includes('/tcgp/') || symbol.includes('/tcgp/');
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}: ${url}`);
  return res.json();
}

async function main() {
  const checkFallback = process.argv.includes('--check-fallback');

  console.log('Fetching TCGdex sets (en)...');
  const sets = await fetchJson(`${BASE_TCGDEX}/${LANG}/sets`);
  const filtered = sets.filter(
    (s) => !SET_IDS_WITHOUT_CARDS.includes(s.id) && !isPocketSet(s)
  );
  console.log(`Using ${filtered.length} sets (excluding Pocket and empty-card sets).\n`);

  const missing = [];
  let totalCards = 0;

  for (let i = 0; i < filtered.length; i++) {
    const set = filtered[i];
    try {
      const setData = await fetchJson(`${BASE_TCGDEX}/${LANG}/sets/${set.id}`);
      const cards = setData.cards ?? [];
      totalCards += cards.length;
      for (const card of cards) {
        const hasImage = card.image && String(card.image).trim().length > 0;
        if (!hasImage) {
          missing.push({
            setId: set.id,
            setName: set.name ?? set.id,
            cardId: card.id,
            name: card.name,
            localId: card.localId,
          });
        }
      }
    } catch (e) {
      console.warn(`Skip set ${set.id}: ${e.message}`);
    }
    if ((i + 1) % 50 === 0) console.log(`  Processed ${i + 1}/${filtered.length} sets...`);
  }

  console.log('\n--- Summary ---');
  console.log(`Total cards (in set lists): ${totalCards}`);
  console.log(`Cards with no image in TCGdex: ${missing.length}`);
  if (totalCards > 0) {
    const pct = ((missing.length / totalCards) * 100).toFixed(1);
    console.log(`Percentage missing: ${pct}%`);
  }

  if (missing.length > 0) {
    console.log('\n--- Cards without image (setId | cardId | name) ---');
    const toShow = missing.slice(0, 100);
    toShow.forEach((m) => console.log(`${m.setId} | ${m.cardId} | ${m.name}`));
    if (missing.length > 100) {
      console.log(`... and ${missing.length - 100} more.`);
    }
  }

  if (checkFallback && missing.length > 0) {
    console.log('\n--- Checking Pokémon TCG API fallback (first 50 missing) ---');
    const sample = missing.slice(0, 50);
    let hasFallback = 0;
    for (const m of sample) {
      try {
        const res = await fetch(
          `${BASE_PTCG}/cards/${encodeURIComponent(m.cardId)}?select=id,images`
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.data?.images?.large || data?.data?.images?.small) hasFallback++;
        }
      } catch {
        // ignore
      }
    }
    console.log(`${hasFallback}/${sample.length} of sampled missing cards have a fallback image on Pokémon TCG API.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
