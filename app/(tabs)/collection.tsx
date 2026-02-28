import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SyncLoadingScreen } from '@/components/SyncLoadingScreen';
import { Text } from '@/components/Themed';
import { loadCollectionsForDisplay, type Collection } from '@/src/lib/collections';
import { getCollectionProgress, type CollectionProgress } from '@/src/lib/collectionProgress';
import { getCollectionDisplayName, getCollectionSubtitle } from '@/src/lib/collectionDisplay';
import { hapticLight } from '@/src/lib/haptics';
import type { Slot } from '@/src/types';
import { useAuth } from '@/src/auth/AuthContext';

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

  return (
    <View style={styles.screen}>
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
