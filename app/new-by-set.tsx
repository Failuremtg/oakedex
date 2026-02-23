import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/Themed';
import { SyncLoadingScreen } from '@/components/SyncLoadingScreen';
import { useAuth } from '@/src/auth/AuthContext';
import { createCollection, loadCollectionsForDisplay } from '@/src/lib/collections';
import { BINDER_COLOR_OPTIONS } from '@/src/constants/binderColors';
import type { EditionFilter } from '@/src/types';
import { getExcludedSetIds, getSetsWithCache } from '@/src/lib/cardDataCache';
import { normalizeTcgdexImageUrl, type TCGdexLang, type TCGdexSetBrief } from '@/src/lib/tcgdex';

const LANG: TCGdexLang = 'en';

export default function NewBySetScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [sets, setSets] = useState<TCGdexSetBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedSet, setSelectedSet] = useState<TCGdexSetBrief | null>(null);
  const [editionFilter, setEditionFilter] = useState<EditionFilter>('all');
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user) return;
      let cancelled = false;
      loadCollectionsForDisplay().then((collections) => {
        if (!cancelled && collections.length >= 1) router.replace('/login');
      });
      return () => { cancelled = true; };
    }, [user, router])
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSetsWithCache(), getExcludedSetIds()]).then(([list, excludedIds]) => {
      if (!cancelled) setSets(list.filter((s) => !excludedIds.includes(s.id)));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const filtered = filter
    ? sets.filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()))
    : sets;

  const onConfirm = useCallback(async () => {
    if (!selectedSet || !selectedColorId || creating) return;
    setCreating(true);
    const coll = await createCollection('by_set', selectedSet.name, {
      setId: selectedSet.id,
      setName: selectedSet.name,
      setSymbol: selectedSet.symbol || selectedSet.logo,
      editionFilter,
      binderColor: selectedColorId,
    });
    setCreating(false);
    router.replace(`/binder/${coll.id}`);
  }, [selectedSet, editionFilter, selectedColorId, creating, router]);

  if (loading) {
    return (
      <View style={styles.container}>
        <SyncLoadingScreen statusText="Loading sets..." />
      </View>
    );
  }

  if (selectedSet) {
    return (
      <View style={styles.container}>
        <Text style={styles.confirmTitle}>{selectedSet.name}</Text>
        <Image
          source={
            selectedSet.symbol || selectedSet.logo
              ? { uri: normalizeTcgdexImageUrl(selectedSet.symbol || selectedSet.logo) ?? undefined }
              : require('@/assets/images/pokeball-bw.png')
          }
          style={styles.setSymbol}
          resizeMode="contain"
        />
        <Text style={styles.label}>Edition</Text>
        <Text style={styles.sublabel}>1st Edition only, Unlimited only, or include all. Default: Include all.</Text>
        <View style={styles.editionRow}>
          {(['all', '1stEditionOnly', 'unlimitedOnly'] as const).map((value) => (
            <Pressable
              key={value}
              style={({ pressed }) => [
                styles.editionChip,
                editionFilter === value && styles.editionChipSelected,
                pressed && styles.editionChipPressed,
              ]}
              onPress={() => setEditionFilter(value)}
              disabled={creating}
            >
              <Text style={[styles.editionChipText, editionFilter === value && styles.editionChipTextSelected]}>
                {value === 'all' && 'Include all'}
                {value === '1stEditionOnly' && '1st Edition only'}
                {value === 'unlimitedOnly' && 'Unlimited only'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Binder color</Text>
        <View style={styles.colorRow}>
          {BINDER_COLOR_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              style={({ pressed }) => [
                styles.colorSwatch,
                { backgroundColor: opt.hex },
                selectedColorId === opt.id && styles.colorSwatchSelected,
                pressed && styles.colorSwatchPressed,
              ]}
              onPress={() => setSelectedColorId(opt.id)}
              disabled={creating}
            />
          ))}
        </View>
        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [styles.button, styles.cancelButton, pressed && styles.buttonPressed]}
            onPress={() => setSelectedSet(null)}
            disabled={creating}
          >
            <Text style={styles.cancelButtonText}>Back</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.button, styles.confirmButton, pressed && styles.buttonPressed]}
            onPress={onConfirm}
            disabled={creating || !selectedColorId}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>Create collection</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Choose a set. All cards from that set will be in the collection.</Text>
      <TextInput
        style={styles.search}
        placeholder="Search sets..."
        placeholderTextColor="#888"
        value={filter}
        onChangeText={setFilter}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={styles.list}
        renderItem={({ item: set }) => (
          <Pressable
            style={({ pressed }) => [styles.setRow, pressed && styles.setRowPressed]}
            onPress={() => setSelectedSet(set)}
            disabled={creating}
          >
            <Image
              source={
                set.symbol || set.logo
                  ? { uri: normalizeTcgdexImageUrl(set.symbol || set.logo) ?? undefined }
                  : require('@/assets/images/pokeball-bw.png')
              }
              style={styles.setSymbolSmall}
              resizeMode="contain"
            />
            <Text style={styles.setName} numberOfLines={1}>{set.name}</Text>
            {set.cardCount?.total != null && (
              <Text style={styles.setCount}>{set.cardCount.total} cards</Text>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2d2d2d', padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2d2d2d' },
  hint: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  search: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  list: { flex: 1 },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  setRowPressed: { opacity: 0.8 },
  setSymbolSmall: { width: 32, height: 32, marginRight: 12 },
  setSymbolPlaceholder: { width: 32, height: 32, marginRight: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 },
  setName: { flex: 1, fontSize: 16, color: '#fff' },
  setCount: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  confirmTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 16 },
  setSymbol: { width: 64, height: 64, marginBottom: 16 },
  label: { fontSize: 14, color: '#fff', marginBottom: 8 },
  sublabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2, marginBottom: 8 },
  editionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  editionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  editionChipSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.8)',
  },
  editionChipPressed: { opacity: 0.8 },
  editionChipText: { fontSize: 14, color: '#fff' },
  editionChipTextSelected: { fontWeight: '600' },
  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 24 },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  colorSwatchSelected: { borderColor: '#fff', borderWidth: 3 },
  colorSwatchPressed: { opacity: 0.8 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  button: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  buttonPressed: { opacity: 0.8 },
  cancelButton: { backgroundColor: 'rgba(255,255,255,0.15)' },
  cancelButtonText: { color: '#fff', fontSize: 16 },
  confirmButton: { backgroundColor: 'rgba(76,175,80,0.8)' },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
