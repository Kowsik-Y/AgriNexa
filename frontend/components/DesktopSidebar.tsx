import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import {
  Home,
  TrendingUp,
  Lightbulb,
  User,
  Settings,
  Tractor,
  LayoutGrid,
  FileText,
  MessageSquare,
  Sprout,
} from 'lucide-react-native';

import { Button } from '@/components/reusables/button';
import { Icon } from '@/components/reusables/icon';
import { Separator } from '@/components/reusables/separator';
import { Text } from '@/components/reusables/text';
import { APP_VERSION } from '@/constants/config';
import { CropScanIcon } from '@/components/CropScanIcon';

const MAIN_NAV = [
  { name: 'index', label: 'Home', icon: Home, route: '/' },
  { name: 'agriflow', label: 'Agri Flow', icon: Tractor, route: '/agriflow' },
  { name: 'tools', label: 'Tools', icon: LayoutGrid, route: '/tools' },
  { name: 'prices', label: 'Prices', icon: TrendingUp, route: '/prices' },
];

const SECONDARY_NAV = [
  { name: 'scan', label: 'Crop Scan', icon: CropScanIcon, route: '/scan' },
  { name: 'assistant', label: 'Assistant', icon: MessageSquare, route: '/assistant' },
  { name: 'advice', label: 'Advice', icon: Lightbulb, route: '/advice' },
  { name: 'reports', label: 'Reports', icon: FileText, route: '/reports' },
];

const BOTTOM_NAV = [
  { name: 'profile', label: 'Profile', icon: User, route: '/profile' },
  { name: 'settings', label: 'Settings', icon: Settings, route: '/settings' },
];

export const DesktopSidebar = () => {
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();

  if (width < 768) return null;

  const isItemActive = (name: string) => {
    const segList = segments as string[];
    if (name === 'index') {
      return (
        segList.length <= 2 ||
        (segList.includes('(tabs)') && !segList.some((s) => s !== '(private)' && s !== '(tabs)'))
      );
    }
    return segList.includes(name);
  };

  const NavItem = ({
    item,
  }: {
    item: { name: string; label: string; icon: any; route: string };
  }) => {
    const isActive = isItemActive(item.name);
    return (
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className="justify-start gap-2.5 h-10 px-3 rounded-xl"
        onPress={() => router.push(item.route as any)}
      >
        <Icon
          as={item.icon}
          size={18}
          className={isActive ? 'text-primary' : 'text-muted-foreground'}
        />
        <Text
          className={
            isActive ? 'text-primary font-bold text-sm' : 'text-muted-foreground font-medium text-sm'
          }
        >
          {item.label}
        </Text>
      </Button>
    );
  };

  return (
    <View className="h-full w-60 border-r border-border bg-card/50 py-5">
      <View className="mb-6 flex-row items-center gap-2.5 px-5">
        <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center border border-primary/20">
          <Icon as={Sprout} size={18} className="text-primary" />
        </View>
        <Text variant="h3" className="font-extrabold text-foreground">
          AgriNexa
        </Text>
      </View>

      <View className="mb-4 gap-1 px-3">
        <Text variant="muted" className="px-2 text-[11px] font-bold tracking-wider uppercase mb-1">
          Main
        </Text>
        {MAIN_NAV.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}
      </View>

      <View className="mb-4 gap-1 px-3">
        <Text variant="muted" className="px-2 text-[11px] font-bold tracking-wider uppercase mb-1">
          Tools
        </Text>
        {SECONDARY_NAV.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}
      </View>

      <View className="flex-1" />

      <Separator className="my-2" />
      <View className="gap-1 px-3 pt-1">
        {BOTTOM_NAV.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}
        <Text variant="muted" className="px-2 pt-2 text-[11px] text-center">
          AgriNexa v{APP_VERSION}
        </Text>
      </View>
    </View>
  );
};
