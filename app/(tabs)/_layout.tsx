import React, { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { Tabs, useRouter } from 'expo-router';

import { CustomTabBar } from '@/components/CustomTabBar';
import { SyncLoadingScreen } from '@/components/SyncLoadingScreen';
import { useAuth } from '@/src/auth/AuthContext';
import { isFirebaseConfigured } from '@/src/lib/firebase';
import { isCacheStale, syncCardData, syncCardDataWithProgress } from '@/src/lib/cardDataCache';
import { preloadCollectionsForDisplay } from '@/src/lib/collections';

export default function TabLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState('Preparing...');

  const maybeSyncCardData = useCallback(() => {
    isCacheStale().then((stale) => {
      if (stale) void syncCardData();
    });
  }, []);

  // No forced login: app is usable without an account (1 collection, no profile).
  // Login is required only for profile and for creating more than 1 collection.
  // useEffect that redirected to /login when !user has been removed.

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stale = await isCacheStale();
      if (!stale) {
        maybeSyncCardData();
        // Still preload binders so home/binder tabs open instantly
        void preloadCollectionsForDisplay();
        return;
      }
      if (cancelled) return;
      setSyncing(true);
      setSyncProgress(0);
      setSyncStatus('Preparing...');
      try {
        await Promise.all([
          syncCardDataWithProgress((progress, message) => {
            if (!cancelled) {
              setSyncProgress(progress);
              setSyncStatus(message);
            }
          }),
          preloadCollectionsForDisplay(),
        ]);
      } finally {
        if (!cancelled) {
          setSyncing(false);
          setSyncProgress(1);
        }
      }
    })();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') maybeSyncCardData();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [maybeSyncCardData]);

  // Always render a navigator (Tabs) on first render so we don't trigger
  // "Attempted to navigate before mounting the Root Layout". Redirect to login
  // happens in the effect above after mount.
  // Always render tabs; no redirect to login. Guests can use app with up to 1 collection.
  if (isFirebaseConfigured() && loading) {
    return (
      <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Collections' }} />
        <Tabs.Screen name="binder" options={{ title: 'Edit' }} />
        <Tabs.Screen name="prices" options={{ title: 'Card Dex' }} />
        <Tabs.Screen name="profile" options={{ title: 'Trainer ID' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
        <Tabs.Screen name="collection" options={{ href: null }} />
        <Tabs.Screen name="search" options={{ href: null }} />
        <Tabs.Screen name="two" options={{ href: null }} />
      </Tabs>
    );
  }

  if (syncing) {
    return (
      <SyncLoadingScreen progress={syncProgress} statusText={syncStatus} />
    );
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Collections' }} />
      <Tabs.Screen name="binder" options={{ title: 'Edit' }} />
      <Tabs.Screen name="prices" options={{ title: 'Card Dex' }} />
      <Tabs.Screen name="profile" options={{ title: 'Trainer ID' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      <Tabs.Screen name="collection" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}
