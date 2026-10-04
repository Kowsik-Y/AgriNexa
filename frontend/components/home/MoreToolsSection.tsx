import React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LayoutGrid, ChevronRight } from 'lucide-react-native';

import { Text } from '@/components/reusables/text';
import { Card, CardContent } from '@/components/reusables/card';
import { Separator } from '@/components/reusables/separator';
import { useTheme } from '@/hooks/use-theme';

export type MoreToolsItem = {
  label: string;
  sub: string;
  icon: any;
  color: string;
  route: string;
};

type MoreToolsSectionProps = {
  label?: string;
  labelIcon?: any;
  labelColor?: string;
  items?: MoreToolsItem[];
  marginBottom?: number;
  onItemPress?: (item: MoreToolsItem) => void;
};

export function MoreToolsSection({
  label = 'More Tools',
  labelIcon: LabelIcon = LayoutGrid,
  labelColor,
  items = [],
  marginBottom = 16,
  onItemPress,
}: MoreToolsSectionProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const resolvedLabelColor = labelColor || colors.mutedForeground;

  const handlePress = (item: MoreToolsItem) => {
    if (onItemPress) {
      onItemPress(item);
      return;
    }
    router.push(item.route as any);
  };

  return (
    <View style={{ marginBottom }}>
      {/* Section Header */}
      <View className="flex-row items-center gap-1.5 mb-2.5 px-0.5">
        <LabelIcon size={15} color={resolvedLabelColor} />
        <Text
          style={{ color: resolvedLabelColor }}
          className="font-extrabold text-[11px] tracking-widest uppercase"
        >
          {label}
        </Text>
      </View>

      {/* Tools Card */}
      <Card className="p-0 gap-0 overflow-hidden border border-border bg-card rounded-2xl shadow-xs">
        <CardContent className="p-0">
          {items.map((item, i, arr) => (
            <React.Fragment key={item.label}>
              <Pressable
                onPress={() => handlePress(item)}
                android_ripple={{
                  color: item.color + '24',
                  borderless: false,
                  foreground: true,
                }}
                className="flex-row items-center gap-3.5 p-4 active:opacity-80"
              >
                <View
                  style={{ backgroundColor: item.color + '18' }}
                  className="w-10 h-10 rounded-xl items-center justify-center shrink-0"
                >
                  <item.icon size={20} color={item.color} />
                </View>

                <View className="flex-1 mr-2">
                  <Text className="font-bold text-foreground text-sm leading-tight">
                    {item.label}
                  </Text>
                  <Text className="text-muted-foreground text-xs leading-normal mt-0.5">
                    {item.sub}
                  </Text>
                </View>

                <ChevronRight size={18} color={colors.mutedForeground} className="shrink-0" />
              </Pressable>
              {i < arr.length - 1 && <Separator />}
            </React.Fragment>
          ))}
        </CardContent>
      </Card>
    </View>
  );
}
