import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Switch, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Languages, Bell, Moon, Shield, Info, ChevronRight, LayoutGrid, Globe, Lock, LogOut } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColors } from '@/hooks/use-theme-colors';

import { useAppContext } from '@/context/AppProvider';

export default function SettingsScreen() {
  const colors = useThemeColors();
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
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronRight size={28} color={colors.text} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>Settings</ThemedText>
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: colors.icon }]}>PREFERENCES</ThemedText>
          
          <SettingToggle 
            icon={Languages} 
            label="Language" 
            val={language} 
            onPress={() => setLanguage(language === 'English' ? 'Tamil' : 'English')} 
          />
          
          <SettingSwitch 
            icon={Bell} 
            label="Push Notifications" 
            value={notifications} 
            onValueChange={setNotifications} 
          />
          
          <SettingSwitch 
            icon={Moon} 
            label="Dark Mode" 
            value={theme === 'dark'} 
            onValueChange={toggleTheme} 
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: colors.icon }]}>APP SETTINGS</ThemedText>
          
          <SettingItem icon={LayoutGrid} label="Dashboard Layout" />
          <SettingItem icon={Globe} label="Region & Currency" />
          <SettingItem icon={Lock} label="Privacy & Security" />
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: colors.icon }]}>ABOUT</ThemedText>
          <SettingItem icon={Info} label="App Version" val="v1.0.4" />
          <SettingItem icon={Shield} label="Privacy Policy" />
        </View>

        <TouchableOpacity 
          style={[styles.logoutBtn, { borderColor: colors.notification }]} 
          onPress={handleLogout}
        >
          <LogOut size={20} color={colors.notification} />
          <ThemedText style={[styles.logoutText, { color: colors.notification }]}>Log Out</ThemedText>
        </TouchableOpacity>

        <View style={styles.footer}>
          <ThemedText style={[styles.footerText, { color: colors.icon }]}>AgriNexa v1.0.4 (Stable)</ThemedText>
          <ThemedText style={[styles.footerText, { color: colors.icon }]}>Proudly built for the smart farming community.</ThemedText>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </ThemedView>
  );
}

const SettingItem = ({ icon: Icon, label, val }: any) => {
  const colors = useThemeColors();
  return (
    <TouchableOpacity style={[styles.settingRow, { borderBottomColor: colors.border }]}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconBox, { backgroundColor: colors.icon + '15' }]}>
          <Icon size={20} color={colors.icon} />
        </View>
        <ThemedText style={[styles.label, { color: colors.text }]}>{label}</ThemedText>
      </View>
      <View style={styles.settingRight}>
        {val && <ThemedText style={[styles.val, { color: colors.icon }]}>{val}</ThemedText>}
        <ChevronRight size={20} color={colors.icon} />
      </View>
    </TouchableOpacity>
  );
}

const SettingToggle = ({ icon: Icon, label, val, onPress }: any) => {
  const colors = useThemeColors();
  return (
    <TouchableOpacity style={[styles.settingRow, { borderBottomColor: colors.border }]} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconBox, { backgroundColor: colors.tint + '15' }]}>
          <Icon size={20} color={colors.tint} />
        </View>
        <ThemedText style={[styles.label, { color: colors.text }]}>{label}</ThemedText>
      </View>
      <View style={styles.settingRight}>
        <ThemedText style={[styles.val, { color: colors.tint, fontWeight: '700' }]}>{val}</ThemedText>
        <ChevronRight size={20} color={colors.icon} />
      </View>
    </TouchableOpacity>
  );
}

const SettingSwitch = ({ icon: Icon, label, value, onValueChange }: any) => {
  const colors = useThemeColors();
  return (
    <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconBox, { backgroundColor: colors.icon + '10' }]}>
          <Icon size={20} color={colors.icon} />
        </View>
        <ThemedText style={[styles.label, { color: colors.text }]}>{label}</ThemedText>
      </View>
      <Switch 
        value={value} 
        onValueChange={onValueChange} 
        trackColor={{ false: colors.border, true: colors.tint }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 30, paddingTop: 70, backgroundColor: 'transparent', flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  content: { flex: 1, paddingHorizontal: 24 },
  section: { marginTop: 32, gap: 4 },
  sectionTitle: { fontSize: 13, letterSpacing: 1.5, marginBottom: 8, marginLeft: 4, fontWeight: '800' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, fontWeight: '600' },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  val: { fontSize: 14, fontWeight: '500' },
  footer: { marginTop: 48, alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12, fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, paddingVertical: 18, borderRadius: 20, borderWidth: 1.5, gap: 12, borderStyle: 'dashed' },
  logoutText: { fontSize: 16, fontWeight: '800' },
});
