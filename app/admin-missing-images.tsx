import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CachedImage } from '@/components/CachedImage';
import { charcoal } from '@/constants/Colors';
import { useAuth } from '@/src/auth/AuthContext';
import { listCloudAdminCardIds, uploadCardImageToCloud } from '@/src/lib/cardImageCloud';
import { useIsAdmin } from '@/src/lib/adminConfig';
import { getMissingImageCards, type MissingImageCard } from '@/src/lib/missingCardImages';
import { isFirebaseConfigured } from '@/src/lib/firebase';

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function AdminMissingImagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin(user);
  const [missingCards, setMissingCards] = useState<MissingImageCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingCardId, setUploadingCardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isFirebaseConfigured() || !user) return;
    setLoading(true);
    setError(null);
    try {
      const [adminIds, missing] = await Promise.all([
        listCloudAdminCardIds(),
        getMissingImageCards(),
      ]);
      const adminSet = new Set(adminIds);
      const stillMissing = missing.filter((c) => !adminSet.has(c.cardId));
      setMissingCards(stillMissing);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMissingCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user != null && isAdmin && !adminLoading) load();
      else if (user == null || (!adminLoading && !isAdmin)) router.replace('/(tabs)/settings');
    }, [user, isAdmin, adminLoading, load, router])
  );

  const handleAddImage = useCallback(
    async (card: MissingImageCard) => {
      if (!isFirebaseConfigured()) {
        Alert.alert('Firebase required', 'Cloud image upload needs Firebase configured.');
        return;
      }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow access to photos to upload an image.');
        return;
      }
      setUploadingCardId(card.cardId);
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [2.5, 3.5],
          quality: 0.9,
        });
        if (result.canceled || !result.assets?.[0]?.uri) {
          setUploadingCardId(null);
          return;
        }
        await uploadCardImageToCloud(card.cardId, result.assets[0].uri);
        setMissingCards((prev) => prev.filter((c) => c.cardId !== card.cardId));
        Alert.alert('Saved', `Image saved for ${card.name}. All users and devices will see it.`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert(
          'Error',
          msg.includes('permission') || msg.includes('insufficient')
            ? `${msg}\n\nEnsure Firebase Storage rules allow write when signed in.`
            : `Could not save image: ${msg}`
        );
      } finally {
        setUploadingCardId(null);
      }
    },
    []
  );

  if (adminLoading || (user != null && !isAdmin && !adminLoading)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Missing images binder</Text>
        <Text style={styles.subtitle}>
          Cards that have no image from the APIs. Add an image to save it for all users and devices. API images are
          always used when available.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading cards without images…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressed]} onPress={load}>
            <Text style={styles.refreshBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.countRow}>
            <Text style={styles.countText}>{missingCards.length} cards missing images</Text>
            <Pressable style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressed]} onPress={load}>
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </Pressable>
          </View>
          {missingCards.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No cards missing images.</Text>
              <Text style={styles.hint}>Or all missing cards already have an admin image.</Text>
            </View>
          ) : (
            <FlatList
              data={chunk(missingCards, 3)}
              keyExtractor={(row) => row.map((c) => c.cardId).join('-')}
              contentContainerStyle={styles.gridContent}
              renderItem={({ item: row }) => {
                return (
                  <View style={styles.gridRow}>
                    {row.map((card) => (
                      <Pressable
                        key={card.cardId}
                        style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
                        onPress={() => handleAddImage(card)}
                        disabled={uploadingCardId === card.cardId}
                      >
                        <View style={styles.cellImageWrap}>
                          <CachedImage
                            remoteUri={null}
                            cardId={card.cardId}
                            style={styles.cellImage}
                            onUploadImage={undefined}
                          />
                        </View>
                        <Text style={styles.cellName} numberOfLines={2}>{card.name}</Text>
                        <Text style={styles.cellMeta} numberOfLines={1}>{card.setName} • #{card.localId}</Text>
                        {uploadingCardId === card.cardId ? (
                          <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" style={styles.cellSpinner} />
                        ) : (
                          <Text style={styles.addImageLabel}>Add image</Text>
                        )}
                      </Pressable>
                    ))}
                    {Array.from({ length: 3 - row.length }).map((_, i) => (
                      <View key={`e-${i}`} style={[styles.cell, styles.cellEmpty]} />
                    ))}
                  </View>
                );
              }}
            />
          )}
        </>
      )}
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 8 },
  backBtnText: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  pressed: { opacity: 0.8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: 'rgba(255,255,255,0.7)' },
  errorText: { color: '#f66', textAlign: 'center', marginBottom: 12 },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  countText: { fontSize: 15, color: 'rgba(255,255,255,0.9)' },
  refreshBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8 },
  refreshBtnText: { color: '#fff', fontSize: 14 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 18, color: '#fff', marginBottom: 8 },
  hint: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  gridContent: { padding: 12, paddingBottom: 40 },
  gridRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  cell: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    minWidth: 0,
  },
  cellEmpty: { backgroundColor: 'transparent' },
  cellImageWrap: { width: '100%', aspectRatio: 2.5 / 3.5, borderRadius: 6, overflow: 'hidden', marginBottom: 6 },
  cellImage: { width: '100%', height: '100%' },
  cellName: { fontSize: 12, color: '#fff', fontWeight: '600', textAlign: 'center' },
  cellMeta: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  cellSpinner: { marginTop: 6 },
  addImageLabel: { fontSize: 11, color: 'rgba(76,175,80,0.9)', marginTop: 4 },
});
