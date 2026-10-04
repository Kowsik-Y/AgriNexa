import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';

import { DesktopSidebar } from '@/components/DesktopSidebar';

export default function PrivateLayout() {
  const { width } = useWindowDimensions();
  const showSidebar = width >= 768;

  return (
    <View className="flex-1 bg-background" style={{ flexDirection: showSidebar ? 'row' : 'column' }}>
      {showSidebar && <DesktopSidebar />}
      <View className="flex-1">
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(non-tabs)" options={{ headerShown: false }} />
        </Stack>
      </View>
    </View>
  );
}
