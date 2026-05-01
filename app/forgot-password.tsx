import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { hapticLight } from '@/src/lib/haptics';

const BORDER = 'rgba(255,255,255,0.2)';
const TEXT_SECONDARY = 'rgba(255,255,255,0.75)';

export default function ForgotPasswordScreen() {
  const { sendPasswordResetEmail, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const canSubmit = email.trim().length > 0 && !busy;

  const handleSend = useCallback(async () => {
    if (!canSubmit) return;
    hapticLight();
    clearError();
    setSent(false);
    setBusy(true);
    const ok = await sendPasswordResetEmail(email.trim());
    setBusy(false);
    if (ok) setSent(true);
  }, [email, canSubmit, sendPasswordResetEmail, clearError]);

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

      {sent ? (
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>Check your inbox</Text>
          <Text style={styles.successText}>
            If an account exists for <Text style={{ fontWeight: '700', color: '#fff' }}>{email.trim()}</Text>, we've sent a reset link. Also check your spam folder.
          </Text>
          <Link href="/login" asChild>
            <Pressable style={styles.primaryButton} onPress={() => hapticLight()}>
              <Text style={styles.primaryButtonText}>Back to sign in</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <>
          <Text style={styles.instruction}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={TEXT_SECONDARY}
              value={email}
              onChangeText={(t) => { clearError(); setSent(false); setEmail(t); }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!busy}
              returnKeyType="done"
              onSubmitEditing={handleSend}
            />
          </View>

          {/* Error banner */}
          {!!error && (
            <Pressable style={styles.errorBanner} onPress={() => clearError()}>
              <Text style={styles.errorBannerText}>{error}</Text>
              <Text style={styles.errorBannerDismiss}>Tap to dismiss</Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.primaryButton, (!canSubmit) && styles.primaryButtonDisabled]}
            disabled={!canSubmit}
            onPress={handleSend}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Send reset link</Text>
            )}
          </Pressable>

          <Text style={styles.backPrompt}>
            <Link href="/login" asChild>
              <Pressable onPress={() => hapticLight()}>
                <Text style={styles.backLink}>Back to sign in</Text>
              </Pressable>
            </Link>
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: charcoal },
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: charcoal,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  logo: {
    alignSelf: 'center',
    width: 280,
    height: 90,
    marginBottom: 32,
  },
  instruction: {
    color: TEXT_SECONDARY,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  inputWrap: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 8,
  },
  input: {
    paddingVertical: 12,
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: 16,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
  },
  errorBannerText: { fontSize: 14, color: '#fca5a5', lineHeight: 20 },
  errorBannerDismiss: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  successBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 14,
    padding: 20,
    gap: 12,
  },
  successTitle: { fontSize: 18, fontWeight: '700', color: '#4ade80', textAlign: 'center' },
  successText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: primary,
    marginTop: 8,
  },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backPrompt: { marginTop: 20, alignSelf: 'center' },
  backLink: { color: primary, fontSize: 15, textDecorationLine: 'underline', fontWeight: '500' },
});
