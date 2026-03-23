import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { User, MapPin, Sprout, Shield, LogOut, ChevronRight, Settings, Bell, HelpCircle, Mail } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColors } from '@/hooks/use-theme-colors';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const profileStr = await AsyncStorage.getItem('user_profile');
        const sessionStr = await AsyncStorage.getItem('user_session');
        if (profileStr) setProfile(JSON.parse(profileStr));
        if (sessionStr) setSession(JSON.parse(sessionStr));
      } catch (e) {
        console.error('Error loading profile data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user_session');
    router.replace('/auth');
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>Profile</ThemedText>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Settings size={28} color={colors.text} />
        </TouchableOpacity>
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Stats Card */}
        <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatarBox, { backgroundColor: colors.tint + '15' }]}>
            <User size={48} color={colors.tint} />
          </View>
          <View style={styles.userInfo}>
            <ThemedText style={styles.userName}>{session?.value || 'Farmer'}</ThemedText>
            <ThemedText style={[styles.userEmail, { color: colors.icon }]}>{session?.method === 'email' ? session.value : 'Connected via ' + (session?.method || 'Google')}</ThemedText>
            <View style={[styles.badge, { backgroundColor: colors.tint }]}>
              <ThemedText style={styles.badgeText}>Active Farmer</ThemedText>
            </View>
          </View>
        </View>

        {/* Farm Summary */}
        <View style={styles.sectionHeader}>
          <Sprout size={20} color={colors.icon} />
          <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: colors.text }]}>My Farm</ThemedText>
        </View>

        <View style={[styles.farmGrid]}>
          <FarmStatCard icon={MapPin} label="Location" val={profile?.district || 'Not set'} />
          <FarmStatCard icon={Sprout} label="Main Crop" val={profile?.mainCrops || 'Not set'} />
          <FarmStatCard icon={Shield} label="Language" val={profile?.appLang || 'English'} />
          <FarmStatCard icon={Bell} label="Status" val="Live" />
        </View>

        {/* Action List */}
        <View style={styles.actionContainer}>
          <ActionItem icon={User} label="Personal Details" />
          <ActionItem icon={Bell} label="Notification Settings" />
          <ActionItem icon={HelpCircle} label="Help & Support" />
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={20} color={colors.notification} />
            <ThemedText style={[styles.logoutText, { color: colors.notification }]}>Logout</ThemedText>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </ThemedView>
  );
}

const FarmStatCard = ({ icon: Icon, label, val }: any) => {
  const colors = useThemeColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIconBox, { backgroundColor: colors.tint + '10' }]}>
        <Icon size={18} color={colors.tint} />
      </View>
      <ThemedText style={[styles.statLabel, { color: colors.icon }]}>{label}</ThemedText>
      <ThemedText style={[styles.statVal, { color: colors.text }]}>{val}</ThemedText>
    </View>
  );
}

const ActionItem = ({ icon: Icon, label }: any) => {
  const colors = useThemeColors();
  return (
    <TouchableOpacity style={[styles.actionItem, { borderBottomColor: colors.border }]}>
      <View style={styles.actionLeft}>
        <View style={[styles.actionIconBox, { backgroundColor: colors.icon + '15' }]}>
          <Icon size={20} color={colors.icon} />
        </View>
        <ThemedText style={[styles.actionLabel, { color: colors.text }]}>{label}</ThemedText>
      </View>
      <ChevronRight size={20} color={colors.icon} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 30, paddingTop: 70, backgroundColor: 'transparent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  content: { flex: 1, paddingHorizontal: 20 },
  userCard: { flexDirection: 'row', padding: 24, borderRadius: 32, borderWidth: 1, alignItems: 'center', elevation: 2 },
  avatarBox: { width: 80, height: 80, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  userInfo: { marginLeft: 20, flex: 1, gap: 4 },
  userName: { fontSize: 22, fontWeight: '800' },
  userEmail: { fontSize: 14, fontWeight: '500' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 32, marginBottom: 16, marginLeft: 8 },
  sectionTitle: { fontSize: 20 },
  farmGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '47%', padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 16, gap: 8 },
  statIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 12, fontWeight: '700' },
  statVal: { fontSize: 15, fontWeight: '800' },
  actionContainer: { marginTop: 16, gap: 8 },
  actionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 1 },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 16, fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32, paddingVertical: 16, gap: 10 },
  logoutText: { fontSize: 16, fontWeight: '700' },
});
