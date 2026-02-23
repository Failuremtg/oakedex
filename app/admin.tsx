import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { charcoal } from '@/constants/Colors';
import { useAuth } from '@/src/auth/AuthContext';

/** Slug for slotKey: lowercase, replace non-alphanumeric with hyphen, collapse and trim. */
function slugForSlotKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
import {
  getDefaultCardOverrides,
  getCustomCards,
  addCustomCard,
  removeCustomCard,
} from '@/src/lib/adminBinderConfig';
import { useIsAdmin } from '@/src/lib/adminConfig';
import {
  uploadCardImageToCloud,
  listCloudAdminCardIds,
  deleteCloudAdminImage,
} from '@/src/lib/cardImageCloud';
import {
  listAdminOverrideCardIds,
  removeAdminOverride,
  setOverride,
} from '@/src/lib/cardImageOverrides';
import { isFirebaseConfigured } from '@/src/lib/firebase';
import type { CustomCard, CardVariantsMap } from '@/src/types';

const DEFAULT_VARIANTS: CardVariantsMap = { normal: true, reverse: false, holo: false, firstEdition: false };

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, loading } = useIsAdmin(user);
  const [cardId, setCardId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [adminCardIds, setAdminCardIds] = useState<string[]>([]);
  const [customCards, setCustomCards] = useState<CustomCard[]>([]);
  const [customFormVisible, setCustomFormVisible] = useState(false);
  const [customForm, setCustomForm] = useState({
    id: '',
    slotKey: '',
    name: '',
    dexId: '',
    localId: '',
    setId: '',
    setName: '',
    image: '',
    normal: true,
    reverse: false,
    holo: false,
    firstEdition: false,
  });
  const [savingCustom, setSavingCustom] = useState(false);
  const useCloud = isFirebaseConfigured();

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    if (user == null || (!loading && !isAdmin)) {
      router.back();
    }
  }, [user, loading, isAdmin, router]);

  const loadAdminList = useCallback(() => {
    if (useCloud) listCloudAdminCardIds().then(setAdminCardIds);
    else listAdminOverrideCardIds().then(setAdminCardIds);
  }, [useCloud]);

  const loadBinderConfig = useCallback(() => {
    getCustomCards().then(setCustomCards);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAdminList();
      if (isFirebaseConfigured()) loadBinderConfig();
    }, [loadAdminList, loadBinderConfig])
  );

  const handleUpload = useCallback(async () => {
    const id = cardId.trim();
    if (!id) {
      Alert.alert('Enter card ID', 'e.g. base1-4, sv3-125');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to upload an image.');
      return;
    }
    setUploading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [2.5, 3.5],
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]?.uri) {
        setUploading(false);
        return;
      }
      if (useCloud) {
        await uploadCardImageToCloud(id, result.assets[0].uri);
        Alert.alert('Saved', `Image saved for card "${id}". All users and devices will see it.`);
      } else {
        await setOverride(id, result.assets[0].uri, 'admin');
        Alert.alert('Saved', `Image saved for card "${id}". It will show on this device.`);
      }
      setCardId('');
      loadAdminList();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      Alert.alert('Error', message.includes('permission') || message.includes('insufficient')
        ? `${message}\n\nMake sure Firebase Storage rules are deployed (storage.rules: allow write when signed in).`
        : `Could not save image: ${message}`);
    } finally {
      setUploading(false);
    }
  }, [cardId, loadAdminList, useCloud]);

  const handleRemove = useCallback(
    async (id: string) => {
      Alert.alert('Remove image?', `Remove admin image for ${id}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (useCloud) await deleteCloudAdminImage(id);
            else await removeAdminOverride(id);
            loadAdminList();
          },
        },
      ]);
    },
    [loadAdminList, useCloud]
  );

  const handleOpenCustomForm = useCallback(() => {
    setCustomForm({
      id: '',
      slotKey: '',
      name: '',
      dexId: '',
      localId: '',
      setId: '',
      setName: '',
      image: '',
      normal: true,
      reverse: false,
      holo: false,
      firstEdition: false,
    });
    setCustomFormVisible(true);
  }, []);

  const handleSaveCustomCard = useCallback(async () => {
    const dexIdNum = parseInt(customForm.dexId, 10);
    if (
      !customForm.id.trim() ||
      !customForm.slotKey.trim() ||
      !customForm.name.trim() ||
      Number.isNaN(dexIdNum) ||
      !customForm.localId.trim() ||
      !customForm.setId.trim() ||
      !customForm.setName.trim()
    ) {
      Alert.alert('Fill required fields', 'id, slotKey, name, dexId (number), localId, setId, setName are required.');
      return;
    }
    setSavingCustom(true);
    try {
      await addCustomCard({
        id: customForm.id.trim(),
        slotKey: customForm.slotKey.trim(),
        name: customForm.name.trim(),
        dexId: dexIdNum,
        localId: customForm.localId.trim(),
        setId: customForm.setId.trim(),
        setName: customForm.setName.trim(),
        image: customForm.image.trim() || null,
        variants: {
          normal: customForm.normal,
          reverse: customForm.reverse,
          holo: customForm.holo,
          firstEdition: customForm.firstEdition,
        },
      });
      setCustomFormVisible(false);
      loadBinderConfig();
      Alert.alert('Saved', 'Custom card added. It will appear in Collect Them All / Master Set.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setSavingCustom(false);
    }
  }, [customForm, loadBinderConfig]);

  const handleRemoveCustomCard = useCallback(
    async (id: string) => {
      Alert.alert('Remove custom card?', `Remove "${id}"? It will disappear from binders.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeCustomCard(id);
              loadBinderConfig();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : String(e));
            }
          },
        },
      ]);
    },
    [loadBinderConfig]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Admin console</Text>
        <Text style={styles.subtitle}>
          {useCloud
            ? 'Upload images so all users and devices see them (saved to cloud).'
            : 'Upload images for this device only (Firebase not configured).'}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <View style={styles.section}>
        <Text style={styles.label}>Card ID (e.g. base1-4, sv3-125)</Text>
        <TextInput
          style={styles.input}
          placeholder="base1-4"
          placeholderTextColor="#888"
          value={cardId}
          onChangeText={setCardId}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!uploading}
        />
        <Pressable
          style={({ pressed }) => [styles.uploadBtn, pressed && styles.pressed, uploading && styles.disabled]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.uploadBtnText}>Upload image for this card</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Admin overrides ({adminCardIds.length})</Text>
        {adminCardIds.length === 0 ? (
          <Text style={styles.hint}>No admin images yet. Add one above.</Text>
        ) : (
          <FlatList
            data={adminCardIds}
            keyExtractor={(id) => id}
            style={styles.list}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.rowText}>{item}</Text>
                <Pressable
                  style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
                  onPress={() => handleRemove(item)}
                >
                  <Text style={styles.removeBtnText}>Remove</Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>

      {isFirebaseConfigured() && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Global binder import</Text>
            <Text style={styles.hint}>
              To import cards for a Set or Single Pokémon binder so they show for every user and device: open that binder in the app, tap Edit, then tap Import in the header. Upload your CSV or Excel file (see CARD_IMPORT_README.md for the template). The imported “collected” state is saved globally and will appear for all users.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Master set defaults (True master binder)</Text>
            <Text style={styles.hint}>
              Choose which card version shows when a slot has no card collected. Opens the same grid as a real binder; tap a slot to pick a version, then Save to push to all users and devices.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.uploadBtn, pressed && styles.pressed, { marginTop: 8 }]}
              onPress={() => router.push('/admin-master-set')}
            >
              <Text style={styles.uploadBtnText}>Open true master binder</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom cards (e.g. extra Unown)</Text>
            <Text style={styles.hint}>
              Add a new slot to Collect Them All / Master Set (like adding another Unown). Card follows same show/hide rules; no image = same as API cards without images.
            </Text>
            <Pressable style={({ pressed }) => [styles.uploadBtn, pressed && styles.pressed, { marginTop: 8 }]} onPress={handleOpenCustomForm}>
              <Text style={styles.uploadBtnText}>Add custom card</Text>
            </Pressable>
            {customCards.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.label, { marginBottom: 4 }]}>Custom cards ({customCards.length})</Text>
                {customCards.map((c) => (
                  <View key={c.id} style={styles.row}>
                    <Text style={styles.rowText} numberOfLines={1}>{c.name} ({c.slotKey})</Text>
                    <Pressable style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]} onPress={() => handleRemoveCustomCard(c.id)}>
                      <Text style={styles.removeBtnText}>Remove</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      )}

      <Modal visible={customFormVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setCustomFormVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Add custom card</Text>
              <Text style={styles.hint}>All fields required except image. Image empty = behaves like API cards with no image.</Text>
              {(
                [
                  { key: 'id', help: 'Unique ID for this card (used for image overrides). If the card exists in TCGdex, use its id (e.g. base1-4). If not, use any unique string (e.g. custom-201-unown-exclaim or mypromo-1).' },
                  { key: 'slotKey', help: 'Auto-generated from setId + localId + name (e.g. base1-114-unown-exclaim). Edit if needed. Must be unique among all slots.' },
                  { key: 'name', help: 'Display name shown on the card, e.g. Unown !' },
                  { key: 'dexId', help: 'National Pokédex number for list order, e.g. 201 for Unown.' },
                  { key: 'localId', help: 'Collector number within the set, e.g. 114. Often the number after the hyphen in the card id.' },
                  { key: 'setId', help: 'TCGdex set ID, e.g. base1 or sv3. Usually the part before the hyphen in the card id.' },
                  { key: 'setName', help: 'Display name of the set, e.g. Base Set or Obsidian Flames.' },
                  { key: 'image', help: 'Optional image URL. Leave empty to behave like API cards with no image.' },
                ] as const
              ).map(({ key: field, help }) => {
                const suggestedSlotKey = (setId: string, localId: string, name: string) => {
                  const s = setId.trim();
                  const l = localId.trim();
                  const n = name.trim();
                  return s && l && n ? `${s}-${l}-${slugForSlotKey(n)}` : '';
                };
                const handleChange = (t: string) => {
                  if (field === 'name') {
                    setCustomForm((prev) => ({
                      ...prev,
                      name: t,
                      slotKey: suggestedSlotKey(prev.setId, prev.localId, t) || prev.slotKey,
                    }));
                  } else if (field === 'localId') {
                    setCustomForm((prev) => ({
                      ...prev,
                      localId: t,
                      slotKey: suggestedSlotKey(prev.setId, t, prev.name) || prev.slotKey,
                    }));
                  } else if (field === 'setId') {
                    setCustomForm((prev) => ({
                      ...prev,
                      setId: t,
                      slotKey: suggestedSlotKey(t, prev.localId, prev.name) || prev.slotKey,
                    }));
                  } else {
                    setCustomForm((prev) => ({ ...prev, [field]: t }));
                  }
                };
                return (
                  <View key={field} style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>{field}</Text>
                    <Text style={styles.fieldHelp}>{help}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={
                        field === 'id' ? 'e.g. base1-4 or custom-201-unown' : field === 'slotKey' ? 'Auto-filled from setId + localId + name' : field === 'name' ? 'e.g. Unown !' : field === 'dexId' ? 'e.g. 201' : field === 'localId' ? 'e.g. 114' : field === 'setId' ? 'e.g. base1' : field === 'setName' ? 'e.g. Base Set' : 'Optional URL'
                      }
                      placeholderTextColor="#888"
                      value={customForm[field as keyof typeof customForm] as string}
                      onChangeText={handleChange}
                      keyboardType={field === 'dexId' ? 'number-pad' : 'default'}
                      autoCapitalize="none"
                    />
                  </View>
                );
              })}
              <Text style={[styles.label, { marginTop: 8 }]}>Variants (which versions exist)</Text>
              {(['normal', 'reverse', 'holo', 'firstEdition'] as const).map((v) => (
                <View key={v} style={styles.switchRow}>
                  <Text style={styles.rowText}>{v === 'firstEdition' ? '1st Edition' : v}</Text>
                  <Switch value={customForm[v]} onValueChange={(val) => setCustomForm((prev) => ({ ...prev, [v]: val }))} trackColor={{ false: '#555', true: 'rgba(76,175,80,0.6)' }} thumbColor="#fff" />
                </View>
              ))}
              <View style={styles.modalButtons}>
                <Pressable style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]} onPress={() => setCustomFormVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.uploadBtn, pressed && styles.pressed, savingCustom && styles.disabled]} onPress={handleSaveCustomCard} disabled={savingCustom}>
                  {savingCustom ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.uploadBtnText}>Save custom card</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: charcoal,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  backBtnText: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  pressed: { opacity: 0.8 },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 2,
  },
  fieldHelp: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 6,
    lineHeight: 17,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: 16,
  },
  uploadBtn: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  list: { maxHeight: 280 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowText: { fontSize: 15, color: '#fff' },
  removeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  removeBtnText: { fontSize: 14, color: '#f66' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  cancelBtnText: { color: '#fff', fontSize: 16 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
});
