import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';

type Props = {
  style?: ViewStyle;
  /**
   * 0..1. Kept subtle; cards can be bright already.
   * Default ~0.55.
   */
  intensity?: number;
  /** Adds a subtle animated shimmer sweep. */
  animated?: boolean;
};

/**
 * Simple "holo" sheen overlay.
 * Render this absolutely on top of a card image.
 */
export function HoloSheen({ style, intensity = 0.55, animated = true }: Props) {
  const a = Math.max(0, Math.min(1, intensity));
  const shimmer = useRef(new Animated.Value(0)).current;

  const shimmerDurationMs = useMemo(() => {
    // Faster when more intense so it feels "sparkly".
    const base = 2600;
    const delta = 900;
    return Math.round(base - delta * a);
  }, [a]);

  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: shimmerDurationMs,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => {
      loop.stop();
      shimmer.setValue(0);
    };
  }, [animated, shimmer, shimmerDurationMs]);

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, 140],
  });

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0.0, 0.35, 0.75, 0.35, 0.0],
  });

  return (
    <View style={[s.wrap, style]} pointerEvents="none">
      {/* Soft rainbow diagonal */}
      <LinearGradient
        colors={[
          `rgba(120, 210, 255, ${0.0 * a})`,
          `rgba(255, 120, 220, ${0.55 * a})`,
          `rgba(120, 255, 190, ${0.50 * a})`,
          `rgba(255, 240, 120, ${0.44 * a})`,
          `rgba(120, 210, 255, ${0.0 * a})`,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Specular band */}
      <LinearGradient
        colors={[
          `rgba(255,255,255, ${0.0 * a})`,
          `rgba(255,255,255, ${0.35 * a})`,
          `rgba(255,255,255, ${0.0 * a})`,
        ]}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 0.8 }}
        style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-12deg' }, { scale: 1.15 }] }]}
      />

      {/* Animated shimmer sweep */}
      <Animated.View
        style={[
          s.shimmerFrame,
          {
            transform: [{ rotate: '20deg' }, { translateX: shimmerTranslate }, { scale: 1.15 }],
            opacity: animated ? shimmerOpacity : 0.55,
          },
        ]}
      >
        <LinearGradient
          colors={[
            `rgba(255,255,255, ${0.0 * a})`,
            `rgba(255,255,255, ${0.65 * a})`,
            `rgba(255,255,255, ${0.0 * a})`,
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    overflow: 'hidden',
  },
  shimmerFrame: {
    position: 'absolute',
    left: '-35%',
    top: '-35%',
    width: '170%',
    height: '170%',
  },
});

