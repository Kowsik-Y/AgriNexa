import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Tractor, Sprout, ShieldCheck, Droplets, Thermometer,
  Calendar, CheckCircle2, LandPlot, AlertTriangle, Circle,
  ChevronRight, Sparkles, Activity, Undo2, ArrowRight
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Button } from '@/components/reusables/button';
import { Badge } from '@/components/reusables/badge';
import { Text } from '@/components/reusables/text';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/reusables/card';
import { Icon } from '@/components/reusables/icon';
import { Separator } from '@/components/reusables/separator';
import { Progress } from '@/components/reusables/progress';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/Spinner';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';

export default function AgriFlowScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const {
    getLatestFarmingPlan,
    getActiveAgriFlowPlans,
    createAgriFlowPlan,
    createAgriFlowPlansFromUserCrops,
    updateAgriFlowTask,
    loading,
  } = useApi();

  const [status, setStatus] = useState<'loading' | 'ready' | 'no_plans' | 'no_crops'>('loading');
  const [activePlan, setActivePlan] = useState<any>(null);
  const [activePlans, setActivePlans] = useState<any[]>([]);
  const [legacyPlan, setLegacyPlan] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [creatingPlan, setCreatingPlan] = useState(false);
  const [creatingAllPlans, setCreatingAllPlans] = useState(false);
  const [currentStage, setCurrentStage] = useState('Land Preparation');
  const [selectedStage, setSelectedStage] = useState('land_preparation');
  const [stageTestResults, setStageTestResults] = useState<Record<string, any>>({});
  const [showPlanBrief, setShowPlanBrief] = useState(false);
  const { toast } = useToast();

  const dynamicStages = useMemo(() => {
    if (!activePlan?.stages) return [];
    return activePlan.stages.map((s: any) => {
      const n = s.stage_name.toLowerCase();
      return {
        id: s.stage_id,
        label: s.stage_name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        icon: n.includes('harvest') ? Calendar :
          n.includes('land') ? LandPlot :
            n.includes('sow') || n.includes('seed') ? Sprout :
              n.includes('vegetative') || n.includes('flower') ? Sprout :
                n.includes('post') || n.includes('market') ? Tractor : Sprout,
        status: s.status,
      };
    });
  }, [activePlan]);

  const showSuccessToast = (message: string) => toast({ title: message, type: 'success' });

  useFocusEffect(
    useCallback(() => {
      const syncRefreshSignal = async () => {
        const refreshNonce = await AsyncStorage.getItem('agriflow_refresh_nonce');
        if (refreshNonce) {
          await AsyncStorage.removeItem('agriflow_refresh_nonce');
          fetchInitialData(true);
        }
      };
      syncRefreshSignal();
    }, [])
  );

  const fetchInitialData = async (preserveSelection = false) => {
    setStatus('loading');

    // Test Results
    const stageTestRaw = await AsyncStorage.getItem('agriflow_stage_test_results_v1');
    if (stageTestRaw) setStageTestResults(JSON.parse(stageTestRaw));

    // Profile Stage Check
    const profileStr = await AsyncStorage.getItem('user_profile');
    const profile = profileStr ? JSON.parse(profileStr) : null;
    if (profile?.flow_stage) {
      setCurrentStage(profile.flow_stage);
      if (!preserveSelection) setSelectedStage(profile.flow_stage);
    }

    try {
      const plansResp = await getActiveAgriFlowPlans();
      const plans = plansResp?.plans || [];
      if (plans.length > 0) {
        setActivePlans(plans);
        hydratePlan(plans[0], preserveSelection);
        setStatus('ready');
      } else {
        const legacy = await getLatestFarmingPlan();
        if (legacy) {
          setLegacyPlan(legacy);
          setStatus('no_plans');
        } else {
          setStatus(profile?.crops ? 'no_plans' : 'no_crops');
        }
      }
    } catch (e) {
      console.warn("Failed retrieving plans", e);
      setStatus('no_plans');
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchInitialData(true);
    setIsRefreshing(false);
  };

  const hydratePlan = (plan: any, preserveSelection = false) => {
    setActivePlan(plan);
    const stages = plan?.stages || [];
    const inProgress = stages.find((s: any) => s.status === 'in_progress')
      || stages.find((s: any) => s.status === 'pending')
      || stages[stages.length - 1]
      || stages[0];
    if (inProgress?.stage_name) {
      if (!preserveSelection) setSelectedStage(inProgress.stage_id);
      setCurrentStage(inProgress.stage_name.replace('_', ' '));
    }
  };

  const activeTasks = useMemo(() => {
    if (!activePlan?.tasks) return [];
    return activePlan.tasks
      .filter((task: any) => task.status !== 'completed' && task.status !== 'skipped')
      .sort((a: any, b: any) => String(a.due_date).localeCompare(String(b.due_date)));
  }, [activePlan]);

  const handleCreatePlanFromProfile = async () => {
    setCreatingPlan(true);
    try {
      const profileStr = await AsyncStorage.getItem('user_profile');
      const profile = profileStr ? JSON.parse(profileStr) : {};
      const payload = {
        field_name: profile?.farm_name || 'Primary Field',
        location: [profile?.village, profile?.district, profile?.state].filter(Boolean).join(', ') || 'Chennai',
        location_meta: { village: profile?.village, district: profile?.district, state: profile?.state },
        soil_type: profile?.soil_type,
        soil_input: {
          nitrogen: Number(profile?.nitrogen || 80),
          phosphorus: Number(profile?.phosphorus || 40),
          potassium: Number(profile?.potassium || 40),
          ph: Number(profile?.ph || 6.5),
          temperature: Number(profile?.temperature || 28),
          humidity: Number(profile?.humidity || 70),
        },
        crop: profile?.crops || undefined,
      };

      const created = await createAgriFlowPlan(payload);
      if (created?.plan_id) {
        await fetchInitialData();
        showSuccessToast('Plan created successfully');
      }
    } finally {
      setCreatingPlan(false);
    }
  };

  const handleCreatePlansForAllCrops = async () => {
    setCreatingAllPlans(true);
    try {
      const created = await createAgriFlowPlansFromUserCrops();
      if (created?.plans?.length > 0) {
        await fetchInitialData();
        showSuccessToast(`Created ${created.plans.length} best plans`);
      } else {
        toast({ title: 'No Crops Found', description: 'Add crops in your profile to generate specialized plans.', type: 'warning' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Unable to build plan. Please retry.', type: 'destructive' });
    } finally {
      setCreatingAllPlans(false);
    }
  };

  const completeTask = async (taskId: string) => {
    setActivePlan((prev: any) => {
      if (!prev) return prev;
      return { ...prev, tasks: prev.tasks.map((t: any) => t.task_id === taskId ? { ...t, status: 'completed' } : t) };
    });

    const result = await updateAgriFlowTask(taskId, { status: 'completed', note: 'Completed via UI' });
    if (result?.status === 'success') {
      showSuccessToast('Task completed');
      const updatedPlan = await getActiveAgriFlowPlans();
      if (updatedPlan?.plans) {
        const p = updatedPlan.plans.find((x: any) => x.plan_id === activePlan?.plan_id) || updatedPlan.plans[0];
        if (p) hydratePlan(p, true);
      }
    } else {
      onRefresh();
    }
  };

  const undoTask = async (taskId: string) => {
    setActivePlan((prev: any) => {
      if (!prev) return prev;
      return { ...prev, tasks: prev.tasks.map((t: any) => t.task_id === taskId ? { ...t, status: 'pending' } : t) };
    });

    const result = await updateAgriFlowTask(taskId, { status: 'pending', note: 'Undone via UI' });
    if (result?.status === 'success') {
      showSuccessToast('Task restored');
      const updatedPlan = await getActiveAgriFlowPlans();
      if (updatedPlan?.plans) {
        const p = updatedPlan.plans.find((x: any) => x.plan_id === activePlan?.plan_id) || updatedPlan.plans[0];
        if (p) hydratePlan(p, true);
      }
    } else {
      onRefresh();
    }
  };

  const shortText = (text: string | undefined, maxLen: number = 82) => {
    if (!text) return 'No summary yet';
    return text.length > maxLen ? `${text.slice(0, maxLen).trim()}...` : text;
  };

  const selectedStageObj = dynamicStages.find((s: any) => s.id === selectedStage);
  const planStages = activePlan?.stages || [];
  const currentPlanStage = planStages.find((stage: any) => stage.status === 'in_progress')
    || planStages.find((stage: any) => stage.status === 'pending')
    || planStages[planStages.length - 1]
    || planStages[0];
  const stageProgress = Math.max(0, Math.min(100, Number(currentPlanStage?.progress_percent || 0)));

  const selectedStageTasks = useMemo(() => {
    if (!activePlan?.tasks) return [];
    return activePlan.tasks
      .filter((task: any) => task.stage_id === selectedStage)
      .sort((a: any, b: any) => String(a.due_date).localeCompare(String(b.due_date)));
  }, [activePlan, selectedStage]);

  const completedCount = selectedStageTasks.filter((t: any) => t.status === 'completed').length;
  const totalStageTaskCount = selectedStageTasks.length;

  const tasksToDisplay = selectedStageTasks.length > 0 ? selectedStageTasks : activeTasks.slice(0, 5);
  const selectedStageTest = stageTestResults[selectedStage];

  /* ── Loading ── */
  if (status === 'loading' && !isRefreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-background gap-3">
        <Spinner size={32} color={colors.tint} />
        <Text variant="muted" className="text-sm">Loading your farm plan…</Text>
      </View>
    );
  }

  /* ── Empty state ── */
  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-8 py-16 gap-6">
      <View className="rounded-full bg-primary/10 p-6">
        <Icon as={LandPlot} size={48} className="text-primary" />
      </View>
      <View className="items-center gap-2">
        <Text variant="h3" className="text-center">
          {status === 'no_crops' ? 'No Crops Found' : 'Smart Planner Not Active'}
        </Text>
        <Text variant="muted" className="text-center text-sm leading-6 max-w-[320px]">
          {status === 'no_crops'
            ? 'Add crops in your profile so we can auto-generate an AI-powered farming flow for your soil & location.'
            : 'Create a stage-by-stage plan from your field location, soil conditions, and crop profile.'}
        </Text>
      </View>
      <View className="w-full gap-3">
        <Button
          className="w-full"
          onPress={status === 'no_crops' ? () => router.push('/profile') : handleCreatePlanFromProfile}
          disabled={creatingPlan}>
          {creatingPlan ? (
            <View className="flex-row items-center gap-2">
              <Spinner size={16} color="#fff" />
              <Text className="text-primary-foreground font-semibold">Analyzing…</Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-2">
              <Icon as={status === 'no_crops' ? ArrowRight : Sparkles} size={16} className="text-primary-foreground" />
              <Text className="text-primary-foreground font-semibold">
                {status === 'no_crops' ? 'Go to Profile' : 'Create Smart Plan'}
              </Text>
            </View>
          )}
        </Button>
        {status !== 'no_crops' && (
          <Button variant="outline" className="w-full" onPress={handleCreatePlansForAllCrops} disabled={creatingAllPlans}>
            <Text className="font-semibold">
              {creatingAllPlans ? 'Generating…' : 'Auto-Generate For All Crops'}
            </Text>
          </Button>
        )}
      </View>
    </View>
  );

  /* ── Main UI ── */
  return (
    <View className="flex-1 bg-background">
      {/* ── Header ── */}
      <View className="px-5 pt-4 pb-3">
        <Text variant="h2" className="border-b-0 pb-0 text-2xl font-extrabold tracking-tight">
          {t('Agri Flow') || 'Agri Flow'}
        </Text>
        <Text variant="muted" className="mt-0.5 text-sm">
          {currentStage} Stage
        </Text>
      </View>

      {/* ── Stage stepper pills ── */}
      {dynamicStages.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="max-h-14 flex-grow-0 border-b border-border/60"
          contentContainerClassName="items-center gap-2 px-4 py-2.5">
          {dynamicStages.map((item: any) => {
            const isActive = item.id === selectedStage;
            const isCompleted = item.status === 'completed';
            const stageFailed = stageTestResults[item.id]?.pass === false;
            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedStage(item.id)}
                className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${
                  isActive
                    ? 'border-primary/40 bg-primary/10'
                    : stageFailed
                      ? 'border-destructive/40 bg-destructive/5'
                      : 'border-border bg-card'
                }`}>
                {isCompleted ? (
                  <Icon as={CheckCircle2} size={13} className="text-emerald-500" />
                ) : stageFailed ? (
                  <Icon as={AlertTriangle} size={13} className="text-destructive" />
                ) : (
                  <Icon as={item.icon} size={13} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                )}
                <Text className={`text-xs font-medium ${
                  isActive ? 'text-primary' : stageFailed ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* ── Content ── */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 p-5 pb-4"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.tint} />}>
        {status !== 'ready' ? renderEmptyState() : (
          <>
            {/* ── Hero progress card ── */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 gap-1">
                    <CardTitle className="text-lg font-bold">
                      {activePlan?.field_name || 'Primary Field'}
                    </CardTitle>
                    <View className="flex-row items-center gap-2">
                      <Badge className="rounded-md">
                        <Text className="text-xs font-semibold">
                          {String(activePlan?.crop || 'Crop').toUpperCase()}
                        </Text>
                      </Badge>
                      <Text variant="muted" className="text-xs">
                        {stageProgress}% complete
                      </Text>
                    </View>
                  </View>
                  <View className="items-center justify-center rounded-full bg-primary/15 h-12 w-12">
                    <Text className="text-primary text-sm font-bold">{stageProgress}%</Text>
                  </View>
                </View>
              </CardHeader>
              <CardContent className="gap-4 pt-1">
                <Progress value={stageProgress} className="h-2.5" indicatorClassName="bg-primary" />
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start rounded-lg border-primary/30"
                  onPress={() => router.push({
                    pathname: '/daily-check',
                    params: { stage: selectedStage, crop: String(activePlan?.crop || '') },
                  })}>
                  <Icon as={Activity} size={14} className="text-primary" />
                  <Text className="text-primary font-medium">Check Health</Text>
                </Button>
              </CardContent>
            </Card>

            {/* ── Multi-crop switcher ── */}
            {activePlans.length > 1 && (
              <View className="gap-2">
                <Text variant="muted" className="text-xs uppercase font-medium tracking-wider">
                  Your Fields
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                  {activePlans.map((plan) => {
                    const isCurrent = activePlan?.plan_id === plan.plan_id;
                    return (
                      <Pressable
                        key={plan.plan_id}
                        onPress={() => hydratePlan(plan)}
                        className={`flex-row items-center gap-1.5 rounded-lg border px-3 py-2 ${
                          isCurrent ? 'border-primary/40 bg-primary/10' : 'border-border bg-card'
                        }`}>
                        <Icon as={Sprout} size={14} className={isCurrent ? 'text-primary' : 'text-muted-foreground'} />
                        <Text className={`text-xs font-semibold ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
                          {plan.crop?.toUpperCase() || 'FIELD'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ── Tasks section header ── */}
            <View className="flex-row items-center justify-between">
              <View className="gap-0.5">
                <Text className="text-sm font-semibold text-foreground">
                  {selectedStageObj?.label || 'Tasks'}
                </Text>
                {totalStageTaskCount > 0 && (
                  <Text variant="muted" className="text-xs">
                    {completedCount}/{totalStageTaskCount} completed
                  </Text>
                )}
              </View>
              {selectedStageTest?.pass === false && (
                <Badge variant="destructive" className="rounded-lg">
                  <Icon as={AlertTriangle} size={11} className="text-white" />
                  <Text className="text-xs text-white font-semibold">Needs Work</Text>
                </Badge>
              )}
            </View>

            {/* ── Task list ── */}
            {tasksToDisplay.length === 0 ? (
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="items-center gap-3 py-8">
                  <View className="rounded-full bg-emerald-500/15 p-3">
                    <Icon as={CheckCircle2} size={28} className="text-emerald-500" />
                  </View>
                  <View className="items-center gap-1">
                    <Text className="font-semibold text-foreground">All caught up!</Text>
                    <Text variant="muted" className="text-xs text-center">
                      No pending tasks for this stage. Great work! 🎉
                    </Text>
                  </View>
                </CardContent>
              </Card>
            ) : (
              tasksToDisplay.map((task: any) => {
                const isDone = task.status === 'completed';
                return (
                  <Card
                    key={task.task_id}
                    className={isDone ? 'border-emerald-500/20 bg-emerald-500/5 gap-2' : 'border-border gap-2'}>
                    <CardHeader className="pb-1">
                      <View className="flex-row items-start gap-3">
                        <Pressable
                          onPress={isDone ? () => undoTask(task.task_id) : () => completeTask(task.task_id)}
                          className="mt-0.5">
                          <Icon
                            as={isDone ? CheckCircle2 : Circle}
                            size={20}
                            className={isDone ? 'text-emerald-500' : 'text-muted-foreground'}
                          />
                        </Pressable>
                        <View className="flex-1 gap-1">
                          <CardTitle className={`text-base ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </CardTitle>
                          {!!task.due_date && (
                            <View className="flex-row items-center gap-1.5">
                              <Icon as={Calendar} size={11} className="text-muted-foreground" />
                              <Text variant="muted" className="text-xs">{task.due_date}</Text>
                            </View>
                          )}
                        </View>
                        {isDone && (
                          <Badge className="bg-emerald-500/15 border-0">
                            <Text className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">Done</Text>
                          </Badge>
                        )}
                      </View>
                    </CardHeader>
                    {!!task.guidance && (
                      <CardContent className="pl-12 pt-0 pb-1">
                        <Text variant="muted" className="text-sm leading-5">{task.guidance}</Text>
                      </CardContent>
                    )}
                    <CardFooter className="pl-12 pt-1">
                      <Button
                        size="sm"
                        variant={isDone ? 'ghost' : 'default'}
                        className={isDone ? '' : 'rounded-lg'}
                        onPress={isDone ? () => undoTask(task.task_id) : () => completeTask(task.task_id)}>
                        {isDone ? (
                          <View className="flex-row items-center gap-1.5">
                            <Icon as={Undo2} size={13} className="text-muted-foreground" />
                            <Text className="text-muted-foreground text-xs">Undo</Text>
                          </View>
                        ) : (
                          <Text className="text-primary-foreground font-medium text-xs">Mark Done</Text>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })
            )}

            {/* ── AI insights ── */}
            {activePlan?.llm_plan && (
              <>
                <Separator className="bg-border/50" />
                <Card className="border-violet-500/20 bg-violet-500/5 gap-1">
                  <CardHeader className="pb-2">
                    <View className="flex-row items-center gap-2">
                      <View className="rounded-lg bg-violet-500/15 p-1.5">
                        <Icon as={Sparkles} size={16} className="text-violet-500" />
                      </View>
                      <CardTitle className="text-base font-bold">AI Insights</CardTitle>
                    </View>
                  </CardHeader>
                  <CardContent className="gap-3 pt-0">
                    <Text className="text-sm leading-6 text-foreground/85">
                      {showPlanBrief ? activePlan.llm_plan.summary : shortText(activePlan.llm_plan.summary, 120)}
                    </Text>

                    {showPlanBrief && activePlan.llm_plan.risk_alerts?.length > 0 && (
                      <View className="rounded-xl border border-destructive/15 bg-destructive/5 p-3.5 gap-2.5">
                        <View className="flex-row items-center gap-2">
                          <Icon as={AlertTriangle} size={14} className="text-destructive" />
                          <Text className="text-sm font-semibold text-destructive">Risks to Watch</Text>
                        </View>
                        {activePlan.llm_plan.risk_alerts.map((item: string, idx: number) => (
                          <View key={idx} className="flex-row items-start gap-2 pl-1">
                            <Text className="text-destructive/70 text-xs mt-0.5">•</Text>
                            <Text className="flex-1 text-sm leading-5 text-foreground/80">{item}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-start"
                      onPress={() => setShowPlanBrief(!showPlanBrief)}>
                      <Text className="text-violet-600 dark:text-violet-400 font-medium text-xs">
                        {showPlanBrief ? 'Show Less' : 'Read Full Brief'}
                      </Text>
                      <Icon
                        as={ChevronRight}
                        size={13}
                        className="text-violet-600 dark:text-violet-400"
                      />
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
