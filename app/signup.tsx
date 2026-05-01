import { Link, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { isDisplayNameAllowed } from '@/src/lib/displayNameFilter';
import { hapticLight } from '@/src/lib/haptics';

const BORDER = 'rgba(255,255,255,0.2)';
const TEXT_SECONDARY = 'rgba(255,255,255,0.75)';
const GREEN = '#4ade80';
const RED = '#f87171';

/** 0 = empty, 1 = weak, 2 = fair, 3 = strong */
function getStrength(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[^a-zA-Z0-9]/.test(pw) || /[0-9]/.test(pw)) s++;
  return Math.min(s, 3) as 0 | 1 | 2 | 3;
}

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Strong'];
const STRENGTH_COLOR = ['', '#ef4444', '#fbbf24', GREEN];

export default function SignUpScreen() {
  const { signUp, signInWithGoogle, signInWithApple, error, clearError } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirm: false,
  });

  const loading = busy;

  // ── derived validation ──────────────────────────────────────────────────────
  const usernameOk = username.trim().length >= 2;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const strength = getStrength(password);
  const pwLongEnough = password.length >= 6;
  const pwMatch = confirm.length > 0 && confirm === password;
  const pwMismatch = touched.confirm && confirm.length > 0 && confirm !== password;

  const canSubmit = usernameOk && emailOk && pwLongEnough && pwMatch && !loading;

  // ── handlers ────────────────────────────────────────────────────────────────
  const handleSignUp = useCallback(async () => {
    if (!canSubmit) return;
    clearError();
    const e = email.trim();
    const name = username.trim();
    const check = isDisplayNameAllowed(name, e);
    if (!check.allowed) {
      Alert.alert('Name not allowed', check.error ?? 'Please choose a different name.');
      return;
    }
    setBusy(true);
    const cred = await signUp(e, password, name);
    setBusy(false);
    if (cred) {
      Alert.alert(
        '✉️  Check your email',
        `A verification link was sent to:\n${e}\n\nVerify then sign in. Didn't get it? Check your spam folder.`,
        [{ text: 'Go to sign in', onPress: () => router.replace('/login') }],
      );
    }
  }, [email, username, password, canSubmit, signUp, clearError, router]);

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

  const touch = (field: keyof typeof touched) =>
    setTouched((s) => ({ ...s, [field]: true }));

  // ── render ───────────────────────────────────────────────────────────────────
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
      <Text style={styles.subtitle}>Your collections are stored in your account.</Text>

      {/* ── Username ──────────────────────────────────────────────────────── */}
      <View style={styles.fieldGroup}>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor={TEXT_SECONDARY}
            value={username}
            onChangeText={(t) => { clearError(); setUsername(t); touch('username'); }}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            returnKeyType="next"
          />
          {touched.username && (
            <Text style={[styles.fieldIcon, { color: usernameOk ? GREEN : RED }]}>
              {usernameOk ? '✓' : '✗'}
            </Text>
          )}
        </View>
        {touched.username && !usernameOk && (
          <Text style={styles.fieldHintError}>At least 2 characters required</Text>
        )}
      </View>

      {/* ── Email ─────────────────────────────────────────────────────────── */}
      <View style={styles.fieldGroup}>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={TEXT_SECONDARY}
            value={email}
            onChangeText={(t) => { clearError(); setEmail(t); touch('email'); }}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            returnKeyType="next"
            autoComplete="email"
          />
          {touched.email && (
            <Text style={[styles.fieldIcon, { color: emailOk ? GREEN : RED }]}>
              {emailOk ? '✓' : '✗'}
            </Text>
          )}
        </View>
        {touched.email && !emailOk && (
          <Text style={styles.fieldHintError}>Enter a valid email address</Text>
        )}
      </View>

      {/* ── Password ──────────────────────────────────────────────────────── */}
      <View style={styles.fieldGroup}>
        <View style={styles.inputWrap}>
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            placeholder="Password"
            placeholderTextColor={TEXT_SECONDARY}
            value={password}
            onChangeText={(t) => { clearError(); setPassword(t); touch('password'); }}
            secureTextEntry={!showPassword}
            editable={!loading}
            returnKeyType="next"
            autoComplete="new-password"
          />
          <Pressable style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)} hitSlop={12}>
            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
          </Pressable>
        </View>

        {/* Strength bar */}
        {password.length > 0 && (
          <View style={styles.strengthRow}>
            <View style={styles.strengthBars}>
              {[1, 2, 3].map((n) => (
                <View
                  key={n}
                  style={[
                    styles.strengthBar,
                    { backgroundColor: strength >= n ? STRENGTH_COLOR[strength] : BORDER },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.strengthLabel, { color: STRENGTH_COLOR[strength] }]}>
              {STRENGTH_LABEL[strength]}
            </Text>
          </View>
        )}

        {touched.password && !pwLongEnough && (
          <Text style={styles.fieldHintError}>Minimum 6 characters</Text>
        )}
      </View>

      {/* ── Confirm password ──────────────────────────────────────────────── */}
      <View style={styles.fieldGroup}>
        <View style={styles.inputWrap}>
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            placeholder="Confirm password"
            placeholderTextColor={TEXT_SECONDARY}
            value={confirm}
            onChangeText={(t) => { clearError(); setConfirm(t); touch('confirm'); }}
            secureTextEntry={!showConfirm}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={() => { hapticLight(); handleSignUp(); }}
            autoComplete="new-password"
          />
          <Pressable style={styles.eyeBtn} onPress={() => setShowConfirm((v) => !v)} hitSlop={12}>
            <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁'}</Text>
          </Pressable>
        </View>
        {pwMatch && (
          <Text style={[styles.fieldHintError, { color: GREEN }]}>✓ Passwords match</Text>
        )}
        {pwMismatch && (
          <Text style={styles.fieldHintError}>Passwords don't match</Text>
        )}
      </View>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {!!error && (
        <Pressable style={styles.errorBanner} onPress={() => clearError()}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <Text style={styles.errorBannerDismiss}>Tap to dismiss</Text>
        </Pressable>
      )}

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      <Pressable
        style={[styles.primaryButton, (!canSubmit || loading) && styles.primaryButtonDisabled]}
        disabled={!canSubmit || loading}
        onPress={() => { hapticLight(); handleSignUp(); }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Create account</Text>
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
          <Text style={styles.socialButtonText}>  Sign up with Apple</Text>
        </Pressable>
      )}

      <Pressable
        style={[styles.socialButton, loading && styles.buttonDisabled]}
        disabled={loading}
        onPress={() => { hapticLight(); handleGoogle(); }}
      >
        <Text style={styles.socialButtonText}>  Sign up with Google</Text>
      </Pressable>

      <Text style={styles.signInPrompt}>
        Already have an account?{' '}
        <Link href="/login" asChild>
          <Pressable onPress={() => hapticLight()}>
            <Text style={styles.signInLink}>Sign in</Text>
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
    gap: 4,
    backgroundColor: charcoal,
    paddingBottom: 40,
  },
  logo: {
    alignSelf: 'center',
    width: 360,
    height: 120,
    marginBottom: 16,
  },
  subtitle: { color: TEXT_SECONDARY, fontSize: 14, marginBottom: 16 },

  // Field layout
  fieldGroup: { gap: 4, marginBottom: 10 },
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
  fieldIcon: { fontSize: 16, paddingLeft: 8 },
  fieldHintError: { fontSize: 12, color: RED, marginTop: 2 },

  // Eye toggle
  eyeBtn: { position: 'absolute', right: 0, paddingVertical: 12, paddingLeft: 8 },
  eyeIcon: { fontSize: 18 },

  // Strength bar
  strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '600', width: 44, textAlign: 'right' },

  // Error banner
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 10,
    padding: 12,
    marginVertical: 6,
  },
  errorBannerText: { fontSize: 14, color: '#fca5a5', lineHeight: 20 },
  errorBannerDismiss: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 },

  // Buttons
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: primary,
    marginTop: 8,
  },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { marginHorizontal: 12, color: TEXT_SECONDARY, fontSize: 14 },

  socialButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 10,
  },
  appleButton: { backgroundColor: '#111', borderColor: '#333' },
  socialButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  buttonDisabled: { opacity: 0.45 },

  signInPrompt: { color: TEXT_SECONDARY, fontSize: 14, marginTop: 4, textAlign: 'center' },
  signInLink: { color: primary, textDecorationLine: 'underline', fontWeight: '600' },
});
