import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist/src/index';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text } from '@/components/Themed';
import { BinderCover } from '@/components/BinderCover';
import { SyncLoadingScreen } from '@/components/SyncLoadingScreen';
import { useAuth } from '@/src/auth/AuthContext';
import { getBinderColorHex } from '@/src/constants/binderColors';
import { JUNGLE_SET_ICON, MASTER_BALL_ICON, POKE_BALL_ICON, POKE_BALL_ICON_BW_SENTINEL, PREMIER_BALL_ICON } from '@/src/constants/collectionIcons';
import {
  getCachedCollections,
  getCollectionsInDisplayOrder,
  saveBinderOrder,
  setCachedCollections,
  type Collection,
} from '@/src/lib/collections';
import { getCollectionProgress, type CollectionProgress } from '@/src/lib/collectionProgress';
import {
  getCollectionDisplayName,
  getCollectionIconUri,
  getCollectionSubtitle,
  isGrandmasterCollection,
} from '@/src/lib/collectionDisplay';
import { hapticLight } from '@/src/lib/haptics';
import { useIsSubscriber } from '@/src/subscription/SubscriptionContext';
import type { Slot } from '@/src/types';

const BINDER_THUMB_WIDTH = 64;   // ~45% larger than original 44
const BINDER_THUMB_HEIGHT = 88;  // same ratio
const STICKER_SIZE = 76;         // sticker scales with binder

export default function BinderTabScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isSubscriber = useIsSubscriber();
  const params = useLocalSearchParams<{ add?: string }>();
  const [ordered, setOrdered] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addMenuVisible, setAddMenuVisible] = useState(false);
  const [progressById, setProgressById] = useState<Record<string, CollectionProgress>>({});

  const openAddMenu = useCallback(() => {
    if (ordered.length >= 3 && !isSubscriber) {
      router.push('/paywall');
      return;
    }
    setAddMenuVisible(true);
  }, [ordered.length, isSubscriber, router]);
  const closeAddMenu = useCallback(() => setAddMenuVisible(false), []);

  useFocusEffect(
    useCallback(() => {
      if (params.add === '1') {
        const cached = getCachedCollections();
        const count = cached?.length ?? 0;
        if (!user && count >= 1) {
          router.replace('/login');
          return;
        }
        setAddMenuVisible(true);
        router.replace('/(tabs)/binder');
      }
    }, [params.add, router, user])
  );

  const onChooseSinglePokemon = useCallback(() => {
    closeAddMenu();
    router.push('/new-single');
  }, [closeAddMenu, router]);

  const refresh = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    const cached = getCachedCollections();
    if (cached != null && cached.length > 0) {
      setOrdered(cached);
      setLoading(false);
    }
    try {
      const list = await getCollectionsInDisplayOrder();
      setOrdered(list);
      setCachedCollections(list);
      const progress: Record<string, CollectionProgress> = {};
      await Promise.all(
        list.map(async (c) => {
          try {
            progress[c.id] = await getCollectionProgress(c);
          } catch {
            progress[c.id] = { filled: c.slots.filter((s) => s.card).length, total: null };
          }
        })
      );
      setProgressById(progress);
    } catch {
      setLoadError("Couldn't load your binders. Tap to try again.");
      setOrdered([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const onDragEnd = useCallback(
    ({ data }: { data: Collection[] }) => {
      setOrdered(data);
      saveBinderOrder(data.map((c) => c.id));
    },
    []
  );

  const renderItem = useCallback(
    ({ item: coll, drag, isActive }: { item: Collection; drag: () => void; isActive: boolean }) => {
      const label = getCollectionDisplayName(coll);
      const typeLabel = getCollectionSubtitle(coll);
      const filled = coll.slots.filter((s: Slot) => s.card).length;
      const prog = progressById[coll.id];
      const total = prog?.total ?? null;
      const meta =
        coll.type === 'by_set'
          ? `${filled} cards`
          : coll.type === 'single_pokemon'
            ? `${filled} printings`
            : (coll.type === 'collect_them_all' || coll.type === 'master_set' || coll.type === 'master_dex') && total != null
              ? `${filled} / ${total}`
              : `${filled} filled`;

      return (
        <ScaleDecorator>
          <View style={[styles.cardRow, isActive && styles.cardRowActive]}>
            <Pressable
              onLongPress={drag}
              disabled={isActive}
              style={styles.dragHandle}
            >
              <FontAwesome name="bars" size={20} color="rgba(255,255,255,0.6)" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => {
                hapticLight();
                router.push(`/binder/${coll.id}?edit=1`);
              }}
            >
              <Text style={styles.cardTitle}>{label}</Text>
              <Text style={styles.cardType}>{typeLabel}</Text>
              <Text style={styles.cardMeta}>{meta}</Text>
            </Pressable>
            <View style={styles.rightColumn}>
              <View style={styles.binderWithSticker}>
                <View style={styles.binderThumbWrap}>
                  <BinderCover
                    width={BINDER_THUMB_WIDTH}
                    height={BINDER_THUMB_HEIGHT}
                    color={getBinderColorHex(coll.binderColor)}
                    subtleRings
                  />
                </View>
                <View style={styles.stickerWrap}>
                  <View style={styles.stickerIconWrap}>
                    <Image
                      source={
                        (() => {
                          const uri = getCollectionIconUri(coll);
                          return uri === POKE_BALL_ICON_BW_SENTINEL ? require('@/assets/images/pokeball-bw.png') : { uri };
                        })()
                      }
                      style={styles.stickerIcon}
                      resizeMode="contain"
                    />
                    {isGrandmasterCollection(coll) && (
                      <View style={styles.stickerStarBadge} pointerEvents="none">
                        <FontAwesome name="star" size={18} color="#000" style={styles.stickerStarOutline} />
                        <FontAwesome name="star" size={14} color="#f0c030" style={styles.stickerStarFill} />
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScaleDecorator>
      );
    },
    [router]
  );

  if (loading) {
    return (
      <View style={styles.screen}>
        <SyncLoadingScreen statusText="Loading your binders..." />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.centered, styles.screen]}>
        <Text style={styles.errorMessage}>{loadError}</Text>
        <Pressable
          style={({ pressed }) => [styles.retryButton, pressed && styles.cardPressed]}
          onPress={() => {
            hapticLight();
            refresh();
          }}
        >
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const emptyState = (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, styles.emptyStateContent]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Your binders</Text>
      <View style={styles.emptyStateIconWrap}>
        <View style={styles.emptyStateBinderWrap}>
          <BinderCover
            width={BINDER_THUMB_WIDTH * 1.5}
            height={BINDER_THUMB_HEIGHT * 1.5}
            color="#6b6b6b"
            subtleRings
          />
        </View>
        <View style={styles.emptyStateStickerWrap}>
          <FontAwesome name="plus" size={40} color="rgba(255,255,255,0.9)" />
        </View>
      </View>
      <Text style={styles.emptyStateTitle}>No binders yet</Text>
      <Text style={styles.emptyStateHint}>
        Create a Single Pokémon binder, Master Set, or set-by-set collection to get started.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.emptyStateButton, pressed && styles.cardPressed]}
        onPress={() => {
          hapticLight();
          if (!user) {
            router.push('/login');
            return;
          }
          openAddMenu();
        }}
      >
        <Text style={styles.emptyStateButtonText}>Add your first collection</Text>
      </Pressable>
    </ScrollView>
  );

  const listWithHeader = (
    <DraggableFlatList
      data={ordered}
      keyExtractor={(item) => item.id}
      onDragEnd={onDragEnd}
      renderItem={renderItem}
      ListHeaderComponent={
        <>
          <Text style={styles.title}>Your binders</Text>
          <Text style={styles.subtitle}>
            Hold and drag to reorder. Order is used on the Collections shelf. Tap to edit.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.addRow, pressed && styles.cardPressed]}
            onPress={() => {
              hapticLight();
              if (!user && ordered.length >= 1) {
                router.push('/login');
                return;
              }
              openAddMenu();
            }}
          >
            <View style={styles.dragHandlePlaceholder} />
            <View style={styles.addCard}>
              <Text style={styles.cardTitle}>Add a new collection</Text>
              <Text style={styles.cardType}>Tap to create</Text>
            </View>
            <View style={styles.rightColumn}>
              <View style={styles.binderWithSticker}>
                <View style={styles.binderThumbWrap}>
                  <BinderCover
                    width={BINDER_THUMB_WIDTH}
                    height={BINDER_THUMB_HEIGHT}
                    color="#6b6b6b"
                    subtleRings
                  />
                </View>
                <View style={styles.stickerWrap}>
                  <View style={styles.addStickerIconWrap}>
                    <FontAwesome name="plus" size={36} color="rgba(255,255,255,0.9)" />
                  </View>
                </View>
              </View>
            </View>
          </Pressable>
        </>
      }
      contentContainerStyle={[styles.content, styles.listContent]}
    />
  );

  return (
    <GestureHandlerRootView style={styles.screen}>
      {ordered.length === 0 ? emptyState : listWithHeader}
      <Modal
        visible={addMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeAddMenu}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            hapticLight();
            closeAddMenu();
          }}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Collection type</Text>
            <Pressable
              style={({ pressed }) => [styles.menuOption, pressed && styles.menuOptionPressed]}
              onPress={() => {
                hapticLight();
                onChooseSinglePokemon();
              }}
            >
              <Image source={{ uri: POKE_BALL_ICON }} style={styles.menuOptionIcon} resizeMode="contain" />
              <Text style={styles.menuOptionText}>Single Pokémon binder</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.menuOption, pressed && styles.menuOptionPressed]}
              onPress={() => {
                hapticLight();
                closeAddMenu();
                router.push('/new-master-set');
              }}
            >
              <Image source={{ uri: MASTER_BALL_ICON }} style={styles.menuOptionIcon} resizeMode="contain" />
              <Text style={styles.menuOptionText}>Master Set</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.menuOption, pressed && styles.menuOptionPressed]}
              onPress={() => {
                hapticLight();
                closeAddMenu();
                router.push('/new-by-set');
              }}
            >
              <Image source={{ uri: JUNGLE_SET_ICON }} style={styles.menuOptionIcon} resizeMode="contain" />
              <Text style={styles.menuOptionText}>Specific Set Collection</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.menuOption, pressed && styles.menuOptionPressed]}
              onPress={() => {
                hapticLight();
                closeAddMenu();
                if (!isSubscriber) {
                  router.push('/paywall');
                  return;
                }
                router.push('/new-custom');
              }}
            >
              <Image source={{ uri: PREMIER_BALL_ICON }} style={styles.menuOptionIcon} resizeMode="contain" />
              <Text style={styles.menuOptionText}>Custom binder</Text>
              {!isSubscriber && <Text style={styles.premiumBadge}>Premium</Text>}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#2d2d2d' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  errorMessage: { color: 'rgba(255,255,255,0.9)', fontSize: 16, textAlign: 'center', marginHorizontal: 24, marginBottom: 16 },
  retryButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  listContent: { flexGrow: 1 },
  emptyStateContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  emptyStateIconWrap: {
    marginTop: 20,
    marginBottom: 24,
    position: 'relative',
    width: BINDER_THUMB_WIDTH * 1.5,
    height: BINDER_THUMB_HEIGHT * 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateBinderWrap: {
    position: 'absolute',
    transform: [{ perspective: 400 }, { rotateY: '-24deg' }],
  },
  emptyStateStickerWrap: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8, textAlign: 'center' },
  emptyStateHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  emptyStateButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.5)',
    alignItems: 'center',
    minWidth: 220,
  },
  emptyStateButtonText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 4, color: '#fff' },
  subtitle: { fontSize: 13, opacity: 0.7, color: '#fff', marginBottom: 16 },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'visible',
  },
  cardRowActive: { opacity: 0.9 },
  dragHandle: {
    padding: 12,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    marginRight: 0,
  },
  cardPressed: { opacity: 0.8 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  cardType: { fontSize: 11, opacity: 0.7, color: '#fff', marginTop: 2 },
  cardMeta: { fontSize: 12, opacity: 0.6, marginTop: 4, color: '#fff' },
  rightColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -28,
  },
  binderWithSticker: {
    width: BINDER_THUMB_WIDTH,
    height: BINDER_THUMB_HEIGHT,
    position: 'relative',
  },
  binderThumbWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ perspective: 400 }, { rotateY: '-24deg' }],
  },
  stickerWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickerIconWrap: {
    position: 'relative',
    width: STICKER_SIZE,
    height: STICKER_SIZE,
  },
  stickerIcon: {
    width: STICKER_SIZE,
    height: STICKER_SIZE,
  },
  stickerStarBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickerStarOutline: { position: 'absolute' },
  stickerStarFill: { position: 'absolute' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  dragHandlePlaceholder: {
    width: 44,
    marginRight: 8,
  },
  addCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    marginRight: 0,
  },
  addStickerIconWrap: {
    width: STICKER_SIZE,
    height: STICKER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#3d3d3d',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  menuOptionPressed: { opacity: 0.8 },
  menuOptionIcon: { width: 36, height: 36, marginRight: 14 },
  menuOptionIconCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
  },
  menuOptionText: { fontSize: 16, color: '#fff', fontWeight: '500' },
  premiumBadge: {
    marginLeft: 'auto',
    fontSize: 11,
    fontWeight: '700',
    color: '#ffcf1c',
    backgroundColor: 'rgba(255,207,28,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
});
