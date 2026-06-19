import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  Tractor, Sprout, ShieldCheck, Droplets, Thermometer,
  Calendar, CheckCircle2, LandPlot, RotateCcw, AlertTriangle, Play, CheckCircle
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Typography } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
        color: n.includes('harvest') ? '#F97316' :
               n.includes('land') ? '#056847' :
               n.includes('sow') ? '#10B981' :
               n.includes('vegetative') ? '#10B981' :
               n.includes('flower') ? '#F59E0B' :
               n.includes('post') ? '#2563EB' : '#10B981',
        activeBg: n.includes('harvest') ? 'rgba(249, 115, 22, 0.15)' :
               n.includes('land') ? 'rgba(5, 104, 71, 0.15)' :
               n.includes('sow') ? 'rgba(16, 185, 129, 0.15)' :
               n.includes('vegetative') ? 'rgba(16, 185, 129, 0.15)' :
               n.includes('flower') ? 'rgba(245, 158, 11, 0.15)' :
               n.includes('post') ? 'rgba(37, 99, 235, 0.15)' : 'rgba(16, 185, 129, 0.15)',
        status: s.status,
      };
    });
  }, [activePlan]);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 1800);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

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
        Alert.alert('No Crops Found', 'Add crops in your profile to generate specialized plans.');
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to build plan. Please retry.');
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

  const tasksToDisplay = selectedStageTasks.length > 0 ? selectedStageTasks : activeTasks.slice(0, 5);
  const selectedStageTest = stageTestResults[selectedStage];

  if (status === 'loading' && !isRefreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Spinner size={32} color={colors.tint} />
      </View>
    );
  }
  
  const renderEmptyState = () => (
    <View style={styles.section}>
      <View style={[styles.card, { borderColor: colors.border, alignItems: 'center', paddingVertical: 40 }]}>
        <LandPlot size={48} color={colors.mutedForeground} style={{ opacity: 0.5, marginBottom: 16 }} />
        <Typography.H3 style={{ color: colors.foreground, textAlign: 'center', marginBottom: 8 }}>
          {status === 'no_crops' ? 'No Crops Found' : 'Smart Planner Not Active'}
        </Typography.H3>
        <Typography.P style={{ color: colors.mutedForeground, textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 }}>
          {status === 'no_crops' 
            ? 'Add crops inside your profile, then we can autogenerate an AI-powered farming flow based on your soil and location.'
            : 'Build your end-to-end stage guidance from your field location, soil conditions, and crop profile.'}
        </Typography.P>
        <Button 
          onPress={status === 'no_crops' ? () => router.push('/profile') : handleCreatePlanFromProfile}
          style={{ width: '80%' }}
          disabled={creatingPlan}
        >
          {status === 'no_crops' ? 'Go to Profile' : (creatingPlan ? 'Analyzing...' : 'Create Smart Plan')}
        </Button>
        {status !== 'no_crops' && (
          <Button
            variant="outline"
            style={{ width: '80%', marginTop: 12 }}
            onPress={handleCreatePlansForAllCrops}
            disabled={creatingAllPlans}
          >
            {creatingAllPlans ? 'Generating...' : 'Auto-Generate For All Crops'}
          </Button>
        )}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Typography.H2 style={{ fontWeight: '800', fontSize: 24, letterSpacing: -0.5, color: colors.foreground }}>
          {t('Agri Flow') || 'Agri Flow'}
        </Typography.H2>
        <Typography.P style={{ color: colors.mutedForeground, marginTop: 2 }}>
          {currentStage} Stage
        </Typography.P>
      </View>

      {/* ── Stage Chip Stepper ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.stepperWrap, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.stepperContent}
      >
        {dynamicStages.map((item: any) => {
          const isActive = item.id === selectedStage;
          const stageFailed = stageTestResults[item.id] && stageTestResults[item.id]?.pass === false;
          return (
            <Pressable
              key={item.id}
              onPress={() => setSelectedStage(item.id)}
              style={[
                styles.stepChip,
                {
                  backgroundColor: isActive ? item.activeBg : 'transparent', 
                  height: 36,
                  borderColor: isActive ? item.color : colors.border },
                stageFailed && { borderColor: '#EF4444' }
              ]}
            >
              <item.icon size={14} color={isActive ? item.color : colors.mutedForeground} strokeWidth={isActive ? 2.5 : 2} />
              <Typography.Small style={{ color: isActive ? item.color : colors.mutedForeground, fontWeight: isActive ? '700' : '600' }}>
                {item.label}
              </Typography.Small>
              {stageFailed && <View style={styles.errorDot} />}
            </Pressable>
          );
        })}
      </ScrollView>

      {!!toastMessage && (
        <View style={styles.toast}>
          <CheckCircle size={14} color="#FFF" />
          <Typography.Small style={{ color: '#FFF', fontWeight: '600' }}>{toastMessage}</Typography.Small>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        {status !== 'ready' ? renderEmptyState() : (
          <>
            {/* ── Active Plan Header ── */}
            <View style={styles.section}>
              <View style={[styles.card, { borderColor: colors.border }]}>
                <View style={[styles.row, { justifyContent: 'space-between' }]}>
                  <View>
                    <Typography.H3 style={{ color: colors.foreground, fontWeight: '700' }}>
                      {activePlan?.field_name || 'Primary Field'}
                    </Typography.H3>
                    <Typography.Small style={{ color: colors.mutedForeground, marginTop: 2 }}>
                      {String(activePlan?.crop || 'Crop').toUpperCase()} • {stageProgress}% Complete
                    </Typography.Small>
                  </View>
                  <Button 
                    variant="outline" 
                    style={{ height: 32, paddingHorizontal: 12, borderRadius: 16 }}
                    onPress={() => router.push({
                      pathname: '/(tabs)/daily-check',
                      params: { stage: selectedStage, crop: String(activePlan?.crop || '') }
                    })}
                  >
                    Check Health
                  </Button>
                </View>
                
                <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
                  <View style={[styles.progressFill, { width: `${stageProgress}%`, backgroundColor: colors.tint }]} />
                </View>
              </View>
            </View>

            {/* ── Multi-Crop Switcher ── */}
            {activePlans.length > 1 && (
              <View style={styles.section}>
                <Typography.Small style={[styles.label, { color: colors.mutedForeground }]}>AVAILABLE FIELDS</Typography.Small>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {activePlans.map((plan) => (
                    <Pressable
                      key={plan.plan_id}
                      onPress={() => hydratePlan(plan)}
                      style={[
                        styles.chipPicker,
                        { borderColor: activePlan?.plan_id === plan.plan_id ? colors.tint : colors.border }
                      ]}
                    >
                      <Typography.Small style={{ color: activePlan?.plan_id === plan.plan_id ? colors.tint : colors.foreground, fontWeight: '600' }}>
                        {plan.crop?.toUpperCase() || 'FIELD'}
                      </Typography.Small>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Current Selected Stage Details ── */}
            <View style={styles.section}>
              <View style={styles.row}>
                <Typography.Small style={[styles.label, { color: colors.mutedForeground, flex: 1 }]}>
                  {selectedStageObj?.label.toUpperCase()} ACTIONS
                </Typography.Small>
                {selectedStageTest?.pass === false && (
                  <Badge variant="destructive" style={{ height: 20 }}>Needs Work</Badge>
                )}
              </View>
              
              <View style={{ gap: 10 }}>
                {tasksToDisplay.length === 0 ? (
                  <View style={[styles.card, { borderColor: colors.border, padding: 20, alignItems: 'center' }]}>
                    <CheckCircle2 size={32} color={colors.tint} style={{ opacity: 0.5, marginBottom: 8 }} />
                    <Typography.P style={{ color: colors.mutedForeground }}>All caught up for this stage!</Typography.P>
                  </View>
                ) : (
                  tasksToDisplay.map((task: any) => (
                    <View key={task.task_id} style={[styles.card, { borderColor: colors.border }]}>
                      <View style={[styles.row, { alignItems: 'flex-start' }]}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Typography.P style={{ fontWeight: '600', color: colors.foreground }}>
                            {task.title}
                          </Typography.P>
                          {!!task.due_date && (
                            <Typography.Small style={{ color: colors.mutedForeground, marginTop: 4 }}>
                              Due: {task.due_date}
                            </Typography.Small>
                          )}
                          <Typography.Small style={{ color: colors.mutedForeground, marginTop: 6, lineHeight: 18 }}>
                            {task.guidance}
                          </Typography.Small>
                        </View>
                        <Button
                          variant={task.status === 'completed' ? 'outline' : 'default'}
                          style={{ height: 32, borderRadius: 16, paddingHorizontal: 12, minWidth: 80 }}
                          onPress={task.status === 'completed' ? () => undoTask(task.task_id) : () => completeTask(task.task_id)}
                        >
                          {task.status === 'completed' ? 'Done' : 'Mark'}
                        </Button>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* ── AI Insights ── */}
            {activePlan?.llm_plan && (
              <View style={styles.section}>
                <Typography.Small style={[styles.label, { color: colors.mutedForeground }]}>AI INSIGHTS</Typography.Small>
                <View style={[styles.card, { borderColor: colors.border }]}>
                  <Typography.Small style={{ color: colors.foreground, lineHeight: 22 }}>
                    {showPlanBrief ? activePlan.llm_plan.summary : shortText(activePlan.llm_plan.summary, 120)}
                  </Typography.Small>
                  
                  {showPlanBrief && (
                     <View style={{ marginTop: 12, gap: 12 }}>
                       {activePlan.llm_plan.risk_alerts?.length > 0 && (
                         <View>
                           <Typography.Small style={{ color: colors.mutedForeground, fontWeight: '700', marginBottom: 6 }}>
                             RISKS TO WATCH
                           </Typography.Small>
                           {activePlan.llm_plan.risk_alerts.map((item: string, idx: number) => (
                             <View key={idx} style={[styles.row, { marginBottom: 6 }]}>
                               <AlertTriangle size={14} color="#EF4444" />
                               <Typography.Small style={{ color: colors.foreground, marginLeft: 6, flex: 1 }}>{item}</Typography.Small>
                             </View>
                           ))}
                         </View>
                       )}
                     </View>
                  )}
                  
                  <Pressable onPress={() => setShowPlanBrief(!showPlanBrief)} style={{ marginTop: 12, alignItems: 'center' }}>
                    <Typography.Small style={{ color: colors.tint, fontWeight: '600' }}>
                      {showPlanBrief ? 'Show Less' : 'Read Full Brief'}
                    </Typography.Small>
                  </Pressable>
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1
  },
  stepperWrap: { flexGrow: 0, borderBottomWidth: 1 },
  stepperContent: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6
  },
  errorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', position: 'absolute', top: 0, right: 0 },
  scrollContent: { paddingBottom: 100 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  label: { fontWeight: '700', fontSize: 11, letterSpacing: 1, marginBottom: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 16 },
  progressFill: { height: '100%', borderRadius: 3 },
  chipPicker: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  toast: {
    position: 'absolute', top: 110, alignSelf: 'center', backgroundColor: '#0F766E',
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 24, zIndex: 100, gap: 8,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4
  }
});
