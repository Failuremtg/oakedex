import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '@/components/Themed';
import { useAuth } from '@/src/auth/AuthContext';
import { isFirebaseConfigured } from '@/src/lib/firebase';
import { hapticLight } from '@/src/lib/haptics';
import { clearAdminCache, fetchAdminConfig, setAdminCache, useIsAdmin } from '@/src/lib/adminConfig';
import { pickAndSaveCustomPhoto, setProfilePicturePref } from '@/src/lib/profilePicture';
import { getTrainerSpriteUrl, TRAINER_SPRITES } from '@/src/constants/trainerSprites';

type AdminCheckResult =
  | { ok: true; emails: string[]; yourEmail: string; youAreAdmin: boolean }
  | { ok: false; error: string };

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isAdmin, loading, refetch } = useIsAdmin(user);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<AdminCheckResult | null>(null);
  const [spritePickerVisible, setSpritePickerVisible] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const onCheckAdminConfig = useCallback(async () => {
    if (!user) return;
    setChecking(true);
    setLastCheck(null);
    clearAdminCache();
    try {
      const result = await fetchAdminConfig();
      const yourEmail = (user.email ?? '').toLowerCase().trim();
      const match = result.ok && result.emails.some((e) => e.toLowerCase().trim() === yourEmail);
      const uidMatch = result.ok && result.uids.includes(user.uid);
      const youAreAdmin = match || uidMatch;

      if (result.ok) {
        setLastCheck({
          ok: true,
          emails: result.emails,
          yourEmail: user.email ?? '',
          youAreAdmin,
        });
        if (youAreAdmin) {
          setAdminCache(result.emails, result.uids);
        }
      } else {
        setLastCheck({ ok: false, error: result.error ?? 'Unknown error' });
      }

      Alert.alert(
        'Admin config check',
        result.ok
          ? `Path: ${result.path}\nEmails in list: ${result.emails.join(', ') || '(none)'}\nYour email: ${user.email ?? '(none)'}\nYou are admin: ${youAreAdmin ? 'Yes' : 'No'}`
          : `Error: ${result.error ?? 'Unknown'}\nPath used: ${result.path}`,
        [{ text: 'OK' }]
      );
      await refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastCheck({ ok: false, error: msg });
      Alert.alert('Admin config check', `Failed: ${msg}`, [{ text: 'OK' }]);
    } finally {
      setChecking(false);
    }
  }, [user, refetch]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    // Stay in app as guest; no redirect to login
  }, [signOut]);

  const handleUploadPhoto = useCallback(async () => {
    setUploadingPhoto(true);
    try {
      const uri = await pickAndSaveCustomPhoto();
      if (uri) Alert.alert('Done', 'Profile picture updated. It will show on your Trainer ID.');
      setSpritePickerVisible(false);
    } catch {
      Alert.alert('Error', 'Could not save photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }, []);

  const handlePickSprite = useCallback((id: string) => {
    setProfilePicturePref({ type: 'sprite', id });
    setSpritePickerVisible(false);
    Alert.alert('Done', 'Profile picture updated. It will show on your Trainer ID.');
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      {user == null && isFirebaseConfigured() && (
        <View style={styles.section}>
          <Text style={styles.label}>Account</Text>
          <Text style={styles.hint}>Sign in to sync your collections across devices and use your Trainer ID.</Text>
          <Pressable
            style={({ pressed }) => [styles.signInBtn, pressed && styles.rowPressed]}
            onPress={() => {
              hapticLight();
              router.push('/login');
            }}
          >
            <Text style={styles.actionBtnText}>Sign in</Text>
          </Pressable>
        </View>
      )}

      {user != null && (
        <View style={styles.section}>
          <Text style={styles.label}>Account</Text>
          <Text style={styles.value}>Email: {user.email ?? user.uid}</Text>
          {isAdmin && !loading && (
            <>
              <Text style={styles.value}>Admin status: Yes</Text>
              <Pressable
                style={({ pressed }) => [styles.checkBtn, pressed && styles.rowPressed]}
                onPress={onCheckAdminConfig}
                disabled={checking}
              >
                {checking ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.checkBtnText}>Check admin config</Text>
                )}
              </Pressable>
              {lastCheck && (
                <View style={styles.lastCheckBox}>
                  <Text style={styles.lastCheckLabel}>Last check result</Text>
                  {lastCheck.ok ? (
                    <>
                      <Text style={styles.lastCheckText}>
                        Emails in list: {lastCheck.emails.length ? lastCheck.emails.join(', ') : '(none)'}
                      </Text>
                      <Text style={styles.lastCheckText}>Your email: {lastCheck.yourEmail || '(none)'}</Text>
                      <Text style={[styles.lastCheckText, styles.lastCheckSuccess]}>
                        You are admin: Yes
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.lastCheckError}>Error: {lastCheck.error}</Text>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      )}

      {user != null && (
        <View style={styles.section}>
          <Text style={styles.label}>Profile picture</Text>
          <Text style={styles.hint}>Shown on your Trainer ID. Upload a photo or pick a Pokémon trainer sprite.</Text>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.rowPressed]}
            onPress={handleUploadPhoto}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionBtnText}>Upload photo</Text>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.actionBtnSecondary, pressed && styles.rowPressed]}
            onPress={() => setSpritePickerVisible(true)}
            disabled={uploadingPhoto}
          >
            <Text style={styles.actionBtnText}>Choose trainer sprite</Text>
          </Pressable>
        </View>
      )}

      {user != null && isAdmin && !loading && (
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => router.push('/admin')}
        >
          <Text style={styles.rowText}>Admin console</Text>
          <Text style={styles.rowHint}>Upload images for missing cards (stored on device)</Text>
        </Pressable>
      )}

      {user != null && (
        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && styles.rowPressed]}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      )}

      <Modal visible={spritePickerVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setSpritePickerVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Choose trainer sprite</Text>
            <ScrollView style={styles.spriteScroll} contentContainerStyle={styles.spriteScrollContent}>
              <View style={styles.spriteGrid}>
                {TRAINER_SPRITES.map((t) => (
                  <Pressable
                    key={t.id}
                    style={({ pressed }) => [styles.spriteCell, pressed && styles.rowPressed]}
                    onPress={() => handlePickSprite(t.id)}
                  >
                    <Image
                      source={{ uri: getTrainerSpriteUrl(t.id) }}
                      style={styles.spriteImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.spriteName} numberOfLines={2}>{t.name}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Pressable
              style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.rowPressed]}
              onPress={() => setSpritePickerVisible(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2d2d2d' },
  content: { padding: 20, paddingTop: 24 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  section: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  label: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  value: { fontSize: 14, color: '#fff', marginBottom: 4 },
  checkBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    alignItems: 'center',
  },
  checkBtnText: { fontSize: 14, color: '#fff' },
  lastCheckBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  lastCheckLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  lastCheckText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginBottom: 2 },
  lastCheckSuccess: { color: '#86efac', fontWeight: '600' },
  lastCheckFail: { color: '#fca5a5' },
  lastCheckError: { fontSize: 13, color: '#fca5a5', marginTop: 4 },
  row: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  rowPressed: { opacity: 0.8 },
  rowText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  rowHint: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 10 },
  signInBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.5)',
  },
  actionBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  actionBtnSecondary: {
    backgroundColor: 'rgba(76, 175, 80, 0.4)',
    marginTop: 8,
  },
  actionBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  signOutBtn: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  signOutText: { fontSize: 16, color: '#fca5a5', fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#2d2d2d',
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  spriteScroll: { maxHeight: 420 },
  spriteScrollContent: { paddingBottom: 16 },
  spriteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  spriteCell: {
    width: '22%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 8,
  },
  spriteImage: { width: 48, height: 48 },
  spriteName: { fontSize: 10, color: 'rgba(255,255,255,0.9)', marginTop: 4, textAlign: 'center' },
  modalCloseBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
});
