import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { charcoal, primary } from '@/constants/Colors';
import { hapticLight } from '@/src/lib/haptics';

export default function AuthChoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.screen, { paddingTop: insets.top, paddingBottom: Math.max(18, insets.bottom + 12) }]}>
      <View style={s.content}>
        <Image
          source={require('@/assets/images/oakedex-logo.png')}
          style={s.logo}
          resizeMode="contain"
        />
        <Text style={s.body}>Sign in to sync your binders, wanted lists, and card images across all your devices.</Text>

        <View style={s.actions}>
          <Pressable
            style={({ pressed }) => [s.primaryBtn, pressed && s.pressed]}
            onPress={() => {
              hapticLight();
              router.replace('/login');
            }}
          >
            <Text style={s.primaryText}>Log in</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.secondaryBtn, pressed && s.pressed]}
            onPress={() => {
              hapticLight();
              router.replace('/signup');
            }}
          >
            <Text style={s.secondaryText}>Sign up</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.ghostBtn, pressed && s.pressed]}
            onPress={() => {
              hapticLight();
              router.replace('/(tabs)');
            }}
          >
            <Text style={s.ghostText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: charcoal, paddingHorizontal: 20 },
  content: { flex: 1, justifyContent: 'center', maxWidth: 520, alignSelf: 'center', width: '100%' },
  logo: { alignSelf: 'center', width: 300, height: 100, marginBottom: 16 },
  body: { fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.72)', textAlign: 'center', marginBottom: 18 },
  actions: { gap: 10 },
  pressed: { opacity: 0.85 },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: primary,
  },
  primaryText: { color: '#1a1a1a', fontWeight: '900', fontSize: 16 },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(106, 68, 155, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(106, 68, 155, 0.7)',
  },
  secondaryText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  ghostBtn: { paddingVertical: 10, alignItems: 'center' },
  ghostText: { color: 'rgba(255,255,255,0.65)', fontWeight: '800' },
});

