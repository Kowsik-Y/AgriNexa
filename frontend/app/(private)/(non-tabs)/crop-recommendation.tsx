import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Sparkles,
  Sprout,
  CheckCircle2,
  AlertCircle,
  Thermometer,
  Droplets,
  Layers,
  ArrowRight,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Button } from '@/components/reusables/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/reusables/card';
import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
import { Spinner } from '@/components/Spinner';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';
import { MarkdownContent } from '@/components/assistant/MarkdownContent';
import { useApi } from '@/hooks/use-api';
import { useAppContext } from '@/context/AppProvider';

export default function CropRecommendationScreen() {
  const router = useRouter();
  const { appLanguage } = useAppContext();
  const { recommendCrops, getPredictionToolsMeta, loading } = useApi();

  const [nitrogen, setNitrogen] = useState('80');
  const [phosphorus, setPhosphorus] = useState('45');
  const [potassium, setPotassium] = useState('40');
  const [ph, setPh] = useState('6.5');
  const [season, setSeason] = useState('Kharif');
  const [temperature, setTemperature] = useState('26');
  const [humidity, setHumidity] = useState('65');

  const [presets, setPresets] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const profileStr = await AsyncStorage.getItem('user_profile');
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          if (profile.nitrogen) setNitrogen(String(profile.nitrogen));
          if (profile.phosphorus) setPhosphorus(String(profile.phosphorus));
          if (profile.potassium) setPotassium(String(profile.potassium));
          if (profile.ph) setPh(String(profile.ph));
        }

        const meta = await getPredictionToolsMeta();
        if (meta?.soil_presets) {
          setPresets(meta.soil_presets);
        }
      } catch (e) {
        console.error('Error loading crop recommendation meta:', e);
      }
    };
    init();
  }, []);

  const handleApplyPreset = (preset: any) => {
    setNitrogen(String(preset.n));
    setPhosphorus(String(preset.p));
    setPotassium(String(preset.k));
    setPh(String(preset.ph));
  };

  const handleRecommend = async () => {
    const res = await recommendCrops({
      nitrogen: parseFloat(nitrogen) || 80,
      phosphorus: parseFloat(phosphorus) || 45,
      potassium: parseFloat(potassium) || 40,
      ph: parseFloat(ph) || 6.5,
      temperature: parseFloat(temperature) || 26,
      humidity: parseFloat(humidity) || 65,
      season,
      language: appLanguage === 'Tamil' ? 'Tamil' : 'English',
    });

    if (res?.status === 'success') {
      setResult(res);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: appLanguage === 'Tamil' ? 'பயிர் பரிந்துரை' : 'Crop Recommendation',
          headerBackTitle: 'Back',
        }}
      />
      <ResponsiveContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="p-5 pb-20 gap-5"
        >
          {/* Header Description */}
          <View className="gap-1.5">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-lg bg-sky-500/15 items-center justify-center">
                <Icon as={Sparkles} size={18} className="text-sky-600 dark:text-sky-400" />
              </View>
              <Text variant="h3">
                {appLanguage === 'Tamil' ? 'ஸ்மார்ட் பயிர் தேர்வு' : 'ML Smart Crop Choice'}
              </Text>
            </View>
            <Text variant="muted" className="text-sm leading-relaxed">
              {appLanguage === 'Tamil'
                ? 'உங்கள் மண்ணின் N-P-K மற்றும் pH தரவுகளை உள்ளிட்டு, செயற்கை நுண்ணறிவு பரிந்துரைகளைப் பெறுங்கள்.'
                : 'Enter your soil N-P-K nutrients and pH to calculate scientifically optimal crops with GenAI agronomic analysis.'}
            </Text>
          </View>

          {/* Quick Presets */}
          {presets.length > 0 && (
            <View className="gap-2">
              <Text variant="small" className="font-semibold text-muted-foreground uppercase text-xs">
                Quick Soil Presets
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                {presets.map((preset, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleApplyPreset(preset)}
                    className="bg-card border border-border px-3 py-1.5 rounded-full flex-row items-center gap-1.5 active:opacity-70"
                  >
                    <Icon as={Layers} size={12} className="text-primary" />
                    <Text className="text-xs font-medium text-foreground">{preset.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Soil Input Card */}
          <Card className="border-border bg-card p-4 gap-4">
            <Text className="font-bold text-foreground text-base">Soil & Nutrients (kg/ha)</Text>

            <View className="flex-row gap-3">
              <View className="flex-1 gap-1.5">
                <Text variant="muted" className="text-xs">Nitrogen (N)</Text>
                <TextInput
                  value={nitrogen}
                  onChangeText={setNitrogen}
                  keyboardType="numeric"
                  className="h-11 px-3 rounded-xl border border-input bg-background text-foreground font-semibold"
                  placeholder="80"
                />
              </View>
              <View className="flex-1 gap-1.5">
                <Text variant="muted" className="text-xs">Phosphorus (P)</Text>
                <TextInput
                  value={phosphorus}
                  onChangeText={setPhosphorus}
                  keyboardType="numeric"
                  className="h-11 px-3 rounded-xl border border-input bg-background text-foreground font-semibold"
                  placeholder="45"
                />
              </View>
              <View className="flex-1 gap-1.5">
                <Text variant="muted" className="text-xs">Potassium (K)</Text>
                <TextInput
                  value={potassium}
                  onChangeText={setPotassium}
                  keyboardType="numeric"
                  className="h-11 px-3 rounded-xl border border-input bg-background text-foreground font-semibold"
                  placeholder="40"
                />
              </View>
              <View className="flex-1 gap-1.5">
                <Text variant="muted" className="text-xs">Soil pH</Text>
                <TextInput
                  value={ph}
                  onChangeText={setPh}
                  keyboardType="numeric"
                  className="h-11 px-3 rounded-xl border border-input bg-background text-foreground font-semibold"
                  placeholder="6.5"
                />
              </View>
            </View>

            {/* Environmental Settings */}
            <View className="flex-row gap-3 pt-2 border-t border-border/50">
              <View className="flex-1 gap-1.5">
                <View className="flex-row items-center gap-1">
                  <Icon as={Thermometer} size={13} className="text-orange-500" />
                  <Text variant="muted" className="text-xs">Temp (°C)</Text>
                </View>
                <TextInput
                  value={temperature}
                  onChangeText={setTemperature}
                  keyboardType="numeric"
                  className="h-10 px-3 rounded-xl border border-input bg-background text-foreground font-medium text-sm"
                  placeholder="26"
                />
              </View>
              <View className="flex-1 gap-1.5">
                <View className="flex-row items-center gap-1">
                  <Icon as={Droplets} size={13} className="text-sky-500" />
                  <Text variant="muted" className="text-xs">Humidity (%)</Text>
                </View>
                <TextInput
                  value={humidity}
                  onChangeText={setHumidity}
                  keyboardType="numeric"
                  className="h-10 px-3 rounded-xl border border-input bg-background text-foreground font-medium text-sm"
                  placeholder="65"
                />
              </View>
              <View className="flex-1 gap-1.5">
                <Text variant="muted" className="text-xs">Season</Text>
                <TextInput
                  value={season}
                  onChangeText={setSeason}
                  className="h-10 px-3 rounded-xl border border-input bg-background text-foreground font-medium text-sm"
                  placeholder="Kharif"
                />
              </View>
            </View>

            <Button
              onPress={handleRecommend}
              disabled={loading}
              className="mt-2 rounded-xl py-3 flex-row items-center justify-center gap-2"
            >
              {loading ? (
                <Spinner size={18} />
              ) : (
                <>
                  <Icon as={Sparkles} size={18} className="text-primary-foreground" />
                  <Text className="text-primary-foreground font-bold">
                    {appLanguage === 'Tamil' ? 'பரிந்துரைகளைக் கண்டறியவும்' : 'Recommend Best Crops with AI'}
                  </Text>
                </>
              )}
            </Button>
          </Card>

          {/* Results Section */}
          {result && (
            <View className="gap-4">
              <View className="flex-row items-center justify-between">
                <Text variant="h4" className="font-bold">
                  {appLanguage === 'Tamil' ? 'பரிந்துரைக்கப்பட்ட பயிர்கள்' : 'Top Recommended Crops'}
                </Text>
                <Text variant="muted" className="text-xs">ML Gaussian Model</Text>
              </View>

              {result.recommendations.map((crop: any, index: number) => {
                const isTop = index === 0;
                return (
                  <Card
                    key={crop.crop}
                    className={`p-4 rounded-2xl border ${isTop
                      ? 'border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-500/15'
                      : 'border-border bg-card'
                      } gap-3`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2.5 flex-1">
                        <View
                          className={`w-9 h-9 rounded-xl items-center justify-center ${isTop ? 'bg-emerald-500/20' : 'bg-primary/10'
                            }`}
                        >
                          <Icon
                            as={Sprout}
                            size={20}
                            className={isTop ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="font-bold text-foreground text-base">
                            #{index + 1} {crop.crop}
                          </Text>
                          <Text variant="muted" className="text-xs">
                            {crop.tamil_name} · {crop.season}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end gap-1">
                        <View
                          className={`px-2.5 py-1 rounded-full ${isTop ? 'bg-emerald-500' : 'bg-primary/20'
                            }`}
                        >
                          <Text
                            className={`text-xs font-bold ${isTop ? 'text-white' : 'text-primary'
                              }`}
                          >
                            {crop.score}% Match
                          </Text>
                        </View>
                        <Text variant="muted" className="text-[10px]">
                          {crop.suitability}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-xs text-foreground/80 leading-relaxed">
                      {crop.description}
                    </Text>

                    {/* Nutrient Notes */}
                    <View className="bg-background/60 p-2.5 rounded-xl gap-1">
                      <Text className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Soil & Nutrient Notes
                      </Text>
                      {crop.nutrient_notes.map((note: string, nIdx: number) => (
                        <View key={nIdx} className="flex-row items-center gap-1.5">
                          <Icon
                            as={note.includes('balanced') ? CheckCircle2 : AlertCircle}
                            size={12}
                            className={note.includes('balanced') ? 'text-emerald-500' : 'text-amber-500'}
                          />
                          <Text className="text-xs text-foreground/90 flex-1">{note}</Text>
                        </View>
                      ))}
                    </View>
                  </Card>
                );
              })}

              {/* GenAI Agronomist Report Card */}
              {result.ai_agronomist_report && (
                <Card className="border-sky-500/30 bg-sky-500/10 dark:bg-sky-500/15 p-4 rounded-2xl gap-2.5">
                  <View className="flex-row items-center gap-2 pb-1 border-b border-sky-500/20">
                    <Icon as={Sparkles} size={18} className="text-sky-600 dark:text-sky-400" />
                    <Text className="font-bold text-sky-800 dark:text-sky-200 text-sm">
                      {appLanguage === 'Tamil'
                        ? 'GenAI வேளாண் ஆலோசகர் அறிக்கை'
                        : 'GenAI Agronomist Advisory Report'}
                    </Text>
                  </View>
                  <MarkdownContent content={result.ai_agronomist_report} />
                </Card>
              )}

              {/* Navigation to Yield Prediction with Top Crop */}
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/yield-prediction',
                    params: { crop: result.top_crop },
                  })
                }
                className="bg-card border border-border p-4 rounded-2xl flex-row items-center justify-between active:opacity-75"
              >
                <View className="gap-0.5 flex-1 pr-3">
                  <Text className="font-bold text-foreground text-sm">
                    {appLanguage === 'Tamil'
                      ? 'இந்த பயிருக்கு மகசூல் கணக்கிட வேண்டுமா?'
                      : `Predict Yield for ${result.top_crop}?`}
                  </Text>
                  <Text variant="muted" className="text-xs">
                    Calculate estimated quintals and gross market revenue
                  </Text>
                </View>
                <Icon as={ArrowRight} size={18} className="text-primary" />
              </Pressable>
            </View>
          )}
        </ScrollView>
      </ResponsiveContainer>
    </View>
  );
}
