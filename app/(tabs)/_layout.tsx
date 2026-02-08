import React from 'react';
import { Stack } from 'expo-router';

export default function TabLayout() {
  // Simple single-screen layout for Ramadan prayer times
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen name="(home)" />
    </Stack>
  );
}
