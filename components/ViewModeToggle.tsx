import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ViewMode } from '@/src/lib/viewModeStorage';
import { hapticSelection } from '@/src/lib/haptics';

type ViewModeToggleProps = {
  mode: ViewMode;
  onToggle: (next: ViewMode) => void;
  label?: boolean;
};

export function ViewModeToggle({ mode, onToggle, label }: ViewModeToggleProps) {
  const next = mode === 'grid' ? 'list' : 'grid';
  return (
    <Pressable
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      onPress={() => {
        hapticSelection();
        onToggle(next);
      }}
      accessibilityLabel={`View as ${next}`}
    >
      <FontAwesome
        name={mode === 'grid' ? 'th-large' : 'list'}
        size={20}
        color="rgba(255,255,255,0.9)"
      />
      {label && (
        <Text style={styles.label}>{mode === 'grid' ? 'Grid' : 'List'}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  pressed: { opacity: 0.8 },
  label: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
});
