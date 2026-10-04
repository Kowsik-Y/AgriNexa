import React from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Card, CardContent } from '@/components/reusables/card';
import { Switch } from '@/components/reusables/switch';
import { Text } from '@/components/reusables/text';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

type IconType = any;

export type SettingsSectionRow = {
  icon: IconType;
  label: string;
  description?: string;
  color: string;
  kind?: 'action' | 'switch';
  value?: string;
  valueColor?: string;
  showChevron?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  checked?: boolean;
  onCheckedChange?: (value: boolean, coords?: { x: number; y: number }) => void;
};

type SettingsSectionProps = {
  title: string;
  rows: SettingsSectionRow[];
};

export function SettingsSection({ title, rows }: SettingsSectionProps) {
  return (
    <View className="mb-4">
      <Text className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground mt-4 mb-2 ml-1">
        {title}
      </Text>
      <Card className="overflow-hidden border border-border/80 bg-card shadow-xs p-0">
        <CardContent className="p-0">
          {rows.map((row, index) => (
            <React.Fragment key={`${row.label}-${index}`}>
              {row.kind === 'switch' ? (
                <SwitchRow {...row} />
              ) : (
                <ActionRow {...row} />
              )}
              {index < rows.length - 1 && (
                <View className="h-[1px] w-full bg-border/60" />
              )}
            </React.Fragment>
          ))}
        </CardContent>
      </Card>
    </View>
  );
}

function ActionRow(row: SettingsSectionRow) {
  const { colors } = useTheme();
  const Icon = row.icon;
  const showChevron = row.showChevron !== false;

  const content = (
    <>
      <View className="flex-1 flex-row items-center gap-3.5 pr-2">
        <View
          className="h-9 w-9 rounded-xl items-center justify-center shrink-0"
          style={{ backgroundColor: row.color + '18' }}
        >
          <Icon size={18} color={row.color} />
        </View>
        <View className="flex-1 justify-center gap-0.5">
          <Text className="font-semibold text-foreground text-sm leading-tight text-left">
            {row.label}
          </Text>
          {row.description ? (
            <Text variant="muted" className="text-xs leading-normal text-left">
              {row.description}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="flex-row items-center gap-1.5 shrink-0">
        {row.value ? (
          <Text
            className={cn(
              'text-xs',
              row.valueColor ? 'font-bold' : 'text-muted-foreground font-normal'
            )}
            style={row.valueColor ? { color: row.valueColor } : undefined}
          >
            {row.value}
          </Text>
        ) : null}
        {showChevron ? <ChevronRight size={16} color={colors.mutedForeground} /> : null}
      </View>
    </>
  );

  if (row.onPress) {
    return (
      <Pressable
        className={cn(
          'w-full flex-row items-center justify-between px-4 py-3.5 active:bg-muted/40',
          row.disabled && 'opacity-50'
        )}
        onPress={row.onPress}
        disabled={row.disabled}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      className={cn(
        'w-full flex-row items-center justify-between px-4 py-3.5',
        row.disabled && 'opacity-50'
      )}
    >
      {content}
    </View>
  );
}

function SwitchRow(row: SettingsSectionRow) {
  const Icon = row.icon;

  return (
    <View
      className={cn(
        'w-full flex-row items-center justify-between px-4 py-3.5',
        row.disabled && 'opacity-50'
      )}
    >
      <View className="flex-1 flex-row items-center gap-3.5 pr-2">
        <View
          className="h-9 w-9 rounded-xl items-center justify-center shrink-0"
          style={{ backgroundColor: row.color + '18' }}
        >
          <Icon size={18} color={row.color} />
        </View>
        <View className="flex-1 justify-center gap-0.5">
          <Text className="font-semibold text-foreground text-sm leading-tight text-left">
            {row.label}
          </Text>
          {row.description ? (
            <Text variant="muted" className="text-xs leading-normal text-left">
              {row.description}
            </Text>
          ) : null}
        </View>
      </View>
      <Switch
        checked={!!row.checked}
        onCheckedChange={(val) => row.onCheckedChange?.(val)}
        disabled={row.disabled}
      />
    </View>
  );
}
