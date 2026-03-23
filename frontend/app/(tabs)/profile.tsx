import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { User, MapPin, Sprout, Shield, LogOut, ChevronRight, Settings, Bell, HelpCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Typography } from '@/components/ui/Typography';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { useTheme } from '@/hooks/use-theme';

export default function ProfileScreen() {
  const { colors } = useTheme();
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
    <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Typography.H1 style={styles.headerTitle}>Profile</Typography.H1>
        <Button variant="ghost" size="icon" onPress={() => router.push('/settings')}>
          <Settings size={28} color={colors.foreground} />
        </Button>
      </View>

      <View style={styles.content}>
        {/* User Stats Card */}
        <Card style={styles.userCard}>
          <CardContent style={styles.userCardContent}>
            <View style={[styles.avatarBox, { backgroundColor: colors.tint + '15' }]}>
              <User size={48} color={colors.tint} />
            </View>
            <View style={styles.userInfo}>
              <Typography.H3>{session?.value || 'Farmer'}</Typography.H3>
              <Typography.Muted>
                {session?.method === 'email' ? session.value : 'Connected via ' + (session?.method || 'Google')}
              </Typography.Muted>
              <Badge style={{ alignSelf: 'flex-start', marginTop: 4 }}>Active Farmer</Badge>
            </View>
          </CardContent>
        </Card>

        {/* Farm Summary */}
        <View style={styles.sectionHeader}>
          <Sprout size={20} color={colors.mutedForeground} />
          <Typography.H3 style={styles.sectionTitle}>My Farm</Typography.H3>
        </View>

        <View style={styles.farmGrid}>
          <FarmStatCard icon={MapPin} label="Location" val={profile?.district || 'Not set'} />
          <FarmStatCard icon={Sprout} label="Main Crop" val={profile?.mainCrops || 'Not set'} />
          <FarmStatCard icon={Shield} label="Language" val={profile?.appLang || 'English'} />
          <FarmStatCard icon={Bell} label="Status" val="Live" />
        </View>

        {/* Action List */}
        <Card style={{ marginTop: 16 }}>
          <CardContent style={{ padding: 0 }}>
            <ActionItem icon={User} label="Personal Details" />
            <Separator />
            <ActionItem icon={Bell} label="Notification Settings" />
            <Separator />
            <ActionItem icon={HelpCircle} label="Help & Support" />
          </CardContent>
        </Card>

        <Button 
          variant="ghost" 
          style={styles.logoutBtn} 
          onPress={handleLogout}
        >
          <LogOut size={20} color={colors.destructive} />
          <Typography.Large style={{ color: colors.destructive, fontWeight: '700' }}>
            Logout
          </Typography.Large>
        </Button>
      </View>
    </KeyboardResponsiveView>
  );
}

const FarmStatCard = ({ icon: Icon, label, val }: any) => {
  const { colors } = useTheme();
  return (
    <Card style={styles.statCard}>
      <CardContent style={{ padding: 20, gap: 8 }}>
        <View style={[styles.statIconBox, { backgroundColor: colors.tint + '10' }]}>
          <Icon size={18} color={colors.tint} />
        </View>
        <Typography.Small style={{ color: colors.mutedForeground, fontWeight: '700' }}>
          {label}
        </Typography.Small>
        <Typography.P style={{ fontWeight: '800' }}>{val}</Typography.P>
      </CardContent>
    </Card>
  );
}

const ActionItem = ({ icon: Icon, label }: any) => {
  const { colors } = useTheme();
  return (
    <Button variant="ghost" style={styles.actionItemInner}>
      <View style={styles.actionLeft}>
        <View style={[styles.actionIconBox, { backgroundColor: colors.mutedForeground + '15' }]}>
          <Icon size={20} color={colors.mutedForeground} />
        </View>
        <Typography.P style={{ fontWeight: '600' }}>{label}</Typography.P>
      </View>
      <ChevronRight size={20} color={colors.mutedForeground} />
    </Button>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: { padding: 30, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { letterSpacing: -1 },
  content: { flex: 1, paddingHorizontal: 20 },
  userCard: { borderRadius: 32 },
  userCardContent: { flexDirection: 'row', alignItems: 'center', padding: 24 },
  avatarBox: { width: 80, height: 80, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  userInfo: { marginLeft: 20, flex: 1, gap: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 32, marginBottom: 16, marginLeft: 8 },
  sectionTitle: { fontSize: 20 },
  farmGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48%', borderRadius: 24, marginBottom: 16 },
  statIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionItemInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 24, paddingHorizontal: 16, height: 'auto' },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32, paddingVertical: 16, gap: 10, height: 'auto' },
});
