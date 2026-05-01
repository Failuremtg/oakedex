import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Text } from '@/components/Themed';
import { charcoal, primary } from '@/constants/Colors';
import { hapticLight } from '@/src/lib/haptics';
import { createWantedList, deleteWantedList, loadWantedLists } from '@/src/lib/wanted';
import type { WantedList } from '@/src/lib/wantedTypes';

export default function WantedTabScreen() {
  const router = useRouter();
  const [lists, setLists] = useState<WantedList[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await loadWantedLists();
      setLists(list.sort((a, b) => b.updatedAt - a.updatedAt));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const empty = useMemo(() => !loading && lists.length === 0, [loading, lists.length]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Wanted</Text>
        <Text style={styles.hint}>Create lists and add cards you want to buy or trade for.</Text>

        <View style={styles.section}>
          {creating ? (
            <>
              <Text style={styles.label}>List name</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Trade binder, Buy list…"
                placeholderTextColor="rgba(255,255,255,0.45)"
                style={styles.input}
                autoCapitalize="words"
              />
              <View style={styles.rowActions}>
                <Pressable
                  style={({ pressed }) => [styles.cancelBtn, pressed && styles.rowPressed]}
                  onPress={() => {
                    setCreating(false);
                    setNewName('');
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.rowPressed]}
                  onPress={async () => {
                    hapticLight();
                    const name = newName.trim() || 'Wanted list';
                    await createWantedList(name);
                    setCreating(false);
                    setNewName('');
                    await refresh();
                  }}
                >
                  <Text style={styles.actionBtnText}>Create</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.rowPressed]}
              onPress={() => {
                hapticLight();
                setCreating(true);
              }}
            >
              <Text style={styles.actionBtnText}>Create wanted list</Text>
            </Pressable>
          )}
        </View>

        {empty ? (
          <View style={styles.section}>
            <Text style={styles.emptyTitle}>No wanted lists yet</Text>
            <Text style={styles.emptyHint}>Tap “Create wanted list” to get started.</Text>
          </View>
        ) : (
          <FlatList
            data={lists}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={loading}
            onRefresh={refresh}
            renderItem={({ item }) => {
              return (
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => router.push(`/(tabs)/wanted/${item.id}` as any)}
                >
                  <View style={styles.rowText}>
                    <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {item.count === 1 ? '1 card' : `${item.count} cards`}
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.removeBtn, pressed && styles.rowPressed]}
                    onPress={() => {
                      hapticLight();
                      Alert.alert('Delete list?', item.name, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: async () => {
                          await deleteWantedList(item.id);
                          await refresh();
                        }},
                      ]);
                    }}
                  >
                    <Text style={styles.removeBtnText}>⋯</Text>
                  </Pressable>
                </Pressable>
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
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 14 },
  section: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  label: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: '#fff',
    marginBottom: 10,
  },
  rowActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  cancelBtnText: { color: '#fff', fontWeight: '700' },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(106, 68, 155, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(106, 68, 155, 0.7)',
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
  rowPressed: { opacity: 0.8 },
  listContent: { paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  rowText: { flex: 1, gap: 2 },
  name: { color: '#fff', fontSize: 15, fontWeight: '700' },
  meta: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  removeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    marginLeft: 10,
  },
  removeBtnText: { color: 'rgba(255,255,255,0.9)', fontWeight: '900', fontSize: 14 },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptyHint: { color: 'rgba(255,255,255,0.65)', fontSize: 13, textAlign: 'center' },
});

