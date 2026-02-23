/**
 * Custom bottom tab bar that always shows icon + label (fixes missing labels on some platforms).
 */
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { charcoal, primary } from '@/constants/Colors';
import { hapticSelection } from '@/src/lib/haptics';

const ICON_SIZE = 24;
const POKEBALL_SIZE = 22;
const POKEBALL_BUTTON = 6;

function MenuPokeBall() {
  return (
    <View style={[styles.pokeBallOuter, { width: POKEBALL_SIZE, height: POKEBALL_SIZE, borderRadius: POKEBALL_SIZE / 2 }]}>
      <View style={[styles.pokeBallTop, { height: POKEBALL_SIZE / 2 }]} />
      <View style={[styles.pokeBallBottom, { height: POKEBALL_SIZE / 2 }]} />
      <View style={[styles.pokeBallLine, { width: POKEBALL_SIZE, height: 2, marginTop: -1 }]} />
      <View
        style={[
          styles.pokeBallButton,
          {
            width: POKEBALL_BUTTON,
            height: POKEBALL_BUTTON,
            borderRadius: POKEBALL_BUTTON / 2,
            borderWidth: 1.5,
          },
        ]}
      />
    </View>
  );
}

const TAB_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentProps<typeof FontAwesome>['name'] }
> = {
  index: { label: 'Collections', icon: 'book' },
  binder: { label: 'Edit', icon: 'pencil' },
  prices: { label: 'Card Dex', icon: 'th' },
  profile: { label: 'Profile', icon: 'user' },
  settings: { label: 'Settings', icon: 'cog' },
};

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  const visibleRoutes = state.routes.filter((route) => route.name in TAB_CONFIG);

  return (
    <View style={[styles.bar, { paddingBottom: bottomPadding }]}>
      <View style={styles.borderStrip}>
        <View style={styles.borderLine} />
        <View style={styles.pokeBallWrap}>
          <MenuPokeBall />
        </View>
        <View style={styles.borderLine} />
      </View>
      <View style={styles.tabRow}>
        {visibleRoutes.map((route) => {
          const routeIndex = state.routes.findIndex((r) => r.key === route.key);
          const config = TAB_CONFIG[route.name];
          const label = config?.label ?? route.name;
          const iconName = config?.icon ?? 'circle';
          const isFocused = state.index === routeIndex;
          const color = isFocused ? primary : '#a0a0a0';

          const onPress = () => {
            hapticSelection();
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tab,
                pressed && styles.tabPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label}
            >
              <FontAwesome name={iconName} size={ICON_SIZE} color={color} />
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: charcoal,
    paddingTop: 0,
  },
  borderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  borderLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1,
  },
  pokeBallWrap: {
    marginHorizontal: 8,
    marginTop: -14,
    zIndex: 1,
  },
  pokeBallOuter: {
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#333',
  },
  pokeBallTop: {
    width: '100%',
    backgroundColor: '#e53935',
  },
  pokeBallBottom: {
    width: '100%',
    backgroundColor: '#fff',
  },
  pokeBallLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    backgroundColor: '#333',
    width: '100%',
  },
  pokeBallButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -POKEBALL_BUTTON / 2,
    marginTop: -POKEBALL_BUTTON / 2,
    backgroundColor: '#fff',
    borderColor: '#333',
  },
  tabRow: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabPressed: { opacity: 0.7 },
  label: {
    fontSize: 12,
    marginTop: 4,
  },
});
