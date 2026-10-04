import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  MapPin,
  Sprout,
  LogOut,
  Settings,
  Bell,
  HelpCircle,
  Activity,
  Languages,
  Shield,
} from 'lucide-react-native';

import { Badge } from '@/components/reusables/badge';
import { Text } from '@/components/reusables/text';
import { Separator } from '@/components/reusables/separator';
import { Spinner } from '@/components/Spinner';
import { APP_VERSION } from '@/constants/config';
import { Button } from '@/components/reusables/button';
import { SettingsSection } from '@/components/SettingsSection';
import { Card, CardContent } from '@/components/reusables/card';
import { useTranslation } from '@/hooks/use-translation';
import { useAppContext } from '@/context/AppProvider';
import { clearAuthData, getSession, getUserProfile } from '@/lib/auth-storage';

export default function ProfileScreen() {
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
      <View className="flex-1 bg-background items-center justify-center">
        <Spinner size={32} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* ── Profile Header ── */}
      <View className="p-5 border-b border-border bg-card/40">
        <View className="flex-row items-center gap-3.5">
          <View className="w-12 h-12 rounded-xl bg-secondary items-center justify-center border border-border">
            <User size={24} className="text-muted-foreground" color="#64748B" />
          </View>
          <View className="flex-1">
            <Text variant="h3" className="text-foreground">
              {profile?.name || t('farmer')}
            </Text>
            <Text variant="muted" className="text-xs mt-0.5">
              {profile?.email ||
                profile?.phone ||
                (session?.method ? `via ${session.method}` : t('signedIn'))}
            </Text>
          </View>
          <Button className="w-10 h-10 bg-card items-center justify-center" onPress={() => router.push('/settings')}>
            <Settings size={19} className="text-muted-foreground" color="#64748B" />
          </Button>
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
      >


        <View className="p-5 gap-4">
          {/* ── Farm Info Section ── */}
          <View className="gap-2">
            <Text
              variant="muted"
              className="text-[11px] font-bold tracking-wider uppercase ml-0.5"
            >
              MY FARM
            </Text>
            <Card className="p-0 overflow-hidden border border-border bg-card rounded-2xl shadow-none">
              <CardContent className="p-0">
                <InfoRow
                  icon={MapPin}
                  label={t('location')}
                  val={profile?.district || t('notSet')}
                  color="#10B981"
                />
                <Separator />
                <InfoRow
                  icon={Sprout}
                  label={t('mainCrop')}
                  val={profile?.mainCrops || t('notSet')}
                  color="#F59E0B"
                />
                <Separator />
                <InfoRow
                  icon={Languages}
                  label={t('appLanguage')}
                  val={appLanguage}
                  color="#3B82F6"
                />
                <Separator />
                <InfoRow
                  icon={Activity}
                  label={t('status')}
                  val={t('live')}
                  isBadge
                  color="#10B981"
                />
              </CardContent>
            </Card>
          </View>

          {/* ── Account Settings Section ── */}
          <SettingsSection
            title="ACCOUNT"
            rows={[
              {
                icon: User,
                label: t('personalDetails'),
                color: '#8B5CF6',
                onPress: () => router.push('/profile/personal-details'),
              },
              {
                icon: Bell,
                label: 'Notification Settings',
                color: '#F97316',
                onPress: () => router.push('/settings/notifications'),
              },
              {
                icon: Shield,
                label: 'Privacy & Security',
                color: '#3B82F6',
                onPress: () => router.push('/settings/privacy'),
              },
              {
                icon: HelpCircle,
                label: 'Help & Support',
                color: '#06B6D4',
                onPress: () => router.push('/settings/help-support'),
              },
            ]}
          />

          {/* ── Logout Button ── */}
          <Button
            variant="outline"
            className="flex-row items-center justify-center gap-2 mt-2 h-12 rounded-xl border-destructive/30 bg-card active:bg-destructive/10"
            onPress={handleLogout}
          >
            <LogOut size={18} color="#EF4444" />
            <Text className="text-destructive font-bold text-sm">Logout</Text>
          </Button>

          {/* ── Version ── */}
          <Text variant="muted" className="text-center text-xs mt-2">
            AgriNexa v{APP_VERSION}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const InfoRow = ({
  icon: IconComponent,
  label,
  val,
  isBadge,
  color = '#10B981',
}: any) => {
  return (
    <View className="flex-row items-center justify-between p-4">
      <View className="flex-row items-center gap-3">
        <View
          style={{ backgroundColor: color + '18' }}
          className="w-8 h-8 rounded-lg items-center justify-center"
        >
          <IconComponent size={16} color={color} />
        </View>
        <Text className="font-semibold text-foreground text-sm">{label}</Text>
      </View>
      {isBadge ? (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5"
        >
          <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {val}
          </Text>
        </Badge>
      ) : (
        <Text variant="muted" className="text-xs font-medium">
          {val}
        </Text>
      )}
    </View>
  );
};

