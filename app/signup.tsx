import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { Text } from '@/components/Themed';
import { useAuth } from '@/src/auth/AuthContext';
import { charcoal, primary } from '@/constants/Colors';
import { isDisplayNameAllowed } from '@/src/lib/displayNameFilter';
import { hapticLight } from '@/src/lib/haptics';

const BORDER = 'rgba(255,255,255,0.2)';
const TEXT_SECONDARY = 'rgba(255,255,255,0.75)';

export default function SignUpScreen() {
  const { signUp, signInWithGoogle, error, clearError, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSignUp = useCallback(async () => {
    clearError();
    const e = email.trim();
    const name = username.trim();
    const p = password;
    if (!e || !p) return;
    if (!name) return;
    if (p.length < 6) return;
    if (p !== confirm) return;
    const check = isDisplayNameAllowed(name, e);
    if (!check.allowed) {
      Alert.alert('Name not allowed', check.error ?? 'Please choose a different name.');
      return;
    }
    setBusy(true);
    const cred = await signUp(e, p, name);
    setBusy(false);
    if (cred) {
      Alert.alert(
        'Check your email',
        `We sent a verification link to ${e}.\n\nPlease verify your email then sign in.`,
        [{ text: 'Go to sign in', onPress: () => router.replace('/login') }]
      );
    }
  }, [email, username, password, confirm, signUp, clearError, router]);

  const loading = busy || authLoading;

  const handleGoogle = useCallback(async () => {
    clearError();
    setBusy(true);
    const cred = await signInWithGoogle();
    setBusy(false);
    if (cred) router.replace('/(tabs)');
  }, [signInWithGoogle, clearError, router]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={true}
      keyboardShouldPersistTaps="handled"
    >
      <Image
        source={require('@/assets/images/oakedex-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.subtitle}>Your collections are stored in your account.</Text>

      <TextInput
        style={styles.input}
        placeholder="Username (shown on your profile)"
        placeholderTextColor={TEXT_SECONDARY}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={TEXT_SECONDARY}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 6 characters)"
        placeholderTextColor={TEXT_SECONDARY}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        placeholderTextColor={TEXT_SECONDARY}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        editable={!loading}
      />

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <Pressable
        style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
        disabled={loading}
        onPress={() => {
          hapticLight();
          handleSignUp();
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Sign up with email</Text>
        )}
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable
        style={[styles.socialButton, loading && styles.buttonDisabled]}
        disabled={loading}
        onPress={() => {
          hapticLight();
          handleGoogle();
        }}
      >
        <Text style={styles.socialButtonText}>Sign up with Google</Text>
      </Pressable>

      <Pressable
        style={styles.linkButton}
        onPress={() => {
          hapticLight();
          router.push('/login');
        }}
      >
        <Text style={styles.linkText}>Back to sign in</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: charcoal },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 14,
    backgroundColor: charcoal,
    paddingBottom: 40,
  },
  logo: {
    alignSelf: 'center',
    width: 360,
    height: 120,
    marginBottom: 24,
  },
  subtitle: { color: TEXT_SECONDARY, marginBottom: 12 },
  socialButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  socialButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  buttonDisabled: { opacity: 0.6 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { marginHorizontal: 12, color: TEXT_SECONDARY, fontSize: 14 },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 0,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: 16,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: primary,
    marginTop: 8,
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  linkButton: { paddingVertical: 8, alignItems: 'center' },
  linkText: { color: primary, textDecorationLine: 'underline', fontWeight: '600' },
  errorText: { color: '#ef4444', fontSize: 14 },
});
