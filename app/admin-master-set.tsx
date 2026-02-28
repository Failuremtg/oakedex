/**
 * Admin: Grandmaster Binder – pick default card per slot (same UX as binder),
 * then Save pushes to all users and devices via Firestore config.
 */

import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CachedImage } from '@/components/CachedImage';
import { SyncLoadingScreen } from '@/components/SyncLoadingScreen';
import { charcoal } from '@/constants/Colors';
import { getDefaultCardOverrides, getCustomCards, setDefaultCardOverrides } from '@/src/lib/adminBinderConfig';
import { getSpeciesWithCache } from '@/src/lib/cardDataCache';
import { getExpandedSpeciesList, getTcgSearchName, VARIATION_GROUPS } from '@/src/lib/masterSetExpansion';
import { getSpecies, getSpeciesNameForLang } from '@/src/lib/pokeapi';
import { getCard, getCardsByName, getCardsFull, normalizeTcgdexImageUrl, toAppCardBrief, type TCGdexLang } from '@/src/lib/tcgdex';
import { cardSlotKey, filterVariantsByEdition, getDisplayVariants, getSlotKeyForEntry, type AppCardBrief, type CardVariant, type CustomCard, type MasterListEntry } from '@/src/types';

const LANG: TCGdexLang = 'en';

function setIdFromCardId(cardId: string): string {
  const i = cardId.lastIndexOf('-');
  return i >= 0 ? cardId.slice(0, i) : cardId;
}

export default function AdminMasterSetScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pokemonList, setPokemonList] = useState<MasterListEntry[]>([]);
  const [defaultBySlotKey, setDefaultBySlotKey] = useState<Record<string, string>>({});
  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  const [visibleSlotKeys, setVisibleSlotKeys] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<{ slotKey: string; name: string; customCard?: CustomCard } | null>(null);
  const [pickerCards, setPickerCards] = useState<(AppCardBrief & { variant: CardVariant })[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [base, customCards, overrides] = await Promise.all([
        getSpeciesWithCache(),
        getCustomCards(),
        getDefaultCardOverrides(),
      ]);
      const species = getExpandedSpeciesList(base, {
        regionalForms: true,
        variationGroups: VARIATION_GROUPS.map((g) => g.id),
        megas: true,
        gmax: true,
      });
      const customEntries: MasterListEntry[] = customCards.map((card) => ({
        type: 'custom',
        slotKey: card.slotKey,
        name: card.name,
        dexId: card.dexId,
        card,
      }));
      const merged = [...species, ...customEntries].sort((a, b) => {
        const aKey = getSlotKeyForEntry(a);
        const bKey = getSlotKeyForEntry(b);
        const aDex = 'dexId' in a ? a.dexId : 0;
        const bDex = 'dexId' in b ? b.dexId : 0;
        if (aDex !== bDex) return aDex - bDex;
        return aKey.localeCompare(bKey, undefined, { numeric: true });
      });
      setPokemonList(merged);
      setDefaultBySlotKey(overrides);
    } catch {
      setPokemonList([]);
      setDefaultBySlotKey({});
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  // Load images for visible slots that have a default card
  useEffect(() => {
    if (pokemonList.length === 0 || visibleSlotKeys.length === 0) return;
    const batch = visibleSlotKeys.slice(0, 20);
    let cancelled = false;
    (async () => {
      for (const slotKey of batch) {
        if (cancelled) return;
        const cardId = defaultBySlotKey[slotKey];
        if (!cardId || imageCache[slotKey]) continue;
        try {
          const card = await getCard(LANG, cardId);
          if (!cancelled && card?.image) {
            const uri = normalizeTcgdexImageUrl(card.image) ?? card.image;
            setImageCache((prev) => ({ ...prev, [slotKey]: uri }));
          }
        } catch {
          /* ignore */
        }
      }
    })();
    return () => { cancelled = true; };
  }, [defaultBySlotKey, visibleSlotKeys, imageCache]);

  const openPicker = useCallback((slotKey: string, name: string, customCard?: CustomCard) => {
    setPickerSlot({ slotKey, name, customCard });
    setPickerVisible(true);
    setPickerCards([]);
    setPickerLoading(true);
  }, []);

  const closePicker = useCallback(() => {
    setPickerVisible(false);
    setPickerSlot(null);
    setPickerCards([]);
  }, []);

  const onPickCard = useCallback((cardId: string) => {
    if (!pickerSlot) return;
    setDefaultBySlotKey((prev) => ({ ...prev, [pickerSlot.slotKey]: cardId }));
    closePicker();
  }, [pickerSlot, closePicker]);

  // Load picker cards when picker opens
  useEffect(() => {
    if (!pickerVisible || !pickerSlot) return;
    const customCard = pickerSlot.customCard;
    if (customCard) {
      const variants = filterVariantsByEdition(getDisplayVariants({ name: customCard.name, variants: customCard.variants }), 'all');
      const expanded: (AppCardBrief & { variant: CardVariant })[] = variants.map((variant) => ({
        id: customCard.id,
        name: customCard.name,
        localId: customCard.localId,
        image: customCard.image,
        set: { id: customCard.setId, name: customCard.setName },
        variant,
      }));
      setPickerCards(expanded);
      setPickerLoading(false);
      return;
    }
    const slotKey = pickerSlot.slotKey;
    const dexId = slotKey.includes('-')
      ? parseInt(slotKey.split('-')[0], 10)
      : parseInt(slotKey, 10);
    const numericDexId = Number.isNaN(dexId) ? undefined : dexId;
    let cancelled = false;
    (async () => {
      try {
        const species = numericDexId != null ? await getSpecies(numericDexId) : null;
        const isForm = slotKey.includes('-');
        const formPart = isForm ? slotKey.split('-').slice(1).join('-') : undefined;
        const pickerSummary = { dexId: numericDexId ?? 0, name: pickerSlot.name, form: formPart };
        const searchName = isForm ? getTcgSearchName(pickerSummary) : (getSpeciesNameForLang(species, LANG) ?? pickerSlot.name);
        let cards = await getCardsByName(LANG, searchName, { exact: false });
        if ((cards ?? []).length === 0 && LANG !== 'en' && searchName) {
          const enCards = await getCardsByName('en', searchName, { exact: false });
          const ids = (enCards ?? []).map((c) => c.id);
          for (let i = 0; i < ids.length; i += 50) {
            const batch = ids.slice(i, i + 50);
            const fullInLang = await Promise.all(batch.map((id) => getCard(LANG, id).catch(() => null)));
            const resolved = fullInLang.filter((c): c is NonNullable<typeof c[0]> => c != null);
            cards = resolved.map((c) => ({ id: c.id, name: c.name, localId: c.localId, image: c.image ?? null, set: c.set }));
          }
        }
        const combined = (cards ?? []).map((c) => ({ brief: toAppCardBrief(c), lang: LANG }));
        const variantsById: Record<string, CardVariant[]> = {};
        const ids = combined.map(({ brief }) => brief.id);
        for (let i = 0; i < ids.length; i += 50) {
          const batch = ids.slice(i, i + 50);
          const fullCards = await getCardsFull(LANG, batch);
          for (const full of fullCards) {
            if (full?.variants) variantsById[full.id] = getDisplayVariants(full);
          }
        }
        const expanded: (AppCardBrief & { variant: CardVariant })[] = [];
        for (const { brief } of combined) {
          const variants = variantsById[brief.id] ?? ['normal'];
          for (const variant of variants) {
            expanded.push({
              ...brief,
              image: brief.image ? (normalizeTcgdexImageUrl(brief.image) ?? brief.image) : null,
              set: { id: brief.set?.id ?? setIdFromCardId(brief.id), name: brief.set?.name ?? '' },
              variant,
            });
          }
        }
        if (!cancelled) setPickerCards(expanded);
      } catch {
        if (!cancelled) setPickerCards([]);
      }
      if (!cancelled) setPickerLoading(false);
    })();
    return () => { cancelled = true; };
  }, [pickerVisible, pickerSlot]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await setDefaultCardOverrides(defaultBySlotKey);
      Alert.alert(
        'Saved',
        'Master set defaults have been saved. All users and devices will see these card versions when a slot is not collected.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [defaultBySlotKey, router]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: MasterListEntry }> }) => {
      setVisibleSlotKeys(viewableItems.map((v) => getSlotKeyForEntry(v.item)));
    },
    []
  );

  if (loading) {
    return (
      <View style={styles.screen}>
        <SyncLoadingScreen statusText="Loading master set..." />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Grandmaster binder</Text>
        <Text style={styles.subtitle}>
          Tap a slot to choose which card version shows when not collected. Save pushes to all users and devices.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed, saving && styles.disabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save (push to all users)</Text>
          )}
        </Pressable>
      </View>

      <FlatList
        data={pokemonList}
        numColumns={3}
        keyExtractor={(item) => getSlotKeyForEntry(item)}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        style={styles.list}
        renderItem={({ item }) => {
          const slotKey = getSlotKeyForEntry(item);
          const cardId = defaultBySlotKey[slotKey];
          const imageUri = cardId ? imageCache[slotKey] : null;
          const displayUri = imageUri ? (normalizeTcgdexImageUrl(imageUri) ?? imageUri) : null;
          return (
            <Pressable
              style={({ pressed }) => [styles.gridCell, pressed && styles.rowPressed]}
              onPress={() => {
                const customCard = 'type' in item && item.type === 'custom' ? item.card : undefined;
                openPicker(slotKey, item.name, customCard);
              }}
            >
              <View style={styles.gridCardInner}>
                {displayUri ? (
                  <CachedImage
                    remoteUri={displayUri}
                    style={[styles.gridCardImage, !cardId && styles.gridCardImageUnselected]}
                    resizeMode="contain"
                    cardId={cardId}
                  />
                ) : (
                  <View style={styles.placeholder} />
                )}
                <View style={styles.ribbon} pointerEvents="none">
                  <Text style={styles.ribbonText} numberOfLines={2}>{item.name}</Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={closePicker}>
        <Pressable style={styles.modalBackdrop} onPress={closePicker}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Choose default card for {pickerSlot?.name ?? ''}</Text>
            <Text style={styles.modalHint}>Tap one to set as the version shown when not collected</Text>
            {pickerLoading ? (
              <ActivityIndicator size="large" color="#fff" style={{ marginVertical: 24 }} />
            ) : (
              <ScrollView style={styles.pickerScroll} contentContainerStyle={styles.pickerScrollContent} showsVerticalScrollIndicator>
                <View style={styles.pickerGrid}>
                  {pickerCards.map((card) => (
                    <Pressable
                      key={cardSlotKey(card.id, card.variant)}
                      style={({ pressed }) => [styles.pickerCell, pressed && styles.rowPressed]}
                      onPress={() => onPickCard(card.id)}
                    >
                      <CachedImage
                        remoteUri={card.image ? (normalizeTcgdexImageUrl(card.image) ?? card.image) : null}
                        style={styles.pickerCellImage}
                        resizeMode="contain"
                        cardId={card.id}
                      />
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
            <Pressable style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.rowPressed]} onPress={closePicker}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: charcoal },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 0, marginBottom: 8 },
  backBtnText: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  pressed: { opacity: 0.8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  saveBtn: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  list: { flex: 1 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 4 },
  gridContent: { paddingBottom: 24 },
  gridCell: { flex: 1, aspectRatio: 2.5 / 3.5, padding: 4, justifyContent: 'center', alignItems: 'center' },
  gridCardInner: { width: '100%', height: '100%', position: 'relative', borderRadius: 8, overflow: 'hidden' },
  gridCardImage: { width: '100%', height: '100%', borderRadius: 8 },
  gridCardImageUnselected: { opacity: 0.6 },
  placeholder: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.12)' },
  ribbon: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(0,0,0,0.78)',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    minHeight: 32,
  },
  ribbonText: { color: 'rgba(255,255,255,0.95)', fontSize: 10 },
  rowPressed: { opacity: 0.85 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    backgroundColor: '#2d2d2d',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 4 },
  modalHint: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 16 },
  pickerScroll: { maxHeight: 400 },
  pickerScrollContent: { paddingBottom: 16 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  pickerCell: {
    width: '31%',
    aspectRatio: 2.5 / 3.5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: '2%',
    marginBottom: 8,
  },
  pickerCellImage: { width: '100%', height: '100%', borderRadius: 8 },
  modalCloseBtn: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  modalCloseText: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
});
