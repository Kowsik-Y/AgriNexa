import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Languages,
  Bell,
  Moon,
  Info,
  Globe,
  Lock,
  LogOut,
  Check,
  HelpCircle,
  ChevronLeft,
  LayoutGrid,
} from 'lucide-react-native';

import { Button } from '@/components/reusables/button';
import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
import { APP_VERSION } from '@/constants/config';
import { SettingsSection } from '@/components/SettingsSection';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/reusables/alert-dialog';
import { useAppContext } from '@/context/AppProvider';
import { useTranslation } from '@/hooks/use-translation';
import { clearAuthData } from '@/lib/auth-storage';
import { cn } from '@/lib/utils';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    theme,
    appLanguage,
    responseLanguage,
    region,
    currency,
    notifications,
    toggleTheme,
    setAppLanguage,
    setResponseLanguage,
    updateNotificationSetting,
  } = useAppContext();
  const { t } = useTranslation();

  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [languageTarget, setLanguageTarget] = useState<'app' | 'response'>('app');

  const handleLogout = async () => {
    await clearAuthData();
    router.replace('/(auth)/auth');
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-10"
      >
        <ResponsiveContainer>
          <View className="px-5 pt-4 gap-2">
          {/* Preferences */}
          <SettingsSection
            title="PREFERENCES"
            rows={[
              {
                icon: Languages,
                color: '#3B82F6',
                label: t('appLanguage'),
                value: appLanguage,
                valueColor: '#3B82F6',
                onPress: () => {
                  setLanguageTarget('app');
                  setShowLanguageDialog(true);
                },
              },
              {
                icon: Languages,
                color: '#8B5CF6',
                label: t('respLanguage'),
                value: responseLanguage,
                valueColor: '#8B5CF6',
                onPress: () => {
                  setLanguageTarget('response');
                  setShowLanguageDialog(true);
                },
              },
              {
                kind: 'switch',
                icon: Bell,
                color: '#F97316',
                label: t('notifications'),
                checked: notifications.enabled,
                onCheckedChange: (val: boolean) => updateNotificationSetting('enabled', val),
              },
              {
                kind: 'switch',
                icon: Moon,
                color: '#6366F1',
                label: t('theme'),
                checked: theme === 'dark',
                onCheckedChange: (_val: boolean, coords?: { x: number; y: number }) => toggleTheme(coords),
              },
            ]}
          />

          {/* App Settings */}
          <SettingsSection
            title="APP SETTINGS"
            rows={[
              {
                icon: LayoutGrid,
                color: '#10B981',
                label: t('dashboardLayout'),
                onPress: () => router.push('/settings/dashboard-layout'),
              },
              {
                icon: Globe,
                color: '#F59E0B',
                label: t('regionCurrency'),
                value: `${region} (${currency})`,
                onPress: () => router.push('/settings/region-currency'),
              },
              {
                icon: Lock,
                color: '#EF4444',
                label: t('privacySecurity'),
                onPress: () => router.push('/settings/privacy'),
              },
            ]}
          />

          {/* About */}
          <SettingsSection
            title="ABOUT"
            rows={[
              {
                icon: Info,
                color: '#64748B',
                label: t('appVersion'),
                value: `v${APP_VERSION}`,
              },
              {
                icon: HelpCircle,
                color: '#06B6D4',
                label: t('helpSupport'),
                onPress: () => router.push('/settings/help-support'),
              },
            ]}
          />

          {/* Logout */}
          <Button
            variant="outline"
            className="flex-row items-center justify-center mt-3 h-12 rounded-xl gap-2 border-destructive/40 bg-card active:bg-destructive/10"
            onPress={() => setShowLogoutAlert(true)}
          >
            <Icon as={LogOut} size={18} className="text-destructive" />
            <Text className="text-destructive font-bold">Logout</Text>
          </Button>

          <Text variant="muted" className="text-center text-xs mt-4">
            AgriNexa v{APP_VERSION} · Smart Farming
          </Text>
        </View>
        </ResponsiveContainer>
      </ScrollView>

      {/* Language Dialog */}
      <AlertDialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {languageTarget === 'app' ? 'App Language' : 'Response Language'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {languageTarget === 'app'
                ? 'Choose interface language.'
                : 'Choose AI response language.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ScrollView className="max-h-72">
            {['English', 'Tamil', 'Hindi', 'Malayalam', 'Kannada', 'Telugu'].map((lang) => {
              const isSelected =
                (languageTarget === 'app' ? appLanguage : responseLanguage) === lang;
              return (
                <Button
                  key={lang}
                  variant="ghost"
                  className="flex-row justify-between rounded-lg"
                  onPress={() => {
                    if (languageTarget === 'app') setAppLanguage(lang as any);
                    else setResponseLanguage(lang as any);
                    setShowLanguageDialog(false);
                  }}
                >
                  <Text
                    className={cn(
                      'text-sm',
                      isSelected ? 'font-bold text-primary' : 'font-normal text-foreground'
                    )}
                  >
                    {lang}
                  </Text>
                  {isSelected && <Icon as={Check} size={18} className="text-primary" />}
                </Button>
              );
            })}
          </ScrollView>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onPress={() => setShowLanguageDialog(false)}
            >
              <Text>Cancel</Text>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout Confirm */}
      <AlertDialog open={showLogoutAlert} onOpenChange={setShowLogoutAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <Button
              variant="outline"
              onPress={() => setShowLogoutAlert(false)}
            >
              <Text>Cancel</Text>
            </Button>
            <Button
              variant="destructive"
              onPress={handleLogout}
            >
              <Text className="text-destructive-foreground">Logout</Text>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}
