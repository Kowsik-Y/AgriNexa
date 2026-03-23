import React, { useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Languages, Bell, Moon, Shield, Info, ChevronRight, LayoutGrid, Globe, Lock, LogOut } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Typography } from '@/components/ui/Typography';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Separator } from '@/components/ui/Separator';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { useTheme } from '@/hooks/use-theme';
import { useAppContext } from '@/context/AppProvider';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { theme, language, toggleTheme, setLanguage } = useAppContext();
  
  const [notifications, setNotifications] = useState(true);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Logout', 
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('user_session');
          router.replace('/auth');
        }
      }
    ]);
  };

  return (
    <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Button variant="ghost" size="icon" onPress={() => router.back()} style={styles.backBtn}>
          <ChevronRight size={28} color={colors.foreground} style={{ transform: [{ rotate: '180deg' }] }} />
        </Button>
        <Typography.H1 style={styles.headerTitle}>Settings</Typography.H1>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Typography.Small style={styles.sectionTitle}>PREFERENCES</Typography.Small>
          <Card>
            <CardContent style={{ padding: 0 }}>
              <SettingToggle 
                icon={Languages} 
                label="Language" 
                val={language} 
                onPress={() => setLanguage(language === 'English' ? 'Tamil' : 'English')} 
              />
              <Separator />
              <SettingSwitch 
                icon={Bell} 
                label="Push Notifications" 
                value={notifications} 
                onValueChange={setNotifications} 
              />
              <Separator />
              <SettingSwitch 
                icon={Moon} 
                label="Dark Mode" 
                value={theme === 'dark'} 
                onValueChange={toggleTheme} 
              />
            </CardContent>
          </Card>
        </View>

        <View style={styles.section}>
          <Typography.Small style={styles.sectionTitle}>APP SETTINGS</Typography.Small>
          <Card>
            <CardContent style={{ padding: 0 }}>
              <SettingItem icon={LayoutGrid} label="Dashboard Layout" />
              <Separator />
              <SettingItem icon={Globe} label="Region & Currency" />
              <Separator />
              <SettingItem icon={Lock} label="Privacy & Security" />
            </CardContent>
          </Card>
        </View>

        <View style={styles.section}>
          <Typography.Small style={styles.sectionTitle}>ABOUT</Typography.Small>
          <Card>
            <CardContent style={{ padding: 0 }}>
              <SettingItem icon={Info} label="App Version" val="v1.0.4" />
              <Separator />
              <SettingItem icon={Shield} label="Privacy Policy" />
            </CardContent>
          </Card>
        </View>

        <Button 
          variant="outline" 
          style={styles.logoutBtn} 
          onPress={handleLogout}
        >
          <LogOut size={20} color={colors.destructive} />
          <Typography.Large style={{ color: colors.destructive, fontWeight: '800' }}>Log Out</Typography.Large>
        </Button>

        <View style={styles.footer}>
          <Typography.Muted>AgriNexa v1.0.4 (Stable)</Typography.Muted>
          <Typography.Muted style={{ textAlign: 'center' }}>
            Proudly built for the smart farming community.
          </Typography.Muted>
        </View>
      </View>
    </KeyboardResponsiveView>
  );
}

const SettingItem = ({ icon: Icon, label, val }: any) => {
  const { colors } = useTheme();
  return (
    <Button variant="ghost" style={styles.settingRowInner}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconBox, { backgroundColor: colors.mutedForeground + '15' }]}>
          <Icon size={20} color={colors.mutedForeground} />
        </View>
        <Typography.P style={{ fontWeight: '600' }}>{label}</Typography.P>
      </View>
      <View style={styles.settingRight}>
        {val && <Typography.Muted>{val}</Typography.Muted>}
        <ChevronRight size={20} color={colors.mutedForeground} />
      </View>
    </Button>
  );
}

const SettingToggle = ({ icon: Icon, label, val, onPress }: any) => {
  const { colors } = useTheme();
  return (
    <Button variant="ghost" style={styles.settingRowInner} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconBox, { backgroundColor: colors.tint + '15' }]}>
          <Icon size={20} color={colors.tint} />
        </View>
        <Typography.P style={{ fontWeight: '600' }}>{label}</Typography.P>
      </View>
      <View style={styles.settingRight}>
        <Typography.P style={{ color: colors.tint, fontWeight: '700' }}>{val}</Typography.P>
        <ChevronRight size={20} color={colors.mutedForeground} />
      </View>
    </Button>
  );
}

const SettingSwitch = ({ icon: Icon, label, value, onValueChange }: any) => {
  const { colors } = useTheme();
  return (
    <View style={styles.settingRowInnerWithSwitch}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconBox, { backgroundColor: colors.mutedForeground + '15' }]}>
          <Icon size={20} color={colors.mutedForeground} />
        </View>
        <Typography.P style={{ fontWeight: '600' }}>{label}</Typography.P>
      </View>
      <Switch 
        checked={value} 
        onCheckedChange={onValueChange} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  header: { padding: 30, paddingTop: 60, flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 12 },
  headerTitle: { letterSpacing: -1 },
  content: { flex: 1, paddingHorizontal: 24 },
  section: { marginTop: 32, gap: 8 },
  sectionTitle: { letterSpacing: 1.5, marginBottom: 4, marginLeft: 4, fontWeight: '800', opacity: 0.6 },
  settingRowInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, paddingHorizontal: 16, height: 'auto' },
  settingRowInnerWithSwitch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footer: { marginTop: 48, alignItems: 'center', gap: 8 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32, paddingVertical: 18, borderRadius: 20, gap: 12, borderStyle: 'dashed', height: 'auto' },
});
