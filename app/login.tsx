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

const LOGO_PLACEHOLDER_HEIGHT = 80;
const GOOGLE_SIGNIN_CONFIGURED = !!(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();

export default function LoginScreen() {
  const { signIn, signInWithGoogle, signInWithApple, error, clearError, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleLogin = useCallback(async () => {
    clearError();
    const e = email.trim();
    const p = password;
    if (!e || !p) return;
    setBusy(true);
    const cred = await signIn(e, p);
    setBusy(false);
    if (cred) router.replace('/(tabs)');
  }, [email, password, signIn, clearError, router]);

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

  const loading = busy || authLoading;

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
        placeholder="Password"
        placeholderTextColor={TEXT_SECONDARY}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />

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

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <Pressable
        style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
        disabled={loading}
        onPress={() => {
          hapticLight();
          handleLogin();
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Sign in with email</Text>
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
          onPress={() => {
            hapticLight();
            handleApple();
          }}
        >
          <Text style={styles.socialButtonText}>Sign in with Apple</Text>
        </Pressable>
      )}

      <Pressable
        style={[
          styles.socialButton,
          loading && styles.buttonDisabled,
          !GOOGLE_SIGNIN_CONFIGURED && styles.socialButtonDisabled,
        ]}
        disabled={loading || !GOOGLE_SIGNIN_CONFIGURED}
        onPress={() => {
          hapticLight();
          handleGoogle();
        }}
      >
        <Text style={[styles.socialButtonText, !GOOGLE_SIGNIN_CONFIGURED && styles.socialButtonTextMuted]}>
          Sign in with Google
        </Text>
      </Pressable>
      {!GOOGLE_SIGNIN_CONFIGURED && (
        <View style={styles.googleHintBlock}>
          <Text style={styles.hintText}>
            <Text style={styles.hintBold}>Using the installed app (APK/AAB)?</Text> Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to EAS: put it in .env, run npm run eas:set-firebase, then create a new build.
          </Text>
          <Text style={[styles.hintText, { marginTop: 6 }]}>
            <Text style={styles.hintBold}>Using dev or Expo Go?</Text> Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env. In Google Cloud Console → Credentials → your Web client → Authorized redirect URIs, add: https://auth.expo.io/@failuremtg/oakedex
          </Text>
        </View>
      )}

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
  socialButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  appleButton: {
    backgroundColor: '#000',
    borderColor: '#333',
  },
  socialButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  socialButtonDisabled: { opacity: 0.6 },
  socialButtonTextMuted: { color: TEXT_SECONDARY },
  googleHintBlock: { marginTop: 4, marginBottom: 4, marginHorizontal: 8 },
  hintText: { color: TEXT_SECONDARY, fontSize: 12 },
  hintBold: { fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
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
  signUpPrompt: { color: TEXT_SECONDARY, fontSize: 14, marginTop: 4 },
  signUpLink: { color: primary, textDecorationLine: 'underline', fontWeight: '600' },
  forgotLink: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 4 },
  forgotLinkText: { color: primary, fontSize: 14, textDecorationLine: 'underline', fontWeight: '500' },
  errorText: { color: '#ef4444', fontSize: 14 },
});
