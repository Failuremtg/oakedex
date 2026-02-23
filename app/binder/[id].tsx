import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CachedImage } from '@/components/CachedImage';
import { SyncLoadingScreen } from '@/components/SyncLoadingScreen';
import { charcoal } from '@/constants/Colors';
import {
  deleteCollection,
  getCollectionByIdFromCache,
  getSlotCard,
  loadCollections,
  refreshCollectionsCache,
  setSlot,
  updateCollection,
  type Collection,
} from '@/src/lib/collections';
import { getCollectionDisplayName, getCollectionSubtitle } from '@/src/lib/collectionDisplay';
import { addExcludedSetId, getPocketSetIds, getSetWithCache, getSetsWithCache, getSpeciesWithCache } from '@/src/lib/cardDataCache';
import { getExpandedSpeciesList, getTcgSearchName } from '@/src/lib/masterSetExpansion';
import { getAnyOverrideUri, setOverride } from '@/src/lib/cardImageOverrides';
import { getSpecies, getSpeciesNameForLang } from '@/src/lib/pokeapi';
import { getCard, getCardsByName, getCardsByIds, getCardsFull, normalizeTcgdexImageUrl, cardImageUrlFromId, LANGUAGE_OPTIONS, toAppCardBrief, type TCGdexLang } from '@/src/lib/tcgdex';
import { cardSlotKey, filterVariantsByEdition, filterVariantsBySetCardCount, getDisplayVariants, getSlotKey, getSlotKeyForEntry, getVariantLabel, getVariantsFromCard, type AppCardBrief, type CardVariant, type CustomCard, type MasterListEntry, type PokemonSummary, type Slot, type SlotCard } from '@/src/types';
import { getDefaultCardOverrides, getCustomCards, getExcludedCardVersions, addExcludedCardVersion, cardVersionKey } from '@/src/lib/adminBinderConfig';
import { useAuth } from '@/src/auth/AuthContext';
import { useIsAdmin } from '@/src/lib/adminConfig';
import { getLocalRemovedSlotKeys, addLocalRemovedSlot } from '@/src/lib/localRemovedSlots';
import {
  getGlobalBinderSlots,
  globalKeyBySet,
  globalKeySinglePokemon,
} from '@/src/lib/globalBinderSlots';
import { useViewMode } from '@/src/lib/viewModeStorage';
import { ViewModeToggle } from '@/components/ViewModeToggle';

/** Slot key for single_pokemon: includes language so EN and DE (same card id) are separate slots. */
function singlePokemonSlotKey(lang: string, cardId: string, variant: CardVariant): string {
  return `${lang}:${cardSlotKey(cardId, variant)}`;
}

const LANG: TCGdexLang = 'en';

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Card id is "setId-localId". Derive setId for set ribbon when set is not on brief. */
function setIdFromCardId(cardId: string): string {
  const i = cardId.lastIndexOf('-');
  return i >= 0 ? cardId.slice(0, i) : cardId;
}

/** Collector number from card id (part after last dash) or from card.localId. */
function collectorNumberFromCardId(cardId: string): string {
  const i = cardId.lastIndexOf('-');
  return i >= 0 ? cardId.slice(i + 1) : cardId;
}

/** Resolve set id to display name using cached set list; fall back to id if unknown. */
function setLabelForCard(card: AppCardBrief, setNamesById: Record<string, string>): string {
  const setId = card.set?.id ?? setIdFromCardId(card.id);
  return setNamesById[setId] ?? card.set?.name ?? setId;
}

function getSetDisplayName(setId: string, setNamesById: Record<string, string>): string {
  return setNamesById[setId] ?? setId;
}

const NO_VERSION_SELECTED = 'No version selected';

export default function BinderScreen() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const isEditMode = edit === '1' || edit === 'true';
  const router = useRouter();
  const { user } = useAuth();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useViewMode('binder');
  const [pokemonList, setPokemonList] = useState<MasterListEntry[]>([]);
  const [defaultCardOverrides, setDefaultCardOverrides] = useState<Record<string, string>>({});
  const customCardByCardId = useMemo(() => {
    const m: Record<string, CustomCard> = {};
    for (const p of pokemonList) {
      if ('type' in p && p.type === 'custom') m[p.card.id] = p.card;
    }
    return m;
  }, [pokemonList]);
  const [printings, setPrintings] = useState<AppCardBrief[]>([]);
  const [printingsByLang, setPrintingsByLang] = useState<Record<string, (AppCardBrief & { variant: CardVariant })[]>>({});
  const [filter, setFilter] = useState('');
  const [editingName, setEditingName] = useState('');
  const [firstPrintingCache, setFirstPrintingCache] = useState<Record<string, string>>({});
  const [cardImageCache, setCardImageCache] = useState<Record<string, string>>({});
  const [visibleSlotKeys, setVisibleSlotKeys] = useState<string[]>([]);
  const [setCards, setSetCards] = useState<(AppCardBrief & { variant: CardVariant })[]>([]);
  const [setExpectedTotal, setSetExpectedTotal] = useState<number>(0);
  const [cardsLoadError, setCardsLoadError] = useState<string | null>(null);
  const [masterPickerVisible, setMasterPickerVisible] = useState(false);
  const [masterPickerPokemon, setMasterPickerPokemon] = useState<{ slotKey: string; name: string; customCard?: CustomCard } | null>(null);
  const [masterPickerCards, setMasterPickerCards] = useState<(AppCardBrief & { variant: CardVariant })[]>([]);
  const [masterPickerLoading, setMasterPickerLoading] = useState(false);
  const [setNamesById, setSetNamesById] = useState<Record<string, string>>({});
  const [userOverrideUris, setUserOverrideUris] = useState<Record<string, string>>({});
  const [localRemovedSet, setLocalRemovedSet] = useState<Set<string>>(new Set());
  const [excludedVersionsSet, setExcludedVersionsSet] = useState<Set<string>>(new Set());
  const { isAdmin } = useIsAdmin(user);
  const [cardOverlay, setCardOverlay] = useState<{
    imageUri: string | null;
    cardName: string;
    setLabel: string;
    collectorNumber: string;
    cardId?: string;
    pokemonName?: string;
    slotKey?: string;
    variant?: CardVariant;
  } | null>(null);
  const [addUserCardVisible, setAddUserCardVisible] = useState(false);
  const [addUserCardName, setAddUserCardName] = useState('');
  const [addUserCardSetName, setAddUserCardSetName] = useState('');
  const [addUserCardImageUri, setAddUserCardImageUri] = useState<string | null>(null);
  const [addingUserCard, setAddingUserCard] = useState(false);
  const [globalSlots, setGlobalSlots] = useState<Slot[] | null>(null);

  const openCardOverlay = useCallback(
    (data: {
      imageUri: string | null;
      cardName: string;
      setLabel: string;
      collectorNumber: string;
      cardId?: string;
      pokemonName?: string;
      slotKey?: string;
      variant?: CardVariant;
    }) => setCardOverlay(data),
    []
  );
  const closeCardOverlay = useCallback(() => setCardOverlay(null), []);

  const handleUploadCardImage = useCallback(async (cardId: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photos to add a card image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2.5, 3.5],
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    try {
      const localUri = await setOverride(cardId, result.assets[0].uri, 'user');
      setUserOverrideUris((prev) => ({ ...prev, [cardId]: localUri }));
    } catch (e) {
      Alert.alert('Error', 'Could not save image. Try again.');
    }
  }, []);

  const handleAddUserCard = useCallback(async () => {
    if (!id || !collection) return;
    const name = addUserCardName.trim();
    if (!name) {
      Alert.alert('Enter a name', 'Card name is required.');
      return;
    }
    const setName = addUserCardSetName.trim() || 'Custom';
    setAddingUserCard(true);
    try {
      const cardId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      let savedImageUri: string | null = null;
      if (addUserCardImageUri) {
        try {
          savedImageUri = await setOverride(cardId, addUserCardImageUri, 'user');
        } catch {
          // Storage not available (e.g. on web) – add card without image
        }
      }
      await setSlot(id, cardId, { cardId, variant: 'normal' });
      await updateCollection(id, {
        userCards: {
          ...(collection.userCards ?? {}),
          [cardId]: { name, setName },
        },
      });
      setAddUserCardVisible(false);
      setAddUserCardName('');
      setAddUserCardSetName('');
      setAddUserCardImageUri(null);
      const uriToShow = savedImageUri ?? addUserCardImageUri;
      if (uriToShow) {
        setUserOverrideUris((prev) => ({ ...prev, [cardId]: uriToShow }));
      }
      const list = await loadCollections();
      void refreshCollectionsCache(list);
      const updated = list.find((c) => c.id === id);
      if (updated) setCollection(updated);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not add card.');
    } finally {
      setAddingUserCard(false);
    }
  }, [id, collection, addUserCardName, addUserCardSetName, addUserCardImageUri]);

  const pickUserCardImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photos to choose an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2.5, 3.5],
      quality: 0.9,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setAddUserCardImageUri(result.assets[0].uri);
    }
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setCardsLoadError(null);
    const cached = getCollectionByIdFromCache(id);
    if (cached) {
      setCollection(cached);
      setEditingName(cached.name ?? '');
      setLoading(false);
    }
    try {
      const list = await loadCollections();
      void refreshCollectionsCache(list);
      const coll = list.find((c) => c.id === id) ?? null;
      setCollection(coll);
      setEditingName(coll?.name ?? '');
      let releaseDateBySetId: Record<string, string> = {};
      try {
        const sets = await getSetsWithCache();
        const map: Record<string, string> = {};
        for (const s of sets) {
          map[s.id] = s.name;
          if (s.releaseDate) releaseDateBySetId[s.id] = s.releaseDate;
        }
        setSetNamesById(map);
      } catch {
        setSetNamesById({});
      }
      const pocketSetIds = await getPocketSetIds();
      const pocketSet = new Set(pocketSetIds);
      if (coll) {
        const overrides: Record<string, string> = {};
        for (const s of coll.slots ?? []) {
          if (s.key.startsWith('user-') && s.card) {
            try {
              const uri = await getAnyOverrideUri(s.card.cardId);
              if (uri) overrides[s.card.cardId] = uri;
            } catch {
              // ignore
            }
          }
        }
        setUserOverrideUris((prev) => ({ ...prev, ...overrides }));
        const [localRemoved, excluded] = await Promise.all([
          getLocalRemovedSlotKeys(id),
          getExcludedCardVersions(),
        ]);
        setLocalRemovedSet(localRemoved);
        setExcludedVersionsSet(excluded);
      }

      if (coll?.type === 'collect_them_all' || coll?.type === 'master_set' || coll?.type === 'master_dex') {
      try {
        const [base, customCards, overrides] = await Promise.all([
          getSpeciesWithCache(),
          getCustomCards(),
          getDefaultCardOverrides(),
        ]);
        setDefaultCardOverrides(overrides);
        const species: MasterListEntry[] =
          coll.type === 'master_set' || coll.type === 'master_dex'
            ? getExpandedSpeciesList(base, coll.masterSetOptions)
            : base;
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
          if (a.dexId !== b.dexId) return a.dexId - b.dexId;
          return aKey.localeCompare(bKey, undefined, { numeric: true });
        });
        setPokemonList(merged);
      } catch {
        setPokemonList([]);
        setDefaultCardOverrides({});
        setCardsLoadError('Could not load Pokémon list.');
      }
    } else if (coll?.type === 'by_set' && coll.setId) {
      if (pocketSet.has(coll.setId)) {
        setSetCards([]);
        setSetExpectedTotal(0);
        setCardsLoadError('This set is not available.');
      } else {
      try {
        const setData = await getSetWithCache(coll.setId, LANG);
        const cards = setData.cards ?? [];
        type SetCardWithVariant = AppCardBrief & { variant: CardVariant };
        const expanded: SetCardWithVariant[] = [];
        for (let i = 0; i < cards.length; i += 50) {
          const batch = cards.slice(i, i + 50);
          const ids = batch.map((c) => c.id);
          const fullCards = await getCardsFull(LANG, ids);
          for (const full of fullCards) {
            if (!full?.variants) continue;
            const fromDisplay = getDisplayVariants(full);
            const displayVariants = filterVariantsBySetCardCount(fromDisplay, setData.cardCount);
            const variants = filterVariantsByEdition(displayVariants, coll.editionFilter);
            // #region agent log
            if (full.variants.holo === true && variants.length !== 3) {
              fetch('http://127.0.0.1:7774/ingest/2c6726e5-47ef-4e43-8edf-38efd07b03fd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c966b'},body:JSON.stringify({sessionId:'5c966b',hypothesisId:'H5',location:'binder/[id].tsx:by_set',message:'Rare/evo card has holo but final variants not 3',data:{cardName:full.name,cardId:full.id,fromDisplay,variantsAfterSetFilter:displayVariants,variantsFinal:variants,setCardCount:setData.cardCount ? JSON.stringify(setData.cardCount) : null},timestamp:Date.now()})}).catch(()=>{});
            }
            // #endregion
            if (variants.length === 0) continue;
            const brief = {
              id: full.id,
              name: full.name,
              localId: full.localId,
              image: normalizeTcgdexImageUrl(full.image) ?? (full.image ?? null),
            };
            for (const variant of variants) {
              expanded.push({ ...brief, variant });
            }
          }
        }
        setSetExpectedTotal(expanded.length);
        setSetCards(expanded);
        if (cards.length === 0) void addExcludedSetId(coll.setId);
      } catch (e) {
        setSetCards([]);
        setSetExpectedTotal(0);
        setCardsLoadError('Could not load set cards. Tap to retry.');
      }
      }
    } else if (coll?.type === 'single_pokemon' && coll.singlePokemonName) {
      const langs = coll.languages?.length ? coll.languages : ['en'];
      const includeRegional = coll.includeRegionalForms !== false;
      type PrintingWithVariant = AppCardBrief & { variant: CardVariant };
      const byLang: Record<string, PrintingWithVariant[]> = {};
      const toBriefWithImage = (c: { id: string; name: string; localId: string; image?: string | null; set?: { id: string; name?: string } }, langCode: TCGdexLang) => {
        const rawUrl = c.image ?? cardImageUrlFromId(langCode, c.id, c.localId);
        const image = normalizeTcgdexImageUrl(rawUrl) ?? rawUrl;
        const setId = c.set?.id ?? setIdFromCardId(c.id);
        return { id: c.id, name: c.name, localId: c.localId, image, set: { id: setId, name: c.set?.name } };
      };
      try {
        let species: Awaited<ReturnType<typeof getSpecies>> = null;
        if (coll.singlePokemonDexId != null && coll.singlePokemonDexId > 0) {
          try {
            species = await getSpecies(coll.singlePokemonDexId);
          } catch {
            species = null;
          }
        }
        const singleSummary: PokemonSummary = {
          dexId: coll.singlePokemonDexId ?? 0,
          name: coll.singlePokemonName ?? '',
          form: coll.singlePokemonName?.startsWith('Gigantamax ') ? 'gmax' : undefined,
        };
        for (const lang of langs as TCGdexLang[]) {
          try {
            const searchName = singleSummary.name && singleSummary.form
              ? getTcgSearchName(singleSummary)
              : (getSpeciesNameForLang(species, lang) ?? coll.singlePokemonName!);
            let briefs = await getCardsByName(lang, searchName, { exact: !includeRegional });
            let fullCardsFromFallback: Awaited<ReturnType<typeof getCard>>[] | null = null;
            // PokeAPI has no Thai (and some other langs); we fall back to English name so name search returns [].
            // Resolve via English: get card IDs from EN, then fetch each card in target language (same IDs).
            if ((briefs ?? []).length === 0 && lang !== 'en' && searchName) {
              const enBriefs = await getCardsByName('en', searchName, { exact: !includeRegional });
              const cardIds = (enBriefs ?? []).map((c) => c.id);
              const fullInLang: (Awaited<ReturnType<typeof getCard>> | null)[] = [];
              for (let i = 0; i < cardIds.length; i += 50) {
                const batch = cardIds.slice(i, i + 50);
                const results = await Promise.all(batch.map((id) => getCard(lang, id).catch(() => null)));
                fullInLang.push(...results);
              }
              fullCardsFromFallback = fullInLang.filter((c): c is NonNullable<typeof c> => c != null);
              briefs = fullCardsFromFallback.map((full) => ({
                id: full.id,
                name: full.name,
                localId: full.localId,
                image: full.image ?? undefined,
                set: full.set ? { id: full.set.id, name: full.set.name } : undefined,
              }));
            }
            const expanded: PrintingWithVariant[] = [];
            if (fullCardsFromFallback && fullCardsFromFallback.length > 0) {
              for (const full of fullCardsFromFallback) {
                if (!full?.variants) continue;
                const variants = filterVariantsByEdition(getDisplayVariants(full), coll.editionFilter);
                if (variants.length === 0) continue;
                const brief = toBriefWithImage(full, lang);
                for (const variant of variants) {
                  expanded.push({ ...brief, variant });
                }
              }
            } else {
              const cardIds = (briefs ?? []).map((c) => c.id);
              for (let i = 0; i < cardIds.length; i += 50) {
                const batch = cardIds.slice(i, i + 50);
                const fullCards = await getCardsFull(lang, batch);
                for (const full of fullCards) {
                  if (!full?.variants) continue;
                  const variants = filterVariantsByEdition(getDisplayVariants(full), coll.editionFilter);
                  if (variants.length === 0) continue;
                  const brief = toBriefWithImage(full, lang);
                  for (const variant of variants) {
                    expanded.push({ ...brief, variant });
                  }
                }
              }
            }
            byLang[lang] = expanded;
          } catch {
            byLang[lang] = [];
          }
        }
        // Exclude cards from Pokémon TCG Pocket sets
        for (const lang of Object.keys(byLang)) {
          byLang[lang] = byLang[lang].filter(
            (p) => !pocketSet.has(p.set?.id ?? setIdFromCardId(p.id))
          );
        }
        // Sort each language's printings by set release date (oldest first), then by card id
        for (const lang of Object.keys(byLang)) {
          byLang[lang].sort((a, b) => {
            const setIdA = a.set?.id ?? setIdFromCardId(a.id);
            const setIdB = b.set?.id ?? setIdFromCardId(b.id);
            const dateA = releaseDateBySetId[setIdA] ?? '9999-12-31';
            const dateB = releaseDateBySetId[setIdB] ?? '9999-12-31';
            if (dateA !== dateB) return dateA.localeCompare(dateB);
            return a.id.localeCompare(b.id);
          });
        }
        setPrintingsByLang(byLang);
        setCardsLoadError(null);
      } catch {
        setPrintingsByLang({});
        setCardsLoadError('Could not load cards. Tap to retry.');
      }
    }
    if (coll?.type === 'by_set' && coll.setId) {
      getGlobalBinderSlots(globalKeyBySet(coll.setId)).then((s) => setGlobalSlots(s ?? null));
    } else if (coll?.type === 'single_pokemon' && coll.singlePokemonName) {
      getGlobalBinderSlots(globalKeySinglePokemon(coll.singlePokemonName)).then((s) => setGlobalSlots(s ?? null));
    } else {
      setGlobalSlots(null);
    }
    } catch {
      setCollection(null);
      setCardsLoadError("Couldn't load this binder. Tap to retry.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  useEffect(() => {
    const isMaster =
      collection?.type === 'collect_them_all' ||
      collection?.type === 'master_set' ||
      collection?.type === 'master_dex';
    if (!isMaster || visibleSlotKeys.length === 0) return;
    const pokemonBySlotKey = new Map(pokemonList.map((p) => [getSlotKeyForEntry(p), p]));
    const batch = visibleSlotKeys.slice(0, 24);
    const overrides = defaultCardOverrides;
    let cancelled = false;
    (async () => {
      for (const slotKey of batch) {
        if (cancelled) return;
        const item = pokemonBySlotKey.get(slotKey);
        if (!item) continue;
        const slotCard = collection ? getSlotCard(effectiveCollection, slotKey) : null;
        if (slotCard) {
          if (cardImageCache[slotCard.cardId]) continue;
          const customCard = customCardByCardId[slotCard.cardId];
          if (customCard?.image) {
            setCardImageCache((prev) => ({ ...prev, [slotCard.cardId]: customCard.image! }));
            continue;
          }
          try {
            const card = await getCard(LANG, slotCard.cardId);
            if (!cancelled && card?.image) {
              const uri = normalizeTcgdexImageUrl(card.image) ?? card.image;
              setCardImageCache((prev) => ({ ...prev, [slotCard.cardId]: uri }));
            }
          } catch {
            /* ignore */
          }
        } else {
          if (firstPrintingCache[slotKey]) continue;
          const isCustom = 'type' in item && item.type === 'custom';
          let didSet = false;
          if (isCustom && item.card.image) {
            setFirstPrintingCache((prev) => ({ ...prev, [slotKey]: item.card.image! }));
            didSet = true;
          }
          if (!didSet && overrides[slotKey]) {
            try {
              const card = await getCard(LANG, overrides[slotKey]);
              if (!cancelled && card?.image) {
                const uri = normalizeTcgdexImageUrl(card.image) ?? card.image;
                setFirstPrintingCache((prev) => ({ ...prev, [slotKey]: uri }));
                didSet = true;
              }
            } catch {
              /* fall through to search */
            }
          }
          if (!didSet && !isCustom) {
            try {
              const searchName = getTcgSearchName(item);
              const cards = await getCardsByName(LANG, searchName, { exact: false });
              const pocketIds = await getPocketSetIds();
              const pocketSet = new Set(pocketIds);
              const filtered = cards.filter((c) => !pocketSet.has(setIdFromCardId(c.id)));
              const sorted = [...filtered].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
              const firstWithImage = sorted.find((c) => c.image);
              if (!cancelled && firstWithImage?.image) {
                const uri = normalizeTcgdexImageUrl(firstWithImage.image) ?? firstWithImage.image;
                setFirstPrintingCache((prev) => ({ ...prev, [slotKey]: uri }));
              }
            } catch {
              /* ignore */
            }
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [collection?.type, collection?.slots, visibleSlotKeys, pokemonList, defaultCardOverrides, customCardByCardId, cardImageCache, firstPrintingCache]);

  useEffect(() => {
    const isMasterType = collection?.type === 'collect_them_all' || collection?.type === 'master_set' || collection?.type === 'master_dex';
    if (!isMasterType || pokemonList.length === 0) return;
    const filtered = filter
      ? pokemonList.filter(
          (p) =>
            p.name.toLowerCase().includes(filter.toLowerCase()) ||
            String(p.dexId).includes(filter)
        )
      : pokemonList;
    setVisibleSlotKeys(filtered.slice(0, 18).map((p) => getSlotKeyForEntry(p)));
  }, [collection?.type, pokemonList, filter]);

  const saveBinderName = useCallback(async () => {
    if (!id || !collection) return;
    const defaultName =
      collection.type === 'collect_them_all' ? 'Collect Them All'
        : collection.type === 'master_set' || collection.type === 'master_dex' ? 'Master Set'
          : collection.singlePokemonName ?? collection.setName ?? 'Binder';
    const name = editingName.trim() || defaultName;
    if (name === collection.name) return;
    const updated = await updateCollection(id, { name });
    if (updated) setCollection(updated);
  }, [id, collection, editingName]);

  const handleCardPress = useCallback(
    async (
      type: Collection['type'],
      slotKey: string,
      cardId: string | null,
      pokemonName?: string,
      variant?: CardVariant
    ) => {
      if (!id || !collection) return;
      if (type === 'single_pokemon' || type === 'by_set') {
        if (!isEditMode) {
          Alert.alert(
            'View only',
            'Open this binder from Edit collections to add or change cards.',
            [{ text: 'OK' }]
          );
          return;
        }
        const effectiveSlots =
          (collection.type === 'by_set' || collection.type === 'single_pokemon') && globalSlots != null
            ? [...globalSlots, ...(collection.slots ?? []).filter((s) => s.key.startsWith('user-'))]
            : (collection.slots ?? []);
        const effectiveCollection = { ...collection, slots: effectiveSlots };
        const slotCard = getSlotCard(effectiveCollection, slotKey);
        const isCollected = !!slotCard;
        const updated = await setSlot(
          id,
          slotKey,
          isCollected ? null : { cardId: cardId ?? slotKey, variant: variant ?? 'normal' }
        );
        if (updated) setCollection(updated);
        return;
      }
      if (
        (type === 'collect_them_all' || type === 'master_set' || type === 'master_dex') &&
        pokemonName != null &&
        slotKey != null
      ) {
        const entry = pokemonList.find((p) => getSlotKeyForEntry(p) === slotKey);
        const customCard = entry && 'type' in entry && entry.type === 'custom' ? entry.card : undefined;
        setMasterPickerPokemon({ slotKey, name: pokemonName, customCard });
        setMasterPickerVisible(true);
        setMasterPickerCards([]);
        setMasterPickerLoading(true);
      }
    },
    [id, collection, isEditMode, pokemonList, globalSlots]
  );

  const handleLongPressCard = useCallback(
    (slotKey: string, cardId: string, variant: CardVariant) => {
      if (!id) return;
      const versionKey = cardVersionKey(cardId, variant);
      const buttons: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[] = [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove from binder (local)',
          onPress: async () => {
            await addLocalRemovedSlot(id, slotKey);
            setLocalRemovedSet((prev) => new Set(prev).add(slotKey));
          },
        },
      ];
      if (isAdmin) {
        buttons.push({
          text: 'Remove for all users (admin)',
          style: 'destructive',
          onPress: async () => {
            await addExcludedCardVersion(cardId, variant);
            setExcludedVersionsSet((prev) => new Set(prev).add(versionKey));
            const updated = await setSlot(id, slotKey, null);
            if (updated) setCollection(updated);
          },
        });
      }
      Alert.alert(
        'Remove card version',
        'Remove this version from your binder (local only), or remove it for all users (admin).',
        buttons
      );
    },
    [id, isAdmin]
  );

  const openMasterPickerFromOverlay = useCallback(() => {
    if (cardOverlay?.pokemonName != null && cardOverlay?.slotKey != null) {
      const entry = pokemonList.find((p) => getSlotKeyForEntry(p) === cardOverlay.slotKey);
      const customCard = entry && 'type' in entry && entry.type === 'custom' ? entry.card : undefined;
      setMasterPickerPokemon({ slotKey: cardOverlay.slotKey, name: cardOverlay.pokemonName, customCard });
      setMasterPickerVisible(true);
      setMasterPickerCards([]);
      setMasterPickerLoading(true);
      closeCardOverlay();
    }
  }, [cardOverlay, closeCardOverlay, pokemonList]);

  const closeMasterPicker = useCallback(() => {
    setMasterPickerVisible(false);
    setMasterPickerPokemon(null);
    setMasterPickerCards([]);
  }, []);

  const onMasterPickCard = useCallback(
    async (cardId: string, variant: CardVariant) => {
      if (!id || !masterPickerPokemon) return;
      const updated = await setSlot(id, masterPickerPokemon.slotKey, {
        cardId,
        variant,
      });
      if (updated) setCollection(updated);
      closeMasterPicker();
    },
    [id, masterPickerPokemon, closeMasterPicker]
  );

  useEffect(() => {
    if (!masterPickerVisible || !masterPickerPokemon || !collection) return;
    const customCard = masterPickerPokemon.customCard;
    if (customCard) {
      const editionFilter = collection.type === 'master_set' || collection.type === 'master_dex' ? collection.editionFilter : undefined;
      const variants = filterVariantsByEdition(getDisplayVariants({ name: customCard.name, variants: customCard.variants }), editionFilter);
      const expanded: (AppCardBrief & { variant: CardVariant })[] = variants.map((variant) => ({
        id: customCard.id,
        name: customCard.name,
        localId: customCard.localId,
        image: customCard.image,
        set: { id: customCard.setId, name: customCard.setName },
        variant,
      }));
      setMasterPickerCards(expanded);
      setMasterPickerLoading(false);
      return;
    }
    const langs = (collection.type === 'master_set' || collection.type === 'master_dex')
      ? (collection.languages?.length ? collection.languages as TCGdexLang[] : ['en'])
      : ['en'];
    const dexId = masterPickerPokemon.slotKey.includes('-')
      ? parseInt(masterPickerPokemon.slotKey.split('-')[0], 10)
      : parseInt(masterPickerPokemon.slotKey, 10);
    const numericDexId = Number.isNaN(dexId) ? undefined : dexId;
    let cancelled = false;
    (async () => {
      try {
        // TCGdex uses different set IDs per language (e.g. ja has S12, en has base1). Search by localized name per language.
        const species = numericDexId != null ? await getSpecies(numericDexId) : null;
        const toBrief = (c: { id: string; name: string; localId: string; image?: string | null; set?: { id: string; name?: string } }, langCode: TCGdexLang) => ({
          ...toAppCardBrief(c),
          image: normalizeTcgdexImageUrl(c.image) ?? (c.image ?? null),
          set: { id: c.set?.id ?? setIdFromCardId(c.id), name: c.set?.name },
        });
        const combined: { brief: AppCardBrief; lang: TCGdexLang }[] = [];
        const isForm = masterPickerPokemon.slotKey.includes('-');
        const formPart = isForm ? masterPickerPokemon.slotKey.split('-').slice(1).join('-') : undefined;
        const pickerSummary: PokemonSummary = { dexId: numericDexId ?? 0, name: masterPickerPokemon.name, form: formPart };
        for (const lang of langs) {
          const searchName = isForm ? getTcgSearchName(pickerSummary) : (getSpeciesNameForLang(species, lang) ?? masterPickerPokemon.name);
          let cards = await getCardsByName(lang, searchName, { exact: false });
          // PokeAPI has no Thai etc.; name search returns []. Resolve via English card IDs.
          if ((cards ?? []).length === 0 && lang !== 'en' && searchName) {
            const enCards = await getCardsByName('en', searchName, { exact: false });
            const ids = (enCards ?? []).map((c) => c.id);
            const fullInLang: (Awaited<ReturnType<typeof getCard>> | null)[] = [];
            for (let i = 0; i < ids.length; i += 50) {
              const batch = ids.slice(i, i + 50);
              const results = await Promise.all(batch.map((id) => getCard(lang, id).catch(() => null)));
              fullInLang.push(...results);
            }
            cards = fullInLang
              .filter((c): c is NonNullable<typeof c> => c != null)
              .map((c) => ({ id: c.id, name: c.name, localId: c.localId, image: c.image ?? null, set: c.set }));
          }
          for (const c of cards ?? []) {
            combined.push({ brief: toBrief(c, lang), lang });
          }
        }
        const pocketIds = await getPocketSetIds();
        const pocketSet = new Set(pocketIds);
        const filteredCombined = combined.filter(
          ({ brief }) => !pocketSet.has(brief.set?.id ?? setIdFromCardId(brief.id))
        );
        // Fetch full card details per language (card IDs are language-specific, e.g. zh-tw vs en).
        const variantsById: Record<string, CardVariant[]> = {};
        const editionFilter = collection.type === 'master_set' || collection.type === 'master_dex' ? collection.editionFilter : undefined;
        const idsByLang: Record<string, string[]> = {};
        for (const { brief, lang } of filteredCombined) {
          const key = lang;
          if (!idsByLang[key]) idsByLang[key] = [];
          if (!idsByLang[key].includes(brief.id)) idsByLang[key].push(brief.id);
        }
        for (const lang of Object.keys(idsByLang) as TCGdexLang[]) {
          const ids = idsByLang[lang];
          for (let i = 0; i < ids.length; i += 50) {
            const batch = ids.slice(i, i + 50);
            const fullCards = await getCardsFull(lang, batch);
            for (const full of fullCards) {
              if (full?.variants) variantsById[full.id] = filterVariantsByEdition(getDisplayVariants(full), editionFilter);
            }
          }
        }
        const expanded: (AppCardBrief & { variant: CardVariant })[] = [];
        for (const { brief } of filteredCombined) {
          const variants = variantsById[brief.id] ?? ['normal'];
          if (variants.length === 0) continue;
          for (const variant of variants) {
            expanded.push({ ...brief, variant });
          }
        }
        if (!cancelled) setMasterPickerCards(expanded);
      } catch {
        if (!cancelled) setMasterPickerCards([]);
      }
      if (!cancelled) setMasterPickerLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [masterPickerVisible, masterPickerPokemon, collection?.type, collection?.languages]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: PokemonSummary }> }) => {
      setVisibleSlotKeys(viewableItems.map((v) => getSlotKeyForEntry(v.item)));
    },
    []
  );
  const handleDeleteBinder = useCallback(() => {
    if (!id || !collection) return;
    const label = getCollectionDisplayName(collection);
    Alert.alert(
      'Delete binder',
      `Remove "${label}"? Your collected cards will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCollection(id);
            router.replace('/(tabs)/binder');
          },
        },
      ]
    );
  }, [id, collection, router]);

  const navigation = useNavigation();

  useLayoutEffect(() => {
    const canDelete =
      collection?.type === 'collect_them_all' ||
      collection?.type === 'single_pokemon' ||
      collection?.type === 'master_set' ||
      collection?.type === 'master_dex' ||
      collection?.type === 'by_set';
    const showCardView =
      collection?.type === 'collect_them_all' ||
      collection?.type === 'master_set' ||
      collection?.type === 'master_dex' ||
      collection?.type === 'single_pokemon' ||
      collection?.type === 'by_set';
    if (showCardView) {
      navigation.setOptions({
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ViewModeToggle mode={viewMode} onToggle={setViewMode} />
            {isEditMode && canDelete && (
              <Pressable
                onPress={handleDeleteBinder}
                style={({ pressed }) => [{ padding: 12, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            )}
          </View>
        ),
      });
    } else {
      navigation.setOptions({ headerRight: undefined });
    }
  }, [isEditMode, collection?.type, handleDeleteBinder, navigation, viewMode, setViewMode]);

  /** Variants that actually exist per card (from API). Must run on every render (before any return) to satisfy rules of hooks. */
  const validVariantsByCardId = useMemo(() => {
    const m: Record<string, Set<CardVariant>> = {};
    if (collection?.type === 'by_set' && setCards.length) {
      for (const c of setCards) {
        if (!m[c.id]) m[c.id] = new Set();
        m[c.id].add(c.variant);
      }
    }
    if (collection?.type === 'single_pokemon') {
      for (const list of Object.values(printingsByLang)) {
        for (const c of list) {
          if (!m[c.id]) m[c.id] = new Set();
          m[c.id].add(c.variant);
        }
      }
    }
    return m;
  }, [collection?.type, setCards, printingsByLang]);

  if (!id || loading) {
    return (
      <View style={styles.screenRoot}>
        <SyncLoadingScreen statusText="Loading binder..." />
      </View>
    );
  }

  if (!collection) {
    return (
      <View style={styles.screenRoot}>
        <View style={styles.screenFill} />
        <View style={styles.centered}>
          <Text style={styles.fallbackText}>{cardsLoadError ?? 'Binder not found.'}</Text>
          <Pressable style={({ pressed }) => [styles.seedButton, pressed && styles.rowPressed]} onPress={() => void load()}>
            <Text style={styles.seedButtonText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const effectiveSlots =
    (collection.type === 'by_set' || collection.type === 'single_pokemon') && globalSlots != null
      ? [...globalSlots, ...(collection.slots ?? []).filter((s) => s.key.startsWith('user-'))]
      : (collection.slots ?? []);
  const displaySlots = effectiveSlots.map((s) => {
    if (localRemovedSet.has(s.key)) return { ...s, card: null as SlotCard | null };
    if (s.card && excludedVersionsSet.has(cardVersionKey(s.card.cardId, s.card.variant))) return { ...s, card: null as SlotCard | null };
    return s;
  });
  const effectiveCollection = { ...collection, slots: displaySlots };

  const isMasterCollection =
    collection.type === 'collect_them_all' ||
    collection.type === 'master_set' ||
    collection.type === 'master_dex';
  if (isMasterCollection) {
    const userEntries: MasterListEntry[] = (effectiveCollection.slots ?? [])
      .filter((s): s is typeof s & { card: NonNullable<typeof s.card> } => s.key.startsWith('user-') && !!s.card)
      .map((s) => ({
        type: 'user' as const,
        slotKey: s.key,
        name: collection.userCards?.[s.card.cardId]?.name ?? 'Custom card',
        cardId: s.card.cardId,
      }));
    const fullList: MasterListEntry[] = [...pokemonList, ...userEntries];
    const filtered = filter
      ? fullList.filter((p) => {
          const name = 'name' in p ? p.name : '';
          const dexId = 'dexId' in p ? String((p as { dexId?: number }).dexId) : '';
          const q = filter.toLowerCase();
          return name.toLowerCase().includes(q) || dexId.includes(filter);
        })
      : fullList;
    const filledCount = effectiveCollection.slots.filter((s) => s.card).length;
    const totalCount = pokemonList.length;
    const progressPct = totalCount > 0 ? filledCount / totalCount : 0;

    return (
      <View style={styles.screenRoot}>
        <View style={styles.screenFill} />
        <View style={styles.container}>
        <View style={styles.topSection}>
          <View style={styles.nameRowWithAction}>
            <View style={styles.nameRowBlock}>
              <Text style={styles.nameRowLabel}>Collection name</Text>
              {isEditMode ? (
                <TextInput
                  style={styles.nameInput}
                  placeholder={getCollectionDisplayName(collection)}
                  placeholderTextColor="#888"
                  value={editingName}
                  onChangeText={setEditingName}
                  onBlur={saveBinderName}
                  cursorColor="#e8e8e8"
                  selectionColor="rgba(255,255,255,0.2)"
                />
              ) : (
                <Text style={styles.nameDisplay}>{collection.name}</Text>
              )}
            </View>
            {isEditMode && (
              <Pressable
                style={({ pressed }) => [styles.addUserCardBtn, pressed && styles.rowPressed]}
                onPress={() => setAddUserCardVisible(true)}
              >
                <Text style={styles.addUserCardBtnText}>Add a missing card</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.nameSubtitle}>{getCollectionSubtitle(collection)}</Text>
          <Text style={styles.ctaProgressLabel}>Progress</Text>
          <View style={styles.progressBarOuter}>
            <View style={[styles.progressBarFill, { width: `${progressPct * 100}%` }]} />
          </View>
          <Text style={styles.ctaProgressText}>{filledCount}/{totalCount}</Text>
        </View>
        <TextInput
          style={styles.search}
          placeholder="Search Pokémon..."
          placeholderTextColor="#888"
          value={filter}
          onChangeText={setFilter}
        />
        {viewMode === 'list' ? (
          <FlatList
            data={filtered}
            style={styles.listFill}
            keyExtractor={(item) => getSlotKeyForEntry(item)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const slotKey = getSlotKeyForEntry(item);
              const slotCard = getSlotCard(effectiveCollection, slotKey);
              const isUserCard = slotKey.startsWith('user-');
              const isCollected = !!slotCard;
              const setLabel = slotCard
                ? (collection.userCards?.[slotCard.cardId]?.setName ?? customCardByCardId[slotCard.cardId]?.setName ?? getSetDisplayName(setIdFromCardId(slotCard.cardId), setNamesById))
                : NO_VERSION_SELECTED;
              const collectorNum = slotCard
                ? (isUserCard ? '—' : (customCardByCardId[slotCard.cardId]?.localId ?? collectorNumberFromCardId(slotCard.cardId)))
                : NO_VERSION_SELECTED;
              const displayVariant =
                slotCard?.variant && validVariantsByCardId[slotCard.cardId] && !validVariantsByCardId[slotCard.cardId].has(slotCard.variant)
                  ? 'normal'
                  : (slotCard?.variant ?? 'normal');
              const variantLabel = displayVariant !== 'normal' ? ` • ${getVariantLabel(displayVariant)}` : '';
              return (
                <Pressable
                  style={({ pressed }) => [styles.listRow, pressed && styles.rowPressed]}
                  onPress={() => {
                    const imageUri = slotCard ? (isUserCard ? userOverrideUris[slotCard.cardId] : cardImageCache[slotCard.cardId]) : firstPrintingCache[slotKey];
                    openCardOverlay({
                      imageUri: imageUri ?? null,
                      cardName: item.name,
                      setLabel,
                      collectorNumber: collectorNum,
                      cardId: slotCard?.cardId,
                      pokemonName: item.name,
                      slotKey,
                      variant: displayVariant,
                    });
                  }}
                  onLongPress={() => slotCard && handleLongPressCard(slotKey, slotCard.cardId, slotCard.variant)}
                >
                  <Text style={styles.listRowName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.listRowMeta} numberOfLines={1}>
                    {setLabel}{collectorNum !== NO_VERSION_SELECTED ? ` #${collectorNum}` : ''}{variantLabel}
                  </Text>
                  <View style={styles.listRowRight}>
                    {isCollected ? <Text style={styles.listRowCheck}>✓</Text> : <View style={styles.listRowEmpty} />}
                  </View>
                </Pressable>
              );
            }}
          />
        ) : (
        <FlatList
          data={filtered}
          numColumns={3}
          style={styles.listFill}
          keyExtractor={(item) => getSlotKeyForEntry(item)}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item }) => {
            const slotKey = getSlotKeyForEntry(item);
            const slotCard = getSlotCard(effectiveCollection, slotKey);
            const isUserCard = slotKey.startsWith('user-');
            const imageUri = slotCard
              ? (isUserCard ? userOverrideUris[slotCard.cardId] : cardImageCache[slotCard.cardId])
              : firstPrintingCache[slotKey];
            const isCollected = !!slotCard;
            const setLabel = slotCard
              ? (collection.userCards?.[slotCard.cardId]?.setName ?? customCardByCardId[slotCard.cardId]?.setName ?? getSetDisplayName(setIdFromCardId(slotCard.cardId), setNamesById))
              : NO_VERSION_SELECTED;
            const collectorNum = slotCard
              ? (isUserCard ? '—' : (customCardByCardId[slotCard.cardId]?.localId ?? collectorNumberFromCardId(slotCard.cardId)))
              : NO_VERSION_SELECTED;
            const displayUri = imageUri ? (normalizeTcgdexImageUrl(imageUri) ?? imageUri) : (isUserCard ? null : null);
            const displayVariant =
              slotCard?.variant && validVariantsByCardId[slotCard.cardId] && !validVariantsByCardId[slotCard.cardId].has(slotCard.variant)
                ? 'normal'
                : (slotCard?.variant ?? 'normal');
            const variantLabelRibbon = displayVariant !== 'normal' ? ` • ${getVariantLabel(displayVariant)}` : '';
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.gridCell,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => {
                  openCardOverlay({
                    imageUri: displayUri,
                    cardName: item.name,
                    setLabel,
                    collectorNumber: collectorNum,
                    cardId: slotCard?.cardId,
                    pokemonName: item.name,
                    slotKey,
                    variant: displayVariant,
                  });
                }}
                onLongPress={() => slotCard && handleLongPressCard(slotKey, slotCard.cardId, slotCard.variant)}
              >
                <View style={styles.gridCardInner}>
                  <CachedImage
                    remoteUri={displayUri}
                    style={[styles.gridCardImage, !isCollected && styles.gridCardImageUnselected]}
                    resizeMode="contain"
                    cardId={slotCard?.cardId}
                    overrideUri={slotCard ? userOverrideUris[slotCard.cardId] : undefined}
                    onUploadImage={slotCard ? handleUploadCardImage : undefined}
                  />
                  <View style={styles.cardRibbon} pointerEvents="none">
                    <Text style={styles.cardRibbonText} numberOfLines={2}>
                      {setLabel}{collectorNum !== NO_VERSION_SELECTED ? ` • #${collectorNum}` : ''}{variantLabelRibbon}
                    </Text>
                  </View>
                  {!isCollected && <View style={styles.gridCardGreyscaleOverlay} pointerEvents="none" />}
                </View>
              </Pressable>
            );
          }}
        />
        )}
        <Modal
          visible={!!cardOverlay}
          transparent
          animationType="fade"
          onRequestClose={closeCardOverlay}
        >
          <Pressable style={styles.masterPickerBackdrop} onPress={closeCardOverlay}>
            <Pressable style={styles.cardOverlayContent} onPress={(e) => e.stopPropagation()}>
              {cardOverlay && (
                <>
                  <View style={styles.cardOverlayCardRow}>
                    <View style={styles.cardOverlayCardWrap}>
                      {cardOverlay.imageUri ? (
                        <CachedImage
                          remoteUri={cardOverlay.imageUri}
                          style={styles.cardOverlayImage}
                          resizeMode="contain"
                          cardId={cardOverlay.cardId}
                          overrideUri={cardOverlay.cardId ? userOverrideUris[cardOverlay.cardId] : undefined}
                        />
                      ) : (
                        <View style={styles.cardOverlayPlaceholder} />
                      )}
                    </View>
                  </View>
                  <View style={styles.cardOverlayInfoBox}>
                    <View style={styles.cardOverlayInfo}>
                      <Text style={styles.cardOverlayInfoTitle}>{cardOverlay.cardName}</Text>
                      <Text style={styles.cardOverlayInfoRow}>Set: {cardOverlay.setLabel}</Text>
                      <Text style={styles.cardOverlayInfoRow}>Collector #: {cardOverlay.collectorNumber}</Text>
                      {cardOverlay.variant != null && cardOverlay.variant !== 'normal' && (
                        <Text style={styles.cardOverlayInfoRow}>Variant: {getVariantLabel(cardOverlay.variant)}</Text>
                      )}
                    </View>
                    <View style={styles.cardOverlayActions}>
                      {isEditMode && cardOverlay.slotKey != null && cardOverlay.slotKey.startsWith('user-') && cardOverlay.cardId && (
                        <Pressable
                          style={({ pressed }) => [styles.cardOverlayChangeBtn, pressed && styles.rowPressed]}
                          onPress={() => { handleUploadCardImage(cardOverlay.cardId!); closeCardOverlay(); }}
                        >
                          <Text style={styles.cardOverlayChangeBtnText}>Change image</Text>
                        </Pressable>
                      )}
                      {isEditMode && cardOverlay.pokemonName != null && cardOverlay.slotKey != null && !cardOverlay.slotKey.startsWith('user-') && (
                        <Pressable
                          style={({ pressed }) => [styles.cardOverlayChangeBtn, pressed && styles.rowPressed]}
                          onPress={openMasterPickerFromOverlay}
                        >
                          <Text style={styles.cardOverlayChangeBtnText}>
                            {cardOverlay.collectorNumber === NO_VERSION_SELECTED ? 'Select version' : 'Change version'}
                          </Text>
                        </Pressable>
                      )}
                      <Pressable
                        style={({ pressed }) => [styles.cardOverlayCloseBtn, pressed && styles.rowPressed]}
                        onPress={closeCardOverlay}
                      >
                        <Text style={styles.cardOverlayCloseText}>Close</Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>
        <Modal visible={addUserCardVisible} transparent animationType="fade" onRequestClose={() => setAddUserCardVisible(false)}>
          <Pressable style={styles.masterPickerBackdrop} onPress={() => setAddUserCardVisible(false)}>
            <Pressable style={styles.masterPickerCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.masterPickerTitle}>Add a missing card</Text>
              <Text style={styles.addUserCardHint}>
                Add cards to your collection that aren’t in the app (e.g. promos or regional releases). Name, set, and image are stored only on this device.
              </Text>
              <TextInput
                style={styles.addUserCardInput}
                placeholder="Card name"
                placeholderTextColor="#888"
                value={addUserCardName}
                onChangeText={setAddUserCardName}
              />
              <TextInput
                style={styles.addUserCardInput}
                placeholder="Set name"
                placeholderTextColor="#888"
                value={addUserCardSetName}
                onChangeText={setAddUserCardSetName}
              />
              <Pressable style={styles.addUserCardImageBtn} onPress={pickUserCardImage}>
                {addUserCardImageUri ? (
                  <Image source={{ uri: addUserCardImageUri }} style={styles.addUserCardThumb} resizeMode="contain" />
                ) : (
                  <Text style={styles.addUserCardImageBtnText}>Pick image from device</Text>
                )}
              </Pressable>
              <View style={styles.modalButtons}>
                <Pressable style={({ pressed }) => [styles.cancelBtn, pressed && styles.rowPressed]} onPress={() => setAddUserCardVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.uploadBtn, pressed && styles.rowPressed, addingUserCard && styles.disabled]}
                  onPress={handleAddUserCard}
                  disabled={addingUserCard}
                >
                  {addingUserCard ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.uploadBtnText}>Add</Text>}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
        <Modal
          visible={masterPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={closeMasterPicker}
        >
          <Pressable style={styles.masterPickerBackdrop} onPress={closeMasterPicker}>
            <Pressable style={styles.masterPickerCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.masterPickerTitle}>
                Choose card for {masterPickerPokemon?.name ?? ''}
              </Text>
              <Text style={styles.masterPickerHint}>Tap one to set as collected</Text>
              {masterPickerLoading ? (
                <ActivityIndicator size="large" color="#fff" style={{ marginVertical: 24 }} />
              ) : (
                <ScrollView
                  style={styles.masterPickerScroll}
                  contentContainerStyle={styles.masterPickerScrollContent}
                  showsVerticalScrollIndicator
                >
                  <View style={styles.masterPickerGrid}>
                    {masterPickerCards
                      .filter((c) => !excludedVersionsSet.has(cardVersionKey(c.id, c.variant)))
                      .map((card) => {
                      const variantLabel = card.variant !== 'normal' ? ` • ${getVariantLabel(card.variant)}` : '';
                      return (
                        <Pressable
                          key={cardSlotKey(card.id, card.variant)}
                          style={({ pressed }) => [
                            styles.masterPickerCell,
                            pressed && styles.rowPressed,
                          ]}
                          onPress={() => onMasterPickCard(card.id, card.variant)}
                        >
                          <CachedImage
                            remoteUri={card.image ? (normalizeTcgdexImageUrl(card.image) ?? card.image) : null}
                            style={styles.masterPickerCardImage}
                            resizeMode="contain"
                            cardId={card.id}
                            overrideUri={userOverrideUris[card.id]}
                            onUploadImage={handleUploadCardImage}
                          />
                          <View style={styles.cardRibbon} pointerEvents="none">
                            <Text style={styles.cardRibbonText} numberOfLines={2}>
                              {getSetDisplayName(card.set?.id ?? setIdFromCardId(card.id), setNamesById)} • #{card.localId ?? collectorNumberFromCardId(card.id)}{variantLabel}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
              <Pressable
                style={({ pressed }) => [styles.masterPickerCloseBtn, pressed && styles.rowPressed]}
                onPress={closeMasterPicker}
              >
                <Text style={styles.masterPickerCloseText}>Cancel</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
        </View>
      </View>
    );
  }

  if (collection.type === 'single_pokemon') {
    const name = collection.singlePokemonName ?? collection.name;
    const langs = collection.languages?.length ? collection.languages : ['en'];
    const userEntriesSingle: { type: 'user'; slotKey: string; name: string; cardId: string }[] = (effectiveCollection.slots ?? [])
      .filter((s): s is typeof s & { card: NonNullable<typeof s.card> } => s.key.startsWith('user-') && !!s.card)
      .map((s) => ({
        type: 'user' as const,
        slotKey: s.key,
        name: collection.userCards?.[s.card.cardId]?.name ?? 'Custom card',
        cardId: s.card.cardId,
      }));
    const printingsFilteredByLang: Record<string, (AppCardBrief & { variant: CardVariant })[]> = {};
    for (const lang of langs) {
      const list = printingsByLang[lang] ?? [];
      printingsFilteredByLang[lang] = list.filter(
        (c) => !excludedVersionsSet.has(cardVersionKey(c.id, c.variant))
      );
    }
    const langSections: { title: string; lang: string; data: { lang: string; row: (AppCardBrief & { variant: CardVariant })[] }[] }[] = langs.map((lang) => ({
      title: LANGUAGE_OPTIONS.find((o) => o.id === lang)?.label ?? lang,
      lang,
      data: chunk(printingsFilteredByLang[lang] ?? [], 3).map((row) => ({ lang, row })),
    }));
    type UserRow = { lang: 'user'; row: { type: 'user'; slotKey: string; name: string; cardId: string }[] };
    const userSection = userEntriesSingle.length > 0
      ? [{ title: 'Your cards', lang: 'user' as const, data: chunk(userEntriesSingle, 3).map((row) => ({ lang: 'user' as const, row })) as UserRow['data'] }]
      : [];
    const sections = [...langSections, ...userSection];
    type FlatSingleItem =
      | { key: string; sectionTitle: string; type: 'user'; slotKey: string; name: string; cardId: string }
      | { key: string; sectionTitle: string; type: 'card'; lang: string; card: AppCardBrief & { variant: CardVariant } };
    const flatSingleItems: FlatSingleItem[] = sections.flatMap((s) =>
      s.data.flatMap((d) => {
        if (d.lang === 'user' && d.row.length > 0 && d.row[0] && 'cardId' in d.row[0]) {
          return (d.row as { slotKey: string; name: string; cardId: string }[]).map((ue) => ({
            key: ue.slotKey,
            sectionTitle: s.title,
            type: 'user' as const,
            ...ue,
          }));
        }
        return (d.row as (AppCardBrief & { variant: CardVariant })[]).map((card) => ({
          key: singlePokemonSlotKey(d.lang, card.id, card.variant),
          sectionTitle: s.title,
          type: 'card' as const,
          lang: d.lang,
          card,
        }));
      })
    );
    const totalPrintings = langSections.reduce((sum, s) => sum + s.data.reduce((rowSum, r) => rowSum + r.row.length, 0), 0) + userEntriesSingle.length;
    const filledCount = effectiveCollection.slots.filter((s) => s.card).length;
    const progressPct = totalPrintings > 0 ? filledCount / totalPrintings : 0;

    return (
      <View style={styles.screenRoot}>
        <View style={styles.screenFill} />
        <View style={styles.container}>
        <View style={styles.topSection}>
          <View style={styles.nameRowWithAction}>
            <View style={styles.nameRowBlock}>
              <Text style={styles.nameRowLabel}>Collection name</Text>
              {isEditMode ? (
                <TextInput
                  style={styles.nameInput}
                  placeholder={collection.singlePokemonName ?? 'Binder'}
                  placeholderTextColor="#888"
                  cursorColor="#e8e8e8"
                  selectionColor="rgba(255,255,255,0.2)"
                  value={editingName}
                  onChangeText={setEditingName}
                  onBlur={saveBinderName}
                />
              ) : (
                <Text style={styles.nameDisplay}>{collection.name}</Text>
              )}
            </View>
            {isEditMode && (
              <Pressable
                style={({ pressed }) => [styles.addUserCardBtn, pressed && styles.rowPressed]}
                onPress={() => setAddUserCardVisible(true)}
              >
                <Text style={styles.addUserCardBtnText}>Add a missing card</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.nameSubtitle}>{getCollectionSubtitle(collection)}</Text>
          <Text style={styles.ctaProgressLabel}>Progress</Text>
          <View style={styles.progressBarOuter}>
            <View style={[styles.progressBarFill, { width: `${progressPct * 100}%` }]} />
          </View>
          <Text style={styles.ctaProgressText}>{filledCount}/{totalPrintings}</Text>
        </View>
        {totalPrintings === 0 ? (
          <View style={styles.emptyState}>
            {cardsLoadError ? (
              <>
                <Text style={styles.emptyStateText}>{cardsLoadError}</Text>
                <Pressable
                  style={({ pressed }) => [styles.seedButton, pressed && styles.rowPressed]}
                  onPress={() => load()}
                >
                  <Text style={styles.seedButtonText}>Retry</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.emptyStateText}>
                  No printings found for "{name}".
                </Text>
                <Text style={styles.emptyStateHint}>
                  The TCGdex API may not have cards for this Pokémon yet, or the name may differ.
                </Text>
              </>
            )}
          </View>
        ) : (
          viewMode === 'list' ? (
            <FlatList
              data={flatSingleItems}
              style={styles.listFill}
              keyExtractor={(item) => item.key}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                if (item.type === 'user') {
                  const slotCard = getSlotCard(effectiveCollection, item.slotKey);
                  const isCollected = !!slotCard;
                  const setLabel = slotCard ? (collection.userCards?.[slotCard.cardId]?.setName ?? 'Custom') : '';
                  return (
                    <Pressable
                      style={({ pressed }) => [styles.listRow, pressed && styles.rowPressed]}
                      onPress={() => {
                        if (isEditMode) handleCardPress(collection.type, item.slotKey, item.cardId, undefined, 'normal');
                        else openCardOverlay({ imageUri: slotCard ? userOverrideUris[slotCard.cardId] ?? null : null, cardName: item.name, setLabel, collectorNumber: '—', cardId: item.cardId, slotKey: item.slotKey });
                      }}
                      onLongPress={() => handleLongPressCard(item.slotKey, item.cardId, 'normal')}
                    >
                      <Text style={styles.listRowName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.listRowMeta}>{item.sectionTitle} • Custom</Text>
                      <View style={styles.listRowRight}>
                        {isCollected ? <Text style={styles.listRowCheck}>✓</Text> : <View style={styles.listRowEmpty} />}
                      </View>
                    </Pressable>
                  );
                }
                const { card, lang } = item;
                const slotKey = singlePokemonSlotKey(lang, card.id, card.variant);
                const slotCard = getSlotCard(effectiveCollection, slotKey) ?? getSlotCard(effectiveCollection, cardSlotKey(card.id, card.variant));
                const isCollected = !!slotCard;
                const setLabel = setLabelForCard(card, setNamesById);
                const collectorNum = card.localId ?? collectorNumberFromCardId(card.id);
                const variantLabel = card.variant !== 'normal' ? ` • ${getVariantLabel(card.variant)}` : '';
                return (
                  <Pressable
                    style={({ pressed }) => [styles.listRow, pressed && styles.rowPressed]}
                    onPress={() => {
                      if (isEditMode) handleCardPress(collection.type, slotKey, card.id, undefined, card.variant);
                      else openCardOverlay({
                        imageUri: card.image ? (normalizeTcgdexImageUrl(card.image) ?? card.image) : null,
                        cardName: card.name + variantLabel,
                        setLabel,
                        collectorNumber: collectorNum,
                        cardId: slotCard?.cardId ?? card.id,
                        variant: card.variant,
                      });
                    }}
                    onLongPress={() => handleLongPressCard(slotKey, card.id, card.variant)}
                  >
                    <Text style={styles.listRowName} numberOfLines={1}>{card.name}</Text>
                    <Text style={styles.listRowMeta} numberOfLines={1}>{item.sectionTitle} • {setLabel} #{collectorNum}{variantLabel}</Text>
                    <View style={styles.listRowRight}>
                      {isCollected ? <Text style={styles.listRowCheck}>✓</Text> : <View style={styles.listRowEmpty} />}
                    </View>
                  </Pressable>
                );
              }}
            />
          ) : (
          <SectionList
            sections={sections}
            style={styles.listFill}
            keyExtractor={(item) =>
              item.lang === 'user'
                ? 'user-' + (item.row as { slotKey: string }[]).map((c) => c.slotKey).join('-')
                : item.lang + '-' + (item.row as (AppCardBrief & { variant: CardVariant })[]).map((c) => cardSlotKey(c.id, c.variant)).join('-')
            }
            stickySectionHeadersEnabled
            renderSectionHeader={({ section }) => (
              <View style={styles.singleSectionHeader}>
                <Text style={styles.singleSectionTitle}>{section.title}</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const { lang, row } = item;
              if (lang === 'user' && row.length > 0 && row[0] && 'cardId' in row[0]) {
                const userRow = row as { type: 'user'; slotKey: string; name: string; cardId: string }[];
                return (
                  <View style={styles.gridRow}>
                    {userRow.map((ue) => {
                      const slotCard = getSlotCard(effectiveCollection, ue.slotKey);
                      const isCollected = !!slotCard;
                      const imageUri = slotCard ? userOverrideUris[slotCard.cardId] : null;
                      const setLabel = slotCard ? (collection.userCards?.[slotCard.cardId]?.setName ?? 'Custom') : '';
                      return (
                        <Pressable
                          key={ue.slotKey}
                          style={({ pressed }) => [styles.gridCell, pressed && styles.rowPressed]}
                          onPress={() => {
                            if (isEditMode) {
                              handleCardPress(collection.type, ue.slotKey, ue.cardId, undefined, 'normal');
                            } else {
                              openCardOverlay({
                                imageUri: imageUri ?? null,
                                cardName: ue.name,
                                setLabel,
                                collectorNumber: '—',
                                cardId: ue.cardId,
                                slotKey: ue.slotKey,
                              });
                            }
                          }}
                          onLongPress={() => handleLongPressCard(ue.slotKey, ue.cardId, 'normal')}
                        >
                          <View style={styles.gridCardInner}>
                            <CachedImage
                              remoteUri={imageUri ?? undefined}
                              style={[styles.gridCardImage, !isCollected && styles.gridCardImageUnselected]}
                              resizeMode="contain"
                              cardId={ue.cardId}
                              overrideUri={userOverrideUris[ue.cardId]}
                              onUploadImage={isEditMode ? handleUploadCardImage : undefined}
                            />
                            <View style={styles.cardRibbon} pointerEvents="none">
                              <Text style={styles.cardRibbonText} numberOfLines={2}>{setLabel}</Text>
                            </View>
                            {!isCollected && <View style={styles.gridCardGreyscaleOverlay} pointerEvents="none" />}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              }
              const cardRow = row as (AppCardBrief & { variant: CardVariant })[];
              return (
              <View style={styles.gridRow}>
                {cardRow.map((card) => {
                  const slotKey = singlePokemonSlotKey(lang, card.id, card.variant);
                  const slotCard =
                    getSlotCard(effectiveCollection, slotKey) ?? getSlotCard(effectiveCollection, cardSlotKey(card.id, card.variant));
                  const isCollected = !!slotCard;
                  const setLabel = setLabelForCard(card, setNamesById);
                  const collectorNum = card.localId ?? collectorNumberFromCardId(card.id);
                  const variantLabel = card.variant !== 'normal' ? ` (${getVariantLabel(card.variant)})` : '';
                  return (
                    <Pressable
                      key={slotKey}
                      style={({ pressed }) => [
                        styles.gridCell,
                        pressed && styles.rowPressed,
                      ]}
                      onPress={() => {
                        if (isEditMode) {
                          handleCardPress(collection.type, slotKey, card.id, undefined, card.variant);
                        } else {
                          openCardOverlay({
                            imageUri: card.image ? (normalizeTcgdexImageUrl(card.image) ?? card.image) : null,
                            cardName: card.name + variantLabel,
                            setLabel,
                            collectorNumber: collectorNum,
                            cardId: slotCard?.cardId ?? card.id,
                            variant: card.variant,
                          });
                        }
                      }}
                      onLongPress={() => handleLongPressCard(slotKey, card.id, card.variant)}
                    >
                      <View style={styles.gridCardInner}>
                        <CachedImage
                          remoteUri={card.image ? (normalizeTcgdexImageUrl(card.image) ?? card.image) : null}
                          style={[styles.gridCardImage, !isCollected && styles.gridCardImageUnselected]}
                          resizeMode="contain"
                          cardId={card.id}
                          overrideUri={userOverrideUris[card.id]}
                          onUploadImage={handleUploadCardImage}
                        />
                        <View style={styles.cardRibbon} pointerEvents="none">
                          <Text style={styles.cardRibbonText} numberOfLines={2}>
                            {setLabel} • #{collectorNum}{variantLabel}
                          </Text>
                        </View>
                        {!isCollected && <View style={styles.gridCardGreyscaleOverlay} pointerEvents="none" />}
                      </View>
                    </Pressable>
                  );
                })}
                {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => (
                  <View key={`pad-${i}`} style={styles.gridCell} />
                ))}
              </View>
              );
            }}
            contentContainerStyle={styles.gridContent}
          />
          )
        )}
        <Modal visible={!!cardOverlay} transparent animationType="fade" onRequestClose={closeCardOverlay}>
          <Pressable style={styles.masterPickerBackdrop} onPress={closeCardOverlay}>
            <Pressable style={styles.cardOverlayContent} onPress={(e) => e.stopPropagation()}>
              {cardOverlay && (
                <>
                  <View style={styles.cardOverlayCardRow}>
                    <View style={styles.cardOverlayCardWrap}>
                      {cardOverlay.imageUri ? (
                        <CachedImage
                          remoteUri={cardOverlay.imageUri}
                          style={styles.cardOverlayImage}
                          resizeMode="contain"
                          cardId={cardOverlay.cardId}
                          overrideUri={cardOverlay.cardId ? userOverrideUris[cardOverlay.cardId] : undefined}
                        />
                      ) : (
                        <View style={styles.cardOverlayPlaceholder} />
                      )}
                    </View>
                  </View>
                  <View style={styles.cardOverlayInfoBox}>
                    <View style={styles.cardOverlayInfo}>
                      <Text style={styles.cardOverlayInfoTitle}>{cardOverlay.cardName}</Text>
                      <Text style={styles.cardOverlayInfoRow}>Set: {cardOverlay.setLabel}</Text>
                      <Text style={styles.cardOverlayInfoRow}>Collector #: {cardOverlay.collectorNumber}</Text>
                    </View>
                    <View style={styles.cardOverlayActions}>
                      <Pressable style={({ pressed }) => [styles.cardOverlayCloseBtn, pressed && styles.rowPressed]} onPress={closeCardOverlay}>
                        <Text style={styles.cardOverlayCloseText}>Close</Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>
        </View>
      </View>
    );
  }

  if (collection.type === 'by_set') {
    const setCardsFiltered = setCards.filter(
      (c) => !excludedVersionsSet.has(cardVersionKey(c.id, c.variant))
    );
    const setCardRows = chunk(setCardsFiltered, 3);
    const filledCount = effectiveCollection.slots.filter((s) => s.card).length;
    const totalCount = setCardsFiltered.length;
    const progressPct = totalCount > 0 ? filledCount / totalCount : 0;

    return (
      <View style={styles.screenRoot}>
        <View style={styles.screenFill} />
        <View style={styles.container}>
          <View style={styles.topSection}>
            <Text style={styles.nameRowLabel}>Collection name</Text>
            {isEditMode ? (
              <TextInput
                style={styles.nameInput}
                placeholder={collection.setName ?? 'Set'}
                placeholderTextColor="#888"
                value={editingName}
                onChangeText={setEditingName}
                onBlur={saveBinderName}
                cursorColor="#e8e8e8"
                selectionColor="rgba(255,255,255,0.2)"
              />
            ) : (
              <Text style={styles.nameDisplay}>{collection.name}</Text>
            )}
            <Text style={styles.nameSubtitle}>{getCollectionSubtitle(collection)}</Text>
            <Text style={styles.ctaProgressLabel}>Progress</Text>
            <View style={styles.progressBarOuter}>
              <View style={[styles.progressBarFill, { width: `${progressPct * 100}%` }]} />
            </View>
            <Text style={styles.ctaProgressText}>{filledCount}/{totalCount}</Text>
          </View>
          {setCardsFiltered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {cardsLoadError
                  ? 'Could not load set cards. Tap to retry.'
                  : setExpectedTotal > 0
                    ? "This set's card list isn't in the database yet (e.g. Jumbo cards, W Promotional)."
                    : 'No cards in this set.'}
              </Text>
              {cardsLoadError && (
                <Pressable
                  style={({ pressed }) => [styles.seedButton, pressed && styles.rowPressed]}
                  onPress={() => load()}
                >
                  <Text style={styles.seedButtonText}>Retry</Text>
                </Pressable>
              )}
            </View>
          ) : (
            viewMode === 'list' ? (
              <FlatList
                data={setCardRows.flat()}
                style={styles.listFill}
                keyExtractor={(card) => cardSlotKey(card.id, card.variant)}
                contentContainerStyle={styles.listContent}
                renderItem={({ item: card }) => {
                  const slotKey = cardSlotKey(card.id, card.variant);
                  const slotCard = getSlotCard(effectiveCollection, slotKey) ?? (card.variant === 'normal' ? getSlotCard(effectiveCollection, card.id) : null);
                  const isCollected = !!slotCard;
                  const setLabel = (collection.setName ?? getSetDisplayName(collection.setId ?? '', setNamesById)) || 'Set';
                  const collectorNum = card.localId ?? collectorNumberFromCardId(card.id);
                  const variantLabel = card.variant !== 'normal' ? ` • ${getVariantLabel(card.variant)}` : '';
                  return (
                    <Pressable
                      style={({ pressed }) => [styles.listRow, pressed && styles.rowPressed]}
                      onPress={() => {
                        if (isEditMode) {
                          handleCardPress(collection.type, slotKey, card.id, undefined, card.variant);
                        } else {
                          openCardOverlay({
                            imageUri: card.image ? (normalizeTcgdexImageUrl(card.image) ?? card.image) : null,
                            cardName: card.name + variantLabel,
                            setLabel,
                            collectorNumber: collectorNum,
                            cardId: slotCard?.cardId ?? card.id,
                            variant: card.variant,
                          });
                        }
                      }}
                      onLongPress={() => handleLongPressCard(slotKey, card.id, card.variant)}
                    >
                      <Text style={styles.listRowName} numberOfLines={1}>{card.name}</Text>
                      <Text style={styles.listRowMeta} numberOfLines={1}>{setLabel} #{collectorNum}{variantLabel}</Text>
                      <View style={styles.listRowRight}>
                        {isCollected ? <Text style={styles.listRowCheck}>✓</Text> : <View style={styles.listRowEmpty} />}
                      </View>
                    </Pressable>
                  );
                }}
              />
            ) : (
            <FlatList
              data={setCardRows}
              style={styles.listFill}
              keyExtractor={(row) => row.map((c) => cardSlotKey(c.id, c.variant)).join('-')}
              renderItem={({ item: row }) => (
                <View style={styles.gridRow}>
                  {row.map((card) => {
                    const slotKey = cardSlotKey(card.id, card.variant);
                    const slotCard = getSlotCard(effectiveCollection, slotKey) ?? (card.variant === 'normal' ? getSlotCard(effectiveCollection, card.id) : null);
                    const isCollected = !!slotCard;
                    const setLabel = (collection.setName ?? getSetDisplayName(collection.setId ?? '', setNamesById)) || 'Set';
                    const collectorNum = card.localId ?? collectorNumberFromCardId(card.id);
                    const variantLabel = card.variant !== 'normal' ? ` (${getVariantLabel(card.variant)})` : '';
                    return (
                      <Pressable
                        key={slotKey}
                        style={({ pressed }) => [styles.gridCell, pressed && styles.rowPressed]}
                        onPress={() => {
                          if (isEditMode) {
                            handleCardPress(collection.type, slotKey, card.id, undefined, card.variant);
                          } else {
                            openCardOverlay({
                              imageUri: card.image ? (normalizeTcgdexImageUrl(card.image) ?? card.image) : null,
                              cardName: card.name + variantLabel,
                              setLabel,
                              collectorNumber: collectorNum,
                              cardId: slotCard?.cardId ?? card.id,
                              variant: card.variant,
                            });
                          }
                        }}
                        onLongPress={() => handleLongPressCard(slotKey, card.id, card.variant)}
                      >
                        <View style={styles.gridCardInner}>
                          <CachedImage
                            remoteUri={card.image ? (normalizeTcgdexImageUrl(card.image) ?? card.image) : null}
                            style={[styles.gridCardImage, !isCollected && styles.gridCardImageUnselected]}
                            resizeMode="contain"
                            cardId={card.id}
                            overrideUri={userOverrideUris[card.id]}
                            onUploadImage={handleUploadCardImage}
                          />
                          <View style={styles.cardRibbon} pointerEvents="none">
                            <Text style={styles.cardRibbonText} numberOfLines={2}>
                              {setLabel} • #{collectorNum}{variantLabel}
                            </Text>
                          </View>
                          {!isCollected && <View style={styles.gridCardGreyscaleOverlay} pointerEvents="none" />}
                        </View>
                      </Pressable>
                    );
                  })}
                  {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => (
                    <View key={`pad-${i}`} style={styles.gridCell} />
                  ))}
                </View>
              )}
              contentContainerStyle={styles.gridContent}
            />
            )
          )}
        <Modal visible={!!cardOverlay} transparent animationType="fade" onRequestClose={closeCardOverlay}>
          <Pressable style={styles.masterPickerBackdrop} onPress={closeCardOverlay}>
            <Pressable style={styles.cardOverlayContent} onPress={(e) => e.stopPropagation()}>
              {cardOverlay && (
                <>
                  <View style={styles.cardOverlayCardRow}>
                    <View style={styles.cardOverlayCardWrap}>
                      {cardOverlay.imageUri ? (
                        <CachedImage
                          remoteUri={cardOverlay.imageUri}
                          style={styles.cardOverlayImage}
                          resizeMode="contain"
                          cardId={cardOverlay.cardId}
                          overrideUri={cardOverlay.cardId ? userOverrideUris[cardOverlay.cardId] : undefined}
                        />
                      ) : (
                        <View style={styles.cardOverlayPlaceholder} />
                      )}
                    </View>
                  </View>
                  <View style={styles.cardOverlayInfoBox}>
                    <View style={styles.cardOverlayInfo}>
                      <Text style={styles.cardOverlayInfoTitle}>{cardOverlay.cardName}</Text>
                      <Text style={styles.cardOverlayInfoRow}>Set: {cardOverlay.setLabel}</Text>
                      <Text style={styles.cardOverlayInfoRow}>Collector #: {cardOverlay.collectorNumber}</Text>
                    </View>
                    <View style={styles.cardOverlayActions}>
                      <Pressable style={({ pressed }) => [styles.cardOverlayCloseBtn, pressed && styles.rowPressed]} onPress={closeCardOverlay}>
                        <Text style={styles.cardOverlayCloseText}>Close</Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screenRoot}>
      <View style={styles.screenFill} />
      <View style={styles.centered}>
        <Text style={styles.fallbackText}>Unsupported collection type.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, position: 'relative' },
  screenFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: charcoal,
  },
  container: { flex: 1, backgroundColor: 'transparent' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  nameRowWithAction: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  nameRowBlock: {
    flex: 1,
    minWidth: 0,
  },
  topSection: {
    backgroundColor: charcoal,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  nameRowLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    alignSelf: 'stretch',
  },
  nameDisplay: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    alignSelf: 'stretch',
  },
  nameSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 10,
    alignSelf: 'stretch',
  },
  nameInput: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    marginBottom: 14,
    alignSelf: 'stretch',
    backgroundColor: charcoal,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  search: {
    margin: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
  },
  ctaProgressLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
    textAlign: 'center',
  },
  progressBarOuter: {
    height: 12,
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#e53935',
    borderRadius: 5,
  },
  ctaProgressText: {
    fontSize: 13,
    color: '#fff',
    marginTop: 6,
  },
  seedButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.4)',
    alignSelf: 'center',
  },
  seedButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  listFill: { flex: 1, backgroundColor: charcoal },
  gridContent: {
    paddingBottom: 24,
    backgroundColor: charcoal,
  },
  listContent: { paddingBottom: 24, paddingHorizontal: 12 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  listRowName: { fontSize: 16, fontWeight: '600', color: '#fff', flex: 1 },
  listRowMeta: { fontSize: 13, color: 'rgba(255,255,255,0.7)', flex: 1 },
  listRowRight: { width: 24, alignItems: 'center' },
  listRowCheck: { fontSize: 16, color: '#4caf50', fontWeight: '700' },
  listRowEmpty: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  gridCell: {
    flex: 1,
    aspectRatio: 2.5 / 3.5,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCardInner: {
    width: '100%',
    height: '100%',
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  gridCardImageUnselected: {
    opacity: 0.45,
  },
  gridCardGreyscaleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(100,100,100,0.72)',
    borderRadius: 8,
    zIndex: 1,
  },
  gridCardPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  cardRibbon: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  cardRibbonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardOverlayContent: {
    width: '94%',
    maxWidth: 560,
    backgroundColor: '#2d2d2d',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  cardOverlayCardRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cardOverlayCardWrap: {
    width: 260,
    aspectRatio: 2.5 / 3.5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cardOverlayImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  cardOverlayPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  cardOverlayInfoBox: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  cardOverlayInfo: {
    marginBottom: 4,
  },
  cardOverlayInfoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  cardOverlayInfoRow: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
  },
  cardOverlayActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cardOverlayChangeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(76, 175, 80, 0.6)',
    borderRadius: 8,
  },
  cardOverlayChangeBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  cardOverlayCloseBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cardOverlayCloseText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
  },
  singleSectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: charcoal,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  singleSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  sectionTitle: { padding: 16, fontSize: 16, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  rowPressed: { opacity: 0.8 },
  dexId: { width: 48, fontSize: 14, opacity: 0.7 },
  name: { flex: 1, fontSize: 16 },
  rowText: { flex: 1 },
  setNum: { fontSize: 12, opacity: 0.7 },
  thumb: { width: 40, height: 56, marginRight: 12, borderRadius: 4 },
  thumbPlaceholder: { width: 40, height: 56, marginRight: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 },
  filled: { fontSize: 12, opacity: 0.9 },
  empty: { fontSize: 14, opacity: 0.4 },
  deleteButtonText: { fontSize: 16, color: '#f66' },
  emptyState: { flex: 1, padding: 24, justifyContent: 'center' },
  emptyStateText: { fontSize: 16, textAlign: 'center', marginBottom: 8 },
  emptyStateHint: { fontSize: 14, textAlign: 'center', opacity: 0.7 },
  masterPickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  masterPickerCard: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    backgroundColor: '#2d2d2d',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  masterPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  masterPickerHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 16,
  },
  masterPickerScroll: { maxHeight: 400 },
  masterPickerScrollContent: { paddingBottom: 16 },
  masterPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  masterPickerCell: {
    width: '31%',
    aspectRatio: 2.5 / 3.5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: '2%',
    marginBottom: 8,
  },
  masterPickerCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  masterPickerPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  masterPickerCloseBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  masterPickerCloseText: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  addUserCardBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  addUserCardBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  addUserCardHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
    textAlign: 'center',
  },
  addUserCardInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  addUserCardImageBtn: {
    marginBottom: 16,
    minHeight: 80,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addUserCardThumb: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  addUserCardImageBtnText: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  cancelBtnText: { fontSize: 16, color: '#fff' },
  uploadBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.7)',
  },
  uploadBtnText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  disabled: { opacity: 0.6 },
  fallbackText: { color: '#fff', fontSize: 16 },
});
