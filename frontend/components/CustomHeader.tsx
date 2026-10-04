import React from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
export type CustomHeaderProps = {
  navigation?: any;
  route?: any;
  options?: any;
  back?: any;
};

import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
import { cn } from '@/lib/utils';

export function CustomHeader({ navigation, route, options = {}, back }: CustomHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const canGoBack = Boolean(back || navigation.canGoBack());
  const title = options.title !== undefined ? options.title : route.name;

  const handleBack = () => {
    if (canGoBack) {
      navigation.goBack();
    } else {
      router.replace('/(private)/(tabs)' as any);
    }
  };

  return (
    <View
      style={{ paddingTop: isDesktop ? 12 : Math.max((insets.top - 24), 12) }}
      className="border-b border-border bg-background backdrop-blur-md"
    >
      <View
        className={cn(
          'w-full flex-row items-center justify-between pb-3',
          isDesktop ? 'px-8 max-w-6xl mx-auto' : 'px-4'
        )}
      >
        {/* Left: Back button & Title */}
        <View className="flex-row items-center gap-3 flex-1 mr-3">
          <Pressable
            onPress={handleBack}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-xl border border-border bg-card shadow-xs active:opacity-70"
          >
            <Icon as={ChevronLeft} size={20} className="text-foreground" />
          </Pressable>

          <View className="flex-1 justify-center">
            <Text
              numberOfLines={1}
              className="text-lg font-bold tracking-tight text-foreground sm:text-xl"
            >
              {title}
            </Text>
          </View>
        </View>

        {/* Right: Optional actions */}
        <View className="flex-row items-center gap-2">
          {options.headerRight ? options.headerRight({ canGoBack }) : null}
        </View>
      </View>
    </View>
  );
}
