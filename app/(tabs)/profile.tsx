import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { SyncLoadingScreen } from '@/components/SyncLoadingScreen';
import { useAuth } from '@/src/auth/AuthContext';
import { isFirebaseConfigured } from '@/src/lib/firebase';
import { loadCollectionsForDisplay } from '@/src/lib/collections';
import type { Collection } from '@/src/types';
import {
  getCollectionDisplayName,
  getCollectionSubtitle,
  getCollectionIconUri,
} from '@/src/lib/collectionDisplay';
import { getCollectionProgress, type CollectionProgress } from '@/src/lib/collectionProgress';
import { POKE_BALL_ICON_BW_SENTINEL } from '@/src/constants/collectionIcons';
import { DEFAULT_TRAINER_SPRITE_URL, getTrainerSpriteUrl, isValidTrainerSpriteId } from '@/src/constants/trainerSprites';
import { getProfilePicturePref } from '@/src/lib/profilePicture';
import { normalizeTcgdexImageUrl } from '@/src/lib/tcgdex';
import { hapticLight } from '@/src/lib/haptics';

function formatMemberSince(creationTime: string | undefined): string {
  if (!creationTime) return '';
  try {
    const d = new Date(creationTime);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function TrainerIdScreen() {
  const insets = useSafeAreaInsets();
  const { user, setDisplayName } = useAuth();
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [progressById, setProgressById] = useState<Record<string, CollectionProgress>>({});
  const [loading, setLoading] = useState(true);
  const [profilePictureUri, setProfilePictureUri] = useState<string | null>(null);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  const loadProfilePicture = useCallback(async () => {
    const pref = await getProfilePicturePref();
    if (!pref) {
      setProfilePictureUri(DEFAULT_TRAINER_SPRITE_URL);
      return;
    }
    if (pref.type === 'sprite') {
      setProfilePictureUri(
        isValidTrainerSpriteId(pref.id) ? getTrainerSpriteUrl(pref.id) : DEFAULT_TRAINER_SPRITE_URL
      );
      return;
    }
    setProfilePictureUri(pref.uri);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await loadCollectionsForDisplay();
      setCollections(list);
      const progress: Record<string, CollectionProgress> = {};
      await Promise.all(
        list.map(async (c) => {
          try {
            progress[c.id] = await getCollectionProgress(c);
          } catch {
            progress[c.id] = { filled: c.slots.filter((s) => s.card).length, total: null };
          }
        })
      );
      setProgressById(progress);
    } catch {
      setCollections([]);
      setProgressById({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void loadProfilePicture();
    }, [loadProfilePicture])
  );

  const avatarSource = profilePictureUri
    ? { uri: profilePictureUri }
    : { uri: DEFAULT_TRAINER_SPRITE_URL };

  const hasUsername = !!user?.displayName?.trim();
  const handleSaveUsername = useCallback(async () => {
    const name = usernameDraft.trim();
    if (!name) {
      Alert.alert('Enter a username', 'Your username is shown on your Trainer ID.');
      return;
    }
    setSavingUsername(true);
    const ok = await setDisplayName(name);
    setSavingUsername(false);
    if (ok) setUsernameDraft('');
  }, [usernameDraft, setDisplayName]);

  const masterCollections = collections.filter((c) => {
    return c.type === 'collect_them_all' || c.type === 'master_set' || c.type === 'master_dex';
  });
  const bySetCollections = collections.filter((c) => c.type === 'by_set');
  const singlePokemonCollections = collections.filter((c) => c.type === 'single_pokemon');

  const memberSince = user?.metadata?.creationTime
    ? formatMemberSince((user.metadata as { creationTime?: string }).creationTime)
    : '';

  if (!isFirebaseConfigured()) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingHorizontal: 24 }]}>
        <Text style={styles.title}>Trainer ID</Text>
        <Text style={styles.hint}>Add Firebase config to enable sign-in.</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingHorizontal: 24 }]}>
        <Text style={styles.title}>Trainer ID</Text>
        <Text style={styles.hint}>
          Sign in to get your Trainer ID, sync your collections across devices, and create more than one binder.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.signInBtn, pressed && styles.rowPressed]}
          onPress={() => {
            hapticLight();
            router.push('/login');
          }}
        >
          <Text style={styles.signInBtnText}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: 24 + insets.top, paddingBottom: 48 + insets.bottom },
      ]}
    >
      <Text style={styles.title}>Trainer ID</Text>

      {/* Trainer card: trainer sprite or custom photo + member since */}
      <View style={styles.trainerCard}>
        <View style={styles.avatarWrap}>
          <Image
            source={avatarSource}
            style={styles.avatarImage}
            resizeMode="contain"
          />
        </View>
        <View style={styles.trainerInfo}>
          {hasUsername ? (
            <Text style={styles.trainerName} numberOfLines={1}>{user.displayName}</Text>
          ) : (
            <View style={styles.usernameForm}>
              <TextInput
                style={styles.usernameInput}
                placeholder="Choose a username"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={usernameDraft}
                onChangeText={setUsernameDraft}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!savingUsername}
              />
              <Pressable
                style={({ pressed }) => [styles.usernameSaveBtn, pressed && styles.rowPressed, savingUsername && styles.disabled]}
                onPress={handleSaveUsername}
                disabled={savingUsername}
              >
                {savingUsername ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.usernameSaveText}>Save username</Text>
                )}
              </Pressable>
            </View>
          )}
          {memberSince ? (
            <Text style={styles.memberSince}>Member since {memberSince}</Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.container}>
          <SyncLoadingScreen statusText="Loading profile..." />
        </View>
      ) : (
        <>
          {/* Binder count */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Binders</Text>
            <Text style={styles.statBig}>{collections.length}</Text>
            <Text style={styles.statHint}>
              {collections.length === 1 ? '1 binder' : `${collections.length} binders`} in your collection
            </Text>
          </View>

          {/* Master / True Master progress */}
          {masterCollections.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Master collections</Text>
    {masterCollections.map((c) => {
                const prog = progressById[c.id];
                const total = prog?.total ?? null;
                const filled = prog?.filled ?? 0;
                const subtitle = getCollectionSubtitle(c);
                return (
                  <View key={c.id} style={styles.binderRow}>
                    <View style={styles.binderRowContent}>
                      <Text style={styles.binderName}>{getCollectionDisplayName(c)}</Text>
                      <Text style={styles.binderSubtitle}>{subtitle}</Text>
                      <Text style={styles.binderProgress}>
                        {filled}
                        {total != null ? ` / ${total}` : ''} collected
                      </Text>
                    </View>
                    {total != null && total > 0 && (
                      <View style={styles.progressBarOuter}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(100, (filled / total) * 100)}%` },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Single Pokémon binders: sprite + progress */}
          {singlePokemonCollections.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Single Pokémon collections</Text>
              {singlePokemonCollections.map((c) => {
                const prog = progressById[c.id];
                const total = prog?.total ?? null;
                const filled = prog?.filled ?? 0;
                const iconUri = getCollectionIconUri(c);
                const source = { uri: iconUri };
                return (
                  <View key={c.id} style={styles.binderRow}>
                    <Image source={source} style={styles.setIcon} resizeMode="contain" />
                    <View style={styles.binderRowContent}>
                      <Text style={styles.binderName}>{getCollectionDisplayName(c)}</Text>
                      <Text style={styles.binderProgress}>
                        {filled}
                        {total != null ? ` / ${total}` : ''} collected
                      </Text>
                    </View>
                    {total != null && total > 0 && (
                      <View style={styles.progressBarOuter}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(100, (filled / total) * 100)}%` },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Set binders: icon + progress */}
          {bySetCollections.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Set collections</Text>
{bySetCollections.map((c) => {
                const prog = progressById[c.id];
                const total = prog?.total ?? null;
                const filled = prog?.filled ?? 0;
                const iconUri = getCollectionIconUri(c);
                const source =
                  iconUri === POKE_BALL_ICON_BW_SENTINEL
                    ? require('@/assets/images/pokeball-bw.png')
                    : { uri: normalizeTcgdexImageUrl(iconUri) ?? iconUri };
                return (
                  <View key={c.id} style={styles.binderRow}>
                    <Image source={source} style={styles.setIcon} resizeMode="contain" />
                    <View style={styles.binderRowContent}>
                      <Text style={styles.binderName}>{getCollectionDisplayName(c)}</Text>
                      <Text style={styles.binderProgress}>
                        {filled}
                        {total != null ? ` / ${total}` : ''} collected
                      </Text>
                    </View>
                    {total != null && total > 0 && (
                      <View style={styles.progressBarOuter}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(100, (filled / total) * 100)}%` },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2d2d2d' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  hint: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8, marginBottom: 20 },
  signInBtn: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.6)',
  },
  signInBtnText: { fontSize: 16, color: '#fff', fontWeight: '600' },

  trainerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 56,
    height: 56,
  },
  trainerInfo: { flex: 1 },
  trainerName: { fontSize: 18, color: '#fff', fontWeight: '600' },
  usernameForm: { gap: 8 },
  usernameInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#fff',
    fontSize: 16,
  },
  usernameSaveBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.7)',
  },
  usernameSaveText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  rowPressed: { opacity: 0.85 },
  memberSince: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  loader: { marginVertical: 24 },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  statBig: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  statHint: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  binderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  setIcon: { width: 40, height: 40, marginRight: 12 },
  binderRowContent: { flex: 1 },
  binderName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  binderSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  binderProgress: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  progressBarOuter: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    width: 80,
    marginLeft: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
});
