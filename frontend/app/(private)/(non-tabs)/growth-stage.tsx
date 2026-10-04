import React, { useState } from 'react';
import { ScrollView, View, Pressable, Alert as NativeAlert } from 'react-native';
import { Stack } from 'expo-router';
import {
  Sprout,
  Play,
  Leaf,
  Thermometer,
  Droplets,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Layers,
  Zap,
} from 'lucide-react-native';

import { Button } from '@/components/reusables/button';
import { Input } from '@/components/reusables/input';
import { Label } from '@/components/reusables/label';
import { Text } from '@/components/reusables/text';
import { Badge } from '@/components/reusables/badge';
import { Separator } from '@/components/reusables/separator';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/reusables/alert';
import { Icon } from '@/components/reusables/icon';
import { Spinner } from '@/components/Spinner';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';
import { useApi } from '@/hooks/use-api';
import { cn } from '@/lib/utils';

const SOIL_TYPES = ['Loamy', 'Sandy', 'Clay', 'Silt', 'Peaty', 'Chalky'] as const;
const WATER_FREQUENCIES = ['Daily', 'Bi-weekly', 'Weekly'] as const;
const FERTILIZER_TYPES = ['Chemical', 'Organic', 'None'] as const;

const CROP_PRESETS: Record<string, { N: string; P: string; K: string; ph: string }> = {
  Rice: { N: '80', P: '40', K: '40', ph: '6.5' },
  Wheat: { N: '120', P: '50', K: '50', ph: '6.8' },
  Cotton: { N: '90', P: '45', K: '50', ph: '7.0' },
  Maize: { N: '100', P: '45', K: '45', ph: '6.2' },
  Sugarcane: { N: '110', P: '55', K: '60', ph: '6.5' },
};

const STAGE_EMOJI: Record<string, string> = {
  Seedling: '🌱',
  Vegetative: '🌿',
  Flowering: '🌸',
};

export default function GrowthStagePredictorScreen() {
  const { predictGrowthStage, predictGrowthMilestone, predictGrowthAll, loading, error } =
    useApi();

  // Stage model inputs
  const [crop, setCrop] = useState('Rice');
  const [nitrogen, setNitrogen] = useState('80');
  const [phosphorus, setPhosphorus] = useState('40');
  const [potassium, setPotassium] = useState('40');
  const [temperature, setTemperature] = useState('28');
  const [humidity, setHumidity] = useState('70');
  const [ph, setPh] = useState('6.5');

  // Milestone model inputs
  const [soilType, setSoilType] = useState<(typeof SOIL_TYPES)[number]>('Loamy');
  const [sunlightHours, setSunlightHours] = useState('6');
  const [waterFrequency, setWaterFrequency] =
    useState<(typeof WATER_FREQUENCIES)[number]>('Daily');
  const [fertilizerType, setFertilizerType] =
    useState<(typeof FERTILIZER_TYPES)[number]>('Chemical');

  // Results
  const [stageResult, setStageResult] = useState<any>(null);
  const [milestoneResult, setMilestoneResult] = useState<any>(null);
  const [allResults, setAllResults] = useState<any>(null);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'stage' | 'milestone' | 'all'>('stage');

  const applyCropPreset = (name: string) => {
    setCrop(name);
    const preset = CROP_PRESETS[name];
    if (preset) {
      setNitrogen(preset.N);
      setPhosphorus(preset.P);
      setPotassium(preset.K);
      setPh(preset.ph);
    }
  };

  const runStageTest = async () => {
    const res = await predictGrowthStage({
      crop,
      N: Number(nitrogen) || 80,
      P: Number(phosphorus) || 40,
      K: Number(potassium) || 40,
      temperature: Number(temperature) || 28,
      humidity: Number(humidity) || 70,
      ph: Number(ph) || 6.5,
    });
    if (res) {
      setStageResult(res);
      setIsResultDialogOpen(true);
    }
  };

  const runMilestoneTest = async () => {
    const res = await predictGrowthMilestone({
      Soil_Type: soilType,
      Sunlight_Hours: Number(sunlightHours) || 6,
      Water_Frequency: waterFrequency,
      Fertilizer_Type: fertilizerType,
      Temperature: Number(temperature) || 28,
      Humidity: Number(humidity) || 70,
    });
    if (res) {
      setMilestoneResult(res);
      setIsResultDialogOpen(true);
    }
  };

  const runAllModels = async () => {
    const res = await predictGrowthAll({
      crop,
      N: Number(nitrogen) || 80,
      P: Number(phosphorus) || 40,
      K: Number(potassium) || 40,
      temperature: Number(temperature) || 28,
      humidity: Number(humidity) || 70,
      ph: Number(ph) || 6.5,
      Soil_Type: soilType,
      Sunlight_Hours: Number(sunlightHours) || 6,
      Water_Frequency: waterFrequency,
      Fertilizer_Type: fertilizerType,
    });
    if (res) {
      setAllResults(res);
      setIsResultDialogOpen(true);
    }
  };

  const resetAll = () => {
    setStageResult(null);
    setMilestoneResult(null);
    setAllResults(null);
    setIsResultDialogOpen(false);
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: 'Growth Stage Predictor' }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="p-5 pb-4 gap-5"
      >
        <ResponsiveContainer>
          {/* Header */}
          <View className="gap-1">
            <Text variant="muted" className="text-sm">
              Predict plant growth stage using trained ML models from your dataset.
            </Text>
          </View>

          {/* Tab Selector */}
          <View className="flex-row gap-2 bg-muted/40 p-1 rounded-xl mb-2">
            {(['stage', 'milestone', 'all'] as const).map((tab) => {
              const isActive = activeTab === tab;
              const labels = {
                stage: 'Stage',
                milestone: 'Milestone',
                all: 'All Models',
              };
              const icons = {
                stage: Sprout,
                milestone: Zap,
                all: Layers,
              };
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  className={cn(
                    'flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg',
                    isActive ? 'bg-primary' : 'bg-transparent'
                  )}
                >
                  <Icon
                    as={icons[tab]}
                    size={14}
                    className={isActive ? 'text-primary-foreground' : 'text-muted-foreground'}
                  />
                  <Text
                    className={cn(
                      'text-xs font-semibold',
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {labels[tab]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Crop Presets */}
          <View className="gap-2 mb-2">
            <Label className="text-xs font-semibold">Quick Crop Presets</Label>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {Object.keys(CROP_PRESETS).map((name) => {
                const isSelected = crop === name;
                return (
                  <Pressable
                    key={name}
                    onPress={() => applyCropPreset(name)}
                    className={cn(
                      'px-4 py-2 rounded-full border',
                      isSelected ? 'bg-primary border-primary' : 'bg-card border-border'
                    )}
                  >
                    <Text
                      className={cn(
                        'text-xs font-semibold',
                        isSelected ? 'text-primary-foreground' : 'text-foreground'
                      )}
                    >
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Input Card */}
          <Card className="border-border/80 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-foreground">
                Input Parameters
              </CardTitle>
              <CardDescription>
                {activeTab === 'stage'
                  ? 'NPK, temperature, humidity, and pH values for stage classification'
                  : activeTab === 'milestone'
                    ? 'Soil, sunlight, water, and fertilizer for milestone prediction'
                    : 'Combined features for all models'}
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              {/* Crop & basic inputs (always shown) */}
              <View className="gap-1.5">
                <Label className="text-xs font-semibold">Crop</Label>
                <Input value={crop} onChangeText={setCrop} placeholder="e.g. Rice" />
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 gap-1.5">
                  <Label className="text-xs font-semibold">
                    <Icon as={Thermometer} size={12} className="text-muted-foreground" />{' '}
                    Temperature (°C)
                  </Label>
                  <Input
                    value={temperature}
                    onChangeText={setTemperature}
                    keyboardType="numeric"
                    placeholder="28"
                  />
                </View>
                <View className="flex-1 gap-1.5">
                  <Label className="text-xs font-semibold">
                    <Icon as={Droplets} size={12} className="text-muted-foreground" />{' '}
                    Humidity (%)
                  </Label>
                  <Input
                    value={humidity}
                    onChangeText={setHumidity}
                    keyboardType="numeric"
                    placeholder="70"
                  />
                </View>
              </View>

              {/* NPK inputs — for stage and all tabs */}
              {(activeTab === 'stage' || activeTab === 'all') && (
                <>
                  <View className="flex-row gap-2">
                    <View className="flex-1 gap-1.5">
                      <Label className="text-xs font-semibold">N (mg/kg)</Label>
                      <Input
                        value={nitrogen}
                        onChangeText={setNitrogen}
                        keyboardType="numeric"
                      />
                    </View>
                    <View className="flex-1 gap-1.5">
                      <Label className="text-xs font-semibold">P (mg/kg)</Label>
                      <Input
                        value={phosphorus}
                        onChangeText={setPhosphorus}
                        keyboardType="numeric"
                      />
                    </View>
                    <View className="flex-1 gap-1.5">
                      <Label className="text-xs font-semibold">K (mg/kg)</Label>
                      <Input
                        value={potassium}
                        onChangeText={setPotassium}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <View className="gap-1.5">
                    <Label className="text-xs font-semibold">Soil pH</Label>
                    <Input value={ph} onChangeText={setPh} keyboardType="numeric" />
                  </View>
                </>
              )}

              {/* Milestone inputs — for milestone and all tabs */}
              {(activeTab === 'milestone' || activeTab === 'all') && (
                <>
                  <Separator className="bg-border/60" />
                  <View className="gap-2">
                    <Label className="text-xs font-semibold">Soil Type</Label>
                    <View className="flex-row flex-wrap gap-2">
                      {SOIL_TYPES.map((s) => (
                        <Pressable
                          key={s}
                          onPress={() => setSoilType(s)}
                          className={cn(
                            'px-3 py-1.5 rounded-full border',
                            soilType === s
                              ? 'bg-primary border-primary'
                              : 'bg-card border-border/80'
                          )}
                        >
                          <Text
                            className={cn(
                              'text-xs font-semibold',
                              soilType === s
                                ? 'text-primary-foreground'
                                : 'text-foreground'
                            )}
                          >
                            {s}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View className="flex-row gap-3">
                    <View className="flex-1 gap-1.5">
                      <Label className="text-xs font-semibold">Sunlight (hrs/day)</Label>
                      <Input
                        value={sunlightHours}
                        onChangeText={setSunlightHours}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View className="gap-2">
                    <Label className="text-xs font-semibold">Water Frequency</Label>
                    <View className="flex-row flex-wrap gap-2">
                      {WATER_FREQUENCIES.map((w) => (
                        <Pressable
                          key={w}
                          onPress={() => setWaterFrequency(w)}
                          className={cn(
                            'px-3 py-1.5 rounded-full border',
                            waterFrequency === w
                              ? 'bg-primary border-primary'
                              : 'bg-card border-border/80'
                          )}
                        >
                          <Text
                            className={cn(
                              'text-xs font-semibold',
                              waterFrequency === w
                                ? 'text-primary-foreground'
                                : 'text-foreground'
                            )}
                          >
                            {w}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View className="gap-2">
                    <Label className="text-xs font-semibold">Fertilizer Type</Label>
                    <View className="flex-row flex-wrap gap-2">
                      {FERTILIZER_TYPES.map((f) => (
                        <Pressable
                          key={f}
                          onPress={() => setFertilizerType(f)}
                          className={cn(
                            'px-3 py-1.5 rounded-full border',
                            fertilizerType === f
                              ? 'bg-primary border-primary'
                              : 'bg-card border-border/80'
                          )}
                        >
                          <Text
                            className={cn(
                              'text-xs font-semibold',
                              fertilizerType === f
                                ? 'text-primary-foreground'
                                : 'text-foreground'
                            )}
                          >
                            {f}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <View className="flex-row gap-3 my-2">
            <Button
              onPress={
                activeTab === 'stage'
                  ? runStageTest
                  : activeTab === 'milestone'
                    ? runMilestoneTest
                    : runAllModels
              }
              disabled={loading}
              className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-2"
            >
              <Icon as={Play} size={16} className="text-primary-foreground" />
              <Text className="text-primary-foreground font-bold">
                {loading
                  ? 'Predicting...'
                  : activeTab === 'all'
                    ? 'Run All Models'
                    : 'Predict'}
              </Text>
            </Button>
            {(stageResult || milestoneResult || allResults) && (
              <>
                <Button
                  variant="outline"
                  onPress={() => setIsResultDialogOpen(true)}
                  className="h-12 rounded-xl px-3 flex-row items-center gap-1.5"
                >
                  <Icon as={Sparkles} size={15} className="text-primary" />
                  <Text className="text-xs font-semibold text-foreground">View Dialog</Text>
                </Button>
                <Button
                  variant="outline"
                  onPress={resetAll}
                  className="h-12 rounded-xl px-3.5"
                >
                  <Icon as={RefreshCw} size={15} className="text-foreground" />
                </Button>
              </>
            )}
          </View>

          {/* Loading */}
          {loading && (
            <View className="items-center py-6 gap-3">
              <Spinner size={28} />
              <Text variant="muted" className="text-sm font-medium">
                Running growth stage model...
              </Text>
            </View>
          )}

          {/* Error */}
          {error && (
            <Alert icon={AlertCircle} variant="destructive">
              <AlertTitle>Prediction Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

        </ResponsiveContainer>
      </ScrollView>

      {/* Result Dialog Modal */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] p-0 overflow-hidden">
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="p-6 gap-4"
          >
            {/* If Stage active and has stageResult */}
            {((activeTab === 'stage' && stageResult) ||
              (!milestoneResult && !allResults && stageResult)) && (
                <>
                  <DialogHeader className="text-left gap-1.5">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Icon as={Sprout} size={22} className="text-emerald-500" />
                        <DialogTitle className="text-lg font-bold">Growth Stage Result</DialogTitle>
                      </View>
                      <Badge className="bg-emerald-600/90">
                        <Text className="text-white text-xs font-semibold">
                          {STAGE_EMOJI[stageResult.predicted_stage] || '🌱'}{' '}
                          {stageResult.predicted_stage}
                        </Text>
                      </Badge>
                    </View>
                    <DialogDescription>
                      AI prediction for {crop} crop based on nutrient and environmental levels.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Primary Card */}
                  <View className="rounded-2xl bg-muted/40 p-4 border border-border/60 gap-3">
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text variant="muted" className="text-xs uppercase font-medium">
                          Predicted Stage
                        </Text>
                        <Text className="text-2xl font-black text-foreground mt-0.5">
                          {stageResult.predicted_stage}
                        </Text>
                      </View>
                      <Badge
                        variant={stageResult.confidence >= 0.7 ? 'outline' : 'destructive'}
                        className="px-3 py-1"
                      >
                        <Text className="text-xs font-bold">
                          {(stageResult.confidence * 100).toFixed(1)}% Confidence
                        </Text>
                      </Badge>
                    </View>

                    <Separator className="bg-border/60" />

                    {/* Environment Chips */}
                    <View className="flex-row flex-wrap gap-2">
                      <View className="rounded-lg bg-card px-2.5 py-1.5 border border-border/50">
                        <Text variant="muted" className="text-[10px] uppercase font-medium">
                          NPK
                        </Text>
                        <Text className="text-xs font-bold text-foreground">
                          {nitrogen}-{phosphorus}-{potassium}
                        </Text>
                      </View>
                      <View className="rounded-lg bg-card px-2.5 py-1.5 border border-border/50">
                        <Text variant="muted" className="text-[10px] uppercase font-medium">
                          Temp
                        </Text>
                        <Text className="text-xs font-bold text-foreground">
                          {temperature}°C
                        </Text>
                      </View>
                      <View className="rounded-lg bg-card px-2.5 py-1.5 border border-border/50">
                        <Text variant="muted" className="text-[10px] uppercase font-medium">
                          Humidity
                        </Text>
                        <Text className="text-xs font-bold text-foreground">
                          {humidity}%
                        </Text>
                      </View>
                      <View className="rounded-lg bg-card px-2.5 py-1.5 border border-border/50">
                        <Text variant="muted" className="text-[10px] uppercase font-medium">
                          Soil pH
                        </Text>
                        <Text className="text-xs font-bold text-foreground">{ph}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Recommendations */}
                  {stageResult.recommendations?.length > 0 && (
                    <View className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 gap-2.5">
                      <View className="flex-row items-center gap-2">
                        <Icon
                          as={Leaf}
                          size={16}
                          className="text-emerald-600 dark:text-emerald-400"
                        />
                        <Text className="font-bold text-foreground text-sm">
                          Actionable Farming Advice
                        </Text>
                      </View>
                      {stageResult.recommendations.map((rec: string, i: number) => (
                        <View key={i} className="flex-row items-start gap-2">
                          <Text className="text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">
                            •
                          </Text>
                          <Text className="text-xs leading-5 text-foreground/90 flex-1">
                            {rec}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}

            {/* If Milestone active and has milestoneResult */}
            {((activeTab === 'milestone' && milestoneResult) ||
              (!stageResult && !allResults && milestoneResult)) && (
                <>
                  <DialogHeader className="text-left gap-1.5">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Icon as={Zap} size={22} className="text-blue-500" />
                        <DialogTitle className="text-lg font-bold">
                          Growth Milestone Result
                        </DialogTitle>
                      </View>
                      <Badge
                        className={
                          milestoneResult.predicted_milestone === 1
                            ? 'bg-emerald-600/90'
                            : 'bg-amber-600/90'
                        }
                      >
                        <Text className="text-white text-xs font-semibold">
                          {milestoneResult.milestone_label ||
                            (milestoneResult.predicted_milestone === 1
                              ? 'Reached'
                              : 'Not Reached')}
                        </Text>
                      </Badge>
                    </View>
                    <DialogDescription>
                      Binary milestone evaluation using soil, watering, and temperature factors.
                    </DialogDescription>
                  </DialogHeader>

                  <View className="rounded-2xl bg-muted/40 p-4 border border-border/60 gap-3">
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text variant="muted" className="text-xs uppercase font-medium">
                          Status
                        </Text>
                        <Text className="text-2xl font-black text-foreground mt-0.5">
                          {milestoneResult.milestone_label ||
                            (milestoneResult.predicted_milestone === 1
                              ? 'Milestone Reached'
                              : 'Not Reached')}
                        </Text>
                      </View>
                      <Badge variant="outline" className="px-3 py-1">
                        <Text className="text-xs font-bold">
                          {(milestoneResult.confidence * 100).toFixed(1)}% Confidence
                        </Text>
                      </Badge>
                    </View>

                    <Separator className="bg-border/60" />

                    {/* Conditions Chips */}
                    <View className="flex-row flex-wrap gap-2">
                      <View className="rounded-lg bg-card px-2.5 py-1.5 border border-border/50">
                        <Text variant="muted" className="text-[10px] uppercase font-medium">
                          Soil
                        </Text>
                        <Text className="text-xs font-bold text-foreground">
                          {soilType}
                        </Text>
                      </View>
                      <View className="rounded-lg bg-card px-2.5 py-1.5 border border-border/50">
                        <Text variant="muted" className="text-[10px] uppercase font-medium">
                          Sunlight
                        </Text>
                        <Text className="text-xs font-bold text-foreground">
                          {sunlightHours} hrs
                        </Text>
                      </View>
                      <View className="rounded-lg bg-card px-2.5 py-1.5 border border-border/50">
                        <Text variant="muted" className="text-[10px] uppercase font-medium">
                          Water
                        </Text>
                        <Text className="text-xs font-bold text-foreground">
                          {waterFrequency}
                        </Text>
                      </View>
                      <View className="rounded-lg bg-card px-2.5 py-1.5 border border-border/50">
                        <Text variant="muted" className="text-[10px] uppercase font-medium">
                          Fertilizer
                        </Text>
                        <Text className="text-xs font-bold text-foreground">
                          {fertilizerType}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-4 gap-1.5">
                    <Text className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                      Cultivation Guidance
                    </Text>
                    <Text className="text-xs text-foreground/90 leading-5">
                      {milestoneResult.predicted_milestone === 1
                        ? 'Target growth milestone reached successfully under current conditions. Continue irrigation and nutrient schedule.'
                        : 'Milestone not yet achieved. Consider adjusting sunlight exposure, water frequency, or soil nutrients.'}
                    </Text>
                  </View>
                </>
              )}

            {/* If All Models active and has allResults */}
            {((activeTab === 'all' && allResults) ||
              (!stageResult && !milestoneResult && allResults)) && (
                <>
                  <DialogHeader className="text-left gap-1.5">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Icon as={Sparkles} size={22} className="text-primary" />
                        <DialogTitle className="text-lg font-bold">
                          Multi-Model Analysis
                        </DialogTitle>
                      </View>
                      <Badge className="bg-primary">
                        <Text className="text-primary-foreground text-xs font-semibold">
                          {STAGE_EMOJI[allResults.primary_stage] || '🌱'}{' '}
                          {allResults.primary_stage}
                        </Text>
                      </Badge>
                    </View>
                    <DialogDescription>
                      Consensus report across Random Forest & PyTorch neural network.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Model Predictions */}
                  <View className="gap-2.5">
                    {allResults.results?.stage && (
                      <View className="rounded-xl bg-muted/40 p-3 border border-border/60 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <Icon as={Sprout} size={16} className="text-emerald-500" />
                          <View>
                            <Text className="text-xs font-bold text-foreground">
                              Stage Model (RF)
                            </Text>
                            <Text variant="muted" className="text-[11px]">
                              {allResults.results.stage.predicted_stage}
                            </Text>
                          </View>
                        </View>
                        <Badge variant="outline">
                          <Text className="text-[11px] font-semibold">
                            {(
                              (allResults.results.stage.confidence || 0) * 100
                            ).toFixed(1)}
                            %
                          </Text>
                        </Badge>
                      </View>
                    )}

                    {allResults.results?.milestone && (
                      <View className="rounded-xl bg-muted/40 p-3 border border-border/60 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <Icon as={Zap} size={16} className="text-blue-500" />
                          <View>
                            <Text className="text-xs font-bold text-foreground">
                              Milestone Model (RF)
                            </Text>
                            <Text variant="muted" className="text-[11px]">
                              {allResults.results.milestone.milestone_label ||
                                `Class ${allResults.results.milestone.predicted_milestone}`}
                            </Text>
                          </View>
                        </View>
                        <Badge variant="outline">
                          <Text className="text-[11px] font-semibold">
                            {(
                              (allResults.results.milestone.confidence || 0) * 100
                            ).toFixed(1)}
                            %
                          </Text>
                        </Badge>
                      </View>
                    )}

                    {allResults.results?.pytorch && (
                      <View className="rounded-xl bg-muted/40 p-3 border border-border/60 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <Icon as={Layers} size={16} className="text-violet-500" />
                          <View>
                            <Text className="text-xs font-bold text-foreground">
                              PyTorch GrowthStageNet
                            </Text>
                            <Text variant="muted" className="text-[11px]">
                              Class{' '}
                              {allResults.results.pytorch.predicted_label ??
                                allResults.results.pytorch.predicted_class}
                            </Text>
                          </View>
                        </View>
                        <Badge variant="outline">
                          <Text className="text-[11px] font-semibold">
                            {(
                              (allResults.results.pytorch.confidence || 0) * 100
                            ).toFixed(1)}
                            %
                          </Text>
                        </Badge>
                      </View>
                    )}
                  </View>

                  {/* Recommendations */}
                  {allResults.recommendations?.length > 0 && (
                    <View className="rounded-2xl bg-primary/10 border border-primary/20 p-4 gap-2">
                      <View className="flex-row items-center gap-2">
                        <Icon as={Leaf} size={16} className="text-primary" />
                        <Text className="font-bold text-foreground text-sm">
                          Actionable Recommendations
                        </Text>
                      </View>
                      {allResults.recommendations.map((rec: string, i: number) => (
                        <View key={i} className="flex-row items-start gap-2">
                          <Text className="text-primary text-xs mt-0.5">•</Text>
                          <Text className="text-xs leading-5 text-foreground/90 flex-1">
                            {rec}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}

            <DialogFooter className="pt-2">
              <Button
                onPress={() => setIsResultDialogOpen(false)}
                className="w-full rounded-xl h-11"
              >
                <Text className="text-primary-foreground font-semibold">Done</Text>
              </Button>
            </DialogFooter>
          </ScrollView>
        </DialogContent>
      </Dialog>
    </View>
  );
}

