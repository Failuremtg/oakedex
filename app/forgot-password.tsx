import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/Themed';
import { useAuth } from '@/src/auth/AuthContext';
import { charcoal, primary } from '@/constants/Colors';

const BORDER = 'rgba(255,255,255,0.2)';
const TEXT_SECONDARY = 'rgba(255,255,255,0.75)';

export default function ForgotPasswordScreen() {
  const { sendPasswordResetEmail, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = useCallback(async () => {
    clearError();
    setSent(false);
    const e = email.trim();
    if (!e) return;
    setBusy(true);
    const ok = await sendPasswordResetEmail(e);
    setBusy(false);
    if (ok) setSent(true);
  }, [email, sendPasswordResetEmail, clearError]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={true}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.instruction}>
        Enter the email address for your account and we&apos;ll send you a link to reset your password.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={TEXT_SECONDARY}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!busy}
      />

      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {sent && (
        <Text style={styles.successText}>
          If an account exists for this email, we&apos;ve sent a link to reset your password. Check your inbox and spam folder.
        </Text>
      )}

      <Pressable
        style={[styles.primaryButton, busy && styles.primaryButtonDisabled]}
        disabled={busy}
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
          <Pressable>
            <Text style={styles.backLink}>Back to sign in</Text>
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
    backgroundColor: charcoal,
    paddingBottom: 40,
  },
  instruction: {
    color: TEXT_SECONDARY,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 0,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  errorText: { color: '#ef4444', fontSize: 14, marginBottom: 8 },
  successText: { color: '#22c55e', fontSize: 14, marginBottom: 12 },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: primary,
    marginTop: 8,
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backPrompt: { marginTop: 24 },
  backLink: { color: primary, fontSize: 15, textDecorationLine: 'underline', fontWeight: '500' },
});
