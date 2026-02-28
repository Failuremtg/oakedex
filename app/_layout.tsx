import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { AuthProvider } from '@/src/auth/AuthContext';
import { SubscriptionProvider } from '@/src/subscription/SubscriptionContext';
import { charcoal } from '@/constants/Colors';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={DarkTheme}>
        <AuthProvider>
          <SubscriptionProvider>
          <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="login"
            options={{
              title: 'Log in',
              headerShown: true,
              contentStyle: { backgroundColor: charcoal },
            }}
          />
          <Stack.Screen
            name="signup"
            options={{
              title: 'Create account',
              headerShown: true,
              contentStyle: { backgroundColor: charcoal },
            }}
          />
          <Stack.Screen
            name="forgot-password"
            options={{
              title: 'Reset password',
              headerShown: true,
              contentStyle: { backgroundColor: charcoal },
            }}
          />
          <Stack.Screen
            name="binder/[id]"
            options={{
              title: 'Binder',
              contentStyle: { backgroundColor: charcoal },
            }}
          />
          <Stack.Screen name="card-picker" options={{ title: 'Choose card', presentation: 'modal' }} />
          <Stack.Screen name="card-search-add" options={{ title: 'Add card', presentation: 'modal' }} />
          <Stack.Screen name="new-single" options={{ title: 'New Single Pokémon' }} />
          <Stack.Screen name="new-master-set" options={{ title: 'New Master Set' }} />
          <Stack.Screen name="new-by-set" options={{ title: 'Specific Set Collection' }} />
          <Stack.Screen name="new-custom" options={{ title: 'Custom binder' }} />
          <Stack.Screen
            name="admin"
            options={{
              title: 'Admin console',
              headerShown: false,
              contentStyle: { backgroundColor: charcoal },
            }}
          />
          <Stack.Screen
            name="admin-master-set"
            options={{
              title: 'Grandmaster binder',
              headerShown: false,
              contentStyle: { backgroundColor: charcoal },
            }}
          />
          <Stack.Screen
            name="admin-missing-images"
            options={{
              title: 'Missing images',
              headerShown: false,
              contentStyle: { backgroundColor: charcoal },
            }}
          />
          <Stack.Screen
            name="admin-feedback"
            options={{
              title: 'Feedback',
              headerShown: true,
              contentStyle: { backgroundColor: charcoal },
            }}
          />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="paywall"
            options={{
              title: 'Subscribe',
              presentation: 'modal',
              contentStyle: { backgroundColor: charcoal },
            }}
          />
          </Stack>
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
