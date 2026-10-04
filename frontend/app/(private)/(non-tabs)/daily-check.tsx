import React, { useState, useEffect } from 'react';
import { View, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from '@/components/Chart';
import { Camera, Sparkles, Image as ImageIcon } from 'lucide-react-native';

import { Button } from '@/components/reusables/button';
import { Badge } from '@/components/reusables/badge';
import { Text } from '@/components/reusables/text';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/reusables/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/reusables/dialog';
import { Input } from '@/components/reusables/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/reusables/select';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { KeyboardResponsiveView } from '@/components/KeyboardResponsiveView';

interface HistoryData {
  dates: string[];
  scores: number[];
}

const STAGE_TEST_RESULTS_KEY = 'agriflow_stage_test_results_v1';

export default function DailyCheckScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ stage?: string; stage_day?: string; crop?: string }>();
  const {
    uploadFile,
    getRequest,
    postRequest,
    getActiveAgriFlowPlans,
    analyzeAgriFlowPhoto,
    recomputeAgriFlowPlan,
  } = useApi();

  const [crop, setCrop] = useState('Rice');
  const [healthScore, setHealthScore] = useState(3);
  const [photo, setPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiAssessment, setAIAssessment] = useState<any>(null);
  const [isAssessmentDialogOpen, setIsAssessmentDialogOpen] = useState(false);
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
          dates: result.history.map((e: any) =>
            new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          ),
          scores: result.history.map((e: any) => e.health_score * 20),
        });
      }
    } catch {
    } finally {
      setLoading(false);
    }
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
    if (status !== 'granted') {
      Alert.alert('Camera Permission', 'Camera access required');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const pickGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'Gallery access required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
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
    if (!crop) {
      Alert.alert('Required', 'Select a crop');
      return;
    }
    try {
      setSubmitting(true);
      setPlannerMessage(null);
      if (photo) {
        const weatherTemp = 25;
        const weatherHumidity = 70;
        const queryParams = new URLSearchParams({
          crop,
          growth_stage_day: growthStageDay.toString(),
          health_score: healthScore.toString(),
          notes: notes || '',
          temperature: '25',
          humidity: '70',
        });
        const res = await uploadFile(
          `/agri-flow/daily-monitoring?${queryParams.toString()}`,
          photo,
          'file',
          `crop_${Date.now()}.jpg`,
          'image/jpeg'
        );
        if (!res) {
          Alert.alert('Error', 'Upload failed');
          return;
        }

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
              `Planner updated: ${pendingCount} pending tasks, ${recompute.changedCount} weather-adjusted tasks (rain ${recompute.rainProbability}%, heat ${recompute.heatIndex}).`
            );
          }
        }

        setAIAssessment(res);
        setIsAssessmentDialogOpen(true);

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
      } else {
        const weatherTemp = 25;
        const weatherHumidity = 70;
        const res = await postRequest(
          '/agri-flow/daily-monitoring',
          {},
          { crop, growth_stage_day: growthStageDay, health_score: healthScore, notes: notes || '' }
        );
        if (!res) {
          Alert.alert('Error', 'Save failed');
          return;
        }

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
              `Planner updated: ${pendingCount} pending tasks, ${recompute.changedCount} weather-adjusted tasks (rain ${recompute.rainProbability}%, heat ${recompute.heatIndex}).`
            );
          }
        }

        setAIAssessment(res);
        setIsAssessmentDialogOpen(true);

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
      setPhoto(null);
      setHealthScore(3);
      setNotes('');
      await loadHistory();
    } catch {
      Alert.alert('Error', 'Failed to submit daily check');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <KeyboardResponsiveView className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="p-4 sm:p-6 pb-28 gap-4 max-w-3xl mx-auto w-full"
      >
        {/* Subtitle */}
        <View className="pb-1">
          <Text variant="muted">Log crop health and monitor daily condition trends</Text>
        </View>

        {/* Photo Card */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
              Crop Photo
            </CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            {photo ? (
              <View className="gap-3">
                <View className="h-48 rounded-xl overflow-hidden bg-muted border border-border/60">
                  <Image source={{ uri: photo }} className="w-full h-full" resizeMode="cover" />
                </View>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setPhoto(null)}
                  className="self-start rounded-lg border-border"
                >
                  <Text className="text-xs font-medium">Remove / Change Photo</Text>
                </Button>
              </View>
            ) : (
              <View className="flex-row gap-3">
                <Button onPress={pickCamera} className="flex-1 flex-row items-center justify-center gap-2 h-11 rounded-xl">
                  <Camera size={16} className="text-primary-foreground" />
                  <Text className="text-primary-foreground font-semibold">Take Photo</Text>
                </Button>
                <Button
                  variant="outline"
                  onPress={pickGallery}
                  className="flex-1 flex-row items-center justify-center gap-2 h-11 rounded-xl border-border"
                >
                  <ImageIcon size={16} className="text-foreground" />
                  <Text className="font-semibold text-foreground">Gallery</Text>
                </Button>
              </View>
            )}
          </CardContent>
        </Card>

        {/* Health Score Card */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
              Health Score
            </CardTitle>
          </CardHeader>
          <CardContent className="items-center gap-3">
            <View className="items-center justify-center py-4 px-6 rounded-2xl bg-muted/40 border border-border/50 w-full">
              <Text className="text-5xl mb-1">{healthEmojis[healthScore - 1]}</Text>
              <Text className="text-base font-bold text-primary">
                {healthLabels[healthScore - 1]}
              </Text>
            </View>
            <View className="flex-row items-center justify-between w-full pt-1">
              <Button
                variant="outline"
                size="sm"
                onPress={() => setHealthScore(Math.max(1, healthScore - 1))}
                className="h-10 px-5 rounded-xl border-border"
              >
                <Text className="font-bold text-base">-1</Text>
              </Button>
              <Text className="text-xl font-extrabold text-foreground">
                {healthScore} / 5
              </Text>
              <Button
                variant="outline"
                size="sm"
                onPress={() => setHealthScore(Math.min(5, healthScore + 1))}
                className="h-10 px-5 rounded-xl border-border"
              >
                <Text className="font-bold text-base">+1</Text>
              </Button>
            </View>
          </CardContent>
        </Card>

        {/* Crop Selection Card */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
              Crop
            </CardTitle>
            {params.stage ? (
              <CardDescription>
                Stage Test: {String(params.stage).replace(/_/g, ' ')} (Day {growthStageDay})
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            <Select value={{ value: crop, label: crop }} onValueChange={(opt) => opt && setCrop(opt.value)}>
              <SelectTrigger className="w-full h-11 rounded-xl">
                <SelectValue placeholder="Select crop" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {['Rice', 'Wheat', 'Maize', 'Cotton', 'Tomato', 'Onion'].map((c) => (
                    <SelectItem key={c} value={c} label={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Notes Card */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
              Notes (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="e.g., Watered yesterday, observed slight leaf yellowing"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              className="min-h-[80px] p-3 text-sm rounded-xl"
            />
          </CardContent>
        </Card>

        {/* AI Assessment Card */}
        {aiAssessment && (
          <Card className="border-primary/40 bg-card overflow-hidden">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <View className="flex-row items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                <CardTitle className="text-base font-bold text-foreground">
                  AI Assessment
                </CardTitle>
              </View>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 rounded-lg border-primary/30"
                onPress={() => setIsAssessmentDialogOpen(true)}
              >
                <Text className="text-xs font-semibold text-primary">View Report</Text>
              </Button>
            </CardHeader>
            <CardContent className="gap-3">
              {aiAssessment.ai_assessment && (
                <View className="flex-row items-center justify-between bg-muted/40 rounded-xl p-3.5 border border-border/60">
                  <View>
                    <Text variant="muted" className="text-xs">
                      Status
                    </Text>
                    <Text className="text-sm font-bold text-foreground mt-0.5">
                      {aiAssessment.ai_assessment.health_status}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text variant="muted" className="text-xs">
                      Health Score
                    </Text>
                    <Text className="text-lg font-black text-primary mt-0.5">
                      {aiAssessment.ai_assessment.health_score}/100
                    </Text>
                  </View>
                </View>
              )}

              {aiAssessment.recommendation && (
                <View className="rounded-xl bg-primary/5 p-3.5 border border-primary/20 gap-1">
                  <Text className="text-xs font-bold text-primary uppercase tracking-wide">
                    Recommendation
                  </Text>
                  <Text className="text-xs text-foreground leading-4" numberOfLines={3}>
                    {aiAssessment.recommendation}
                  </Text>
                </View>
              )}

              {plannerMessage && (
                <View className="rounded-xl bg-sky-500/10 p-3.5 border border-sky-500/20 gap-1">
                  <Text className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wide">
                    Planner Sync
                  </Text>
                  <Text className="text-xs text-sky-700 dark:text-sky-300 leading-4" numberOfLines={2}>
                    {plannerMessage}
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>
        )}

        {/* Trend Card */}
        {historyData && historyData.dates.length > 1 && (
          <Card className="border-border/80 bg-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                7-Day Health Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart
                data={historyData.scores}
                labels={historyData.dates}
                height={180}
                style={{ borderRadius: 12 }}
              />
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <Button
          onPress={submit}
          disabled={submitting}
          className="h-12 rounded-xl mt-2"
        >
          <Text className="text-primary-foreground font-bold text-base">
            {submitting ? 'Processing...' : '✓ Submit Daily Check'}
          </Text>
        </Button>
      </ScrollView>

      {/* AI Assessment Reusable Dialog */}
      <Dialog open={isAssessmentDialogOpen} onOpenChange={setIsAssessmentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex-row items-center gap-2 text-xl font-bold">
              <Sparkles size={20} className="text-primary" />
              AI Assessment Report
            </DialogTitle>
            <DialogDescription>
              Crop health evaluation and automated action plan
            </DialogDescription>
          </DialogHeader>

          <View className="gap-3 py-2">
            {aiAssessment?.ai_assessment && (
              <View className="rounded-xl bg-muted/40 p-3.5 border border-border/60 gap-2.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-muted-foreground uppercase">
                    Health Status
                  </Text>
                  <Badge variant="outline" className="border-primary/40 bg-primary/10">
                    <Text className="text-xs font-bold text-primary">
                      {aiAssessment.ai_assessment.health_status}
                    </Text>
                  </Badge>
                </View>
                <View className="flex-row items-baseline gap-1">
                  <Text className="text-3xl font-extrabold text-foreground">
                    {aiAssessment.ai_assessment.health_score}
                  </Text>
                  <Text variant="muted" className="text-sm font-semibold">
                    /100
                  </Text>
                </View>
                {aiAssessment.ai_assessment.observations?.length > 0 && (
                  <View className="gap-1 mt-1">
                    <Text className="text-xs font-semibold text-muted-foreground">
                      Observations:
                    </Text>
                    {aiAssessment.ai_assessment.observations.map((obs: string, idx: number) => (
                      <View key={idx} className="flex-row items-start gap-1.5">
                        <Text className="text-xs text-primary font-bold">•</Text>
                        <Text className="text-xs text-foreground flex-1">{obs}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {aiAssessment?.recommendation && (
              <View className="rounded-xl bg-primary/5 p-3.5 border border-primary/20 gap-1.5">
                <Text className="text-xs font-bold text-primary uppercase tracking-wide">
                  Recommendation
                </Text>
                <Text className="text-sm text-foreground leading-5">
                  {aiAssessment.recommendation}
                </Text>
              </View>
            )}

            {plannerMessage && (
              <View className="rounded-xl bg-sky-500/10 p-3.5 border border-sky-500/20 gap-1.5">
                <Text className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wide">
                  Planner Sync
                </Text>
                <Text className="text-xs text-sky-700 dark:text-sky-300 leading-4">
                  {plannerMessage}
                </Text>
              </View>
            )}
          </View>

          <DialogFooter>
            <Button
              onPress={() => setIsAssessmentDialogOpen(false)}
              className="w-full sm:w-auto rounded-xl"
            >
              <Text className="text-primary-foreground font-semibold">Close</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </KeyboardResponsiveView>
  );
}
