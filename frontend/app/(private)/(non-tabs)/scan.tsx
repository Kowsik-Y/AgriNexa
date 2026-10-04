import React, { useState } from 'react';
import { View, Image, ScrollView, Alert as NativeAlert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, CheckCircle2, AlertCircle, Info, ImageOff, Sprout, Globe } from 'lucide-react-native';

import { Button } from '@/components/reusables/button';
import { Badge } from '@/components/reusables/badge';
import { Text } from '@/components/reusables/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/reusables/card';
import { Separator } from '@/components/reusables/separator';
import { Icon } from '@/components/reusables/icon';
import { Alert, AlertDescription, AlertTitle } from '@/components/reusables/alert';
import { Spinner } from '@/components/Spinner';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';
import { useApi } from '@/hooks/use-api';

const STAGE_EMOJI: Record<string, string> = {
  Seedling: '🌱',
  Vegetative: '🌿',
  Flowering: '🌸',
};

export default function ScanScreen() {
  const { predictScan, predictGrowthStage, loading, error } = useApi();
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [growthStage, setGrowthStage] = useState<any>(null);
  const [loadingMessage, setLoadingMessage] = useState('Uploading image securely...');
  const [isScanning, setIsScanning] = useState(false);

  const pickImage = async () => {
    let res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!res.canceled) {
      const uri = res.assets[0].uri;
      setImage(uri);
      handlePredict(uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      NativeAlert.alert('Permission Required', 'Camera permission is required to take crop photos.');
      return;
    }
    let res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!res.canceled) {
      const uri = res.assets[0].uri;
      setImage(uri);
      handlePredict(uri);
    }
  };

  const handlePredict = async (uri: string) => {
    setResult(null);
    setGrowthStage(null);
    setLoadingMessage('Uploading image securely...');
    setIsScanning(true);

    const scanResult = await predictScan(uri, (status) => {
      setLoadingMessage(status);
    });

    setIsScanning(false);
    if (!scanResult) return;

    setResult(scanResult);

    // Growth stage uses the resolved crop (stage model expects lowercase crop labels)
    const stageResult = await predictGrowthStage({
      crop: String(scanResult.crop_prediction?.predicted_crop || 'rice').toLowerCase(),
      temperature: 28,
      humidity: 70,
      N: 80,
      P: 40,
      K: 40,
      ph: 6.5,
    });
    if (stageResult) setGrowthStage(stageResult);
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-14">
        <ResponsiveContainer>
          <View className="px-5 pt-4 pb-4">
            <Text variant="muted" className="text-sm">
              Analyze plant health and detect diseases with AI.
            </Text>
          </View>

          <View className="px-5">
            {image ? (
              <View className="w-full overflow-hidden rounded-2xl border border-border bg-muted/20">
                <Image source={{ uri: image }} className="h-64 w-full" resizeMode="cover" />
              </View>
            ) : (
              <View className="w-full items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 py-12 px-4 gap-3">
                <View className="rounded-full bg-muted/60 p-4">
                  <Icon as={ImageOff} size={32} className="text-muted-foreground" />
                </View>
                <View className="items-center">
                  <Text className="font-semibold text-foreground">No image selected</Text>
                  <Text variant="muted" className="mt-0.5 text-xs text-center">
                    Take a photo or choose an image from your gallery
                  </Text>
                </View>
              </View>
            )}

            <View className="flex-row gap-3 mt-4 w-full">
              <Button
                className="flex-1 flex-row items-center justify-center gap-2 h-12 rounded-xl"
                onPress={takePhoto}
              >
                <Icon as={Camera} size={18} className="text-primary-foreground" />
                <Text className="font-semibold text-primary-foreground">Camera</Text>
              </Button>
              <Button
                variant="outline"
                className="flex-1 flex-row items-center justify-center gap-2 h-12 rounded-xl"
                onPress={pickImage}
              >
                <Icon as={ImageIcon} size={18} className="text-foreground" />
                <Text className="font-semibold text-foreground">Gallery</Text>
              </Button>
            </View>

            {isScanning && (
              <View className="items-center justify-center py-10 gap-3">
                <Spinner size={32} />
                <Text variant="muted" className="text-sm font-medium text-center">
                  {loadingMessage}
                </Text>
              </View>
            )}

            {error && (
              <View className="mt-4">
                <Alert icon={AlertCircle} variant="destructive">
                  <AlertTitle>Scan Failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </View>
            )}

            {result && (
              <Card className="mt-6 gap-4 py-5 border-border">
                <CardHeader className="flex-row items-center justify-between px-5 pb-0">
                  <View className="flex-row items-center gap-2">
                    <Icon as={CheckCircle2} size={20} className="text-emerald-500" />
                    <CardTitle className="text-lg font-bold">Analysis Complete</CardTitle>
                  </View>
                  {result.is_healthy ? (
                    <Badge className="bg-emerald-600/90">
                      <Text className="text-white text-xs font-semibold">✓ Healthy</Text>
                    </Badge>
                  ) : (
                    <Badge variant={result.confidence < 0.5 ? 'destructive' : 'secondary'}>
                      <Text className="text-xs font-semibold">
                        {result.disease && result.disease !== 'Healthy' ? 'Issue Detected' : 'Scanned'}
                      </Text>
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="gap-4 px-5 pt-0">
                  <View className="rounded-xl bg-muted/40 p-4 border border-border/50 gap-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 mr-2">
                        <Text variant="muted" className="text-xs uppercase font-medium">Disease</Text>
                        <Text className="text-base font-bold text-foreground mt-0.5">
                          {result.disease || 'Unknown'}
                        </Text>
                      </View>
                      <Badge variant={result.confidence < 0.5 ? 'destructive' : 'outline'}>
                        <Text className="text-xs">
                          {(result.confidence * 100).toFixed(1)}% match
                        </Text>
                      </Badge>
                    </View>

                    <Separator className="bg-border/60" />

                    <View className="flex-row items-center justify-between">
                      <Text variant="muted" className="text-xs uppercase font-medium">Detected Crop</Text>
                      <Text className="font-semibold text-foreground">
                        {result.crop_prediction?.predicted_crop || 'Unknown'}
                      </Text>
                    </View>
                  </View>

                  {/* Growth Stage Section */}
                  {growthStage && (
                    <View className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 gap-3">
                      <View className="flex-row items-center gap-2">
                        <Icon as={Sprout} size={16} className="text-emerald-500" />
                        <Text className="font-bold text-foreground text-sm">Growth Stage</Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-lg">
                            {STAGE_EMOJI[growthStage.predicted_stage] || '🌱'}
                          </Text>
                          <Text className="text-base font-bold text-foreground">
                            {growthStage.predicted_stage}
                          </Text>
                        </View>
                        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10">
                          <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {((growthStage.confidence || 0) * 100).toFixed(1)}%
                          </Text>
                        </Badge>
                      </View>
                      {growthStage.recommendations?.length > 0 && (
                        <View className="gap-1.5 pt-1">
                          {growthStage.recommendations.slice(0, 2).map((rec: string, i: number) => (
                            <View key={i} className="flex-row items-start gap-2">
                              <Text className="text-emerald-500 text-xs mt-0.5">•</Text>
                              <Text className="text-xs leading-4 text-foreground/80 flex-1">{rec}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {result.confidence < 0.5 && (
                    <Alert
                      icon={AlertCircle}
                      className="border-amber-500/30 bg-amber-500/10"
                      iconClassName="text-amber-600 dark:text-amber-400"
                    >
                      <AlertTitle className="text-amber-800 dark:text-amber-300 font-semibold">
                        Low Confidence Warning
                      </AlertTitle>
                      <AlertDescription className="text-amber-700/90 dark:text-amber-300/90">
                        Low confidence — please consult an agricultural expert or retake the photo with better lighting.
                      </AlertDescription>
                    </Alert>
                  )}

                  {result.symptoms && (
                    <View className="gap-1.5 pt-1">
                      <View className="flex-row items-center gap-2">
                        <Icon as={Info} size={16} className="text-amber-500" />
                        <Text className="font-bold text-foreground">Observed Symptoms</Text>
                      </View>
                      <Text className="text-sm leading-6 text-foreground/90">
                        {result.symptoms}
                      </Text>
                    </View>
                  )}

                  {result.search_query && (
                    <View className="gap-1.5 pt-1">
                      <View className="flex-row items-center gap-2">
                        <Icon as={Globe} size={16} className="text-blue-500" />
                        <Text className="font-bold text-foreground">Web Search Triggered</Text>
                      </View>
                      <View className="rounded-md bg-blue-500/10 border border-blue-500/20 p-2.5">
                        <Text className="text-xs text-blue-700 dark:text-blue-400 italic">
                          "{result.search_query}"
                        </Text>
                      </View>
                    </View>
                  )}

                  {result.solution && (
                    <View className="gap-1.5 pt-1">
                      <View className="flex-row items-center gap-2">
                        <Icon as={Sprout} size={16} className="text-primary" />
                        <Text className="font-bold text-foreground">Recommended Action</Text>
                      </View>
                      <Text className="text-sm leading-6 text-foreground/90">
                        {result.solution}
                      </Text>
                    </View>
                  )}

                  {result.pesticide_recommendation && result.pesticide_recommendation !== 'None required' && (
                    <View className="rounded-xl bg-muted/60 border border-border/50 p-3.5 gap-1.5">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-base">💊</Text>
                        <Text className="font-semibold text-primary">
                          {result.pesticide_recommendation}
                        </Text>
                      </View>
                      {result.dosage && (
                        <Text variant="muted" className="text-xs">
                          Dosage: {result.dosage}
                        </Text>
                      )}
                    </View>
                  )}

                  {result.tamil_solution && (
                    <>
                      <Separator className="my-1 bg-border/60" />
                      <View className="gap-1.5">
                        <Text className="font-bold text-foreground">🌿 தீர்வு (Tamil)</Text>
                        <Text variant="muted" className="text-sm leading-6">
                          {result.tamil_solution}
                        </Text>
                      </View>
                    </>
                  )}

                  {result.note && (
                    <>
                      <Separator className="my-2 bg-border/60" />
                      <Text variant="muted" className="text-[10px] text-center uppercase tracking-wider">
                        {result.note}
                      </Text>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </View>
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}


