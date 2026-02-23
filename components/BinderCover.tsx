/**
 * Binder spine/cover – spine and rings neutral; front cover in Pokémon type color.
 */
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const DEFAULT_ACCENT = '#A8A878';

/** Spine width as fraction of total width (left edge). */
const SPINE_FRACTION = 0.14;
/** Ring strip width (metal bar with rings). */
const RING_STRIP_WIDTH = 6;
const CORNER_RADIUS = 10;

/** Slightly darker for shadow/crease on cover edge. */
const COVER_SHADOW = 'rgba(0,0,0,0.12)';
/** Spine: neutral grey. */
const SPINE_FILL = '#3d3d3d';
/** Spine subtle highlight (top curve). */
const SPINE_HIGHLIGHT = 'rgba(255,255,255,0.06)';
/** Ring metal. */
const RING_STRIP = '#5a5a5a';
const RING_HOLE = 'rgba(0,0,0,0.35)';
const RING_HOLE_SUBTLE = 'rgba(0,0,0,0.12)';

type BinderCoverProps = {
  source?: number;
  width: number;
  height: number;
  color?: string;
  /** When true, ring holes (dots) are less visible – e.g. for small thumbnails. */
  subtleRings?: boolean;
};

function DrawnBinder({ width, height, color = DEFAULT_ACCENT, subtleRings }: BinderCoverProps) {
  const spineWidth = Math.max(10, width * SPINE_FRACTION);
  const coverLeft = spineWidth + RING_STRIP_WIDTH;
  const coverWidth = width - coverLeft;
  const ringCount = 3;
  const ringR = 3;
  const ringHoleColor = subtleRings ? RING_HOLE_SUBTLE : RING_HOLE;

  return (
    <View
      style={[
        styles.outer,
        {
          width,
          height,
          borderRadius: CORNER_RADIUS,
          overflow: 'hidden',
        },
      ]}
    >
      {/* Spine (left) – neutral grey only */}
      <View
        style={[
          styles.spine,
          {
            width: spineWidth,
            left: 0,
            top: 0,
            bottom: 0,
            borderTopLeftRadius: CORNER_RADIUS,
            borderBottomLeftRadius: CORNER_RADIUS,
            backgroundColor: SPINE_FILL,
          },
        ]}
      />
      <View
        style={[
          styles.spineHighlight,
          {
            width: spineWidth,
            left: 0,
            top: 0,
            height: height * 0.4,
            borderTopLeftRadius: CORNER_RADIUS,
          },
        ]}
      />

      {/* Ring strip (metal bar) */}
      <View
        style={[
          styles.ringStrip,
          {
            left: spineWidth,
            top: 0,
            bottom: 0,
            width: RING_STRIP_WIDTH,
          },
        ]}
      />
      {Array.from({ length: ringCount }, (_, i) => {
        const cy = height * (0.2 + (0.6 * i) / (ringCount - 1 || 1));
        return (
          <View
            key={i}
            style={[
              styles.ringHole,
              {
                left: spineWidth + (RING_STRIP_WIDTH - ringR * 2) / 2,
                top: cy - ringR,
                width: ringR * 2,
                height: ringR * 2,
                borderRadius: ringR,
                backgroundColor: ringHoleColor,
              },
            ]}
          />
        );
      })}

      {/* Front cover – full binder color (Pokémon type color) */}
      <View
        style={[
          styles.cover,
          {
            left: coverLeft,
            top: 0,
            width: coverWidth,
            height,
            borderTopRightRadius: CORNER_RADIUS,
            borderBottomRightRadius: CORNER_RADIUS,
            backgroundColor: color,
          },
        ]}
      />
      {/* Cover inner shadow (left edge where it meets spine) */}
      <View
        style={[
          styles.coverShadow,
          {
            left: coverLeft,
            top: 0,
            width: 8,
            height,
            borderTopRightRadius: 2,
            borderBottomRightRadius: 2,
          },
        ]}
      />
      {/* Top bevel highlight */}
      <View
        style={[
          styles.coverBevel,
          {
            left: coverLeft,
            top: 0,
            right: 0,
            height: 4,
            borderTopRightRadius: CORNER_RADIUS,
          },
        ]}
      />
    </View>
  );
}

export function BinderCover({ source, width, height, color, subtleRings }: BinderCoverProps) {
  if (source != null) {
    return (
      <Image
        source={source}
        style={{ width, height, borderRadius: CORNER_RADIUS }}
        resizeMode="cover"
      />
    );
  }
  return (
    <DrawnBinder
      width={width}
      height={height}
      color={color ?? DEFAULT_ACCENT}
      subtleRings={subtleRings}
    />
  );
}

const styles = StyleSheet.create({
  outer: {
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  spine: {
    position: 'absolute',
  },
  spineHighlight: {
    position: 'absolute',
    backgroundColor: SPINE_HIGHLIGHT,
  },
  ringStrip: {
    position: 'absolute',
    backgroundColor: RING_STRIP,
  },
  ringHole: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  cover: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  coverShadow: {
    position: 'absolute',
    backgroundColor: COVER_SHADOW,
  },
  coverBevel: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});
