import React from 'react';
import { Stack } from 'expo-router';
import { charcoal } from '@/constants/Colors';

export default function ParentInsightLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: charcoal },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: charcoal },
        headerShadowVisible: false,
      }}
    />
  );
}

