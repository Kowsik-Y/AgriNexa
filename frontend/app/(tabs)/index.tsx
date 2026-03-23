import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LayoutGrid, Camera, Mic, BarChart3, Sprout, Cloud, Thermometer, Droplets, Bell } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Typography } from '@/components/ui/Typography';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { useApi } from '../../hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { useAppContext } from '../../context/AppProvider';

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { language } = useAppContext();
  const { getHomeData, loading } = useApi();
  const [data, setData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const isTamil = language === 'Tamil';

  useEffect(() => {
    const init = async () => {
      const profileStr = await AsyncStorage.getItem('user_profile');
      if (profileStr) setProfile(JSON.parse(profileStr));
      const homeData = await getHomeData();
      setData(homeData);
    };
    init();
  }, []);

  const welcomeMsg = isTamil 
    ? `வணக்கம், ${profile?.district || 'விவசாயி'}!`
    : `Welcome, ${profile?.district || 'Farmer'}!`;
  
  const subMsg = isTamil
    ? 'உங்கள் ஸ்மார்ட் பண்ணை உதவியாளர்.'
    : 'Your smart farm assistant.';

  return (
    <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Typography.H1 style={styles.headerTitle}>AgriNexa</Typography.H1>
        <Typography.H3 style={styles.welcomeText}>
          {welcomeMsg}
        </Typography.H3>
        <Typography.P style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
          {subMsg}
        </Typography.P>
      </View>

      {/* Weather Card */}
      <Card style={styles.card}>
        <CardHeader style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Cloud size={20} color={colors.tint} />
            <Typography.Small style={{ color: colors.tint, textTransform: 'uppercase', letterSpacing: 1 }}>
              Weather Update
            </Typography.Small>
          </View>
        </CardHeader>
        <CardContent>
          <View style={styles.weatherContent}>
            <Typography.H1 style={styles.temp}>
              {data?.weather?.temp ?? '--'}°C
            </Typography.H1>
            <View>
              <Typography.Large>
                {isTamil ? (data?.weather?.tamil_condition || data?.weather?.condition) : data?.weather?.condition ?? 'Loading...'}
              </Typography.Large>
              <View style={styles.weatherStatRow}>
                <Droplets size={14} color={colors.mutedForeground} />
                <Typography.Small style={{ color: colors.mutedForeground, marginLeft: 4 }}>
                  {data?.weather?.humidity ?? '--'}% Humidity
                </Typography.Small>
              </View>
            </View>
          </View>
          <View style={[styles.adviceBox, { backgroundColor: colors.tint + '10' }]}>
            <Sprout size={16} color={colors.tint} />
            <Typography.Small style={styles.advice}>
              {isTamil ? (data?.weather?.tamil_advice || data?.weather?.advice) : data?.weather?.advice ?? 'Fetching optimal farming conditions...'}
            </Typography.Small>
          </View>
        </CardContent>
      </Card>

      {/* Pest Alert Card */}
      <Card style={styles.card}>
        <CardHeader style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Bell size={20} color={colors.destructive} />
            <Typography.Small style={{ color: colors.destructive, textTransform: 'uppercase', letterSpacing: 1 }}>
              Pest Alert
            </Typography.Small>
          </View>
        </CardHeader>
        <CardContent>
          <Typography.Large>
            {isTamil ? (data?.alerts?.tamil_pest_type || data?.alerts?.pest_type) : data?.alerts?.pest_type ?? 'Monitoring area...'}
          </Typography.Large>
          <View style={styles.riskBadge}>
            <Typography.Small style={{ color: colors.mutedForeground }}>Risk Level: </Typography.Small>
            <Badge variant={data?.alerts?.alert_level === 'High' ? 'destructive' : 'secondary'}>
              {data?.alerts?.alert_level ?? 'Normal'}
            </Badge>
          </View>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <View style={styles.actionHeader}>
        <LayoutGrid size={20} color={colors.mutedForeground} />
        <Typography.H3 style={styles.sectionTitle}>Smart Tools</Typography.H3>
      </View>

      <View style={styles.actionGrid}>
        <ActionBtn icon={Camera} label="Crop Scan" color={colors.tint} onPress={() => router.push('/scan')} />
        <ActionBtn icon={Mic} label="Voice AI" color="#3B82F6" onPress={() => router.push('/voice')} />
        <ActionBtn icon={BarChart3} label="Market Prices" color="#F59E0B" onPress={() => router.push('/prices')} />
        <ActionBtn icon={Sprout} label="Crop Advice" color="#8B5CF6" onPress={() => router.push('/advice')} />
      </View>
    </KeyboardResponsiveView>
  );
}

const ActionBtn = ({ icon: Icon, label, color, onPress }: { icon: any, label: string, color: string, onPress: () => void }) => {
  const { colors } = useTheme();
  return (
    <Button 
      variant="outline"
      style={[styles.actionBtn, { height: 'auto', padding: 20 }]}
      onPress={onPress}
    >
      <View style={styles.actionBtnInner}>
        <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
          <Icon size={24} color={color} />
        </View>
        <Typography.Small style={{ fontWeight: '700' }}>{label}</Typography.Small>
      </View>
    </Button>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  header: { padding: 30, paddingTop: 60, gap: 4 },
  headerTitle: { letterSpacing: -1 },
  welcomeText: { marginTop: 12 },
  headerSubtitle: { fontWeight: '500' },
  card: { marginHorizontal: 20, marginVertical: 10, borderRadius: 24 },
  cardHeader: { paddingBottom: 0 },
  weatherContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  temp: { fontSize: 56, letterSpacing: -2 },
  weatherStatRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  adviceBox: { padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  advice: { flex: 1, lineHeight: 18, fontWeight: '500' },
  riskBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  actionHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginTop: 24, marginBottom: 16 },
  sectionTitle: { marginLeft: 10 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, justifyContent: 'space-between' },
  actionBtn: { width: '45%', marginHorizontal: '2.5%', marginBottom: 16, borderRadius: 24 },
  actionBtnInner: { alignItems: 'center', gap: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
