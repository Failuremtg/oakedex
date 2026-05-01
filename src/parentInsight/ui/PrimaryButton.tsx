import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { primary } from '@/constants/Colors';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={disabled ? { disabled: true } : {}}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

