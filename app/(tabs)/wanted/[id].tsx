import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, BackHandler, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { CachedImage } from '@/components/CachedImage';
import { Text } from '@/components/Themed';
import { charcoal } from '@/constants/Colors';
import { hapticLight } from '@/src/lib/haptics';
import { loadWantedItems, removeWantedItem, loadWantedLists } from '@/src/lib/wanted';
import type { WantedItem, WantedList } from '@/src/lib/wantedTypes';
import { getVariantLabel } from '@/src/types';

export default function WantedListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const listId = params.id as string | undefined;

  const [list, setList] = useState<WantedList | null>(null);
  const [items, setItems] = useState<WantedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!listId) return;
    setLoading(true);
    try {
      const [lists, wanted] = await Promise.all([loadWantedLists(), loadWantedItems(listId)]);
      setList(lists.find((l) => l.id === listId) ?? null);
      setItems(wanted.sort((a, b) => b.createdAt - a.createdAt));
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Ensure back always returns to the Wanted tab, not the last stack screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/(tabs)/wanted' as any);
      return true;
    });
    return () => sub.remove();
  }, [router]);

  const empty = useMemo(() => !loading && items.length === 0, [loading, items.length]);

  if (!listId) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Wanted</Text>
          <Text style={styles.hint}>Missing list.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.rowPressed]}
            onPress={() => router.replace('/(tabs)/wanted' as any)}
          >
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {list?.name ?? 'Wanted list'}
            </Text>
            <Text style={styles.hint}>{items.length === 1 ? '1 card' : `${items.length} cards`}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.rowPressed]}
            onPress={() => router.push(`/(tabs)/wanted-add?listId=${encodeURIComponent(listId)}` as any)}
          >
            <Text style={styles.actionBtnText}>+ Add</Text>
          </Pressable>
        </View>

        {empty ? (
          <View style={styles.section}>
            <Text style={styles.emptyTitle}>No cards in this list</Text>
            <Text style={styles.emptyHint}>Tap “+ Add” to add the first card.</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={loading}
            onRefresh={refresh}
            renderItem={({ item }) => {
              const meta = `${item.setName ?? 'Set'} • #${item.localId ?? '—'}${
                item.variant !== 'normal' ? ` • ${getVariantLabel(item.variant)}` : ''
              }`;
              return (
                <View style={styles.row}>
                  <CachedImage remoteUri={item.image} cardId={item.cardId} style={styles.thumb} resizeMode="contain" />
                  <View style={styles.rowText}>
                    <Text style={styles.name} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {meta}
                    </Text>
                    <Text style={styles.intent} numberOfLines={1}>
                      {item.intent === 'buy' ? 'Buy' : item.intent === 'trade' ? 'Trade' : 'Buy or trade'}
                      {item.note ? ` • ${item.note}` : ''}
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.removeBtn, pressed && styles.rowPressed]}
                    onPress={() => {
                      hapticLight();
                      Alert.alert('Remove?', item.name, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: async () => {
                            await removeWantedItem(listId, item.id);
                            await refresh();
                          },
                        },
                      ]);
                    }}
                  >
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </Pressable>
                </View>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: charcoal },
  content: { padding: 20, paddingTop: 24, flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  hint: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  backBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)' },
  backText: { color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(106, 68, 155, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(106, 68, 155, 0.7)',
  },
  actionBtnText: { color: '#fff', fontWeight: '800' },
  rowPressed: { opacity: 0.8 },
  section: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptyHint: { color: 'rgba(255,255,255,0.65)', fontSize: 13, textAlign: 'center' },
  listContent: { paddingBottom: 24 },
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
  intent: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  removeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    marginLeft: 10,
  },
  removeBtnText: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: 12 },
});

