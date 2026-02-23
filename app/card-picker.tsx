import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';

import { Text, View } from '@/components/Themed';
import { SyncLoadingScreen } from '@/components/SyncLoadingScreen';
import { setSlot } from '@/src/lib/collections';
import { getPocketSetIds } from '@/src/lib/cardDataCache';
import { getTcgSearchName } from '@/src/lib/masterSetExpansion';
import { getCard, getCardsByName, type TCGdexLang } from '@/src/lib/tcgdex';
import { getVariantLabel, getVariantsFromCard, type CardVariant } from '@/src/types';
import type { PokemonSummary } from '@/src/types';

const LANG: TCGdexLang = 'en';

function setIdFromCardId(cardId: string): string {
  const i = cardId.lastIndexOf('-');
  return i >= 0 ? cardId.slice(0, i) : cardId;
}

export default function CardPickerScreen() {
  const params = useLocalSearchParams<{
    collectionId: string;
    slotKey: string;
    binderType: string;
    pokemonName?: string;
  }>();
  const router = useRouter();
  const { collectionId, slotKey, binderType, pokemonName } = params;

  const [step, setStep] = useState<'list' | 'variant'>('list');
  const [cards, setCards] = useState<Array<{ id: string; name: string; localId: string; image?: string }>>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [variants, setVariants] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isSinglePokemon = binderType === 'single_pokemon';
  const isCollectThemAll = binderType === 'collect_them_all';
  const isBySet = binderType === 'by_set';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!collectionId || !slotKey) {
        setLoading(false);
        return;
      }
      if (isSinglePokemon) {
        const full = await getCard(LANG, slotKey);
        if (!cancelled && full) {
          setCards([{ id: full.id, name: full.name, localId: full.localId, image: full.image }]);
          setSelectedCardId(full.id);
          setVariants(full.variants && typeof full.variants === 'object' ? full.variants : {});
          setStep('variant');
        }
      } else if (isBySet) {
        const full = await getCard(LANG, slotKey);
        if (!cancelled && full) {
          setCards([{ id: full.id, name: full.name, localId: full.localId, image: full.image }]);
          setSelectedCardId(full.id);
          setVariants(full.variants && typeof full.variants === 'object' ? full.variants : {});
          setStep('variant');
        }
      } else if (isCollectThemAll && pokemonName) {
        const summary: PokemonSummary = {
          dexId: 0,
          name: pokemonName,
          form: pokemonName.startsWith('Gigantamax ') ? 'gmax' : undefined,
        };
        const searchName = getTcgSearchName(summary);
        const list = await getCardsByName(LANG, searchName, { exact: false });
        const pocketIds = await getPocketSetIds();
        const pocketSet = new Set(pocketIds);
        const filtered = (list ?? []).filter((c) => !pocketSet.has(setIdFromCardId(c.id)));
        if (!cancelled) setCards(filtered);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [collectionId, slotKey, binderType, pokemonName, isSinglePokemon, isCollectThemAll, isBySet]);

  const onSelectCard = useCallback(async (cardId: string) => {
    setSelectedCardId(cardId);
    const full = await getCard(LANG, cardId);
    if (full?.variants) setVariants(full.variants);
    setStep('variant');
  }, []);

  const onSelectVariant = useCallback(
    async (variant: CardVariant) => {
      if (!collectionId || !slotKey || !selectedCardId) return;
      const valid = getVariantsFromCard({ variants });
      if (!valid.includes(variant)) return;
      setSaving(true);
      await setSlot(collectionId, slotKey, { cardId: selectedCardId, variant });
      setSaving(false);
      router.back();
    },
    [collectionId, slotKey, selectedCardId, variants, router]
  );

  const clearSlot = useCallback(async () => {
    if (!collectionId || !slotKey) return;
    setSaving(true);
    await setSlot(collectionId, slotKey, null);
    setSaving(false);
    router.back();
  }, [collectionId, slotKey, router]);

  if (!collectionId || !slotKey) {
    return (
      <View style={styles.centered}>
        <Text>Missing params.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <SyncLoadingScreen statusText="Loading cards..." />
      </View>
    );
  }

  if (step === 'variant' && selectedCardId) {
    const card = cards.find((c) => c.id === selectedCardId);
    const availableVariants = (Object.entries(variants) as [string, boolean][]).filter(
      ([_, available]) => available === true
    );
    const validVariants = getVariantsFromCard({ variants });
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {card?.image && (
          <Image source={{ uri: card.image }} style={styles.cardImage} resizeMode="contain" />
        )}
        <Text style={styles.cardName}>{card?.name}</Text>
        <Text style={styles.setInfo}>#{card?.localId}</Text>
        <Text style={styles.variantTitle}>Which version do you have?</Text>
        {availableVariants.map(([v]) => {
          const variant = v as CardVariant;
          if (!validVariants.includes(variant)) return null;
          return (
            <Pressable
              key={variant}
              style={({ pressed }) => [styles.variantButton, pressed && styles.variantPressed]}
              onPress={() => onSelectVariant(variant)}
              disabled={saving}
            >
              <Text style={styles.variantButtonText}>{getVariantLabel(variant)}</Text>
            </Pressable>
          );
        })}
        <Pressable
          style={({ pressed }) => [styles.clearButton, pressed && styles.variantPressed]}
          onPress={clearSlot}
          disabled={saving}
        >
          <Text style={styles.clearButtonText}>Clear / I don't have this</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (cards.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>No cards found for "{pokemonName}".</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={cards}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => onSelectCard(item.id)}
        >
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.thumb} />
          ) : (
            <View style={styles.thumbPlaceholder} />
          )}
          <View style={styles.rowText}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.setNum}>#{item.localId}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, alignItems: 'center', paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  rowPressed: { opacity: 0.8 },
  thumb: { width: 50, height: 70, marginRight: 12, borderRadius: 4 },
  thumbPlaceholder: {
    width: 50,
    height: 70,
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
  },
  rowText: { flex: 1 },
  name: { fontSize: 16 },
  setNum: { fontSize: 12, opacity: 0.7 },
  cardImage: { width: 220, height: 308, marginBottom: 16 },
  cardName: { fontSize: 20, fontWeight: '600', marginBottom: 4 },
  setInfo: { fontSize: 14, opacity: 0.7, marginBottom: 24 },
  variantTitle: { fontSize: 16, marginBottom: 12 },
  variantButton: {
    width: '100%',
    padding: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 8,
  },
  variantPressed: { opacity: 0.8 },
  variantButtonText: { fontSize: 16, textAlign: 'center' },
  clearButton: {
    marginTop: 24,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  clearButtonText: { fontSize: 14, textAlign: 'center', opacity: 0.8 },
});
