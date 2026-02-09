import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <Icon sf="moon.stars.fill" />
        <Label>Prayer Times</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
