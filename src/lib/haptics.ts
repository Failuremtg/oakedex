/**
 * Centralized haptic feedback for consistent tap/click feel.
 * Uses expo-haptics; safe to call on web (no-op or Vibration API where supported).
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

function safeHaptic(fn: () => Promise<void>) {
  if (!isNative) return;
  fn().catch(() => {});
}

/** Light impact – buttons, list items, links, card taps */
export function hapticLight() {
  safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Medium impact – primary actions (submit, confirm) */
export function hapticMedium() {
  safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Selection change – tabs, toggles, segmented controls, pickers */
export function hapticSelection() {
  safeHaptic(() => Haptics.selectionAsync());
}

/** Success notification – e.g. save complete, success state */
export function hapticSuccess() {
  safeHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  );
}

/** Warning notification – e.g. validation warning */
export function hapticWarning() {
  safeHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  );
}

/** Error notification – e.g. failed action */
export function hapticError() {
  safeHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  );
}
