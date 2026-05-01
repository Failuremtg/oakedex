import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { Text } from '@/components/Themed';
import { PrimaryButton } from '@/src/parentInsight/ui/PrimaryButton';
import { ScreenContainer } from '@/src/parentInsight/ui/ScreenContainer';
import { parentInsightTheme } from '@/src/parentInsight/ui/ParentInsightTheme';
import {
  clearParentInsightHistory,
  loadParentInsightHistory,
  type ParentInsightHistoryItem,
} from '@/src/parentInsight/history/historyStorage';

export default function ParentInsightHistoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ParentInsightHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    loadParentInsightHistory()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onClear = () => {
    Alert.alert('Clear history?', 'This removes your recent questions from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearParentInsightHistory();
          refresh();
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <Stack.Screen
        options={{
          title: 'History',
          headerRight: () => (
            <Pressable onPress={onClear} accessibilityRole="button" style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Recent questions</Text>
        <Text style={styles.subtitle}>
          A quick place to revisit topics you’ve looked up.
        </Text>

        {loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Loading…</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptyText}>
              Ask a question on the home screen and it’ll show up here.
            </Text>
            <PrimaryButton label="Ask a question" onPress={() => router.replace('/parent-insight')} />
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push({ pathname: '/parent-insight/result', params: { q: item.question } })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {item.question}
                </Text>
                <Text style={styles.rowMeta}>
                  Tap to view the explanation again
                </Text>
              </Pressable>
            ))}
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
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: parentInsightTheme.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: parentInsightTheme.textMuted,
  },
  list: {
    gap: 10,
    paddingTop: 6,
  },
  row: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    gap: 6,
  },
  rowTitle: {
    color: parentInsightTheme.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  rowMeta: {
    color: parentInsightTheme.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    marginTop: 10,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    gap: 10,
  },
  emptyTitle: {
    color: parentInsightTheme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: parentInsightTheme.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  clearText: { color: parentInsightTheme.textMuted, fontWeight: '800' },
  pressed: { opacity: 0.85 },
});

