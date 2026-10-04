import React, { useState } from 'react';
import { Alert, Image, ScrollView, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  FlaskConical,
  Leaf,
  ShieldAlert,
  FileSearch,
  Bug,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Code2,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react-native';

import { Button } from '@/components/reusables/button';
import { Badge } from '@/components/reusables/badge';
import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/reusables/card';
import { Spinner } from '@/components/Spinner';
import { Input } from '@/components/reusables/input';
import { Label } from '@/components/reusables/label';
import { useApi } from '@/hooks/use-api';
import { cn } from '@/lib/utils';

const STAGE_ONLY_OPTIONS = [
  'land_preparation',
  'sowing',
  'vegetative',
  'flowering',
  'harvest',
  'post_harvest',
] as const;

const STAGE_DAY_MAP: Record<(typeof STAGE_ONLY_OPTIONS)[number], number> = {
  land_preparation: 7,
  sowing: 14,
  vegetative: 35,
  flowering: 60,
  harvest: 105,
  post_harvest: 120,
};

export default function MlTestLabScreen() {
  const router = useRouter();
  const { predictCrop, predictDisease, testStageModel, uploadFile, loading, error } = useApi();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [stageCrop, setStageCrop] = useState('Rice');
  const [stageLocation, setStageLocation] = useState('');
  const [selectedStage, setSelectedStage] = useState<(typeof STAGE_ONLY_OPTIONS)[number]>('vegetative');
  const [stageOnlyResult, setStageOnlyResult] = useState<any>(null);
  const [cropResult, setCropResult] = useState<any>(null);
  const [diseaseResult, setDiseaseResult] = useState<any>(null);
  const [pestResult, setPestResult] = useState<any>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const completedChecks = [stageOnlyResult, cropResult, diseaseResult, pestResult].filter(Boolean).length;

  const pickImageFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (result.canceled) return;
    const nextUri = result.assets[0]?.uri;
    if (!nextUri) return;
    setImageUri(nextUri);
    setCropResult(null);
    setDiseaseResult(null);
    setPestResult(null);
  };

  const pickImageFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed for testing predictions.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (result.canceled) return;
    const nextUri = result.assets[0]?.uri;
    if (!nextUri) return;
    setImageUri(nextUri);
    setCropResult(null);
    setDiseaseResult(null);
    setPestResult(null);
  };

  const runCropTest = async () => {
    if (!imageUri) {
      Alert.alert('Image required', 'Choose an image before running crop test.');
      return;
    }
    const response = await predictCrop(imageUri);
    setCropResult(response || null);
  };

  const runDiseaseTest = async () => {
    if (!imageUri) {
      Alert.alert('Image required', 'Choose an image before running disease test.');
      return;
    }
    const response = await predictDisease(imageUri);
    setDiseaseResult(response || null);
  };

  const runPestTest = async () => {
    if (!imageUri) {
      Alert.alert('Image required', 'Choose an image before running pest detection test.');
      return;
    }
    const response = await uploadFile(
      '/agri-flow/pest-detection',
      imageUri,
      'file',
      'crop.jpg',
      'image/jpeg'
    );
    setPestResult(response || null);
  };

  const runStageOnlyTest = async () => {
    const mappedDay = STAGE_DAY_MAP[selectedStage];
    const response = await testStageModel({
      crop: stageCrop || 'Rice',
      location: stageLocation,
      growth_stage_day: mappedDay,
      health_score: 3,
      temperature: 28,
      humidity: 70,
      nitrogen: 80,
      phosphorus: 40,
      potassium: 40,
      ph: 6.5,
    });
    setStageOnlyResult(response || null);
  };

  const runAllImageTests = async () => {
    if (!imageUri) {
      Alert.alert('Image required', 'Choose an image before running all image tests.');
      return;
    }
    const [cropRes, diseaseRes, pestRes] = await Promise.all([
      predictCrop(imageUri),
      predictDisease(imageUri),
      uploadFile('/agri-flow/pest-detection', imageUri, 'file', 'crop.jpg', 'image/jpeg'),
    ]);
    setCropResult(cropRes || null);
    setDiseaseResult(diseaseRes || null);
    setPestResult(pestRes || null);
  };

  const debugPayload = {
    stage_only_test: stageOnlyResult,
    crop_prediction: cropResult,
    disease_prediction: diseaseResult,
    pest_detection: pestResult,
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="p-4 sm:p-6 pb-28 gap-4 max-w-3xl mx-auto w-full"
      >
        {/* Subtitle */}
        <View className="pb-1">
          <Text variant="muted">Stage modeling test and multi-model computer vision diagnostics</Text>
        </View>

        {/* Dashboard Status Card */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Icon as={FlaskConical} size={18} className="text-primary" />
              <CardTitle className="text-base font-bold text-foreground">
                Testing Overview
              </CardTitle>
            </View>
            <Badge variant="outline" className="border-primary/30 bg-background">
              <Text className="text-xs font-semibold">{completedChecks}/4 Checked</Text>
            </Badge>
          </CardHeader>
          <CardContent className="gap-2">
            <View className="flex-row items-center gap-2">
              <Badge variant="secondary" className="px-2.5 py-1">
                <Text className="text-xs font-medium">Stage: {selectedStage.replace(/_/g, ' ')}</Text>
              </Badge>
              <Badge variant="secondary" className="px-2.5 py-1">
                <Text className="text-xs font-medium">Stage Day: {STAGE_DAY_MAP[selectedStage]}</Text>
              </Badge>
            </View>
            <Text variant="muted" className="text-xs leading-4">
              Run the agronomic stage model first, then select or take an image to run crop, disease, and pest detection.
            </Text>
          </CardContent>
        </Card>

        {/* Stage-Only Test Card */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <View className="flex-row items-center gap-2">
              <Icon as={FileSearch} size={18} className="text-primary" />
              <CardTitle className="text-base font-bold text-foreground">
                Stage-Only Model Test
              </CardTitle>
            </View>
            <CardDescription>
              Predict crop stage and timeline rules without an image
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1.5">
                <Label className="text-xs font-semibold">Crop</Label>
                <Input
                  value={stageCrop}
                  onChangeText={setStageCrop}
                  placeholder="e.g., Rice"
                  className="h-10 text-sm"
                />
              </View>
              <View className="flex-1 gap-1.5">
                <Label className="text-xs font-semibold">Location</Label>
                <Input
                  value={stageLocation}
                  onChangeText={setStageLocation}
                  placeholder="e.g., Coimbatore"
                  className="h-10 text-sm"
                />
              </View>
            </View>

            <View className="gap-2">
              <Label className="text-xs font-semibold">Select Crop Stage</Label>
              <View className="flex-row flex-wrap gap-2">
                {STAGE_ONLY_OPTIONS.map((stage) => {
                  const selected = selectedStage === stage;
                  return (
                    <Pressable
                      key={stage}
                      onPress={() => setSelectedStage(stage)}
                      className={cn(
                        'px-3 py-1.5 rounded-full border',
                        selected
                          ? 'bg-primary border-primary'
                          : 'bg-card border-border/80'
                      )}
                    >
                      <Text
                        className={cn(
                          'text-xs font-semibold',
                          selected ? 'text-primary-foreground' : 'text-foreground'
                        )}
                      >
                        {stage.replace(/_/g, ' ')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text variant="muted" className="text-xs">
                Simulated growth day: {STAGE_DAY_MAP[selectedStage]}
              </Text>
            </View>

            <View className="flex-row gap-2.5 pt-1">
              <Button onPress={runStageOnlyTest} className="flex-1 h-11 rounded-xl">
                <Text className="text-primary-foreground font-semibold">Run Stage Test</Text>
              </Button>
              <Button
                variant="outline"
                onPress={() => router.push('/(tabs)/stage-model-test' as any)}
                className="h-11 rounded-xl border-border px-4"
              >
                <Text className="font-semibold">Detailed Route</Text>
              </Button>
            </View>

            {stageOnlyResult && (
              <View className="rounded-xl border border-border/60 bg-muted/30 p-3.5 gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-bold text-foreground">
                    Predicted Stage: {stageOnlyResult?.model?.runtime?.predicted_stage || 'N/A'}
                  </Text>
                  {stageOnlyResult?.model?.runtime?.confidence != null && (
                    <Badge variant="outline" className="border-primary/40 bg-primary/10">
                      <Text className="text-xs font-semibold text-primary">
                        {(Number(stageOnlyResult.model.runtime.confidence) * 100).toFixed(0)}% Conf
                      </Text>
                    </Badge>
                  )}
                </View>
                <Text variant="muted" className="text-xs leading-4">
                  {stageOnlyResult?.explanation || 'No explanation available'}
                </Text>
              </View>
            )}
          </CardContent>
        </Card>

        {/* Test Image Card */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <View className="flex-row items-center gap-2">
              <Icon as={Camera} size={18} className="text-primary" />
              <CardTitle className="text-base font-bold text-foreground">
                Test Image
              </CardTitle>
            </View>
            <CardDescription>
              Select or take a crop photo for computer vision evaluations
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            {imageUri ? (
              <View className="h-52 rounded-xl overflow-hidden bg-muted border border-border/60">
                <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
              </View>
            ) : (
              <View className="h-32 rounded-xl border border-dashed border-border/80 items-center justify-center bg-muted/20 gap-1.5">
                <Icon as={ImageIcon} size={28} className="text-muted-foreground/60" />
                <Text variant="muted" className="text-xs">
                  No test image selected
                </Text>
              </View>
            )}

            <View className="flex-row gap-2.5">
              <Button
                onPress={pickImageFromCamera}
                className="flex-1 flex-row items-center justify-center gap-2 h-11 rounded-xl"
              >
                <Icon as={Camera} size={16} className="text-primary-foreground" />
                <Text className="text-primary-foreground font-semibold">Camera</Text>
              </Button>
              <Button
                variant="outline"
                onPress={pickImageFromGallery}
                className="flex-1 flex-row items-center justify-center gap-2 h-11 rounded-xl border-border"
              >
                <Icon as={ImageIcon} size={16} className="text-foreground" />
                <Text className="font-semibold text-foreground">Gallery</Text>
              </Button>
            </View>

            <Button
              variant="secondary"
              onPress={runAllImageTests}
              className="h-11 rounded-xl"
            >
              <Text className="font-semibold">Run All Image Tests (Crop + Disease + Pest)</Text>
            </Button>
          </CardContent>
        </Card>

        {/* Crop Test Card */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Icon as={Leaf} size={18} className="text-emerald-500" />
              <CardTitle className="text-base font-bold text-foreground">
                Crop Classification Test
              </CardTitle>
            </View>
            <Button
              variant="outline"
              size="sm"
              onPress={runCropTest}
              className="h-8 px-3 rounded-lg border-border"
            >
              <Text className="text-xs font-semibold">Run Crop Test</Text>
            </Button>
          </CardHeader>
          <CardContent>
            {cropResult ? (
              <View className="rounded-xl border border-border/60 bg-muted/30 p-3.5 gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-bold text-foreground">
                    Crop: {cropResult?.predicted_crop || cropResult?.crop || 'Unknown'}
                  </Text>
                  {cropResult?.confidence != null && (
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10">
                      <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {(Number(cropResult.confidence) * 100).toFixed(1)}% Confidence
                      </Text>
                    </Badge>
                  )}
                </View>
              </View>
            ) : (
              <Text variant="muted" className="text-xs py-1">
                No crop classification run yet. Click 'Run Crop Test' above.
              </Text>
            )}
          </CardContent>
        </Card>

        {/* Disease Test Card */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Icon as={ShieldAlert} size={18} className="text-amber-500" />
              <CardTitle className="text-base font-bold text-foreground">
                Disease Diagnosis Test
              </CardTitle>
            </View>
            <Button
              variant="outline"
              size="sm"
              onPress={runDiseaseTest}
              className="h-8 px-3 rounded-lg border-border"
            >
              <Text className="text-xs font-semibold">Run Disease Test</Text>
            </Button>
          </CardHeader>
          <CardContent>
            {diseaseResult ? (
              <View className="rounded-xl border border-border/60 bg-muted/30 p-3.5 gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-bold text-foreground">
                    Disease: {diseaseResult?.disease || 'Unknown'}
                  </Text>
                  {diseaseResult?.confidence != null && (
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10">
                      <Text className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {(Number(diseaseResult.confidence) * 100).toFixed(1)}% Confidence
                      </Text>
                    </Badge>
                  )}
                </View>
                {diseaseResult?.solution && (
                  <Text variant="muted" className="text-xs leading-4">
                    Solution: {diseaseResult.solution}
                  </Text>
                )}
              </View>
            ) : (
              <Text variant="muted" className="text-xs py-1">
                No disease test executed yet. Click 'Run Disease Test' above.
              </Text>
            )}
          </CardContent>
        </Card>

        {/* Pest Detection Test Card */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Icon as={Bug} size={18} className="text-rose-500" />
              <CardTitle className="text-base font-bold text-foreground">
                Pest Detection Test
              </CardTitle>
            </View>
            <Button
              variant="outline"
              size="sm"
              onPress={runPestTest}
              className="h-8 px-3 rounded-lg border-border"
            >
              <Text className="text-xs font-semibold">Run Pest Test</Text>
            </Button>
          </CardHeader>
          <CardContent>
            {pestResult ? (
              <View className="rounded-xl border border-border/60 bg-muted/30 p-3.5 gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-bold text-foreground">
                    Pest: {pestResult?.pest || pestResult?.pest_name || 'Unknown'}
                  </Text>
                  {pestResult?.confidence != null && (
                    <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10">
                      <Text className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                        {(Number(pestResult.confidence) * 100).toFixed(1)}% Confidence
                      </Text>
                    </Badge>
                  )}
                </View>
                {pestResult?.recommendation && (
                  <Text variant="muted" className="text-xs leading-4">
                    Recommendation: {pestResult.recommendation}
                  </Text>
                )}
              </View>
            ) : (
              <Text variant="muted" className="text-xs py-1">
                No pest detection test run yet. Click 'Run Pest Test' above.
              </Text>
            )}
          </CardContent>
        </Card>

        {/* Raw Response Debug Card */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Icon as={Code2} size={18} className="text-primary" />
              <CardTitle className="text-base font-bold text-foreground">
                Raw JSON Debugger
              </CardTitle>
            </View>
            <Button
              variant="outline"
              size="sm"
              onPress={() => setShowRawJson((prev) => !prev)}
              className="h-8 px-3 rounded-lg border-border"
            >
              <Text className="text-xs font-semibold">
                {showRawJson ? 'Hide JSON' : 'Show JSON'}
              </Text>
            </Button>
          </CardHeader>
          {showRawJson && (
            <CardContent>
              <View className="rounded-xl bg-muted/50 p-3.5 border border-border/60">
                <Text className="font-mono text-xs text-foreground">
                  {JSON.stringify(debugPayload, null, 2)}
                </Text>
              </View>
            </CardContent>
          )}
        </Card>

        {/* More Tools Links */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-foreground">
              Related Diagnostics
            </CardTitle>
          </CardHeader>
          <CardContent className="gap-2.5">
            <Button
              variant="outline"
              onPress={() => router.push('/(tabs)/stage-model-test' as any)}
              className="w-full justify-between h-11 rounded-xl border-border px-4"
            >
              <Text className="font-semibold">Open Stage Model Test</Text>
              <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              onPress={() => router.push('/(tabs)/scan' as any)}
              className="w-full justify-between h-11 rounded-xl border-border px-4"
            >
              <Text className="font-semibold">Open Unified Scan Route</Text>
              <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
            </Button>
          </CardContent>
        </Card>

        {/* Global Loading Overlay / Indicator */}
        {loading && (
          <View className="py-4 items-center justify-center gap-2">
            <Spinner size={24} />
            <Text variant="muted" className="text-xs">
              Running model inference...
            </Text>
          </View>
        )}

        {/* Error Alert Box */}
        {!!error && (
          <View className="rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 flex-row items-center gap-2.5">
            <Icon as={AlertTriangle} size={18} className="text-destructive shrink-0" />
            <Text className="text-xs font-medium text-destructive flex-1">{error}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
