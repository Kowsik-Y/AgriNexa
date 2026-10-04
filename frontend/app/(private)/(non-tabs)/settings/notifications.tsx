import React from 'react';
import { View, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Bell, CloudSun, ShieldAlert, TrendingUp, Tractor, Tablet } from 'lucide-react-native';

import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';
import { SettingsSection } from '@/components/SettingsSection';
import { useToast } from '@/components/Toast';
import { useAppContext } from '@/context/AppProvider';

export default function NotificationSettingsScreen() {
  const { toast } = useToast();
  const { notifications, updateNotificationSetting } = useAppContext();

  const toggleSetting = (key: string) => {
    const val = !(notifications as any)[key];
    updateNotificationSetting(key, val);

    if (key === 'enabled' && !val) {
      toast({
        title: 'Notifications Disabled',
        description: 'You will no longer receive real-time alerts.',
        type: 'warning',
      });
    }
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: 'Notifications' }} />
      <ResponsiveContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="p-5 pb-16 gap-6"
        >
          <View className="gap-2">
            <SettingsSection
              title="MASTER SWITCH"
              rows={[
                {
                  kind: 'switch',
                  icon: Bell,
                  label: 'Push Notifications',
                  description: 'Allow AgriNexa to send you alerts',
                  color: '#16A34A',
                  checked: notifications.enabled,
                  onCheckedChange: () => toggleSetting('enabled'),
                },
              ]}
            />
          </View>

          <View className="gap-2 -mt-4">
            <SettingsSection
              title="ALERT PREFERENCES"
              rows={[
                {
                  kind: 'switch',
                  icon: CloudSun,
                  label: 'Weather Alerts',
                  description: 'Storms, rain, and temperature shifts',
                  color: '#3B82F6',
                  checked: notifications.weather,
                  onCheckedChange: () => toggleSetting('weather'),
                  disabled: !notifications.enabled,
                },
                {
                  kind: 'switch',
                  icon: ShieldAlert,
                  label: 'Pest & Disease',
                  description: 'Local outbreaks and risk levels',
                  color: '#EF4444',
                  checked: notifications.pest,
                  onCheckedChange: () => toggleSetting('pest'),
                  disabled: !notifications.enabled,
                },
                {
                  kind: 'switch',
                  icon: TrendingUp,
                  label: 'Market Prices',
                  description: 'Daily updates on your key crops',
                  color: '#F59E0B',
                  checked: notifications.price,
                  onCheckedChange: () => toggleSetting('price'),
                  disabled: !notifications.enabled,
                },
                {
                  kind: 'switch',
                  icon: Tractor,
                  label: 'Agri Flow',
                  description: 'Task reminders and stage updates',
                  color: '#8B5CF6',
                  checked: notifications.agriFlow,
                  onCheckedChange: () => toggleSetting('agriFlow'),
                  disabled: !notifications.enabled,
                },
              ]}
            />
          </View>

          <View className="items-center gap-2 mt-4 px-6 opacity-70">
            <Icon as={Tablet} size={22} className="text-muted-foreground" />
            <Text variant="muted" className="text-xs text-center">
              We respect your focus. AgriNexa only sends critical alerts to help you manage your farm effectively.
            </Text>
          </View>
        </ScrollView>
      </ResponsiveContainer>
    </View>
  );
}
