import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from '@/components/ui/Chart';
import { MessageCircle, Camera, Heart, Leaf, TrendingUp, Zap } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectItem } from '@/components/ui/Select';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { Typography } from '@/components/ui/Typography';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';

interface HistoryData { dates: string[]; scores: number[]; }

const STAGE_TEST_RESULTS_KEY = 'agriflow_stage_test_results_v1';

export default function DailyCheckScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ stage?: string; stage_day?: string; crop?: string }>();
  const { uploadFile, getRequest, postRequest, getActiveAgriFlowPlans, analyzeAgriFlowPhoto, recomputeAgriFlowPlan } = useApi();

  const [crop, setCrop] = useState('Rice');
  const [healthScore, setHealthScore] = useState(3);
  const [photo, setPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiAssessment, setAIAssessment] = useState<any>(null);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [growthStageDay, setGrowthStageDay] = useState(30);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activePlanLocation, setActivePlanLocation] = useState<string | null>(null);
  const [plannerMessage, setPlannerMessage] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
    loadActivePlan();

    if (params.crop && String(params.crop).trim().length > 0) {
      setCrop(String(params.crop));
    }
    if (params.stage_day && !Number.isNaN(Number(params.stage_day))) {
      setGrowthStageDay(Math.max(1, Math.min(365, Number(params.stage_day))));
    }
  }, []);

  const healthEmojis = ['😢', '😕', '😐', '🙂', '😊'];
  const healthLabels = ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'];

  const loadHistory = async () => {
    try {
      setLoading(true);
      const result = await getRequest('/agri-flow/daily-monitoring/history', { days: 7 });
      if (result.history?.length > 0) {
        setHistoryData({
          dates: result.history.map((e: any) => new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
          scores: result.history.map((e: any) => e.health_score * 20),
        });
      }
    } catch { } finally { setLoading(false); }
  };

  const loadActivePlan = async () => {
    try {
      const result = await getActiveAgriFlowPlans();
      const firstPlan = result?.plans?.[0];
      if (firstPlan?.plan_id) {
        setActivePlanId(firstPlan.plan_id);
        setActivePlanLocation(firstPlan.location || null);
        if (firstPlan.crop) {
          setCrop(String(firstPlan.crop).charAt(0).toUpperCase() + String(firstPlan.crop).slice(1));
        }
      }
    } catch {
      setActivePlanId(null);
    }
  };

  const pickCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Camera Permission', 'Camera access required'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const pickGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission', 'Gallery access required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const deriveRainProbability = (humidityValue: number, score: number) => {
    if (humidityValue >= 85) return 75;
    if (humidityValue >= 75) return 60;
    if (score <= 2 && humidityValue >= 65) return 55;
    return 35;
  };

  const deriveHeatIndex = (tempValue: number, humidityValue: number) => {
    const humidityFactor = Math.max(0, (humidityValue - 40) * 0.12);
    return Number((tempValue + humidityFactor).toFixed(1));
  };

  const triggerPlannerRecompute = async (planId: string, tempValue: number, humidityValue: number) => {
    const rainProbability = deriveRainProbability(humidityValue, healthScore);
    const heatIndex = deriveHeatIndex(tempValue, humidityValue);

    const recomputeRes = await recomputeAgriFlowPlan(planId, {
      rain_probability: rainProbability,
      heat_index: heatIndex,
      humidity: humidityValue,
      note: `Auto recompute from daily check (${activePlanLocation || 'field'})`,
    });

    const changedCount = recomputeRes?.last_recompute?.changed_task_ids?.length || 0;
    return { changedCount, rainProbability, heatIndex };
  };

  const persistStageTestResult = async (payload: {
    stage: string;
    crop: string;
    stageDay: number;
    manualHealthScore: number;
    aiHealthScore?: number;
    recommendation?: string;
  }) => {
    const aiScore = payload.aiHealthScore;
    const normalizedManualScore = payload.manualHealthScore * 20;
    const referenceScore = aiScore != null ? aiScore : normalizedManualScore;
    const pass = referenceScore >= 55;

    const raw = await AsyncStorage.getItem(STAGE_TEST_RESULTS_KEY);
    const existing = raw ? JSON.parse(raw) : {};
    existing[payload.stage] = {
      stage: payload.stage,
      crop: payload.crop,
      stageDay: payload.stageDay,
      pass,
      manualHealthScore: payload.manualHealthScore,
      aiHealthScore: aiScore ?? null,
      recommendation: payload.recommendation || null,
      testedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(STAGE_TEST_RESULTS_KEY, JSON.stringify(existing));
  };

  const submit = async () => {
    if (!crop) { Alert.alert('Required', 'Select a crop'); return; }
    try {
      setSubmitting(true);
      setPlannerMessage(null);
      if (photo) {
        const weatherTemp = 25;
        const weatherHumidity = 70;
        const params = new URLSearchParams({ crop, growth_stage_day: growthStageDay.toString(), health_score: healthScore.toString(), notes: notes || '', temperature: '25', humidity: '70' });
        const res = await uploadFile(`/agri-flow/daily-monitoring?${params}`, photo, 'file', `crop_${Date.now()}.jpg`, 'image/jpeg');
        if (!res) { Alert.alert('Error', 'Upload failed'); return; }

        if (activePlanId) {
          const plannerRes = await analyzeAgriFlowPhoto(
            {
              plan_id: activePlanId,
              crop,
              growth_stage_day: growthStageDay,
              health_score: healthScore,
              notes: notes || undefined,
              temperature: weatherTemp,
              humidity: weatherHumidity,
            },
            photo
          );
          if (plannerRes?.status === 'success') {
            const pendingCount = (plannerRes?.plan?.tasks || []).filter(
              (task: any) => task.status !== 'completed' && task.status !== 'skipped'
            ).length;
            const recompute = await triggerPlannerRecompute(activePlanId, weatherTemp, weatherHumidity);
            setPlannerMessage(
              `Planner updated. ${pendingCount} pending tasks, ${recompute.changedCount} weather-adjusted tasks (rain ${recompute.rainProbability}%, heat ${recompute.heatIndex}).`
            );
          }
        }

        setAIAssessment(res);

        if (params.stage) {
          await persistStageTestResult({
            stage: String(params.stage),
            crop,
            stageDay: growthStageDay,
            manualHealthScore: healthScore,
            aiHealthScore: res?.ai_assessment?.health_score,
            recommendation: res?.recommendation,
          });
        }

        Alert.alert('✅ Done', res.recommendation);
      } else {
        const weatherTemp = 25;
        const weatherHumidity = 70;
        const res = await postRequest('/agri-flow/daily-monitoring', {}, { crop, growth_stage_day: growthStageDay, health_score: healthScore, notes: notes || '' });
        if (!res) { Alert.alert('Error', 'Save failed'); return; }

        if (activePlanId) {
          const plannerRes = await analyzeAgriFlowPhoto({
            plan_id: activePlanId,
            crop,
            growth_stage_day: growthStageDay,
            health_score: healthScore,
            notes: notes || undefined,
            temperature: weatherTemp,
            humidity: weatherHumidity,
          });
          if (plannerRes?.status === 'success') {
            const pendingCount = (plannerRes?.plan?.tasks || []).filter(
              (task: any) => task.status !== 'completed' && task.status !== 'skipped'
            ).length;
            const recompute = await triggerPlannerRecompute(activePlanId, weatherTemp, weatherHumidity);
            setPlannerMessage(
              `Planner updated. ${pendingCount} pending tasks, ${recompute.changedCount} weather-adjusted tasks (rain ${recompute.rainProbability}%, heat ${recompute.heatIndex}).`
            );
          }
        }

        setAIAssessment(res);

        if (params.stage) {
          await persistStageTestResult({
            stage: String(params.stage),
            crop,
            stageDay: growthStageDay,
            manualHealthScore: healthScore,
            aiHealthScore: res?.ai_assessment?.health_score,
            recommendation: res?.recommendation,
          });
        }
      }
      setPhoto(null); setHealthScore(3); setNotes('');
      await loadHistory();
    } catch { Alert.alert('Error', 'Failed'); } finally { setSubmitting(false); }
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.tint} /></View>;
  }

  return (
    <KeyboardResponsiveView style={{ backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Typography.H2 style={[styles.title, { color: colors.foreground, borderBottomWidth: 0 }]}>Daily Check</Typography.H2>
          <Typography.Small style={{ color: colors.mutedForeground, marginTop: 2 }}>Log crop health daily</Typography.Small>
        </View>

        {/* Photo */}
        <View style={[styles.card, { borderColor: colors.border }]}>
          <Typography.Small style={[styles.label, { color: colors.mutedForeground }]}>PHOTO</Typography.Small>
          {photo ? (
            <>
              <View style={[styles.photoPreview, { backgroundColor: colors.muted }]}>
                <Typography.Small style={{ color: colors.mutedForeground }}>{photo.split('/').pop()}</Typography.Small>
              </View>
              <Button variant="outline" onPress={() => setPhoto(null)} style={{ marginTop: 8 }}>Change</Button>
            </>
          ) : (
            <View style={styles.btnRow}>
              <Button onPress={pickCamera} style={{ flex: 1 }}>Take Photo</Button>
              <Button variant="outline" onPress={pickGallery} style={{ flex: 1 }}>Gallery</Button>
            </View>
          )}
        </View>

        {/* Health */}
        <View style={[styles.card, { borderColor: colors.border }]}>
          <Typography.Small style={[styles.label, { color: colors.mutedForeground }]}>HEALTH SCORE</Typography.Small>
          <View style={styles.emojiRow}>
            <Typography.H1 style={{ fontSize: 40 }}>{healthEmojis[healthScore - 1]}</Typography.H1>
            <Typography.P style={{ fontWeight: '600', color: colors.tint }}>{healthLabels[healthScore - 1]}</Typography.P>
          </View>
          <View style={styles.scoreRow}>
            <Button variant="outline" onPress={() => setHealthScore(Math.max(1, healthScore - 1))} style={styles.adjBtn}>-1</Button>
            <Typography.P style={{ fontWeight: '700' }}>{healthScore}/5</Typography.P>
            <Button variant="outline" onPress={() => setHealthScore(Math.min(5, healthScore + 1))} style={styles.adjBtn}>+1</Button>
          </View>
        </View>

        {/* Crop */}
        <View style={[styles.card, { borderColor: colors.border }]}>
          <Typography.Small style={[styles.label, { color: colors.mutedForeground }]}>CROP</Typography.Small>
          {params.stage ? (
            <Typography.Small style={{ color: colors.mutedForeground, marginBottom: 8 }}>
              Stage Test: {String(params.stage).replace(/_/g, ' ')} (Day {growthStageDay})
            </Typography.Small>
          ) : null}
          <Select value={crop} onValueChange={setCrop} placeholder="Select crop">
            {['Rice', 'Wheat', 'Maize', 'Cotton', 'Tomato', 'Onion'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </Select>
        </View>

        {/* Notes */}
        <View style={[styles.card, { borderColor: colors.border }]}>
          <Typography.Small style={[styles.label, { color: colors.mutedForeground }]}>NOTES (OPTIONAL)</Typography.Small>
          <Input
            placeholder="e.g., Watered yesterday, yellowing leaves"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={{ minHeight: 72 }}
          />
        </View>

        {/* AI Assessment */}
        {aiAssessment && (
          <View style={[styles.card, { borderColor: colors.tint }]}>
            <Typography.Small style={[styles.label, { color: colors.tint }]}>AI ASSESSMENT</Typography.Small>
            {aiAssessment.ai_assessment && (
              <>
                <Typography.P style={{ fontWeight: '600' }}>Status: {aiAssessment.ai_assessment.health_status}</Typography.P>
                <Typography.P style={{ color: colors.tint }}>Score: {aiAssessment.ai_assessment.health_score}/100</Typography.P>
                {aiAssessment.ai_assessment.observations?.map((obs: string, idx: number) => (
                  <Typography.Small key={idx} style={{ color: colors.foreground }}>• {obs}</Typography.Small>
                ))}
              </>
            )}
            <View style={[styles.recBox, { backgroundColor: colors.muted }]}>
              <Typography.Small style={{ fontWeight: '700', color: colors.tint, marginBottom: 4 }}>Recommendation</Typography.Small>
              <Typography.P>{aiAssessment.recommendation}</Typography.P>
            </View>
            {plannerMessage && (
              <View style={[styles.recBox, { backgroundColor: colors.muted, marginTop: 8 }]}>
                <Typography.Small style={{ fontWeight: '700', color: colors.tint, marginBottom: 4 }}>Planner Sync</Typography.Small>
                <Typography.P>{plannerMessage}</Typography.P>
              </View>
            )}
          </View>
        )}

        {/* Trend */}
        {historyData && historyData.dates.length > 1 && (
          <View style={[styles.card, { borderColor: colors.border }]}>
            <Typography.Small style={[styles.label, { color: colors.mutedForeground }]}>7-DAY TREND</Typography.Small>
            <LineChart data={historyData.scores} labels={historyData.dates} height={180} style={{ borderRadius: 12 }} />
          </View>
        )}

        {/* Submit */}
        <Button onPress={submit} disabled={submitting} style={styles.submitBtn}>
          {submitting ? 'Processing...' : '✓ Submit Daily Check'}
        </Button>

        <View style={{ height: 30 }} />
      </ScrollView>
    </KeyboardResponsiveView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { paddingTop: 56, paddingBottom: 16 },
  title: { fontWeight: '800', fontSize: 24, letterSpacing: -0.5 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 14 },
  label: { fontWeight: '700', fontSize: 11, letterSpacing: 1, marginBottom: 10 },
  photoPreview: { height: 120, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnRow: { flexDirection: 'row', gap: 10 },
  emojiRow: { alignItems: 'center', marginBottom: 12 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  adjBtn: { minWidth: 60 },
  recBox: { marginTop: 10, padding: 10, borderRadius: 8 },
  submitBtn: { marginTop: 4, height: 48, borderRadius: 12 },
});
