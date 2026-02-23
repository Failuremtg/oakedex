import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/Themed';
import { ViewModeToggle } from '@/components/ViewModeToggle';
import { CachedImage } from '@/components/CachedImage';
import { primary } from '@/constants/Colors';
import { getSetsWithCache, getPocketSetIds } from '@/src/lib/cardDataCache';
import { useViewMode } from '@/src/lib/viewModeStorage';
import {
  cardImageUrlFromId,
  getCardsByName,
  LANGUAGE_OPTIONS,
  normalizeTcgdexImageUrl,
  type TCGdexCardBrief,
  type TCGdexLang,
} from '@/src/lib/tcgdex';

const MAX_RESULTS_PER_LANG = 50;
const NUM_COLUMNS = 3;

type CardWithLang = TCGdexCardBrief & { lang: TCGdexLang; setName?: string };

function getSetIdFromCardId(cardId: string): string {
  const dash = cardId.lastIndexOf('-');
  return dash >= 0 ? cardId.slice(0, dash) : cardId;
}

function langLabel(lang: TCGdexLang): string {
  return LANGUAGE_OPTIONS.find((o) => o.id === lang)?.label ?? lang;
}

function cardImageUri(item: CardWithLang): string {
  const fromApi = normalizeTcgdexImageUrl(item.image);
  if (fromApi) return fromApi;
  return `${cardImageUrlFromId(item.lang, item.id, item.localId)}/high.png`;
}

function CardGridItem({ item }: { item: CardWithLang }) {
  const imageUri = cardImageUri(item);
  const setLabel = item.setName ?? getSetIdFromCardId(item.id);

  return (
    <View style={styles.gridItem}>
      <View style={styles.cardImageWrap}>
        <CachedImage
          remoteUri={imageUri}
          style={styles.cardImage}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.cardName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.cardMeta}>
        {setLabel} #{item.localId}
      </Text>
      <View style={styles.langBadge}>
        <Text style={styles.langBadgeText}>{langLabel(item.lang)}</Text>
      </View>
    </View>
  );
}

export default function CardDexScreen() {
  const [viewMode, setViewMode] = useViewMode('search');
  const [query, setQuery] = useState('');
  const [selectedLangs, setSelectedLangs] = useState<TCGdexLang[]>(['en']);
  const [cards, setCards] = useState<CardWithLang[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const toggleLang = useCallback((lang: TCGdexLang) => {
    setSelectedLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  }, []);

  const search = useCallback(async () => {
    const q = query.trim();
    if (!q) {
      setCards([]);
      setSearched(false);
      return;
    }
    if (selectedLangs.length === 0) {
      setCards([]);
      setSearched(true);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const results = await Promise.all(
        selectedLangs.map(async (lang) => {
          const briefs = await getCardsByName(lang, q, { exact: false });
          return briefs.slice(0, MAX_RESULTS_PER_LANG).map((b) => ({ ...b, lang }));
        })
      );
      let merged: CardWithLang[] = results.flat();
      const pocketIds = await getPocketSetIds();
      const pocketSet = new Set(pocketIds);
      merged = merged.filter((c) => !pocketSet.has(getSetIdFromCardId(c.id)));
      const sets = await getSetsWithCache();
      const setNamesById: Record<string, string> = {};
      const releaseDateBySetId: Record<string, string> = {};
      for (const s of sets) {
        setNamesById[s.id] = s.name;
        if (s.releaseDate) releaseDateBySetId[s.id] = s.releaseDate;
      }
      merged.sort((a, b) => {
        const setIdA = getSetIdFromCardId(a.id);
        const setIdB = getSetIdFromCardId(b.id);
        const dateA = releaseDateBySetId[setIdA] ?? '9999-12-31';
        const dateB = releaseDateBySetId[setIdB] ?? '9999-12-31';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return a.id.localeCompare(b.id);
      });
      merged = merged.map((c) => ({
        ...c,
        setName: setNamesById[getSetIdFromCardId(c.id)] ?? getSetIdFromCardId(c.id),
      }));
      setCards(merged);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [query, selectedLangs]);

  const gridData = useMemo(() => {
    const emptySlots = cards.length % NUM_COLUMNS;
    if (emptySlots === 0) return cards;
    return [
      ...cards,
      ...Array(NUM_COLUMNS - emptySlots)
        .fill(null)
        .map((_, i) => ({ id: `empty-${i}`, empty: true })),
    ];
  }, [cards]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Card Dex</Text>
          <ViewModeToggle mode={viewMode} onToggle={setViewMode} label />
        </View>
        <Text style={styles.subtitle}>Search cards and see all versions</Text>
      </View>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Card or Pokémon name..."
          placeholderTextColor="#888"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          returnKeyType="search"
        />
        <Pressable
          style={({ pressed }) => [styles.searchBtn, pressed && styles.searchBtnPressed]}
          onPress={search}
        >
          <Text style={styles.searchBtnText}>Search</Text>
        </Pressable>
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Languages:</Text>
        <View style={styles.toggleWrap}>
          {LANGUAGE_OPTIONS.map((opt) => {
            const on = selectedLangs.includes(opt.id);
            return (
              <Pressable
                key={opt.id}
                style={[styles.toggleChip, on && styles.toggleChipOn]}
                onPress={() => toggleLang(opt.id)}
              >
                <Text style={[styles.toggleChipText, on && styles.toggleChipTextOn]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {loading && (
        <View style={StyleSheet.absoluteFill}>
          <SyncLoadingScreen statusText="Searching cards..." />
        </View>
      )}
      {!loading && searched && selectedLangs.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.hint}>Select at least one language, then search.</Text>
        </View>
      )}
      {!loading && searched && cards.length === 0 && selectedLangs.length > 0 && (
        <View style={styles.centered}>
          <Text style={styles.hint}>No cards found. Try another name.</Text>
        </View>
      )}
      {!loading && cards.length > 0 && (
        viewMode === 'list' ? (
          <FlatList
            data={cards}
            keyExtractor={(item) => `${item.id}-${item.lang}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.listRow}>
                <View style={styles.listRowThumb}>
                  <CachedImage
                    remoteUri={cardImageUri(item)}
                    style={styles.listRowThumbImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.listRowText}>
                  <Text style={styles.listRowTitle} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.listRowMeta}>
                    {item.setName ?? getSetIdFromCardId(item.id)} #{item.localId} • {langLabel(item.lang)}
                  </Text>
                </View>
              </View>
            )}
          />
        ) : (
        <FlatList
          data={gridData}
          keyExtractor={(item, index) =>
            'empty' in item && item.empty
              ? `empty-${index}`
              : `${(item as CardWithLang).id}-${(item as CardWithLang).lang}`
          }
          renderItem={({ item }) =>
            'empty' in item && item.empty ? (
              <View style={styles.gridItem} />
            ) : (
              <CardGridItem item={item as CardWithLang} />
            )
          }
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
        />
        )
      )}
      {!loading && !searched && (
        <View style={styles.centered}>
          <Text style={styles.hint}>Pick languages and search to see all versions of a card.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#2d2d2d' },
  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    paddingHorizontal: 14,
    fontSize: 16,
  },
  searchBtn: {
    backgroundColor: primary,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
  },
  searchBtnPressed: { opacity: 0.9 },
  searchBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  toggleRow: { paddingHorizontal: 20, paddingBottom: 16 },
  toggleLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
  toggleWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  toggleChipOn: { backgroundColor: primary },
  toggleChipText: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  toggleChipTextOn: { color: '#fff', fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hint: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  gridContent: { paddingHorizontal: 12, paddingBottom: 24 },
  gridRow: { gap: 8, marginBottom: 8 },
  gridItem: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  cardImageWrap: { width: '100%', aspectRatio: 2.5 / 3.5, borderRadius: 6, overflow: 'hidden' },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  cardName: { fontSize: 12, color: '#fff', marginTop: 6, textAlign: 'center' },
  cardMeta: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  langBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  langBadgeText: { fontSize: 10, color: 'rgba(255,255,255,0.9)' },
  listContent: { paddingBottom: 24, paddingHorizontal: 12 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  listRowThumb: { width: 40, height: 56, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' },
  listRowThumbImage: { width: '100%', height: '100%' },
  listRowText: { flex: 1, minWidth: 0 },
  listRowTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  listRowMeta: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
});
