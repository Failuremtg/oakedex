import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { charcoal } from '@/constants/Colors';
import { useAuth } from '@/src/auth/AuthContext';
import {
  deleteFeedback,
  formatFeedbackAsText,
  listFeedback,
  type FeedbackEntry,
} from '@/src/lib/feedback';
import { isFirebaseConfigured } from '@/src/lib/firebase';
import { useIsAdmin } from '@/src/lib/adminConfig';

function formatDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminFeedbackScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, loading } = useIsAdmin(user);
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isFirebaseConfigured()) return;
    setLoadingList(true);
    try {
      const list = await listFeedback();
      setEntries(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Error', msg);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isFirebaseConfigured() || !user || (!loading && !isAdmin)) {
        router.replace('/(tabs)/settings');
        return;
      }
      load();
    }, [user, loading, isAdmin, router, load])
  );

  const handleDownload = useCallback(async () => {
    if (entries.length === 0) {
      Alert.alert('No feedback', 'There is no feedback to download.');
      return;
    }
    setDownloading(true);
    try {
      const text = formatFeedbackAsText(entries);
      const filename = `oakedex-feedback-${new Date().toISOString().slice(0, 10)}.txt`;
      const path = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(path, text, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: 'text/plain',
          dialogTitle: 'Save feedback as file',
        });
      } else {
        await Share.share({ message: text, title: 'Oakedex feedback export' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('cancel') && !msg.includes('dismiss')) {
        Alert.alert('Download failed', msg);
      }
    } finally {
      setDownloading(false);
    }
  }, [entries]);

  const handleDelete = useCallback(
    (entry: FeedbackEntry) => {
      Alert.alert('Delete feedback?', `From: ${entry.userEmail ?? entry.userId}\n\nThis cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(entry.id);
            try {
              await deleteFeedback(entry.id);
              setEntries((prev) => prev.filter((e) => e.id !== entry.id));
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              Alert.alert('Error', msg);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]);
    },
    []
  );

  if (!isFirebaseConfigured()) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Firebase is not configured.</Text>
      </View>
    );
  }

  if (!loading && !isAdmin) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Pressable
          style={({ pressed }) => [styles.downloadBtn, pressed && styles.pressed]}
          onPress={handleDownload}
          disabled={downloading || entries.length === 0}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.downloadBtnText}>Download all as .txt</Text>
          )}
        </Pressable>
      </View>

      {loadingList ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading feedback…</Text>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No feedback yet.</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardMeta}>
                  {item.userEmail ?? item.userId ?? 'unknown'} · {formatDate(item.createdAt)}
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
                  onPress={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color="#fca5a5" />
                  ) : (
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  )}
                </Pressable>
              </View>
              <Text style={styles.cardMessage} numberOfLines={10}>
                {item.message}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: charcoal },
  toolbar: {
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  downloadBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.5)',
    alignItems: 'center',
  },
  downloadBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  pressed: { opacity: 0.8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.6)' },
  listContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardMeta: { fontSize: 12, color: 'rgba(255,255,255,0.6)', flex: 1 },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  deleteBtnText: { fontSize: 13, color: '#fca5a5', fontWeight: '600' },
  cardMessage: { fontSize: 14, color: '#fff', lineHeight: 20 },
});
