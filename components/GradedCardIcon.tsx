import React from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  size: number;
};

/**
 * Simple drawn icon for a graded card slab (no image assets needed).
 * Kept intentionally minimal so it reads well at tiny sizes.
 */
export function GradedCardIcon({ size }: Props) {
  // Match the reference slab proportions: squarer corners, thick clear border,
  // top label window, and subtle internal rails.
  // We draw the slab inside a square so the icon fits existing layouts,
  // but the slab itself should feel taller and less wide.
  const slabW = Math.round(size * 0.72);
  const slabH = Math.round(size * 0.92);
  const slabLeft = Math.round((size - slabW) / 2);
  const slabTop = Math.round((size - slabH) / 2);

  const radius = Math.max(6, Math.round(slabW * 0.14));
  const pad = Math.max(3, Math.round(slabW * 0.09));
  const border = Math.max(2, Math.round(slabW * 0.08));
  const labelH = Math.max(8, Math.round(slabH * 0.22));
  const gap = Math.max(2, Math.round(slabH * 0.035));
  const labelTop = pad;
  const labelLeft = pad + border;
  const labelRight = pad + border;
  const labelBottomY = labelTop + labelH;
  const windowTop = labelBottomY + gap;

  return (
    <View style={[s.frame, { width: size, height: size }]}>
      <View
        style={[
          s.outer,
          {
            position: 'absolute',
            left: slabLeft,
            top: slabTop,
            width: slabW,
            height: slabH,
            borderRadius: radius,
            padding: border,
          },
        ]}
      >
        {/* Inner clear wall (creates thick slab border) */}
        <View style={[s.innerWall, { borderRadius: Math.max(4, radius - 2) }]} />

        {/* Top label window */}
        <View
          style={[
            s.labelWindow,
            {
              left: labelLeft,
              right: labelRight,
              top: labelTop,
              height: labelH,
              borderRadius: Math.max(4, Math.round(radius * 0.55)),
            },
          ]}
        />

        {/* Separator line between label and card area */}
        <View
          style={[
            s.separator,
            {
              left: pad,
              right: pad,
              top: labelBottomY + Math.max(1, Math.round(gap * 0.2)),
            },
          ]}
        />

        <View
          style={[
            s.window,
            {
              left: pad + border,
              right: pad + border,
              top: windowTop,
              bottom: pad + border,
              borderRadius: Math.max(4, Math.round(radius * 0.55)),
            },
          ]}
        >
          {/* internal rails like the reference */}
          <View style={s.railTop} />
          <View style={s.railBottom} />
          <View style={s.railLeft} />
          <View style={s.railRight} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  frame: {
    // Keeps layout square while drawing a portrait slab inside.
    position: 'relative',
  },
  outer: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 1, height: 2 },
    elevation: 3,
    overflow: 'hidden',
  },
  innerWall: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
  },
  labelWindow: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  separator: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  window: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(0,0,0,0.30)',
    overflow: 'hidden',
  },
  railTop: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    top: '10%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.26)',
    borderRadius: 2,
  },
  railBottom: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    bottom: '10%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.26)',
    borderRadius: 2,
  },
  railLeft: {
    position: 'absolute',
    left: '12%',
    top: '16%',
    bottom: '16%',
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 2,
  },
  railRight: {
    position: 'absolute',
    right: '12%',
    top: '16%',
    bottom: '16%',
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 2,
  },
});

