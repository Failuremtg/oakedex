import React from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text } from 'react-native';
import { primary } from '@/constants/Colors';
import { hapticLight } from '@/src/lib/haptics';

const BUG_REPORT_URL = 'https://www.oakedex.com';

type WelcomeModalProps = {
  visible: boolean;
  onDismiss: () => void;
};

/**
 * Welcome window shown to new users or after a major app update.
 */
export function WelcomeModal({ visible, onDismiss }: WelcomeModalProps) {
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
          <Text style={styles.title}>Welcome to Oakedex BETA</Text>
          <Text style={styles.message}>
            As this is the beta version of the app, errors and problems might occur.
          </Text>
          <Text style={styles.message}>
            Please report any bugs or issues you find at{' '}
            <Pressable
              onPress={() => {
                hapticLight();
                Linking.openURL(BUG_REPORT_URL);
              }}
              hitSlop={8}
            >
              <Text style={styles.url}>www.oakedex.com</Text>
            </Pressable>
          </Text>
          <Text style={styles.messageLast}>
            Thank you, and hope you enjoy the app!
          </Text>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => {
              hapticLight();
              onDismiss();
            }}
          >
            <Text style={styles.buttonText}>Got it</Text>
          </Pressable>
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
    textAlign: 'center',
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 12,
  },
  messageLast: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  url: {
    color: primary,
    fontWeight: '600',
    fontSize: 20,
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: primary,
    paddingVertical: 14,
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
