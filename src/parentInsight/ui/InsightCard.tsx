import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { parentInsightTheme } from '@/src/parentInsight/ui/ParentInsightTheme';

export function InsightCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: parentInsightTheme.card,
    borderColor: parentInsightTheme.cardBorder,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: parentInsightTheme.text,
    marginBottom: 8,
  },
  body: {
    gap: 8,
  },
});

