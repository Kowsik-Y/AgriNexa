import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Mic, BarChart3, Sprout, Cloud, Droplets, Bell, MessageSquareIcon, Tractor } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { useApi } from '../../hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { useAppContext } from '../../context/AppProvider';
import { useTranslation } from '@/hooks/use-translation';
import { MoreToolsSection } from '@/components/home/MoreToolsSection';

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { appLanguage } = useAppContext();
  const { t } = useTranslation();
  const { getHomeData } = useApi();
  const [data, setData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const profileStr = await AsyncStorage.getItem('user_profile');
      if (profileStr) setProfile(JSON.parse(profileStr));
      const homeData = await getHomeData();
      setData(homeData);
    };
    init();
  }, []);

  const isTamil = appLanguage === 'Tamil';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Typography.H2 style={[styles.greeting, { color: colors.foreground, borderBottomWidth: 0 }]}>
                {t('welcome', { name: profile?.name || t('farmer') })} 👋
              </Typography.H2>
              <Typography.P style={{ color: colors.mutedForeground, marginTop: 2 }}>
                {t('smartAssistant')}
              </Typography.P>
            </View>
          </View>
        </View>

        {/* ── Weather ── */}
        <View style={styles.section}>
          <Typography.Small style={[styles.label, { color: colors.mutedForeground }]}>WEATHER</Typography.Small>
          <Pressable
            onPress={() => router.push('/weather-hourly')}
            style={({ pressed }) => [
              styles.card,
              { borderColor: colors.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.weatherRow}>
              <View>
                <Typography.H1 style={[styles.temp, { color: colors.foreground }]}>
                  {data?.weather?.temp ?? '--'}°C
                </Typography.H1>
                <Typography.P style={{ color: colors.foreground, fontWeight: '600' }}>
                  {isTamil
                    ? (data?.weather?.tamil_condition || data?.weather?.condition)
                    : (data?.weather?.condition ?? 'Loading...')}
                </Typography.P>
                <View style={styles.humRow}>
                  <Droplets size={13} color={colors.mutedForeground} />
                  <Typography.Small style={{ color: colors.mutedForeground, marginLeft: 4 }}>
                    {t('humidity_val', { count: data?.weather?.humidity ?? '--' })}
                  </Typography.Small>
                </View>
              </View>
              <Cloud size={40} color={colors.mutedForeground} />
            </View>
            {data?.weather?.advice ? (
              <View style={[styles.adviceRow, { backgroundColor: colors.muted }]}>
                <Typography.Small style={{ color: colors.foreground, flex: 1, lineHeight: 18 }}>
                  {isTamil ? (data.weather.tamil_advice || data.weather.advice) : data.weather.advice}
                </Typography.Small>
              </View>
            ) : null}
            <Typography.Small style={{ color: colors.mutedForeground, marginTop: 10 }}>
              Tap to view hourly and full timeline weather
            </Typography.Small>
          </Pressable>
        </View>

        {/* ── Pest Alert ── */}
        <View style={styles.section}>
          <Typography.Small style={[styles.label, { color: colors.mutedForeground }]}>ALERTS</Typography.Small>
          <View style={[styles.card, { borderColor: colors.border }]}>
            <View style={styles.alertRow}>
              <View style={{ flex: 1 }}>
                <Typography.P style={{ fontWeight: '600', color: colors.foreground }}>
                  {isTamil
                    ? (data?.alerts?.tamil_pest_type || data?.alerts?.pest_type)
                    : (data?.alerts?.pest_type ?? t('Monitoring area...'))}
                </Typography.P>
                <View style={styles.riskRow}>
                  <Typography.Small style={{ color: colors.mutedForeground }}>{t('riskLevel')}: </Typography.Small>
                  <Badge variant={data?.alerts?.alert_level === 'High' ? 'destructive' : 'secondary'}>
                    {t(data?.alerts?.alert_level ?? 'Normal')}
                  </Badge>
                </View>
              </View>
              <Bell size={22} color={colors.mutedForeground} />
            </View>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <Typography.Small style={[styles.label, { color: colors.mutedForeground }]}>TOOLS</Typography.Small>
          <View style={styles.actionGrid}>
            <ActionCard icon={Camera} label={t('cropScan')} onPress={() => router.push('/scan')} />
            <ActionCard icon={Mic} label={t('Assistant')} onPress={() => router.push('/assistant')} />
            <ActionCard icon={BarChart3} label={t('marketPrices')} onPress={() => router.push('/prices')} />
            <ActionCard icon={Sprout} label={t('cropAdvice')} onPress={() => router.push('/advice')} />
          </View>
        </View>

        <MoreToolsSection items={[
          { label: 'Agri Flow', sub: 'Your farming roadmap', icon: Tractor, color: '#8B5CF6', route: '/agriflow' },
          { label: 'Reports', sub: 'Export & analytics', icon: BarChart3, color: '#F97316', route: '/reports' },
          { label: 'Daily Check', sub: 'Log daily health', icon: Sprout, color: '#10B981', route: '/daily-check' },
        ]} />
      </ScrollView>

      {/* ── FAB ── */}
      <Pressable
        onPress={() => router.push('/assistant')}
        style={[styles.fab, { backgroundColor: colors.tint }]}
      >
        <MessageSquareIcon size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const ActionCard = ({ icon: Icon, label, onPress }: any) => {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        { borderColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Icon size={22} color={colors.foreground} />
      <Typography.Small style={{ color: colors.foreground, fontWeight: '600', textAlign: 'center' }}>
        {label}
      </Typography.Small>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingBottom: 100 },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontWeight: '800', fontSize: 24, letterSpacing: -0.5 },

  section: { paddingHorizontal: 20, marginTop: 20 },
  label: { fontWeight: '700', fontSize: 11, letterSpacing: 1, marginBottom: 8 },

  card: { borderRadius: 12, borderWidth: 1, padding: 16 },

  weatherRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  temp: { fontSize: 40, fontWeight: '800', letterSpacing: -1.5 },
  humRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  adviceRow: { marginTop: 12, padding: 10, borderRadius: 8 },

  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  riskRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    width: '47%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
