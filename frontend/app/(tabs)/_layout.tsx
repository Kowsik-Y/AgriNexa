import { Tabs } from 'expo-router';
import React from 'react';
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { Home, TrendingUp, Tractor, User, LayoutDashboard, Store } from 'lucide-react-native';
import { Typography } from '@/components/ui/Typography';

import { HapticTab } from '@/components/haptic-tab';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function TabLayout() {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const primaryScreens = [
    { name: 'index', title: 'Home', icon: Home },
    { name: 'agriflow', title: 'AgriFlow', icon: Tractor },
    { name: 'tools', title: 'Tools', icon: LayoutDashboard },
    { name: 'prices', title: 'Prices', icon: Store },
    { name: 'profile', title: 'Profile', icon: User },
  ] as const;

  const hiddenScreens = [
    'assistant',
    'advice',
    'reports',
    'settings',
    'scan',
    'daily-check',
    'weather-hourly',
    'weather-timeline',
    'update-farming-flow',
    'stage-model-test',
    'ml-test-lab',
  ] as const;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.mainContent}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: colors.tint,
            tabBarInactiveTintColor: colors.icon,
            headerShown: false,
            tabBarButton: HapticTab,
            tabBarStyle: {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              borderTopWidth: 1,
              height: 80,
              paddingBottom: 20,
              paddingTop: 10,
              display: isDesktop ? 'none' : 'flex',
            },
            tabBarLabel: ({ color, children }) => (
              <Typography.P style={{ color, fontSize: 10, fontWeight: '600', marginTop: 2 }}>
                {children}
              </Typography.P>
            ),
          }}
        >
          {primaryScreens.map((screen) => {
            const Icon = screen.icon;
            return (
              <Tabs.Screen
                key={screen.name}
                name={screen.name}
                options={{
                  title: screen.title,
                  tabBarIcon: ({ color }) => (
                    <Icon size={22} color={color} strokeWidth={1.5} />
                  ),
                }}
              />
            );
          })}
          {hiddenScreens.map((name) => (
            <Tabs.Screen key={name} name={name} options={{ href: null }} />
          ))}
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mainContent: { flex: 1 },
});
