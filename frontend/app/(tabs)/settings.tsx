import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Languages, Bell, Moon, Shield, Info, Globe, Lock, LogOut, Check, HelpCircle, Settings, ChevronLeft, LayoutGrid } from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { SettingsSection } from '@/components/ui/SettingsSection';
import {
  AlertDialog, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter
} from '@/components/ui/Dialog';
import { useTheme } from '@/hooks/use-theme';
import { useAppContext } from '@/context/AppProvider';
import { useTranslation } from '@/hooks/use-translation';
import { clearAuthData } from '@/lib/auth-storage';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { theme, appLanguage, responseLanguage, region, currency, notifications, toggleTheme, setAppLanguage, setResponseLanguage, updateNotificationSetting } = useAppContext();
  const { t } = useTranslation();

  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [languageTarget, setLanguageTarget] = useState<'app' | 'response'>('app');

  const handleLogout = async () => {
    await clearAuthData();
    router.replace('/(auth)/auth');
  };

  return (
    <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scroll}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border }]}>
          <ChevronLeft size={20} color={colors.foreground} />
        </Pressable>
        <Typography.H3 style={{ fontWeight: '800', color: colors.foreground }}>Settings</Typography.H3>
      </View>

      <View style={styles.body}>
        {/* Preferences */}
        <SettingsSection
          title="PREFERENCES"
          rows={[
            {
              icon: Languages, color: '#3B82F6', label: t('appLanguage'), value: appLanguage, valueColor: '#3B82F6',
              onPress: () => { setLanguageTarget('app'); setShowLanguageDialog(true); },
            },
            {
              icon: Languages, color: '#8B5CF6', label: t('respLanguage'), value: responseLanguage, valueColor: '#8B5CF6',
              onPress: () => { setLanguageTarget('response'); setShowLanguageDialog(true); },
            },
            {
              kind: 'switch', icon: Bell, color: '#F97316', label: t('notifications'),
              checked: notifications.enabled, onCheckedChange: (val: boolean) => updateNotificationSetting('enabled', val),
            },
            {
              kind: 'switch', icon: Moon, color: '#6366F1', label: t('theme'),
              checked: theme === 'dark', onCheckedChange: (_val: boolean, coords?: { x: number; y: number }) => toggleTheme(coords),
            },
          ]}
        />

        {/* App Settings */}
        <SettingsSection
          title="APP SETTINGS"
          rows={[
            { icon: LayoutGrid, color: '#10B981', label: t('dashboardLayout'), onPress: () => router.push('/settings/dashboard-layout') },
            { icon: Globe, color: '#F59E0B', label: t('regionCurrency'), value: `${region} (${currency})`, onPress: () => router.push('/settings/region-currency') },
            { icon: Lock, color: '#EF4444', label: t('privacySecurity'), onPress: () => router.push('/settings/privacy') },
          ]}
        />

        {/* About */}
        <SettingsSection
          title="ABOUT"
          rows={[
            { icon: Info, color: '#64748B', label: t('appVersion'), value: 'v1.0.4' },
            { icon: HelpCircle, color: '#06B6D4', label: t('helpSupport'), onPress: () => router.push('/settings/help-support') },
          ]}
        />

        {/* Logout */}
        <Button
          variant="outline"
          style={[styles.logoutBtn, { borderColor: colors.destructive + '40' }]}
          onPress={() => setShowLogoutAlert(true)}
        >
          <LogOut size={18} color={colors.destructive} />
          <Typography.P style={{ color: colors.destructive, fontWeight: '700' }}>Logout</Typography.P>
        </Button>

        <Typography.Muted style={styles.footer}>AgriNexa v1.0.4 · Smart Farming</Typography.Muted>
      </View>

      {/* Language Dialog */}
      <AlertDialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
        <AlertDialogHeader>
          <AlertDialogTitle>{languageTarget === 'app' ? 'App Language' : 'Response Language'}</AlertDialogTitle>
          <AlertDialogDescription>
            {languageTarget === 'app' ? 'Choose interface language.' : 'Choose AI response language.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ScrollView style={{ maxHeight: 300 }}>
          {['English', 'Tamil', 'Hindi', 'Malayalam', 'Kannada', 'Telugu'].map((lang) => (
            <Button
              key={lang} variant="ghost"
              style={{ justifyContent: 'space-between', paddingVertical: 14 }}
              onPress={() => {
                if (languageTarget === 'app') setAppLanguage(lang as any);
                else setResponseLanguage(lang as any);
                setShowLanguageDialog(false);
              }}
            >
              <Typography.P translate={false} style={{ fontWeight: (languageTarget === 'app' ? appLanguage : responseLanguage) === lang ? '700' : '400' }}>{lang}</Typography.P>
              {(languageTarget === 'app' ? appLanguage : responseLanguage) === lang && <Check size={18} color={colors.tint} />}
            </Button>
          ))}
        </ScrollView>
        <AlertDialogFooter>
          <Button variant="outline" onPress={() => setShowLanguageDialog(false)} style={{ flex: 1 }}>Cancel</Button>
        </AlertDialogFooter>
      </AlertDialog>

      {/* Logout Confirm */}
      <AlertDialog open={showLogoutAlert} onOpenChange={setShowLogoutAlert}>
        <AlertDialogHeader>
          <AlertDialogTitle>Logout</AlertDialogTitle>
          <AlertDialogDescription>Are you sure you want to log out?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter style={{ gap: 12 }}>
          <Button variant="outline" onPress={() => setShowLogoutAlert(false)} style={{ flex: 1 }}>Cancel</Button>
          <Button variant="destructive" onPress={handleLogout} style={{ flex: 1 }}>Logout</Button>
        </AlertDialogFooter>
      </AlertDialog>
    </KeyboardResponsiveView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 20, gap: 8 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, height: 48, borderRadius: 12, gap: 8 },
  footer: { textAlign: 'center', marginTop: 16 },
});
