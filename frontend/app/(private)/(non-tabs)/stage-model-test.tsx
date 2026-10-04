import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { Play, Sparkles, RefreshCw, Sprout, FileText } from 'lucide-react-native';

import { Button } from '@/components/reusables/button';
import { Input } from '@/components/reusables/input';
import { Label } from '@/components/reusables/label';
import { Text } from '@/components/reusables/text';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/reusables/card';
import { Badge } from '@/components/reusables/badge';
import { Separator } from '@/components/reusables/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/reusables/dialog';
import { Icon } from '@/components/reusables/icon';
import { MarkdownContent } from '@/components/assistant/MarkdownContent';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';
import { useApi } from '@/hooks/use-api';

const STAGE_EMOJI: Record<string, string> = {
  Seedling: '🌱',
  Vegetative: '🌿',
  Tillering: '🌾',
  Flowering: '🌸',
  Maturity: '🌾',
  Harvesting: '🚜',
};

export default function StageModelTestScreen() {
  const { testStageModel } = useApi();

  const [crop, setCrop] = useState('Rice');
  const [location, setLocation] = useState('');
  const [growthStageDay, setGrowthStageDay] = useState('35');
  const [healthScore, setHealthScore] = useState('3');
  const [temperature, setTemperature] = useState('28');
  const [humidity, setHumidity] = useState('70');
  const [nitrogen, setNitrogen] = useState('80');
  const [phosphorus, setPhosphorus] = useState('40');
  const [potassium, setPotassium] = useState('40');
  const [ph, setPh] = useState('6.5');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const res = await testStageModel({
        crop,
        location,
        growth_stage_day: Number(growthStageDay) || 1,
        health_score: Number(healthScore) || 3,
        temperature: Number(temperature) || 28,
        humidity: Number(humidity) || 70,
        nitrogen: Number(nitrogen) || 80,
        phosphorus: Number(phosphorus) || 40,
        potassium: Number(potassium) || 40,
        ph: Number(ph) || 6.5,
      });

      if (!res?.status) {
        Alert.alert('Error', 'Stage model test failed.');
        return;
      }
      setResult(res);
      setIsResultDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setResult(null);
    setIsResultDialogOpen(false);
  };

  const predictedStage = result?.model?.runtime?.predicted_stage || 'Unknown';
  const confidence = result?.model?.runtime?.confidence;
  const modelStatus = result?.model?.runtime?.model_status || 'Unknown';
  const loaderStatus = result?.model?.loader?.loaded ? 'Loaded' : 'Fallback / Not loaded';

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: 'Stage Model Test' }} />
      <ResponsiveContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="p-5 pb-16 gap-5"
        >
          <Text variant="muted" className="text-sm -mt-1">
            Test your imported Colab model and get LLM explanation.
          </Text>

          <Card className="p-4 rounded-2xl border border-border bg-card gap-3.5">
            <View className="gap-1.5">
              <Label>Crop</Label>
              <Input value={crop} onChangeText={setCrop} placeholder="e.g. Rice" />
            </View>
            <View className="gap-1.5">
              <Label>Location</Label>
              <Input value={location} onChangeText={setLocation} placeholder="e.g. Mandya, Karnataka" />
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1.5">
                <Label>Growth Stage Day</Label>
                <Input value={growthStageDay} onChangeText={setGrowthStageDay} keyboardType="numeric" />
              </View>
              <View className="flex-1 gap-1.5">
                <Label>Health Score (1-5)</Label>
                <Input value={healthScore} onChangeText={setHealthScore} keyboardType="numeric" />
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1.5">
                <Label>Temperature (°C)</Label>
                <Input value={temperature} onChangeText={setTemperature} keyboardType="numeric" />
              </View>
              <View className="flex-1 gap-1.5">
                <Label>Humidity (%)</Label>
                <Input value={humidity} onChangeText={setHumidity} keyboardType="numeric" />
              </View>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1 gap-1.5">
                <Label>N (mg/kg)</Label>
                <Input value={nitrogen} onChangeText={setNitrogen} keyboardType="numeric" />
              </View>
              <View className="flex-1 gap-1.5">
                <Label>P (mg/kg)</Label>
                <Input value={phosphorus} onChangeText={setPhosphorus} keyboardType="numeric" />
              </View>
              <View className="flex-1 gap-1.5">
                <Label>K (mg/kg)</Label>
                <Input value={potassium} onChangeText={setPotassium} keyboardType="numeric" />
              </View>
            </View>
            <View className="gap-1.5">
              <Label>Soil pH</Label>
              <Input value={ph} onChangeText={setPh} keyboardType="numeric" />
            </View>
          </Card>

          <View className="flex-row gap-2">
            <Button
              onPress={runTest}
              disabled={loading}
              className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-2"
            >
              <Icon as={Play} size={16} className="text-primary-foreground" />
              <Text className="text-primary-foreground font-bold">
                {loading ? 'Testing...' : 'Run Stage Test'}
              </Text>
            </Button>
            {result && (
              <>
                <Button
                  variant="outline"
                  onPress={() => setIsResultDialogOpen(true)}
                  className="h-12 rounded-xl px-3 flex-row items-center gap-1.5"
                >
                  <Icon as={Sparkles} size={15} className="text-primary" />
                  <Text className="text-xs font-semibold text-foreground">View Result</Text>
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

          {result && (
            <Card className="rounded-2xl border border-border bg-card p-4 gap-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Icon as={Sprout} size={18} className="text-emerald-500" />
                  <CardTitle className="text-base font-bold text-foreground">
                    Latest Prediction Summary
                  </CardTitle>
                </View>
                <Badge className="bg-emerald-600/90">
                  <Text className="text-white text-xs font-semibold">
                    {STAGE_EMOJI[predictedStage] || '🌱'} {predictedStage}
                  </Text>
                </Badge>
              </View>
              <View className="flex-row items-center justify-between pt-1">
                <Text variant="muted" className="text-xs">
                  Confidence: {typeof confidence === 'number' ? `${(confidence * 100).toFixed(1)}%` : String(confidence)}
                </Text>
                <Text variant="muted" className="text-xs">
                  Model: {modelStatus}
                </Text>
              </View>
              <Button
                variant="secondary"
                onPress={() => setIsResultDialogOpen(true)}
                className="mt-1 h-9 rounded-lg flex-row items-center justify-center gap-1.5"
              >
                <Icon as={FileText} size={14} className="text-foreground" />
                <Text className="text-xs font-medium text-foreground">Open Detailed Explanation</Text>
              </Button>
            </Card>
          )}
        </ScrollView>
      </ResponsiveContainer>

      {/* Result Dialog Modal with Markdown Explanation */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] p-0 overflow-hidden">
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="p-6 gap-4"
          >
            {result && (
              <>
                <DialogHeader className="text-left gap-1.5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Icon as={Sprout} size={22} className="text-emerald-500" />
                      <DialogTitle className="text-lg font-bold">Stage Model Result</DialogTitle>
                    </View>
                    <Badge className="bg-emerald-600/90">
                      <Text className="text-white text-xs font-semibold">
                        {STAGE_EMOJI[predictedStage] || '🌱'} {predictedStage}
                      </Text>
                    </Badge>
                  </View>
                  <DialogDescription>
                    AI prediction for {crop} {location ? `at ${location}` : ''} (Day {growthStageDay}).
                  </DialogDescription>
                </DialogHeader>

                {/* Primary Metrics Card */}
                <View className="rounded-2xl bg-muted/40 p-4 border border-border/60 gap-3">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text variant="muted" className="text-xs uppercase font-medium">
                        Predicted Stage
                      </Text>
                      <Text className="text-2xl font-black text-foreground mt-0.5">
                        {predictedStage}
                      </Text>
                    </View>
                    {confidence != null && (
                      <Badge
                        variant={Number(confidence) >= 0.7 ? 'outline' : 'destructive'}
                        className="px-3 py-1"
                      >
                        <Text className="text-xs font-bold">
                          {typeof confidence === 'number'
                            ? `${(confidence * 100).toFixed(1)}%`
                            : String(confidence)}{' '}
                          Confidence
                        </Text>
                      </Badge>
                    )}
                  </View>

                  <Separator className="bg-border/60" />

                  {/* Conditions Chips */}
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
                    <View className="rounded-lg bg-card px-2.5 py-1.5 border border-border/50">
                      <Text variant="muted" className="text-[10px] uppercase font-medium">
                        Health Score
                      </Text>
                      <Text className="text-xs font-bold text-foreground">{healthScore}/5</Text>
                    </View>
                  </View>

                  <Separator className="bg-border/60" />

                  <View className="flex-row items-center justify-between text-xs">
                    <Text variant="muted" className="text-xs">
                      Model Status: <Text className="font-semibold text-foreground">{modelStatus}</Text>
                    </Text>
                    <Text variant="muted" className="text-xs">
                      Loader: <Text className="font-semibold text-foreground">{loaderStatus}</Text>
                    </Text>
                  </View>
                </View>

                {/* Markdown LLM Explanation */}
                {result.explanation && (
                  <View className="rounded-2xl bg-muted/30 border border-border/60 p-4 gap-2">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Icon as={Sparkles} size={16} className="text-primary" />
                      <Text className="font-bold text-foreground text-sm">
                        Agronomic Explanation & Advice
                      </Text>
                    </View>
                    <MarkdownContent content={result.explanation} />
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
