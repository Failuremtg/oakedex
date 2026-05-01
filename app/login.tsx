import { Link, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/Themed';
import { useAuth } from '@/src/auth/AuthContext';
import { charcoal, primary } from '@/constants/Colors';
import { hapticLight } from '@/src/lib/haptics';

const BORDER = 'rgba(255,255,255,0.2)';
const TEXT_SECONDARY = 'rgba(255,255,255,0.75)';

const GOOGLE_SIGNIN_CONFIGURED = !!(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();

export default function LoginScreen() {
  const { signIn, signInWithGoogle, signInWithApple, error, clearError, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const handleLogin = useCallback(async () => {
    if (!canSubmit) return;
    clearError();
    setBusy(true);
    const cred = await signIn(email.trim(), password);
    setBusy(false);
    if (cred) router.replace('/(tabs)');
  }, [email, password, canSubmit, signIn, clearError, router]);

  const handleGoogle = useCallback(async () => {
    clearError();
    setBusy(true);
    const cred = await signInWithGoogle();
    setBusy(false);
    if (cred) router.replace('/(tabs)');
  }, [signInWithGoogle, clearError, router]);

  const handleApple = useCallback(async () => {
    clearError();
    setBusy(true);
    const cred = await signInWithApple();
    setBusy(false);
    if (cred) router.replace('/(tabs)');
  }, [signInWithApple, clearError, router]);

  const loading = busy;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Image
        source={require('@/assets/images/oakedex-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Email field */}
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={TEXT_SECONDARY}
          value={email}
          onChangeText={(t) => { clearError(); setEmail(t); }}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
          returnKeyType="next"
          autoComplete="email"
        />
      </View>

      {/* Password field with visibility toggle */}
      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.input, styles.inputWithIcon]}
          placeholder="Password"
          placeholderTextColor={TEXT_SECONDARY}
          value={password}
          onChangeText={(t) => { clearError(); setPassword(t); }}
          secureTextEntry={!showPassword}
          editable={!loading}
          returnKeyType="done"
          onSubmitEditing={() => { hapticLight(); handleLogin(); }}
          autoComplete="password"
        />
        <Pressable
          style={styles.eyeBtn}
          onPress={() => setShowPassword((v) => !v)}
          hitSlop={12}
        >
          <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.forgotLink}
        disabled={loading}
        onPress={() => {
          hapticLight();
          router.push('/forgot-password');
        }}
      >
        <Text style={styles.forgotLinkText}>Forgot password?</Text>
      </Pressable>

      {/* Error banner */}
      {!!error && (
        <Pressable style={styles.errorBanner} onPress={() => clearError()}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <Text style={styles.errorBannerDismiss}>Tap to dismiss</Text>
        </Pressable>
      )}

      {/* Sign in button — disabled until fields filled */}
      <Pressable
        style={[
          styles.primaryButton,
          (!canSubmit || loading) && styles.primaryButtonDisabled,
        ]}
        disabled={!canSubmit || loading}
        onPress={() => {
          hapticLight();
          handleLogin();
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Sign in</Text>
        )}
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {Platform.OS === 'ios' && (
        <Pressable
          style={[styles.socialButton, styles.appleButton, loading && styles.buttonDisabled]}
          disabled={loading}
          onPress={() => { hapticLight(); handleApple(); }}
        >
          <Text style={styles.socialButtonText}>  Sign in with Apple</Text>
        </Pressable>
      )}

      <Pressable
        style={[
          styles.socialButton,
          (loading || !GOOGLE_SIGNIN_CONFIGURED) && styles.buttonDisabled,
        ]}
        disabled={loading || !GOOGLE_SIGNIN_CONFIGURED}
        onPress={() => { hapticLight(); handleGoogle(); }}
      >
        <Text style={styles.socialButtonText}>  Sign in with Google</Text>
      </Pressable>

      <Text style={styles.signUpPrompt}>
        Don&apos;t have an account?{' '}
        <Link href="/signup" asChild>
          <Pressable onPress={() => hapticLight()}>
            <Text style={styles.signUpLink}>Sign up</Text>
          </Pressable>
        </Link>
      </Text>
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
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: 16,
  },
  inputWithIcon: { paddingRight: 40 },
  eyeBtn: {
    position: 'absolute',
    right: 0,
    paddingVertical: 12,
    paddingLeft: 8,
  },
  eyeIcon: { fontSize: 18 },
  forgotLink: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 4 },
  forgotLinkText: { color: primary, fontSize: 14, textDecorationLine: 'underline', fontWeight: '500' },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  errorBannerText: { fontSize: 14, color: '#fca5a5', lineHeight: 20 },
  errorBannerDismiss: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: primary,
    marginTop: 4,
  },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { marginHorizontal: 12, color: TEXT_SECONDARY, fontSize: 14 },
  socialButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  appleButton: { backgroundColor: '#111', borderColor: '#333' },
  socialButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  buttonDisabled: { opacity: 0.45 },
  signUpPrompt: { color: TEXT_SECONDARY, fontSize: 14, marginTop: 8, textAlign: 'center' },
  signUpLink: { color: primary, textDecorationLine: 'underline', fontWeight: '600' },
});
