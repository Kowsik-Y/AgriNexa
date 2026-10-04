import React from 'react';
import { Stack } from 'expo-router';
import { CustomHeader } from '@/components/CustomHeader';

export default function NonTabsLayout() {
  return (
    <Stack
      screenOptions={{
        header: (props) => <CustomHeader {...props} />,
        animation: 'default',
      }}
    >
      <Stack.Screen name="scan" options={{ title: 'Crop Scan' }} />
      <Stack.Screen name="assistant" options={{ headerShown: false }} />
      <Stack.Screen name="advice" options={{ title: 'Crop Advice' }} />
      <Stack.Screen name="reports" options={{ title: 'Reports' }} />
      <Stack.Screen name="daily-check" options={{ title: 'Daily Health Check' }} />
      <Stack.Screen name="weather-hourly" options={{ title: 'Weather' }} />
      <Stack.Screen name="ml-test-lab" options={{ title: 'ML Test Lab' }} />
      <Stack.Screen name="stage-model-test" options={{ title: 'Stage Model Test' }} />
      <Stack.Screen name="update-farming-flow" options={{ title: 'Update Farming Flow' }} />

      {/* Settings Sub-routes */}
      <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
      <Stack.Screen name="settings/change-password" options={{ title: 'Change Password' }} />
      <Stack.Screen name="settings/dashboard-layout" options={{ title: 'Dashboard Layout' }} />
      <Stack.Screen name="settings/help-support" options={{ title: 'Help & Support' }} />
      <Stack.Screen name="settings/notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="settings/personal-details" options={{ title: 'Personal Details' }} />
      <Stack.Screen name="settings/privacy" options={{ title: 'Privacy & Security' }} />
      <Stack.Screen name="settings/region-currency" options={{ title: 'Region & Currency' }} />

      {/* Profile Sub-routes */}
      <Stack.Screen name="profile/edit-profile" options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="profile/personal-details" options={{ title: 'Personal Details' }} />
    </Stack>
  );
}
