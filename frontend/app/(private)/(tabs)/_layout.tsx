import { Tabs } from 'expo-router';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Home, Tractor, User, LayoutDashboard, Store } from 'lucide-react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
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

  return (
    <View className="flex-1 bg-background">
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.tint || colors.primary || '#10B981',
          tabBarInactiveTintColor: colors.tabIconDefault || colors.icon || '#94A3B8',
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 72,
            paddingBottom: 14,
            paddingTop: 8,
            display: isDesktop ? 'none' : 'flex',
          },
          tabBarLabel: ({ color, children }) => (
            <Text
              style={{ color }}
              className="text-[11px] font-semibold mt-0.5"
            >
              {children}
            </Text>
          ),
        }}
      >
        {primaryScreens.map((screen) => {
          const IconComponent = screen.icon;
          return (
            <Tabs.Screen
              key={screen.name}
              name={screen.name}
              options={{
                title: screen.title,
                tabBarIcon: ({ color }) => (
                  <Icon as={IconComponent} size={22} color={color} strokeWidth={1.5} />
                ),
              }}
            />
          );
        })}
      </Tabs>
    </View>
  );
}
