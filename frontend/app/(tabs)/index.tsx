import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LayoutGrid, Camera, Mic, BarChart3, Sprout, Cloud, Thermometer, Droplets, Bell } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useApi } from '../../hooks/use-api';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { useAppContext } from '../../context/AppProvider';

export default function HomeScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { language } = useAppContext();
  const { getHomeData, loading } = useApi();
  const [data, setData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const isTamil = language === 'Tamil';

  useEffect(() => {
    const init = async () => {
      const profileStr = await AsyncStorage.getItem('user_profile');
      if (profileStr) {
        setProfile(JSON.parse(profileStr));
      }
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>AgriNexa</ThemedText>
        <ThemedText type="subtitle" style={[styles.welcomeText, { color: colors.text }]}>
          {welcomeMsg}
        </ThemedText>
        <ThemedText style={[styles.headerSubtitle, { color: colors.icon }]}>
          {subMsg}
        </ThemedText>
      </ThemedView>

      {/* Weather Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Cloud size={20} color={colors.tint} />
          <ThemedText type="defaultSemiBold" style={[styles.cardTitle, { color: colors.tint }]}>
            Weather Update
          </ThemedText>
        </View>
        <View style={styles.weatherContent}>
          <ThemedText style={[styles.temp, { color: colors.text }]}>
            {data?.weather?.temp ?? '--'}°C
          </ThemedText>
          <View>
            <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>
              {isTamil ? (data?.weather?.tamil_condition || data?.weather?.condition) : data?.weather?.condition ?? 'Loading...'}
            </ThemedText>
            <View style={styles.weatherStatRow}>
              <Droplets size={14} color={colors.icon} />
              <ThemedText style={[styles.weatherStat, { color: colors.icon }]}>
                {data?.weather?.humidity ?? '--'}% Humidity
              </ThemedText>
            </View>
          </View>
        </View>
        <View style={[styles.adviceBox, { backgroundColor: colors.tint + '10' }]}>
          <Sprout size={16} color={colors.tint} />
          <ThemedText style={[styles.advice, { color: colors.text }]}>
            {isTamil ? (data?.weather?.tamil_advice || data?.weather?.advice) : data?.weather?.advice ?? 'Fetching optimal farming conditions...'}
          </ThemedText>
        </View>
      </View>

      {/* Pest Alert Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Bell size={20} color={colors.notification} />
          <ThemedText type="defaultSemiBold" style={[styles.cardTitle, { color: colors.notification }]}>
            Pest Alert
          </ThemedText>
        </View>
        <ThemedText type="defaultSemiBold" style={[styles.alertDetail, { color: colors.text }]}>
          {isTamil ? (data?.alerts?.tamil_pest_type || data?.alerts?.pest_type) : data?.alerts?.pest_type ?? 'Monitoring area...'}
        </ThemedText>
        <View style={styles.riskBadge}>
          <ThemedText style={[styles.riskText, { color: colors.icon }]}>
            Risk Level: 
          </ThemedText>
          <ThemedText style={[styles.riskValue, { color: colors.notification }]}>
            {data?.alerts?.alert_level ?? 'Normal'}
          </ThemedText>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionHeader}>
        <LayoutGrid size={20} color={colors.icon} />
        <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: colors.text }]}>
          Smart Tools
        </ThemedText>
      </View>

      <View style={styles.actionGrid}>
        <ActionBtn icon={Camera} label="Crop Scan" color={colors.tint} onPress={() => router.push('/scan')} />
        <ActionBtn icon={Mic} label="Voice AI" color="#3B82F6" onPress={() => router.push('/voice')} />
        <ActionBtn icon={BarChart3} label="Market Prices" color="#F59E0B" onPress={() => router.push('/prices')} />
        <ActionBtn icon={Sprout} label="Crop Advice" color="#8B5CF6" onPress={() => router.push('/advice')} />
      </View>
    </ScrollView>
  );
}

const ActionBtn = ({ icon: Icon, label, color, onPress }: { icon: any, label: string, color: string, onPress: () => void }) => {
  const colors = useThemeColors();
  return (
    <TouchableOpacity 
      style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
      onPress={onPress}
    >
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        <Icon size={24} color={color} />
      </View>
      <ThemedText style={[styles.actionLabel, { color: colors.text }]}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 30, paddingTop: 70, backgroundColor: 'transparent', gap: 4 },
  headerTitle: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  welcomeText: { fontSize: 20, fontWeight: '700', marginTop: 12 },
  headerSubtitle: { fontSize: 15, fontWeight: '500', opacity: 0.8 },
  card: { marginHorizontal: 20, marginVertical: 10, padding: 24, borderRadius: 28, borderWidth: 1, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitle: { marginLeft: 10, fontSize: 17, textTransform: 'uppercase', letterSpacing: 1 },
  weatherContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  temp: { fontSize: 56, fontWeight: '800', letterSpacing: -2 },
  weatherStatRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  weatherStat: { fontSize: 14, marginLeft: 4 },
  adviceBox: { padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center' },
  advice: { marginLeft: 10, fontSize: 13, flex: 1, lineHeight: 18, fontWeight: '500' },
  alertDetail: { marginTop: 8, fontSize: 18 },
  riskBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  riskText: { fontSize: 14 },
  riskValue: { fontSize: 14, fontWeight: '700', marginLeft: 4 },
  actionHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginTop: 24, marginBottom: 16 },
  sectionTitle: { fontSize: 20, marginLeft: 10 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, justifyContent: 'space-between' },
  actionBtn: { width: '45%', marginHorizontal: '2.5%', marginBottom: 16, padding: 20, borderRadius: 24, borderWidth: 1, alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionLabel: { fontSize: 14, fontWeight: '700' },
});
