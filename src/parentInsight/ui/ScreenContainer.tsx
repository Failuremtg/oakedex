import React from 'react';
import { SafeAreaView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { parentInsightTheme } from '@/src/parentInsight/ui/ParentInsightTheme';

export function ScreenContainer({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <SafeAreaView style={[styles.root, style]}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: parentInsightTheme.background,
  },
});

