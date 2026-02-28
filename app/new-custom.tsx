import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text } from '@/components/Themed';
import { SyncLoadingScreen } from '@/components/SyncLoadingScreen';
import { useAuth } from '@/src/auth/AuthContext';
import { createCollection, loadCollectionsForDisplay } from '@/src/lib/collections';
import { BINDER_COLOR_OPTIONS } from '@/src/constants/binderColors';
import { LANGUAGE_OPTIONS, type TCGdexLang } from '@/src/lib/tcgdex';
import { getSpeciesWithCache } from '@/src/lib/cardDataCache';
import { hapticLight } from '@/src/lib/haptics';
import { useIsSubscriber } from '@/src/subscription/SubscriptionContext';
import type { PokemonSummary } from '@/src/types';

const SPRITE_URL = (dexId: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexId}.png`;

const NUM_COLUMNS = 3;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type Step = 'choose' | 'empty' | 'multi';

export default function NewCustomScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const isSubscriber = useIsSubscriber();

  useEffect(() => {
    if (!isSubscriber) {
      router.replace('/paywall');
    }
  }, [isSubscriber, router]);
  const [step, setStep] = useState<Step>('choose');
  const [list, setList] = useState<PokemonSummary[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedPokemon, setSelectedPokemon] = useState<Set<string>>(new Set());
  const [binderName, setBinderName] = useState('');
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<TCGdexLang[]>(['en']);

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
    return () => { cancelled = true; };
  }, []);

  const filtered =
    filter.trim() === ''
      ? list
      : list.filter(
          (p) =>
            p.name.toLowerCase().includes(filter.toLowerCase()) ||
            String(p.dexId).includes(filter)
        );
  const rows = chunk(filtered, NUM_COLUMNS);

  const togglePokemon = useCallback((p: PokemonSummary) => {
    const key = `${p.dexId}-${p.name}`;
    setSelectedPokemon((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const onCreateEmpty = useCallback(async () => {
    const name = binderName.trim() || 'My custom binder';
    if (!selectedColorId || creating) return;
    hapticLight();
    setCreating(true);
    const coll = await createCollection('custom', name, { binderColor: selectedColorId });
    setCreating(false);
    router.replace(`/binder/${coll.id}?edit=1`);
  }, [binderName, selectedColorId, creating, router]);

  const onCreateMulti = useCallback(async () => {
    const name = binderName.trim() || 'Multi-Pokémon binder';
    if (!selectedColorId || creating || selectedPokemon.size === 0) return;
    hapticLight();
    setCreating(true);
    const ids: number[] = [];
    const names: string[] = [];
    selectedPokemon.forEach((key) => {
      const idx = key.indexOf('-');
      const dexStr = idx >= 0 ? key.slice(0, idx) : key;
      const dexId = parseInt(dexStr, 10);
      if (!isNaN(dexId)) {
        ids.push(dexId);
        names.push(list.find((p) => p.dexId === dexId)?.name ?? key.slice(idx + 1) ?? '');
      }
    });
    const langs = selectedLanguages.length > 0 ? selectedLanguages : ['en'];
    const coll = await createCollection('custom', name, {
      binderColor: selectedColorId,
      customPokemonIds: ids,
      customPokemonNames: names,
      languages: langs,
    });
    setCreating(false);
    router.replace(`/binder/${coll.id}?edit=1`);
  }, [binderName, selectedColorId, selectedLanguages, creating, selectedPokemon, list, router]);

  const back = useCallback(() => {
    hapticLight();
    setStep('choose');
    setBinderName('');
    setSelectedColorId(null);
    setSelectedPokemon(new Set());
    setSelectedLanguages(['en']);
  }, []);

  const toggleLanguage = useCallback((langId: TCGdexLang) => {
    setSelectedLanguages((prev) =>
      prev.includes(langId) ? prev.filter((l) => l !== langId) : [...prev, langId]
    );
  }, []);

  if (loading && step === 'multi') {
    return (
      <View style={styles.container}>
        <SyncLoadingScreen statusText="Loading Pokémon..." />
      </View>
    );
  }

  if (step === 'choose') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.chooseTitle}>Custom binder</Text>
        <Text style={styles.chooseHint}>
          Start with an empty binder and add cards via search, or choose multiple Pokémon to collect.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.chooseCard, pressed && styles.chooseCardPressed]}
          onPress={() => {
            hapticLight();
            setStep('empty');
            setBinderName('My custom binder');
            setSelectedColorId(BINDER_COLOR_OPTIONS[0]?.id ?? null);
          }}
        >
          <View style={styles.chooseIconWrap}>
            <FontAwesome name="search" size={32} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={styles.chooseCardTitle}>Empty binder</Text>
          <Text style={styles.chooseCardSub}>Add cards one by one via search inside the binder.</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.chooseCard, pressed && styles.chooseCardPressed]}
          onPress={() => {
            hapticLight();
            setStep('multi');
            setSelectedColorId(BINDER_COLOR_OPTIONS[0]?.id ?? null);
          }}
        >
          <View style={styles.chooseIconWrap}>
            <FontAwesome name="th-list" size={32} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={styles.chooseCardTitle}>Multi-Pokémon</Text>
          <Text style={styles.chooseCardSub}>Pick several Pokémon and collect all their printings.</Text>
        </Pressable>
      </View>
    );
  }

  if (step === 'empty') {
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.formTitle}>Empty custom binder</Text>
        <Text style={styles.label}>Binder name</Text>
        <TextInput
          style={styles.nameInput}
          placeholder="My custom binder"
          placeholderTextColor="#888"
          value={binderName}
          onChangeText={setBinderName}
          autoCapitalize="words"
        />
        <Text style={[styles.label, { marginTop: 12 }]}>Binder color</Text>
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
              onPress={() => { hapticLight(); setSelectedColorId(opt.id); }}
              disabled={creating}
            />
          ))}
        </View>
        <View style={styles.formButtons}>
          <Pressable style={({ pressed }) => [styles.button, styles.cancelButton, pressed && styles.buttonPressed]} onPress={back} disabled={creating}>
            <Text style={styles.cancelButtonText}>Back</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.createButton,
              pressed && styles.buttonPressed,
              (!selectedColorId || creating) && styles.createButtonDisabled,
            ]}
            onPress={onCreateEmpty}
            disabled={!selectedColorId || creating}
          >
            {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.createButtonText}>Create</Text>}
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.hint}>Tap Pokémon to add or remove from your list. Then set name and color below.</Text>
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
        style={styles.list}
        renderItem={({ item: row }) => (
          <View style={styles.gridRow}>
            {row.map((item) => {
              const key = `${item.dexId}-${item.name}`;
              const isSelected = selectedPokemon.has(key);
              return (
                <Pressable
                  key={item.dexId}
                  style={({ pressed }) => [
                    styles.gridCell,
                    isSelected && styles.gridCellSelected,
                    pressed && styles.gridCellPressed,
                  ]}
                  onPress={() => { hapticLight(); togglePokemon(item); }}
                  disabled={creating}
                >
                  <Image source={{ uri: SPRITE_URL(item.dexId) }} style={styles.sprite} resizeMode="contain" />
                  <Text style={styles.pokemonName} numberOfLines={2}>{item.name}</Text>
                  {isSelected && <View style={styles.checkBadge}><FontAwesome name="check" size={14} color="#fff" /></View>}
                </Pressable>
              );
            })}
            {row.length < NUM_COLUMNS &&
              Array.from({ length: NUM_COLUMNS - row.length }).map((_, i) => (
                <View key={`pad-${i}`} style={styles.gridCell} />
              ))}
          </View>
        )}
      />
      <View style={styles.multiFooter}>
        <Text style={styles.label}>Binder name</Text>
        <TextInput
          style={styles.nameInput}
          placeholder={selectedPokemon.size > 0 ? `${selectedPokemon.size} Pokémon` : 'Name your binder'}
          placeholderTextColor="#888"
          value={binderName}
          onChangeText={setBinderName}
          autoCapitalize="words"
        />
        <Text style={[styles.label, { marginTop: 8 }]}>Languages</Text>
        <View style={styles.langRow}>
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
                onPress={() => { hapticLight(); toggleLanguage(opt.id); }}
                disabled={creating}
              >
                <Text style={[styles.langChipText, isSelected && styles.langChipTextSelected]}>{opt.label}</Text>
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
              onPress={() => { hapticLight(); setSelectedColorId(opt.id); }}
              disabled={creating}
            />
          ))}
        </View>
        <View style={styles.formButtons}>
          <Pressable style={({ pressed }) => [styles.button, styles.cancelButton, pressed && styles.buttonPressed]} onPress={back} disabled={creating}>
            <Text style={styles.cancelButtonText}>Back</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.createButton,
              pressed && styles.buttonPressed,
              (selectedPokemon.size === 0 || !selectedColorId || creating) && styles.createButtonDisabled,
            ]}
            onPress={onCreateMulti}
            disabled={selectedPokemon.size === 0 || !selectedColorId || creating}
          >
            {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.createButtonText}>Create ({selectedPokemon.size} Pokémon)</Text>}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2d2d2d' },
  chooseTitle: { fontSize: 22, fontWeight: '700', color: '#fff', paddingHorizontal: 16, marginTop: 8 },
  chooseHint: { fontSize: 14, color: 'rgba(255,255,255,0.75)', paddingHorizontal: 16, marginTop: 8, marginBottom: 20 },
  chooseCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  chooseCardPressed: { opacity: 0.85 },
  chooseIconWrap: { marginBottom: 12 },
  chooseCardTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  chooseCardSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  formContent: { padding: 16, paddingBottom: 40 },
  formTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16 },
  formButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  label: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.9)' },
  nameInput: {
    marginTop: 6,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 16,
  },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  langChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  langChipSelected: { backgroundColor: 'rgba(106,68,155,0.5)' },
  langChipPressed: { opacity: 0.8 },
  langChipText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  langChipTextSelected: { color: '#fff', fontWeight: '600' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchSelected: { borderColor: '#fff' },
  colorSwatchPressed: { opacity: 0.8 },
  button: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  cancelButton: { backgroundColor: 'rgba(255,255,255,0.15)' },
  cancelButtonText: { color: '#fff', fontWeight: '600' },
  createButton: { backgroundColor: '#6a449b' },
  createButtonDisabled: { opacity: 0.6 },
  createButtonText: { color: '#fff', fontWeight: '700' },
  buttonPressed: { opacity: 0.85 },
  hint: { padding: 16, fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  search: { marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 16 },
  list: { flex: 1 },
  gridRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  gridCell: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 4,
    position: 'relative',
  },
  gridCellSelected: { backgroundColor: 'rgba(106,68,155,0.4)', borderWidth: 2, borderColor: '#6a449b' },
  gridCellPressed: { opacity: 0.8 },
  sprite: { width: 64, height: 64 },
  pokemonName: { fontSize: 12, color: '#fff', marginTop: 4, textAlign: 'center' },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6a449b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiFooter: { padding: 16, paddingBottom: 24, backgroundColor: '#2d2d2d', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
});
