import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/components/Themed';
import { useAuth } from '@/src/auth/AuthContext';
import { createCollection, loadCollectionsForDisplay } from '@/src/lib/collections';
import { BINDER_COLOR_OPTIONS } from '@/src/constants/binderColors';
import { LANGUAGE_OPTIONS, type TCGdexLang } from '@/src/lib/tcgdex';
import type { EditionFilter, MasterSetOptions } from '@/src/types';

const DEFAULT_NAME = 'Master Set';

export default function NewMasterSetScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState(DEFAULT_NAME);
  const [creating, setCreating] = useState(false);
  const [regionalForms, setRegionalForms] = useState(false);
  const [variations, setVariations] = useState(false);
  const [megas, setMegas] = useState(false);
  const [gmax, setGmax] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<TCGdexLang[]>(['en']);
  const [editionFilter, setEditionFilter] = useState<EditionFilter>('all');

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

  const options: MasterSetOptions = {
    regionalForms,
    variations,
    megas,
    gmax,
  };

  const onSelectColor = useCallback(
    async (colorId: string) => {
      if (creating) return;
      setCreating(true);
      const coll = await createCollection('master_set', name.trim() || DEFAULT_NAME, {
        masterSetOptions: options,
        languages: selectedLanguages.length > 0 ? selectedLanguages : ['en'],
        editionFilter,
        binderColor: colorId,
      });
      setCreating(false);
      router.replace(`/binder/${coll.id}`);
    },
    [name, options, selectedLanguages, editionFilter, creating, router]
  );

  const toggle = useCallback(
    (key: keyof MasterSetOptions) => {
      if (key === 'regionalForms') setRegionalForms((v) => !v);
      if (key === 'variations') setVariations((v) => !v);
      if (key === 'megas') setMegas((v) => !v);
      if (key === 'gmax') setGmax((v) => !v);
    },
    []
  );

  const toggleLanguage = useCallback((langId: TCGdexLang) => {
    setSelectedLanguages((prev) =>
      prev.includes(langId) ? prev.filter((l) => l !== langId) : [...prev, langId]
    );
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>One of each Pokémon. Enable options to include more entries.</Text>
      <Text style={styles.label}>Binder name</Text>
      <TextInput
        style={styles.input}
        placeholder={DEFAULT_NAME}
        placeholderTextColor="#888"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        editable={!creating}
      />
      <Text style={styles.label}>Include (turn all on for True Master Collection)</Text>
      {(['regionalForms', 'variations', 'megas', 'gmax'] as const).map((key) => (
        <Pressable
          key={key}
          style={({ pressed }) => [styles.optionRow, pressed && styles.optionPressed]}
          onPress={() => toggle(key)}
          disabled={creating}
        >
          <Text style={styles.optionLabel}>
            {key === 'regionalForms' && 'Regional forms'}
            {key === 'variations' && 'All variations'}
            {key === 'megas' && 'Mega evolutions'}
            {key === 'gmax' && 'Gigantamax forms'}
          </Text>
          <View style={[styles.check, (options[key] && styles.checkOn) || {}]} />
        </Pressable>
      ))}
      <Text style={[styles.label, { marginTop: 16 }]}>Edition</Text>
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
      <Text style={[styles.label, { marginTop: 16 }]}>Languages</Text>
      <Text style={styles.sublabel}>Card picker will show printings in these languages (e.g. Japanese, Chinese).</Text>
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
      <Text style={[styles.label, { marginTop: 16 }]}>Binder color</Text>
      <View style={styles.colorRow}>
        {BINDER_COLOR_OPTIONS.map((opt) => (
          <Pressable
            key={opt.id}
            style={({ pressed }) => [
              styles.colorSwatch,
              { backgroundColor: opt.hex },
              pressed && styles.colorSwatchPressed,
            ]}
            onPress={() => onSelectColor(opt.id)}
            disabled={creating}
          />
        ))}
      </View>
      {creating && (
        <View style={styles.creatingWrap}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2d2d2d', padding: 20 },
  hint: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 16 },
  label: { fontSize: 14, color: '#fff', marginBottom: 8 },
  input: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  optionPressed: { opacity: 0.8 },
  optionLabel: { fontSize: 16, color: '#fff' },
  check: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  checkOn: { backgroundColor: 'rgba(76,175,80,0.8)', borderColor: 'rgba(76,175,80,0.8)' },
  sublabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2, marginBottom: 8 },
  editionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
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
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  langChipSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.8)',
  },
  langChipPressed: { opacity: 0.8 },
  langChipText: { fontSize: 14, color: '#fff' },
  langChipTextSelected: { fontWeight: '600' },
  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 8 },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  colorSwatchPressed: { opacity: 0.8 },
  creatingWrap: { marginTop: 16, alignItems: 'center' },
});
