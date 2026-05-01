import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { createCollection, loadCollectionsForDisplay } from '@/src/lib/collections';
import { BINDER_COLOR_OPTIONS } from '@/src/constants/binderColors';
import { hapticLight } from '@/src/lib/haptics';
import { useAuth } from '@/src/auth/AuthContext';
import { useIsSubscriber } from '@/src/subscription/SubscriptionContext';

export default function NewGradedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const isSubscriber = useIsSubscriber();

  useEffect(() => {
    if (!isSubscriber) router.replace('/paywall');
  }, [isSubscriber, router]);

  useFocusEffect(
    useCallback(() => {
      if (user) return;
      let cancelled = false;
      loadCollectionsForDisplay().then((collections) => {
        if (!cancelled && collections.length >= 1) router.replace('/login');
      });
      return () => {
        cancelled = true;
      };
    }, [user, router])
  );

  const [binderName, setBinderName] = useState('Graded collection');
  const [selectedColorId, setSelectedColorId] = useState<string | null>(BINDER_COLOR_OPTIONS[0]?.id ?? null);
  const [creating, setCreating] = useState(false);

  const onCreate = useCallback(async () => {
    if (!selectedColorId || creating) return;
    hapticLight();
    setCreating(true);
    const name = binderName.trim() || 'Graded collection';
    const coll = await createCollection('graded', name, { binderColor: selectedColorId });
    setCreating(false);
    router.replace(`/binder/${coll.id}?edit=1`);
  }, [binderName, selectedColorId, creating, router]);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Graded card collection</Text>
      <Text style={styles.hint}>
        Base setup only. Next we’ll add grading company, grade, cert number, and slab photos per card.
      </Text>

      <Text style={styles.label}>Collection name</Text>
      <TextInput
        style={styles.input}
        placeholder="Graded collection"
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
              pressed && styles.pressed,
            ]}
            onPress={() => {
              hapticLight();
              setSelectedColorId(opt.id);
            }}
            disabled={creating}
          />
        ))}
      </View>

      <View style={styles.buttons}>
        <Pressable
          style={({ pressed }) => [styles.button, styles.cancelBtn, pressed && styles.pressed]}
          onPress={() => router.back()}
          disabled={creating}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.createBtn,
            pressed && styles.pressed,
            (!selectedColorId || creating) && styles.disabled,
          ]}
          onPress={onCreate}
          disabled={!selectedColorId || creating}
        >
          {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.createText}>Create</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2d2d2d' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.65)', marginBottom: 8, textTransform: 'uppercase' },
  input: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  colorSwatchSelected: { borderColor: '#fff', borderWidth: 2 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 18 },
  button: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, minWidth: 110, alignItems: 'center' },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.12)' },
  cancelText: { color: '#fff', fontWeight: '800' },
  createBtn: { backgroundColor: 'rgba(106, 68, 155, 0.35)', borderWidth: 1, borderColor: 'rgba(106, 68, 155, 0.7)' },
  createText: { color: '#fff', fontWeight: '900' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },
});

