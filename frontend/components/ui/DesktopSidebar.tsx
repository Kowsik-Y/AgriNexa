import React from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import {
  Home, Camera, Mic, TrendingUp, Lightbulb, User, Settings,
  Tractor, LayoutGrid, FileText, MessageSquareText, Sprout
} from 'lucide-react-native';
import { Typography } from './Typography';
import { useTheme } from '@/hooks/use-theme';

const MAIN_NAV = [
  { name: 'index', label: 'Home', icon: Home },
  { name: 'agriflow', label: 'Agri Flow', icon: Tractor },
  { name: 'tools', label: 'Tools', icon: LayoutGrid },
  { name: 'prices', label: 'Prices', icon: TrendingUp },
];

const SECONDARY_NAV = [
  { name: 'scan', label: 'Crop Scan', icon: Camera },
  { name: 'assistant', label: 'Assistant', icon: MessageSquareText },
  { name: 'advice', label: 'Advice', icon: Lightbulb },
  { name: 'reports', label: 'Reports', icon: FileText },
];

const BOTTOM_NAV = [
  { name: 'profile', label: 'Profile', icon: User },
  { name: 'settings', label: 'Settings', icon: Settings },
];

export const DesktopSidebar = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();

  const currentTab = segments[1] || 'index';

  if (width < 768) return null;

  const NavItem = ({ item }: { item: { name: string; label: string; icon: any } }) => {
    const isActive = currentTab === item.name;
    const Icon = item.icon;
    return (
      <Pressable
        onPress={() => router.push(`/(tabs)/${item.name === 'index' ? '' : item.name}` as any)}
        style={({ pressed }) => [
          styles.navItem,
          isActive && { backgroundColor: colors.tint + '10' },
          pressed && { opacity: 0.6 },
        ]}
      >
        <Icon
          size={18}
          color={isActive ? colors.tint : colors.mutedForeground}
          strokeWidth={isActive ? 2 : 1.5}
        />
        <Typography.P style={[
          styles.navLabel,
          { color: isActive ? colors.tint : colors.foreground },
          isActive && { fontWeight: '600' },
        ]}>
          {item.label}
        </Typography.P>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderRightColor: colors.border }]}>
      {/* Logo */}
      <View style={styles.header}>
        <Sprout size={20} color={colors.tint} />
        <Typography.P style={[styles.logoText, { color: colors.foreground }]}>AgriNexa</Typography.P>
      </View>

      {/* Main Nav */}
      <View style={styles.section}>
        <Typography.Small style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MAIN</Typography.Small>
        {MAIN_NAV.map((item) => <NavItem key={item.name} item={item} />)}
      </View>

      {/* Tools */}
      <View style={styles.section}>
        <Typography.Small style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TOOLS</Typography.Small>
        {SECONDARY_NAV.map((item) => <NavItem key={item.name} item={item} />)}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Bottom */}
      <View style={[styles.bottomSection, { borderTopColor: colors.border }]}>
        {BOTTOM_NAV.map((item) => <NavItem key={item.name} item={item} />)}
        <Typography.Muted style={styles.version}>v1.0.4</Typography.Muted>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 220,
    height: '100%',
    borderRightWidth: 1,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 8,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  section: {
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 10,
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  bottomSection: {
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 2,
  },
  version: {
    fontSize: 11,
    paddingHorizontal: 8,
    marginTop: 8,
    marginBottom: 12,
  },
});
