import React from 'react';
import { View, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  Shield,
  Lock,
  Trash2,
  Eye,
  Smartphone,
  Scroll,
} from 'lucide-react-native';

import { Card, CardContent } from '@/components/reusables/card';
import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';
import { SettingsSection } from '@/components/SettingsSection';

export default function PrivacySecurityScreen() {
  const router = useRouter();

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account and all associated data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: 'Privacy & Security' }} />
      <ResponsiveContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="p-5 pb-16 gap-6"
        >
          <View className="gap-2">
            <SettingsSection
              title="SECURITY"
              rows={[
                {
                  icon: Lock,
                  label: 'Change Password',
                  color: '#3B82F6',
                  onPress: () => router.push('/settings/change-password'),
                },
                {
                  icon: Smartphone,
                  label: 'Manage Devices',
                  color: '#3B82F6',
                  value: '1 Active',
                },
                {
                  icon: Eye,
                  label: 'Login Activity',
                  color: '#3B82F6',
                },
              ]}
            />
          </View>

          <View className="gap-2 -mt-4">
            <SettingsSection
              title="PRIVACY"
              rows={[
                {
                  icon: Shield,
                  label: 'Data Privacy',
                  description: 'Manage your data usage',
                  color: '#10B981',
                },
                {
                  icon: Scroll,
                  label: 'Privacy Policy',
                  color: '#10B981',
                },
              ]}
            />
          </View>

          {/* Danger Zone */}
          <View className="gap-2 -mt-2">
            <Text className="text-xs font-bold uppercase tracking-wider text-destructive ml-1">
              DANGER ZONE
            </Text>
            <Card className="p-0 border border-destructive/30 bg-destructive/5 overflow-hidden">
              <CardContent className="p-0">
                <Pressable
                  className="flex-row items-center justify-between px-4 py-3.5 active:bg-destructive/10"
                  onPress={handleDeleteAccount}
                >
                  <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                    <View className="w-10 h-10 rounded-xl items-center justify-center bg-destructive/15 shrink-0">
                      <Icon as={Trash2} size={18} className="text-destructive" />
                    </View>
                    <View className="flex-1 justify-center gap-0.5">
                      <Text className="font-semibold text-destructive text-sm">
                        Delete Account
                      </Text>
                      <Text variant="muted" className="text-xs">
                        Permanently erase your data
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </ResponsiveContainer>
    </View>
  );
}
