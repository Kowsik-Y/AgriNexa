import React, { useEffect, useState } from 'react';
import { Alert, Platform, View, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FileDown, BarChart3, CalendarDays, Activity, Share2 } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { Button } from '@/components/reusables/button';
import { Card, CardContent } from '@/components/reusables/card';
import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
import { Spinner } from '@/components/Spinner';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';
import { useApi } from '@/hooks/use-api';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

interface MonitoringSummary {
  monitoring_count: number;
  average_health_score: number;
  trend: string;
  last_photo_date: string | null;
}

export default function ReportsScreen() {
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

  useEffect(() => {
    loadSummary(days);
  }, [days]);

  const getAuthHeaders = async () => {
    const sessionStr = await AsyncStorage.getItem('user_session');
    const session = sessionStr ? JSON.parse(sessionStr) : null;
    if (!session?.token) {
      Alert.alert('Session expired', 'Please sign in again.');
      return null;
    }
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
        if (!response.ok) {
          Alert.alert('Download failed');
          return;
        }
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
      if (result.status !== 200) {
        Alert.alert('Download failed');
        return;
      }
      Alert.alert('Downloaded', 'PDF saved.');
    } catch {
      Alert.alert('Error', 'Failed to generate report.');
    } finally {
      setDownloading(false);
    }
  };

  const sharePdf = async () => {
    try {
      setSharing(true);
      const headers = await getAuthHeaders();
      if (!headers) return;
      const reportUrl = `${BASE_URL}/agri-flow/report/pdf?days=${days}`;
      if (Platform.OS === 'web') {
        await downloadPdf();
        return;
      }
      const fileUri = `${FileSystem.cacheDirectory}agrinexa_report_share_${days}d_${Date.now()}.pdf`;
      const result = await FileSystem.downloadAsync(reportUrl, fileUri, { headers });
      if (result.status !== 200) {
        Alert.alert('Share failed');
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Unavailable');
        return;
      }
      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${days}-Day Report`,
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Error', 'Failed to share.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: 'Monitoring Reports' }} />
      <ResponsiveContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="p-5 pb-16 gap-5"
        >
          <Text variant="muted" className="text-sm -mt-1">
            Monitoring analytics & export
          </Text>

          {/* Range Selector */}
          <View className="flex-row gap-2">
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                variant={days === d ? 'default' : 'outline'}
                onPress={() => setDays(d)}
                className="flex-1 rounded-xl h-10"
              >
                <Text
                  className={`text-sm font-semibold ${
                    days === d ? 'text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  {d} Days
                </Text>
              </Button>
            ))}
          </View>

          {loading && !summary ? (
            <View className="items-center justify-center py-20">
              <Spinner size={32} />
            </View>
          ) : (
            <View className="gap-5">
              {/* Summary Card */}
              <Card className="rounded-2xl border border-border bg-card p-4 gap-3">
                <Text variant="muted" className="text-xs font-bold uppercase tracking-wider">
                  SUMMARY
                </Text>
                <View className="flex-row items-center gap-2.5">
                  <Icon as={Activity} size={16} className="text-muted-foreground" />
                  <Text className="text-sm text-foreground">
                    Entries: <Text className="font-bold">{summary?.monitoring_count ?? 0}</Text>
                  </Text>
                </View>
                <View className="flex-row items-center gap-2.5">
                  <Icon as={BarChart3} size={16} className="text-muted-foreground" />
                  <Text className="text-sm text-foreground">
                    Avg Health: <Text className="font-bold">{summary?.average_health_score ?? 0} / 5</Text>
                  </Text>
                </View>
                <View className="flex-row items-center gap-2.5">
                  <Icon as={CalendarDays} size={16} className="text-muted-foreground" />
                  <Text className="text-sm text-foreground">
                    Trend: <Text className="font-bold capitalize">{summary?.trend ?? 'stable'}</Text>
                  </Text>
                </View>
              </Card>

              {/* Recommendations */}
              <Card className="rounded-2xl border border-border bg-card p-4 gap-2.5">
                <Text variant="muted" className="text-xs font-bold uppercase tracking-wider">
                  RECOMMENDATIONS
                </Text>
                {recommendations.length > 0 ? (
                  recommendations.map((item, idx) => (
                    <Text key={idx} className="text-sm leading-relaxed text-foreground/90">
                      • {item}
                    </Text>
                  ))
                ) : (
                  <Text variant="muted" className="text-sm">
                    No recommendations yet.
                  </Text>
                )}
              </Card>

              {/* Export Buttons */}
              <View className="flex-row gap-3 mt-1">
                <Button
                  onPress={downloadPdf}
                  disabled={downloading || sharing}
                  className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-2"
                >
                  <Icon as={FileDown} size={18} className="text-primary-foreground" />
                  <Text className="text-primary-foreground font-semibold">
                    {downloading ? 'Downloading...' : 'Download'}
                  </Text>
                </Button>
                <Button
                  variant="outline"
                  onPress={sharePdf}
                  disabled={downloading || sharing}
                  className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-2"
                >
                  <Icon as={Share2} size={18} className="text-foreground" />
                  <Text className="font-semibold text-foreground">
                    {sharing ? 'Sharing...' : 'Share'}
                  </Text>
                </Button>
              </View>
            </View>
          )}
        </ScrollView>
      </ResponsiveContainer>
    </View>
  );
}
