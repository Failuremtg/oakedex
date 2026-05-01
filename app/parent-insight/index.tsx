import React, { useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { Text } from '@/components/Themed';
import { MOCK_INSIGHTS } from '@/src/parentInsight/mock/mockInsights';
import { ExampleChip } from '@/src/parentInsight/ui/ExampleChip';
import { PrimaryButton } from '@/src/parentInsight/ui/PrimaryButton';
import { ScreenContainer } from '@/src/parentInsight/ui/ScreenContainer';
import { parentInsightTheme } from '@/src/parentInsight/ui/ParentInsightTheme';

export default function ParentInsightHomeScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const examples = useMemo(() => MOCK_INSIGHTS.map((e) => e.examplePrompt), []);

  const canAsk = query.trim().length > 0;

  const ask = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    router.push({ pathname: '/parent-insight/result', params: { q: trimmed } });
  };

  return (
    <ScreenContainer>
      <Stack.Screen
        options={{
          title: 'Clarivo',
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/parent-insight/history')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
            >
              <Text style={styles.headerBtnText}>History</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Clarivo</Text>
          <Text style={styles.subtitle}>
            Simple, calm explanations for the online worlds your child cares about.
          </Text>

          <View style={styles.inputWrap}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Try: “What does OP mean?”"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.input}
              autoCorrect={true}
              autoCapitalize="sentences"
              returnKeyType="search"
              onSubmitEditing={() => ask(query)}
              accessibilityLabel="Ask a question"
              accessibilityHint="Type a topic your child mentioned, then press Ask."
            />
            <PrimaryButton
              label="Ask"
              onPress={() => ask(query)}
              disabled={!canAsk}
              accessibilityHint="Gets a short explanation and conversation ideas."
            />
          </View>

          <View style={styles.examples}>
            <Text style={styles.examplesTitle}>Not sure what to ask? Try one of these.</Text>
            <View style={styles.chips}>
              {examples.map((ex) => (
                <ExampleChip
                  key={ex}
                  label={ex}
                  onPress={() => {
                    setQuery(ex);
                    ask(ex);
                  }}
                />
              ))}
            </View>
          </View>

          <View style={styles.trustRow}>
            <Text style={styles.trustText}>
              This is here to support real conversations—not replace them.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: 18,
    paddingTop: 22,
    gap: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: parentInsightTheme.text,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: parentInsightTheme.textMuted,
  },
  inputWrap: {
    gap: 12,
  },
  input: {
    backgroundColor: parentInsightTheme.inputBg,
    borderColor: parentInsightTheme.inputBorder,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: parentInsightTheme.text,
  },
  examples: {
    gap: 10,
    paddingTop: 6,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: parentInsightTheme.text,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  trustRow: {
    paddingTop: 10,
  },
  trustText: {
    fontSize: 13,
    color: parentInsightTheme.textMuted,
  },
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  headerBtnPressed: { opacity: 0.85 },
  headerBtnText: { color: parentInsightTheme.textMuted, fontWeight: '800' },
});

