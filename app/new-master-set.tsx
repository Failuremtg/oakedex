import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/components/Themed';
import { useAuth } from '@/src/auth/AuthContext';
import { createCollection, loadCollectionsForDisplay } from '@/src/lib/collections';
import { BINDER_COLOR_OPTIONS } from '@/src/constants/binderColors';
import { getExpandedSpeciesList, VARIATION_GROUPS } from '@/src/lib/masterSetExpansion';
import { LANGUAGE_OPTIONS, type TCGdexLang } from '@/src/lib/tcgdex';
import type { MasterSetOptions } from '@/src/types';
import { getCustomCards } from '@/src/lib/adminBinderConfig';
import { getSpeciesWithCache } from '@/src/lib/cardDataCache';

const DEFAULT_NAME = 'Master Set';

export default function NewMasterSetScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState(DEFAULT_NAME);
  const [creating, setCreating] = useState(false);
  const [regionalForms, setRegionalForms] = useState(false);
  const [variationGroups, setVariationGroups] = useState<string[]>([]);
  const [variationsModalVisible, setVariationsModalVisible] = useState(false);
  const [megas, setMegas] = useState(false);
  const [gmax, setGmax] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<TCGdexLang[]>(['en']);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [expectedTotal, setExpectedTotal] = useState<number | null>(null);

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
    variationGroups: variationGroups.length > 0 ? variationGroups : undefined,
    megas,
    gmax,
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [base, customCards] = await Promise.all([
          getSpeciesWithCache(),
          getCustomCards(),
        ]);
        if (cancelled) return;
        const species = getExpandedSpeciesList(base, options);
        setExpectedTotal(species.length + customCards.length);
      } catch {
        if (!cancelled) setExpectedTotal(null);
      }
    })();
    return () => { cancelled = true; };
  }, [regionalForms, megas, gmax, variationGroups.length, JSON.stringify(variationGroups)]);

  const onCreateBinder = useCallback(
    async () => {
      if (!selectedColorId || creating) return;
      setCreating(true);
      const coll = await createCollection('master_set', name.trim() || DEFAULT_NAME, {
        masterSetOptions: options,
        languages: selectedLanguages.length > 0 ? selectedLanguages : ['en'],
        binderColor: selectedColorId,
      });
      setCreating(false);
      router.replace(`/binder/${coll.id}?edit=1`);
    },
    [name, options, selectedLanguages, selectedColorId, creating, router]
  );

  const onSelectColor = useCallback((colorId: string) => {
    setSelectedColorId(colorId);
  }, []);

  const toggle = useCallback(
    (key: keyof MasterSetOptions) => {
      if (key === 'regionalForms') setRegionalForms((v) => !v);
      if (key === 'megas') setMegas((v) => !v);
      if (key === 'gmax') setGmax((v) => !v);
    },
    []
  );

  const toggleVariationGroup = useCallback((groupId: string) => {
    setVariationGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  }, []);

  const toggleLanguage = useCallback((langId: TCGdexLang) => {
    setSelectedLanguages((prev) =>
      prev.includes(langId) ? prev.filter((l) => l !== langId) : [...prev, langId]
    );
  }, []);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={true}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.hint}>One of each Pokémon. Enable options to include more entries.</Text>
      {expectedTotal != null && (
        <Text style={styles.expectedTotalHint}>Slots for full completion: {expectedTotal.toLocaleString()}</Text>
      )}
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
      <Text style={styles.label}>Include (turn all on for Grandmaster Collection)</Text>
      {(['regionalForms', 'megas', 'gmax'] as const).map((key) => (
        <Pressable
          key={key}
          style={({ pressed }) => [styles.optionRow, pressed && styles.optionPressed]}
          onPress={() => toggle(key)}
          disabled={creating}
        >
          <Text style={styles.optionLabel}>
            {key === 'regionalForms' && 'Regional forms'}
            {key === 'megas' && 'Mega evolutions'}
            {key === 'gmax' && 'Gigantamax forms'}
          </Text>
          <View style={[styles.check, (options[key] && styles.checkOn) || {}]} />
        </Pressable>
      ))}
      <Pressable
        style={({ pressed }) => [styles.optionRow, styles.addVariationsRow, pressed && styles.optionPressed]}
        onPress={() => setVariationsModalVisible(true)}
        disabled={creating}
      >
        <Text style={styles.optionLabel}>Add variations</Text>
        <View style={styles.variationBadgeWrap}>
          {variationGroups.length > 0 && (
            <View style={styles.variationBadge}>
              <Text style={styles.variationBadgeText}>{variationGroups.length}</Text>
            </View>
          )}
          <Text style={styles.addVariationsHint}>{variationGroups.length ? 'Edit' : 'Select'}</Text>
        </View>
      </Pressable>
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
              selectedColorId === opt.id && styles.colorSwatchSelected,
              pressed && styles.colorSwatchPressed,
            ]}
            onPress={() => onSelectColor(opt.id)}
            disabled={creating}
          />
        ))}
      </View>
      <Pressable
        style={[
          styles.createButton,
          (!selectedColorId || creating) && styles.createButtonDisabled,
        ]}
        onPress={onCreateBinder}
        disabled={!selectedColorId || creating}
      >
        {creating ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.createButtonText}>Create Binder</Text>
        )}
      </Pressable>

      <Modal
        visible={variationsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVariationsModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setVariationsModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Add variations</Text>
            <Text style={styles.modalSubtitle}>
              Choose and add any extra variations you want to be included in your collection (If the Pokémon doesn't have a normal form, the variants include any forms needed).
            </Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator>
              {VARIATION_GROUPS.map((group) => {
              const isSelected = variationGroups.includes(group.id);
              return (
                <Pressable
                  key={group.id}
                  style={({ pressed }) => [
                    styles.variationRow,
                    isSelected && styles.variationRowSelected,
                    pressed && styles.optionPressed,
                  ]}
                  onPress={() => toggleVariationGroup(group.id)}
                >
                  <Text style={styles.variationRowLabel}>{group.label}</Text>
                  <View style={[styles.check, isSelected && styles.checkOn]} />
                </Pressable>
              );
            })}
            </ScrollView>
            <Pressable
              style={({ pressed }) => [styles.modalDoneBtn, pressed && styles.optionPressed]}
              onPress={() => setVariationsModalVisible(false)}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#2d2d2d' },
  container: { flexGrow: 1, backgroundColor: '#2d2d2d', padding: 20, paddingBottom: 40 },
  hint: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 16 },
  expectedTotalHint: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
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
  addVariationsRow: { marginTop: 4 },
  addVariationsHint: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  variationBadgeWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  variationBadge: {
    backgroundColor: 'rgba(76,175,80,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  variationBadgeText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  sublabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2, marginBottom: 8 },
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
  colorSwatchSelected: { borderColor: '#fff', borderWidth: 3 },
  colorSwatchPressed: { opacity: 0.8 },
  createButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.8)',
  },
  createButtonDisabled: { opacity: 0.6 },
  createButtonText: { fontSize: 16, color: '#fff', fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#2d2d2d',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 },
  modalSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 16 },
  modalScroll: { maxHeight: 280 },
  variationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  variationRowSelected: { backgroundColor: 'rgba(76,175,80,0.25)' },
  variationRowLabel: { fontSize: 16, color: '#fff' },
  modalDoneBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.6)',
  },
  modalDoneText: { fontSize: 16, color: '#fff', fontWeight: '600' },
});
