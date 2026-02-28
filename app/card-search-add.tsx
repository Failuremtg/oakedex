import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/Themed';
import { CachedImage } from '@/components/CachedImage';
import { setSlot } from '@/src/lib/collections';
import { getCard, getCardsByName, type TCGdexLang } from '@/src/lib/tcgdex';
import { normalizeTcgdexImageUrl } from '@/src/lib/tcgdex';
import { getDisplayVariants, getVariantLabel, type CardVariant } from '@/src/types';
import { CARD_VARIANTS } from '@/src/types';

const LANG: TCGdexLang = 'en';

type CardBrief = { id: string; name: string; localId: string; image?: string; set?: { id: string; name: string } };

export default function CardSearchAddScreen() {
  const params = useLocalSearchParams<{ collectionId: string; slotKey?: string }>();
  const router = useRouter();
  const collectionId = params.collectionId as string | undefined;
  const prefilledSlotKey = params.slotKey as string | undefined;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CardBrief[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardBrief | null>(null);
  const [variants, setVariants] = useState<CardVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getCardsByName(LANG, query.trim(), { exact: false })
      .then((cards) => {
        if (!cancelled) setResults(cards ?? []);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [query]);

  const onSelectCard = useCallback(async (card: CardBrief) => {
    setSelectedCard(card);
    setLoadingVariants(true);
    try {
      const full = await getCard(LANG, card.id);
      const list = getDisplayVariants(full);
      setVariants(list.length > 0 ? list : ['normal']);
    } catch {
      setVariants(['normal']);
    } finally {
      setLoadingVariants(false);
    }
  }, []);

  const onAdd = useCallback(
    async (variant: CardVariant) => {
      if (!collectionId || !selectedCard || saving) return;
      setSaving(true);
      try {
        const slotKey = prefilledSlotKey ?? `tcg-${selectedCard.id}-${variant}-${Date.now()}`;
        await setSlot(collectionId, slotKey, { cardId: selectedCard.id, variant });
        router.back();
      } catch (e) {
        console.warn(e);
      } finally {
        setSaving(false);
      }
    },
    [collectionId, prefilledSlotKey, selectedCard, saving, router]
  );

  const closeVariantPicker = useCallback(() => setSelectedCard(null), []);

  if (!collectionId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Missing collection.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Search for a card to add to your custom binder.</Text>
      <TextInput
        style={styles.search}
        placeholder="Card name..."
        placeholderTextColor="#888"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#6a449b" /></View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => onSelectCard(item)}
            >
              <CachedImage
                remoteUri={normalizeTcgdexImageUrl(item.image) ?? item.image ?? undefined}
                style={styles.thumb}
                resizeMode="contain"
              />
              <View style={styles.rowText}>
                <Text style={styles.rowName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.rowSet} numberOfLines={1}>{item.set?.name ?? item.id}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={query.trim() ? <Text style={styles.empty}>No cards found.</Text> : null}
        />
      )}

      {selectedCard && (
        <Pressable style={styles.modalBackdrop} onPress={closeVariantPicker}>
          <Pressable style={styles.variantCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.variantTitle}>Choose variation</Text>
            {loadingVariants ? (
              <ActivityIndicator size="small" color="#6a449b" style={{ marginVertical: 16 }} />
            ) : (
              <View style={styles.variantRow}>
                {variants.map((v) => (
                  <Pressable
                    key={v}
                    style={({ pressed }) => [
                      styles.variantChip,
                      pressed && styles.variantChipPressed,
                      saving && styles.variantChipDisabled,
                    ]}
                    onPress={() => onAdd(v)}
                    disabled={saving}
                  >
                    <Text style={styles.variantChipText}>{getVariantLabel(v)}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Pressable style={styles.cancelBtn} onPress={closeVariantPicker}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2d2d2d' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hint: { padding: 16, fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  search: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 16,
  },
  list: { flex: 1 },
  listContent: { paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rowPressed: { opacity: 0.8 },
  thumb: { width: 48, height: 68, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.2)' },
  rowText: { marginLeft: 12, flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  rowSet: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  empty: { padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.6)' },
  error: { color: '#ef4444', marginBottom: 12 },
  backBtn: { padding: 12 },
  backBtnText: { color: '#6a449b', fontWeight: '600' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  variantCard: {
    width: '100%',
    maxWidth: 320,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#2d2d2d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  variantTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 },
  variantRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  variantChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(106,68,155,0.5)',
  },
  variantChipPressed: { opacity: 0.8 },
  variantChipDisabled: { opacity: 0.5 },
  variantChipText: { color: '#fff', fontWeight: '600' },
  cancelBtn: { marginTop: 16, alignSelf: 'center' },
  cancelBtnText: { color: 'rgba(255,255,255,0.7)' },
});
