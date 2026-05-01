import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { CachedImage } from '@/components/CachedImage';
import { Text } from '@/components/Themed';
import { addWantedItem } from '@/src/lib/wanted';
import { parseCardQuery } from '@/src/lib/cardQuery';
import { searchExtraPrintings } from '@/src/lib/extraPrintings';
import { getSetsWithCache } from '@/src/lib/cardDataCache';
import { getCard, getCardsByName, normalizeTcgdexImageUrl, type TCGdexLang } from '@/src/lib/tcgdex';
import { filterVariantsBySetAndLanguage, getDisplayVariants, getVariantLabel, type CardVariant } from '@/src/types';
import { charcoal } from '@/constants/Colors';

const LANG: TCGdexLang = 'en';

type CardBrief = { id: string; name: string; localId: string; image?: string | null; setName?: string; variant?: CardVariant };

function setIdFromCardId(cardId: string): string {
  const i = cardId.lastIndexOf('-');
  return i >= 0 ? cardId.slice(0, i) : cardId;
}

export default function WantedAddScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ listId?: string }>();
  const listId = (params.listId ?? 'default').toString();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CardBrief[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardBrief | null>(null);
  const [variants, setVariants] = useState<CardVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [saving, setSaving] = useState(false);

  const trimmed = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const parsed = parseCardQuery(trimmed);
    const exactPromise =
      parsed.kind === 'setAndLocalId' || parsed.kind === 'cardId'
        ? getCard(LANG, parsed.kind === 'cardId' ? parsed.cardId : parsed.cardId)
            .then((c) => (c ? [c] : []))
            .catch(() => [])
        : Promise.resolve([]);

    // Wanted search should be broad (not strict filtering) so users can discover cards easily.
    Promise.all([
      exactPromise,
      getCardsByName(LANG, trimmed, { exact: false, page: 1, itemsPerPage: 200 }),
      Promise.resolve(searchExtraPrintings(trimmed)),
      getSetsWithCache(),
    ])
      .then(([exactCards, apiCards, extraCards, sets]) => {
        if (cancelled) return;
        const setNamesById: Record<string, string> = {};
        for (const s of sets ?? []) setNamesById[s.id] = s.name;

        const exactList: CardBrief[] = (exactCards ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          localId: c.localId,
          image: c.image ?? null,
          setName: c.set?.name,
        }));
        const apiList: CardBrief[] = (apiCards ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          localId: c.localId,
          image: c.image ?? null,
          setName: c.set?.name,
        }));
        const extraList: CardBrief[] = extraCards.map((c) => ({
          id: c.id,
          name: c.name,
          localId: c.localId,
          image: c.image ?? null,
          setName: c.set?.name,
          variant: c.variant,
        }));
        const seen = new Set<string>();
        const merged: CardBrief[] = [];
        for (const x of [...exactList, ...apiList, ...extraList]) {
          if (seen.has(x.id)) continue;
          seen.add(x.id);
          const inferredSetName = x.setName ?? setNamesById[setIdFromCardId(x.id)] ?? setIdFromCardId(x.id);
          merged.push({ ...x, setName: inferredSetName });
        }
        setResults(merged);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trimmed]);

  const onSelectCard = useCallback(async (card: CardBrief) => {
    setSelectedCard(card);
    if (card.id.startsWith('extra-') && card.variant) {
      setVariants([card.variant]);
      setLoadingVariants(false);
      return;
    }
    setLoadingVariants(true);
    try {
      const full = await getCard(LANG, card.id);
      const list = filterVariantsBySetAndLanguage(getDisplayVariants(full), full.set?.name ?? card.setName ?? null, LANG);
      setVariants(list.length > 0 ? list : ['normal']);
    } catch {
      setVariants(['normal']);
    } finally {
      setLoadingVariants(false);
    }
  }, []);

  const onAdd = useCallback(
    async (variant: CardVariant) => {
      if (!selectedCard || saving) return;
      setSaving(true);
      try {
        const full = selectedCard.id.startsWith('extra-') ? null : await getCard(LANG, selectedCard.id).catch(() => null);
        const name = full?.name ?? selectedCard.name;
        const localId = full?.localId ?? selectedCard.localId;
        const setName = full?.set?.name ?? selectedCard.setName;
        const image =
          normalizeTcgdexImageUrl(full?.image ?? selectedCard.image ?? null) ?? (full?.image ?? selectedCard.image ?? null);
        await addWantedItem({
          listId,
          cardId: selectedCard.id,
          variant,
          name,
          localId,
          setName,
          image,
          intent: 'either',
        });
        router.back();
      } finally {
        setSaving(false);
      }
    },
    [selectedCard, saving, router, listId]
  );

  const closeVariantPicker = useCallback(() => setSelectedCard(null), []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.rowPressed]}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Add to Wanted</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Search</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.search}
              placeholder="Search cards..."
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="words"
            />
            {loading ? <ActivityIndicator color="#fff" /> : null}
          </View>
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => onSelectCard(item)}
              disabled={saving}
            >
              <CachedImage remoteUri={item.image ?? undefined} cardId={item.id} style={styles.thumb} resizeMode="contain" />
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.setName ?? 'Set'} • #{item.localId ?? '—'}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            trimmed && !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No results.</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Search for a card to add.</Text>
              </View>
            )
          }
        />
      </View>

      {selectedCard && (
        <View style={styles.variantSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} numberOfLines={2}>
              {selectedCard.name}
            </Text>
            <Pressable onPress={closeVariantPicker} style={({ pressed }) => [styles.closeBtn, pressed && styles.rowPressed]}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
          {loadingVariants ? (
            <View style={styles.sheetLoading}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.sheetHint}>Loading variants…</Text>
            </View>
          ) : (
            <View style={styles.variantList}>
              {variants.map((v) => (
                <Pressable
                  key={v}
                  style={({ pressed }) => [styles.variantBtn, pressed && styles.rowPressed, saving && styles.disabled]}
                  onPress={() => onAdd(v)}
                  disabled={saving}
                >
                  <Text style={styles.variantText}>{getVariantLabel(v)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: charcoal },
  content: { flex: 1, padding: 20, paddingTop: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  title: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  backBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)' },
  backText: { color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  rowPressed: { opacity: 0.8 },

  section: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  label: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  search: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff' },
  listContent: { paddingBottom: 200 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  thumb: { width: 52, height: 72, marginRight: 12, borderRadius: 6 },
  rowText: { flex: 1, gap: 2 },
  name: { color: '#fff', fontSize: 15, fontWeight: '700' },
  meta: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.7)' },

  variantSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: charcoal,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    padding: 14,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sheetTitle: { color: '#fff', fontWeight: '800', flex: 1 },
  closeBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)' },
  closeText: { color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  sheetLoading: { paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetHint: { color: 'rgba(255,255,255,0.7)' },
  variantList: { paddingTop: 10, gap: 8 },
  variantBtn: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(106, 68, 155, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(106, 68, 155, 0.7)',
  },
  variantText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
});

