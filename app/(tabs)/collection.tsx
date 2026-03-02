import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BinderCover } from '@/components/BinderCover';
import { SyncLoadingScreen } from '@/components/SyncLoadingScreen';
import { Text } from '@/components/Themed';
import { loadCollectionsForDisplay, type Collection } from '@/src/lib/collections';
import { getCollectionProgress, type CollectionProgress } from '@/src/lib/collectionProgress';
import { getCollectionDisplayName, getCollectionSubtitle } from '@/src/lib/collectionDisplay';
import { hapticLight } from '@/src/lib/haptics';
import type { Slot } from '@/src/types';
import { useAuth } from '@/src/auth/AuthContext';

const BINDER_THUMB_WIDTH = 64;
const BINDER_THUMB_HEIGHT = 88;

export default function CollectionTabScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressById, setProgressById] = useState<Record<string, CollectionProgress>>({});

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const list = await loadCollectionsForDisplay();
          if (!cancelled) setCollections(list);
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
          if (!cancelled) setProgressById(progress);
        } catch {
          if (!cancelled) setCollections([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const masterCollections = collections.filter((c) =>
    c.type === 'collect_them_all' || c.type === 'master_set' || c.type === 'master_dex'
  );
  const singlePokemonBinders = collections.filter((c) => c.type === 'single_pokemon');
  const bySetCollections = collections.filter((c) => c.type === 'by_set');

  if (loading) {
    return (
      <View style={styles.screen}>
        <SyncLoadingScreen statusText="Loading collection..." />
      </View>
    );
  }

  const emptyState = (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, styles.emptyStateContent]}
      showsVerticalScrollIndicator={false}
    >
      <Image
        source={require('@/assets/images/oakedex-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
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
      <Text style={styles.emptyStateTitle}>Create a binder</Text>
      <Text style={styles.emptyStateHint}>
        Add a Single Pokémon binder, Master Set, or set collection to get started.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.emptyStateButton, pressed && styles.cardPressed]}
        onPress={() => {
          hapticLight();
          if (!user) {
            router.push('/login');
            return;
          }
          router.push('/new-single');
        }}
      >
        <Text style={styles.emptyStateButtonText}>Add your first collection</Text>
      </Pressable>
    </ScrollView>
  );

  return (
    <View style={styles.screen}>
      {collections.length === 0 ? (
        emptyState
      ) : (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Image
          source={require('@/assets/images/oakedex-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {masterCollections.map((coll) => {
          const filled = coll.slots.filter((s: Slot) => s.card).length;
          const total = progressById[coll.id]?.total ?? null;
          const meta = total != null ? `${filled} / ${total}` : `${filled} filled`;
          return (
          <Pressable
            key={coll.id}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => {
              hapticLight();
              router.push(`/binder/${coll.id}`);
            }}
          >
            <Text style={styles.cardTitle}>{getCollectionDisplayName(coll)}</Text>
            <Text style={styles.cardSubtitle}>{getCollectionSubtitle(coll)}</Text>
            <Text style={styles.cardMeta}>{meta}</Text>
          </Pressable>
          );
        })}

        {singlePokemonBinders.map((coll) => (
          <Pressable
            key={coll.id}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => {
              hapticLight();
              router.push(`/binder/${coll.id}`);
            }}
          >
            <Text style={styles.cardTitle}>{getCollectionDisplayName(coll)}</Text>
            <Text style={styles.cardSubtitle}>{getCollectionSubtitle(coll)}</Text>
            <Text style={styles.cardMeta}>{coll.slots.filter((s: Slot) => s.card).length} printings</Text>
          </Pressable>
        ))}

        {bySetCollections.map((coll) => (
          <Pressable
            key={coll.id}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => {
              hapticLight();
              router.push(`/binder/${coll.id}`);
            }}
          >
            <Text style={styles.cardTitle}>{getCollectionDisplayName(coll)}</Text>
            <Text style={styles.cardSubtitle}>{getCollectionSubtitle(coll)}</Text>
            <Text style={styles.cardMeta}>{coll.slots.filter((s: Slot) => s.card).length} cards</Text>
          </Pressable>
        ))}

        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.cardPressed]}
          onPress={() => {
            hapticLight();
            if (!user && collections.length >= 1) {
              router.push('/login');
              return;
            }
            router.push('/new-single');
          }}
        >
          <Text style={styles.addButtonText}>+ New Single Pokémon binder</Text>
        </Pressable>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#2d2d2d' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  logo: {
    alignSelf: 'center',
    height: 66,
    width: 240,
    marginBottom: 24,
  },
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
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardPressed: { opacity: 0.8 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  cardSubtitle: { fontSize: 13, opacity: 0.8, marginTop: 2, color: '#fff' },
  cardMeta: { fontSize: 12, opacity: 0.6, marginTop: 4, color: '#fff' },
  addButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  addButtonText: { fontSize: 16, textAlign: 'center', opacity: 0.9, color: '#fff' },
});
