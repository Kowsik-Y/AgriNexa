import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { User, MapPin, Sprout, LogOut, Settings, Bell, HelpCircle, Activity, Languages, Shield } from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { useAppContext } from '@/context/AppProvider';
import { clearAuthData, getSession, getUserProfile } from '@/lib/auth-storage';
import { Card, CardContent } from '@/components/ui/Card';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { appLanguage } = useAppContext();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedProfile = await getUserProfile();
        const savedSession = await getSession();
        if (savedProfile) setProfile(savedProfile);
        if (savedSession) setSession(savedSession);
      } catch (e) {
        console.error('Error loading profile data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleLogout = async () => {
    await clearAuthData();
    router.replace('/(auth)/auth');
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={32} color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Header ── */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <User size={32} color={colors.mutedForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Typography.H3 style={{ fontWeight: '800', color: colors.foreground }}>
                {profile?.name || t('farmer')}
              </Typography.H3>
              <Typography.Small style={{ color: colors.mutedForeground, marginTop: 2 }}>
                {profile?.email || profile?.phone || (session?.method ? `via ${session.method}` : t('signedIn'))}
              </Typography.Small>
            </View>
            <Pressable
              onPress={() => router.push('/settings')}
              style={[styles.settingsBtn, { borderColor: colors.border }]}
            >
              <Settings size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          {/* Farm Info */}
          <View style={styles.section}>
            <Typography.Small style={[styles.sectionTitle, { color: colors.mutedForeground }]}>MY FARM</Typography.Small>
            <Card>
              <CardContent style={{ padding: 0 }}>
                <InfoRow icon={MapPin} label={t('location')} val={profile?.district || t('notSet')} color="#10B981" />
                <Separator />
                <InfoRow icon={Sprout} label={t('mainCrop')} val={profile?.mainCrops || t('notSet')} color="#F59E0B" />
                <Separator />
                <InfoRow icon={Languages} label={t('appLanguage')} val={appLanguage} color="#3B82F6" />
                <Separator />
                <InfoRow icon={Activity} label={t('status')} val={t('live')} isBadge color="#10B981" />
              </CardContent>
            </Card>
          </View>

          {/* Account */}
          <SettingsSection
            title="ACCOUNT"
            rows={[
              { icon: User, label: t('personalDetails'), color: '#8B5CF6', onPress: () => router.push('/profile/personal-details') },
              { icon: Bell, label: 'Notification Settings', color: '#F97316', onPress: () => router.push('/settings/notifications') },
              { icon: Shield, label: 'Privacy & Security', color: '#3B82F6', onPress: () => router.push('/settings/privacy') },
              { icon: HelpCircle, label: 'Help & Support', color: '#06B6D4', onPress: () => router.push('/settings/help-support') },
            ]}
          />

          {/* Logout */}
          <Button
            variant="outline"
            style={[styles.logoutBtn, { borderColor: colors.destructive + '40' }]}
            onPress={handleLogout}
          >
            <LogOut size={18} color={colors.destructive} />
            <Typography.P style={{ color: colors.destructive, fontWeight: '700' }}>Logout</Typography.P>
          </Button>

          <Typography.Muted style={styles.version}>AgriNexa v1.0.4</Typography.Muted>
        </View>
      </ScrollView>
    </View>
  );
}

const InfoRow = ({ icon: Icon, label, val, isBadge }: any) => {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <View style={styles.rowLeft}>
        <Icon size={16} color={colors.mutedForeground} />
        <Typography.P style={{ fontWeight: '600', color: colors.foreground }}>{label}</Typography.P>
      </View>
      {isBadge ? <Badge>{val}</Badge> : <Typography.Small style={{ color: colors.mutedForeground }}>{val}</Typography.Small>}
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingBottom: 110 },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  settingsBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginLeft: 2 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider: { height: 1 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, height: 48, borderRadius: 12, gap: 8 },
  version: { textAlign: 'center', marginTop: 16 },
});
