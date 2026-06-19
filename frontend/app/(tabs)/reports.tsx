import React, { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FileDown, BarChart3, CalendarDays, Activity, Share2 } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { Typography } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { useTheme } from '@/hooks/use-theme';
import { useApi } from '@/hooks/use-api';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

interface MonitoringSummary {
  monitoring_count: number;
  average_health_score: number;
  trend: string;
  last_photo_date: string | null;
}

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { getRequest, loading } = useApi();
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const loadSummary = async (rangeDays: number) => {
    const response = await getRequest('/agri-flow/daily-monitoring/history', { days: rangeDays });
    if (!response) return;
    setSummary(response.summary || null);
    setRecommendations(response.recommendations || []);
  };

  useEffect(() => { loadSummary(days); }, [days]);

  const getAuthHeaders = async () => {
    const sessionStr = await AsyncStorage.getItem('user_session');
    const session = sessionStr ? JSON.parse(sessionStr) : null;
    if (!session?.token) { Alert.alert('Session expired', 'Please sign in again.'); return null; }
    return { Accept: 'application/pdf', Authorization: `Bearer ${session.token}` };
  };

  const downloadPdf = async () => {
    try {
      setDownloading(true);
      const headers = await getAuthHeaders();
      if (!headers) return;
      const reportUrl = `${BASE_URL}/agri-flow/report/pdf?days=${days}`;

      if (Platform.OS === 'web') {
        const response = await fetch(reportUrl, { method: 'GET', headers });
        if (!response.ok) { Alert.alert('Download failed'); return; }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = `agrinexa_report_${days}d_${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
        Alert.alert('Downloaded');
        return;
      }
      const fileUri = `${FileSystem.documentDirectory}agrinexa_report_${days}d_${Date.now()}.pdf`;
      const result = await FileSystem.downloadAsync(reportUrl, fileUri, { headers });
      if (result.status !== 200) { Alert.alert('Download failed'); return; }
      Alert.alert('Downloaded', 'PDF saved.');
    } catch { Alert.alert('Error', 'Failed to generate report.'); }
    finally { setDownloading(false); }
  };

  const sharePdf = async () => {
    try {
      setSharing(true);
      const headers = await getAuthHeaders();
      if (!headers) return;
      const reportUrl = `${BASE_URL}/agri-flow/report/pdf?days=${days}`;
      if (Platform.OS === 'web') { await downloadPdf(); return; }
      const fileUri = `${FileSystem.cacheDirectory}agrinexa_report_share_${days}d_${Date.now()}.pdf`;
      const result = await FileSystem.downloadAsync(reportUrl, fileUri, { headers });
      if (result.status !== 200) { Alert.alert('Share failed'); return; }
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { Alert.alert('Unavailable'); return; }
      await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: `${days}-Day Report`, UTI: 'com.adobe.pdf' });
    } catch { Alert.alert('Error', 'Failed to share.'); }
    finally { setSharing(false); }
  };

  return (
    <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scroll}>
      <ResponsiveContainer>
        <View style={styles.header}>
          <Typography.H2 style={[styles.title, { color: colors.foreground, borderBottomWidth: 0 }]}>Reports</Typography.H2>
          <Typography.Small style={{ color: colors.mutedForeground, marginTop: 2 }}>Monitoring analytics & export</Typography.Small>
        </View>

        <View style={styles.rangeRow}>
          {[7, 30, 90].map(d => (
            <Button key={d} variant={days === d ? 'default' : 'outline'} onPress={() => setDays(d)} style={styles.rangeBtn}>
              <Typography.P>{d} Days</Typography.P>
            </Button>
          ))}
        </View>

        {loading && !summary ? (
          <View style={styles.loading}><Spinner size={28} color={colors.tint} /></View>
        ) : (
          <View style={styles.content}>
            {/* Summary */}
            <View style={[styles.card, { borderColor: colors.border }]}>
              <Typography.Small style={[styles.label, { color: colors.mutedForeground }]}>SUMMARY</Typography.Small>
              <View style={styles.metricRow}>
                <Activity size={14} color={colors.mutedForeground} />
                <Typography.P>Entries: {summary?.monitoring_count ?? 0}</Typography.P>
              </View>
              <View style={styles.metricRow}>
                <BarChart3 size={14} color={colors.mutedForeground} />
                <Typography.P>Avg Health: {summary?.average_health_score ?? 0} / 5</Typography.P>
              </View>
              <View style={styles.metricRow}>
                <CalendarDays size={14} color={colors.mutedForeground} />
                <Typography.P>Trend: {summary?.trend ?? 'stable'}</Typography.P>
              </View>
            </View>

            {/* Recommendations */}
            <View style={[styles.card, { borderColor: colors.border }]}>
              <Typography.Small style={[styles.label, { color: colors.mutedForeground }]}>RECOMMENDATIONS</Typography.Small>
              {recommendations.length > 0 ? (
                recommendations.map((item, idx) => (
                  <Typography.P key={idx} style={{ lineHeight: 20, marginBottom: 4 }}>• {item}</Typography.P>
                ))
              ) : (
                <Typography.Muted>No recommendations yet.</Typography.Muted>
              )}
            </View>

            {/* Export */}
            <View style={styles.exportRow}>
              <Button onPress={downloadPdf} disabled={downloading || sharing} style={styles.exportBtn}>
                <FileDown size={16} color="#fff" />
                <Typography.P style={{ color: '#fff', fontWeight: '600' }}>{downloading ? 'Downloading...' : 'Download'}</Typography.P>
              </Button>
              <Button variant="outline" onPress={sharePdf} disabled={downloading || sharing} style={styles.exportBtn}>
                <Share2 size={16} color={colors.foreground} />
                <Typography.P style={{ fontWeight: '600' }}>{sharing ? 'Sharing...' : 'Share'}</Typography.P>
              </Button>
            </View>
          </View>
        )}
      </ResponsiveContainer>
    </KeyboardResponsiveView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title: { fontWeight: '800', fontSize: 24, letterSpacing: -0.5 },
  rangeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  rangeBtn: { flex: 1, borderRadius: 10 },
  loading: { marginTop: 80, alignItems: 'center' },
  content: { paddingHorizontal: 20, gap: 14 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14 },
  label: { fontWeight: '700', fontSize: 11, letterSpacing: 1, marginBottom: 10 },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  exportRow: { flexDirection: 'row', gap: 10 },
  exportBtn: { flex: 1, height: 44, borderRadius: 10, flexDirection: 'row', gap: 6 },
});
