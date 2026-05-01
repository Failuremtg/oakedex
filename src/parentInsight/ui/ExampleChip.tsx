import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/Themed';
import { parentInsightTheme } from '@/src/parentInsight/ui/ParentInsightTheme';

export function ExampleChip({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: parentInsightTheme.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: parentInsightTheme.cardBorder,
  },
  pressed: { opacity: 0.8 },
  text: {
    fontSize: 13,
    color: parentInsightTheme.textMuted,
    fontWeight: '600',
  },
});

