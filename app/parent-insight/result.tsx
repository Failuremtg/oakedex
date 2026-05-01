import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { Text } from '@/components/Themed';
import { DEFAULT_SECTION_TITLES, type ParentInsight } from '@/src/parentInsight/types';
import { generateParentInsight } from '@/src/parentInsight/generateParentInsight';
import { addParentInsightHistoryItem } from '@/src/parentInsight/history/historyStorage';
import { InsightCard } from '@/src/parentInsight/ui/InsightCard';
import { PrimaryButton } from '@/src/parentInsight/ui/PrimaryButton';
import { ScreenContainer } from '@/src/parentInsight/ui/ScreenContainer';
import { parentInsightTheme } from '@/src/parentInsight/ui/ParentInsightTheme';

type LoadState =
  | { status: 'idle' | 'loading' }
  | { status: 'success'; insight: ParentInsight }
  | { status: 'error'; message: string };

export default function ParentInsightResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const question = useMemo(() => (params.q ?? '').toString(), [params.q]);

  const [state, setState] = useState<LoadState>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!question.trim()) {
        setState({ status: 'error', message: 'Try asking a short question like “What is Roblox?”' });
        return;
      }
      setState({ status: 'loading' });
      try {
        const insight = await generateParentInsight(question);
        void addParentInsightHistoryItem(question, insight);
        if (!cancelled) setState({ status: 'success', insight });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Something went wrong.';
        if (!cancelled) setState({ status: 'error', message: msg });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [question]);

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: 'Clarivo' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        >
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.label}>Your question</Text>
          <Text style={styles.question}>{question || '—'}</Text>
        </View>

        {state.status === 'loading' || state.status === 'idle' ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.loadingText}>Putting it into plain language…</Text>
          </View>
        ) : state.status === 'error' ? (
          <View style={styles.error}>
            <Text style={styles.errorTitle}>Couldn’t load an answer</Text>
            <Text style={styles.errorText}>{state.message}</Text>
            <PrimaryButton label="Try again" onPress={() => router.replace({ pathname: '/parent-insight/result', params: { q: question } })} />
            <PrimaryButton label="Ask another" onPress={() => router.replace('/parent-insight')} />
          </View>
        ) : (
          <View style={styles.cards}>
            <InsightCard title={DEFAULT_SECTION_TITLES.whatItIsTitle}>
              <Text style={styles.bodyText}>{state.status === 'success' ? state.insight.whatItIs : ''}</Text>
            </InsightCard>

            <InsightCard title={DEFAULT_SECTION_TITLES.whyKidsCareTitle}>
              <Text style={styles.bodyText}>{state.status === 'success' ? state.insight.whyKidsCare : ''}</Text>
            </InsightCard>

            <InsightCard title={DEFAULT_SECTION_TITLES.conversationStartersTitle}>
              <View style={styles.list}>
                {(state.status === 'success' ? state.insight.conversationStarters : []).slice(0, 5).map((q: string, idx: number) => (
                  <View key={`${idx}-${q}`} style={styles.listRow}>
                    <Text style={styles.bullet}>{'\u2022'}</Text>
                    <Text style={styles.listText}>{q}</Text>
                  </View>
                ))}
              </View>
            </InsightCard>

            {state.status === 'success' && state.insight.goodToKnow ? (
              <InsightCard title={DEFAULT_SECTION_TITLES.goodToKnowTitle}>
                <Text style={styles.bodyText}>{state.insight.goodToKnow}</Text>
              </InsightCard>
            ) : null}

            <View style={styles.footer}>
              <PrimaryButton label="Ask another" onPress={() => router.replace('/parent-insight')} />
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 18,
    paddingTop: 16,
    gap: 14,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  backPressed: { opacity: 0.85 },
  backText: { color: parentInsightTheme.textMuted, fontWeight: '700' },
  header: { gap: 6, paddingTop: 4 },
  label: { color: parentInsightTheme.textMuted, fontSize: 12, fontWeight: '700' },
  question: { color: parentInsightTheme.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  loading: {
    marginTop: 18,
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  loadingText: { color: parentInsightTheme.textMuted, fontSize: 14, fontWeight: '600' },
  error: { gap: 12, paddingTop: 10 },
  errorTitle: { color: parentInsightTheme.text, fontSize: 18, fontWeight: '800' },
  errorText: { color: parentInsightTheme.textMuted, fontSize: 14, lineHeight: 20 },
  cards: { gap: 12 },
  bodyText: { color: parentInsightTheme.text, fontSize: 14, lineHeight: 20 },
  list: { gap: 8 },
  listRow: { flexDirection: 'row', gap: 10 },
  bullet: { color: parentInsightTheme.textMuted, marginTop: 2 },
  listText: { flex: 1, color: parentInsightTheme.text, fontSize: 14, lineHeight: 20 },
  footer: { paddingTop: 6 },
});

