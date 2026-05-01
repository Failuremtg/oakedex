import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { primary } from '@/constants/Colors';
import { hapticLight } from '@/src/lib/haptics';

type WelcomeModalProps = {
  visible: boolean;
  onDismiss: () => void;
  onOpenFeedback?: () => void;
};

/**
 * Welcome window shown to new users or after a major app update.
 */
export function WelcomeModal({ visible, onDismiss, onOpenFeedback }: WelcomeModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable
        style={styles.backdrop}
        onPress={() => {
          hapticLight();
          onDismiss();
        }}
      >
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Early access</Text>
          <Text style={styles.message}>
            You’re using an early access version of Oakedex. That means some features may still be in progress, and you might run into bugs.
          </Text>
          <Text style={styles.messageLast}>
            If something doesn’t work — or you’d like to request a feature — please submit feedback in your Profile settings.
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.buttonPressed]}
              onPress={() => {
                hapticLight();
                onDismiss();
              }}
            >
              <Text style={styles.secondaryText}>Not now</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={() => {
                hapticLight();
                onDismiss();
                onOpenFeedback?.();
              }}
            >
              <Text style={styles.buttonText}>Submit feedback</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#2d2d2d',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'left',
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
    textAlign: 'left',
    marginBottom: 12,
  },
  messageLast: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
    textAlign: 'left',
    marginBottom: 24,
  },
  buttonRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  secondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  secondaryText: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '700' },
  button: {
    backgroundColor: primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.9 },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
