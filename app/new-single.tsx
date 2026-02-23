import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { SyncLoadingScreen } from '@/components/SyncLoadingScreen';
import { useAuth } from '@/src/auth/AuthContext';
import { createCollection, loadCollectionsForDisplay } from '@/src/lib/collections';
import { BINDER_COLOR_OPTIONS } from '@/src/constants/binderColors';
import { LANGUAGE_OPTIONS, type TCGdexLang } from '@/src/lib/tcgdex';
import { getSpeciesWithCache } from '@/src/lib/cardDataCache';
import type { EditionFilter, PokemonSummary } from '@/src/types';

const SPRITE_URL = (dexId: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexId}.png`;

const NUM_COLUMNS = 3;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function NewSingleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [list, setList] = useState<PokemonSummary[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonSummary | null>(null);
  const [binderName, setBinderName] = useState('');
  const [includeRegionalForms, setIncludeRegionalForms] = useState(true);
  const [selectedLanguages, setSelectedLanguages] = useState<TCGdexLang[]>(['en']);
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
    getSpeciesWithCache().then((species) => {
      if (!cancelled) setList(species);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedPokemon) {
      setBinderName(selectedPokemon.name);
      setSelectedColorId(BINDER_COLOR_OPTIONS[0]?.id ?? null);
    } else {
      setBinderName('');
      setSelectedColorId(null);
    }
  }, [selectedPokemon]);

  const filtered = filter
    ? list.filter(
        (p) =>
          p.name.toLowerCase().includes(filter.toLowerCase()) ||
          String(p.dexId).includes(filter)
      )
    : list;
  const rows = chunk(filtered, NUM_COLUMNS);

  const onCreateBinder = useCallback(async () => {
    if (!selectedPokemon || creating || !selectedColorId) return;
    setCreating(true);
    const name = binderName.trim() || selectedPokemon.name;
    const coll = await createCollection('single_pokemon', name, {
      singlePokemonDexId: selectedPokemon.dexId,
      singlePokemonName: selectedPokemon.name,
      includeRegionalForms,
      languages: selectedLanguages.length > 0 ? selectedLanguages : ['en'],
      editionFilter,
      binderColor: selectedColorId,
    });
    setCreating(false);
    setSelectedPokemon(null);
    router.replace(`/binder/${coll.id}`);
  }, [selectedPokemon, binderName, includeRegionalForms, selectedLanguages, editionFilter, selectedColorId, creating, router]);

  const toggleLanguage = useCallback((langId: TCGdexLang) => {
    setSelectedLanguages((prev) =>
      prev.includes(langId) ? prev.filter((l) => l !== langId) : [...prev, langId]
    );
  }, []);

  const closeModal = useCallback(() => setSelectedPokemon(null), []);

  if (loading) {
    return (
      <View style={styles.container}>
        <SyncLoadingScreen statusText="Loading Pokémon..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.hint}>Choose a Pokémon to collect all its printings.</Text>
      <TextInput
        style={styles.search}
        placeholder="Search by name or number..."
        placeholderTextColor="#888"
        value={filter}
        onChangeText={setFilter}
      />

      <FlatList
        data={rows}
        keyExtractor={(row) => row.map((p) => p.dexId).join('-')}
        numColumns={1}
        renderItem={({ item: row }) => (
          <View style={styles.gridRow}>
            {row.map((item) => (
              <Pressable
                key={item.dexId}
                style={({ pressed }) => [styles.gridCell, pressed && styles.gridCellPressed]}
                onPress={() => setSelectedPokemon(item)}
                disabled={creating}
              >
                <Image
                  source={{ uri: SPRITE_URL(item.dexId) }}
                  style={styles.sprite}
                  resizeMode="contain"
                />
                <Text style={styles.pokemonName} numberOfLines={2}>
                  {item.name}
                </Text>
              </Pressable>
            ))}
            {row.length < NUM_COLUMNS &&
              Array.from({ length: NUM_COLUMNS - row.length }).map((_, i) => (
                <View key={`pad-${i}`} style={styles.gridCell} />
              ))}
          </View>
        )}
      />

      <Modal
        visible={!!selectedPokemon}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable
          style={[
            styles.modalBackdrop,
            {
              paddingTop: 24 + insets.top,
              paddingBottom: 24 + insets.bottom,
            },
          ]}
          onPress={closeModal}
        >
          <Pressable
            style={[styles.modalCard, { paddingBottom: 20 + insets.bottom }]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedPokemon && (
              <>
                <View style={styles.modalHeader}>
                  <Image
                    source={{ uri: SPRITE_URL(selectedPokemon.dexId) }}
                    style={styles.modalSprite}
                    resizeMode="contain"
                  />
                  <Text style={styles.modalTitle}>{selectedPokemon.name} binder</Text>
                </View>

                <Text style={styles.label}>Binder name</Text>
                <TextInput
                  style={styles.nameInput}
                  placeholder={selectedPokemon.name}
                  placeholderTextColor="#888"
                  value={binderName}
                  onChangeText={setBinderName}
                  autoCapitalize="words"
                />

                <View style={styles.switchRow}>
                  <Text style={styles.label}>Include regional forms</Text>
                  <Switch
                    value={includeRegionalForms}
                    onValueChange={setIncludeRegionalForms}
                    trackColor={{ false: '#555', true: 'rgba(76,175,80,0.6)' }}
                    thumbColor={includeRegionalForms ? '#4CAF50' : '#888'}
                  />
                </View>
                <Text style={styles.sublabel}>
                  {includeRegionalForms
                    ? 'Cards like Alolan Vulpix, Galarian Zigzagoon will be included.'
                    : 'Only the base form (exact name match) will be included.'}
                </Text>

                <Text style={[styles.label, { marginTop: 8 }]}>Edition</Text>
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

                <Text style={[styles.label, { marginTop: 8 }]}>Languages</Text>
                <View style={styles.colorRow}>
                  {LANGUAGE_OPTIONS.map((opt) => {
                    const isSelected = selectedLanguages.includes(opt.id);
                    return (
                      <Pressable
                        key={opt.id}
                        style={({ pressed }) => [
                          styles.langChip,
                          isSelected && styles.langChipSelected,
                          pressed && styles.langChipPressed,
                        ]}
                        onPress={() => toggleLanguage(opt.id)}
                        disabled={creating}
                      >
                        <Text style={[styles.langChipText, isSelected && styles.langChipTextSelected]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.label, { marginTop: 8 }]}>Binder color</Text>
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

                <View style={styles.modalButtons}>
                  <Pressable
                    style={({ pressed }) => [styles.button, styles.cancelButton, pressed && styles.buttonPressed]}
                    onPress={closeModal}
                    disabled={creating}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.button,
                      styles.createButton,
                      pressed && styles.buttonPressed,
                      (!selectedColorId || creating) && styles.createButtonDisabled,
                    ]}
                    onPress={onCreateBinder}
                    disabled={!selectedColorId || creating}
                  >
                    {creating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.createButtonText}>Create binder</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2d2d2d' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2d2d2d' },
  hint: { padding: 16, fontSize: 14, opacity: 0.8, color: '#fff' },
  search: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
  },
  gridRow: { flexDirection: 'row', paddingHorizontal: 8, marginBottom: 4 },
  gridCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    margin: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  gridCellPressed: { opacity: 0.8 },
  sprite: { width: 72, height: 72 },
  pokemonName: { fontSize: 12, color: '#fff', marginTop: 6, textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#2d2d2d',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  modalSprite: { width: 56, height: 56, marginRight: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  label: { fontSize: 14, color: '#fff', marginBottom: 8 },
  sublabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  nameInput: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 16,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 8 },
  editionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
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
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginRight: 8,
    marginBottom: 8,
  },
  langChipSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.8)',
  },
  langChipPressed: { opacity: 0.8 },
  langChipText: { fontSize: 14, color: '#fff' },
  langChipTextSelected: { fontWeight: '600' },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  colorSwatchSelected: { borderColor: '#fff', borderWidth: 3 },
  colorSwatchPressed: { opacity: 0.8 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  button: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  buttonPressed: { opacity: 0.8 },
  cancelButton: { backgroundColor: 'rgba(255,255,255,0.15)' },
  cancelButtonText: { color: '#fff', fontSize: 16 },
  createButton: { backgroundColor: 'rgba(76,175,80,0.9)' },
  createButtonDisabled: { opacity: 0.6 },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
