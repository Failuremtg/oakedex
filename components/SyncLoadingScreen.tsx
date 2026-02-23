import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { charcoal } from '@/constants/Colors';

const POKEMON_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png';
const POKEBALL_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';

const BAR_HEIGHT = 28;
const POKEBALL_SIZE = 36;
const SPRITE_SIZE = 48;
const BAR_PADDING_H = 24;

type SyncLoadingScreenProps = {
  /** 0–1 for determinate progress; omit for indeterminate (animated bar + sprite). */
  progress?: number;
  /** Status message below the bar. Default "Loading..." when progress is omitted. */
  statusText?: string;
};

export function SyncLoadingScreen({ progress, statusText }: SyncLoadingScreenProps) {
  const screenWidth = Dimensions.get('window').width;
  const barWidth = Math.min(screenWidth - BAR_PADDING_H * 2, 320);
  const spriteX = useSharedValue(0);
  const fillProgress = useSharedValue(progress ?? 0);
  const isIndeterminate = progress === undefined;

  useEffect(() => {
    if (typeof progress === 'number') {
      fillProgress.value = Math.max(0, Math.min(1, progress));
    }
  }, [progress]);

  useEffect(() => {
    spriteX.value = 0;
    spriteX.value = withRepeat(
      withTiming(barWidth - SPRITE_SIZE, { duration: 2000 }),
      -1,
      true
    );
  }, [barWidth]);

  useEffect(() => {
    if (!isIndeterminate) return;
    fillProgress.value = 0;
    fillProgress.value = withRepeat(
      withTiming(0.85, { duration: 1200 }),
      -1,
      true
    );
  }, [isIndeterminate]);

  const spriteAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: spriteX.value }],
  }));

  const fillWidthStyle = useAnimatedStyle(() => {
    'worklet';
    const w = Math.max(BAR_HEIGHT, fillProgress.value * barWidth);
    return { width: w };
  });

  const pokeballLeftStyle = useAnimatedStyle(() => {
    'worklet';
    return { left: fillProgress.value * (barWidth - POKEBALL_SIZE) };
  });

  return (
    <View style={styles.container}>
      <View style={[styles.barTrack, { width: barWidth }]}>
        <Animated.View style={[styles.barFill, fillWidthStyle]} />
        <Animated.View style={[styles.pokeballWrap, pokeballLeftStyle]}>
          <Image
            source={{ uri: POKEBALL_URL }}
            style={styles.pokeball}
            resizeMode="contain"
          />
        </Animated.View>
        <Animated.View style={[styles.spriteWrap, spriteAnimatedStyle]}>
          <Image
            source={{ uri: POKEMON_SPRITE_URL }}
            style={styles.sprite}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
      <Text style={styles.statusText} numberOfLines={1}>
        {statusText ?? (isIndeterminate ? 'Loading...' : 'Preparing...')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: charcoal,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: BAR_PADDING_H,
  },
  barTrack: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'visible',
    position: 'relative',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#e53935',
    borderRadius: BAR_HEIGHT / 2,
    minWidth: BAR_HEIGHT,
  },
  pokeballWrap: {
    position: 'absolute',
    top: (BAR_HEIGHT - POKEBALL_SIZE) / 2,
    width: POKEBALL_SIZE,
    height: POKEBALL_SIZE,
    zIndex: 2,
  },
  pokeball: {
    width: POKEBALL_SIZE,
    height: POKEBALL_SIZE,
  },
  spriteWrap: {
    position: 'absolute',
    top: (BAR_HEIGHT - SPRITE_SIZE) / 2 - 8,
    width: SPRITE_SIZE,
    height: SPRITE_SIZE + 16,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sprite: {
    width: SPRITE_SIZE,
    height: SPRITE_SIZE,
  },
  statusText: {
    marginTop: 16,
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    maxWidth: 280,
  },
});
