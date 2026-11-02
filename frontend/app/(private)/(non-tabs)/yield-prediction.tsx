import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, TextInput } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  TrendingUp,
  CheckCircle2,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Button } from '@/components/reusables/button';
import { Card, CardContent } from '@/components/reusables/card';
import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
import { Spinner } from '@/components/Spinner';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';
import { MarkdownContent } from '@/components/assistant/MarkdownContent';
import { useApi } from '@/hooks/use-api';
import { useAppContext } from '@/context/AppProvider';

const CROPS = [
  'Rice',
  'Wheat',
  'Maize',
  'Cotton',
  'Sugarcane',
  'Groundnut',
  'Tomato',
  'Chickpea',
  'Blackgram',
  'Banana',
];

const SOILS = ['Alluvial', 'Black Soil', 'Red Soil', 'Clay Loam', 'Sandy Loam'];
const IRRIGATIONS = ['Drip / Micro', 'Canal / Flood', 'Borewell', 'Rainfed'];

export default function YieldPredictionScreen() {
  const params = useLocalSearchParams<{ crop?: string }>();
  const { appLanguage } = useAppContext();
  const { predictYield, loading } = useApi();

  const [selectedCrop, setSelectedCrop] = useState(params.crop || 'Rice');
  const [area, setArea] = useState('2');
  const [areaUnit, setAreaUnit] = useState<'acres' | 'hectares'>('acres');
  const [soilType, setSoilType] = useState('Alluvial');
  const [irrigation, setIrrigation] = useState('Canal / Flood');
  const [season, setSeason] = useState('Kharif');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (params.crop) {
      setSelectedCrop(params.crop);
    }
  }, [params.crop]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileStr = await AsyncStorage.getItem('user_profile');
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          if (profile.crops && !params.crop) {
            const first = profile.crops.split(',')[0].trim();
            if (first) setSelectedCrop(first);
          }
          if (profile.farm_size) {
            setArea(String(profile.farm_size));
          }
        }
      } catch (e) {
        console.error('Error reading profile:', e);
      }
    };
    loadProfile();
  }, []);

  const handlePredict = async () => {
    const res = await predictYield({
      crop: selectedCrop,
      area: parseFloat(area) || 1,
      area_unit: areaUnit,
      season,
      soil_type: soilType,
      irrigation_type: irrigation,
      fertilizer_level: 'Balanced',
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
          title: appLanguage === 'Tamil' ? 'மகசூல் கணிப்பு' : 'Crop Yield Prediction',
          headerBackTitle: 'Back',
        }}
      />
      <ResponsiveContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="p-5 pb-20 gap-5"
        >
          {/* Header */}
          <View className="gap-1.5">
            <View className="flex-row items-center gap-2">
              <Text variant="h3">
                {appLanguage === 'Tamil' ? 'மகசூல் மற்றும் வருவாய் கணிப்பு' : 'Yield & Revenue Forecast'}
              </Text>
            </View>
            <Text variant="muted" className="text-sm leading-relaxed">
              {appLanguage === 'Tamil'
                ? 'உங்கள் பயிர், நிலப்பரப்பு மற்றும் பாசன முறையைத் தேர்ந்தெடுத்து எதிர்பார்க்கப்படும் மகசூலைக் கணக்கிடுங்கள்.'
                : 'Estimate harvest output in Quintals and projected market revenue optimization interventions.'}
            </Text>
          </View>

          {/* Form Card */}
          <Card className="border-border bg-card p-4 gap-4">
            {/* Crop Selector Chips */}
            <View className="gap-2">
              <Text className="text-xs font-semibold text-muted-foreground uppercase">Select Crop</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                {CROPS.map((c) => {
                  const active = selectedCrop.toLowerCase() === c.toLowerCase();
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setSelectedCrop(c)}
                      className={`px-3 py-1.5 rounded-full border ${active
                        ? 'bg-primary border-primary'
                        : 'bg-background border-border active:opacity-70'
                        }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${active ? 'text-primary-foreground' : 'text-foreground'
                          }`}
                      >
                        {c}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Land Area and Unit */}
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1.5">
                <Text variant="muted" className="text-xs">Land Area</Text>
                <TextInput
                  value={area}
                  onChangeText={setArea}
                  keyboardType="numeric"
                  className="h-11 px-3 rounded-xl border border-input bg-background text-foreground font-semibold"
                  placeholder="2"
                />
              </View>

              <View className="gap-1.5">
                <Text variant="muted" className="text-xs">Unit</Text>
                <View className="flex-row h-11 rounded-xl border border-input bg-muted/30 p-1 gap-1">
                  <Pressable
                    onPress={() => setAreaUnit('acres')}
                    className={`px-3 rounded-lg justify-center items-center ${areaUnit === 'acres' ? 'bg-background shadow-xs' : ''
                      }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${areaUnit === 'acres' ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                    >
                      Acres
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setAreaUnit('hectares')}
                    className={`px-3 rounded-lg justify-center items-center ${areaUnit === 'hectares' ? 'bg-background shadow-xs' : ''
                      }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${areaUnit === 'hectares' ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                    >
                      Hectares
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Soil Type Selection */}
            <View className="gap-1.5">
              <Text variant="muted" className="text-xs">Soil Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                {SOILS.map((s) => {
                  const active = soilType === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setSoilType(s)}
                      className={`px-3 py-1.5 rounded-lg border text-xs ${active
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background'
                        }`}
                    >
                      <Text
                        className={`text-xs ${active ? 'text-primary font-bold' : 'text-foreground'
                          }`}
                      >
                        {s}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Irrigation Type Selection */}
            <View className="gap-1.5">
              <Text variant="muted" className="text-xs">Irrigation System</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                {IRRIGATIONS.map((i) => {
                  const active = irrigation === i;
                  return (
                    <Pressable
                      key={i}
                      onPress={() => setIrrigation(i)}
                      className={`px-3 py-1.5 rounded-lg border text-xs ${active
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background'
                        }`}
                    >
                      <Text
                        className={`text-xs ${active ? 'text-primary font-bold' : 'text-foreground'
                          }`}
                      >
                        {i}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <Button
              onPress={handlePredict}
              disabled={loading}
              className="mt-2 rounded-xl py-3 flex-row items-center justify-center gap-2"
            >
              {loading ? (
                <Spinner size={18} />
              ) : (
                <>
                  <Icon as={TrendingUp} size={18} className="text-primary-foreground" />
                  <Text className="text-primary-foreground font-bold">
                    {appLanguage === 'Tamil' ? 'மகசூலைக் கணக்கிடவும்' : 'Predict Yield'}
                  </Text>
                </>
              )}
            </Button>
          </Card>

          {/* Results Display */}
          {result && (
            <View className="gap-4">
              {/* Big KPI Card */}
              <Card className="p-5 rounded-2xl border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/15 gap-4">
                <View className="flex-row items-center justify-between">
                  <View className="gap-0.5">
                    <Text className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase">
                      Total Expected Production
                    </Text>
                    <Text variant="h1" className="text-emerald-700 dark:text-emerald-300 font-extrabold">
                      {result.total_production.expected_quintals} <Text className="text-lg font-normal">Quintals</Text>
                    </Text>
                  </View>
                  <View className="bg-emerald-500/20 px-3 py-1.5 rounded-xl items-center">
                    <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {result.yield_per_acre.expected_quintals} Q/acre
                    </Text>
                  </View>
                </View>

                {/* Range Bar */}
                <View className="bg-background/80 p-3 rounded-xl gap-1.5">
                  <View className="flex-row justify-between text-xs">
                    <Text variant="muted" className="text-xs">
                      Conservative: {result.total_production.min_quintals} Q
                    </Text>
                    <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Upper Potential: {result.total_production.max_quintals} Q
                    </Text>
                  </View>
                  <View className="h-2 rounded-full bg-muted overflow-hidden">
                    <View className="h-full bg-emerald-500 w-3/4 rounded-full" />
                  </View>
                </View>

                {/* Revenue Projections */}
                <View className="flex-row items-center justify-between pt-3 border-t border-emerald-500/20">
                  <View>
                    <Text variant="muted" className="text-xs">Estimated Gross Revenue</Text>
                    <Text className="text-xl font-bold text-foreground">
                      {result.financial_forecast.formatted_revenue}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text variant="muted" className="text-xs">Benchmark Rate</Text>
                    <Text className="text-xs font-semibold text-foreground">
                      ₹{result.financial_forecast.modal_price_per_quintal}/Q
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Optimization Plan Card */}
              {result.ai_yield_plan && (
                <Card className="border-sky-500/30 bg-sky-500/10 dark:bg-sky-500/15 p-4 rounded-2xl gap-2.5">
                  <View className="flex-row items-center gap-2 pb-1 border-b border-sky-500/20">
                    <Text className="font-bold text-sky-800 dark:text-sky-200 text-sm">
                      {appLanguage === 'Tamil'
                        ? 'மகசூல் மேம்பாட்டுத் திட்டம்'
                        : 'Yield Enhancement Plan'}
                    </Text>
                  </View>
                  <MarkdownContent content={result.ai_yield_plan} />
                </Card>
              )}

              {/* Key Intervention Actions */}
              {result.gap_closure_actions?.length > 0 && (
                <Card className="border-border bg-card p-4 rounded-2xl gap-2.5">
                  <Text className="font-bold text-foreground text-sm">Recommended High-Impact Interventions</Text>
                  {result.gap_closure_actions.map((act: string, idx: number) => (
                    <View key={idx} className="flex-row items-start gap-2">
                      <Icon as={CheckCircle2} size={14} className="text-emerald-500 mt-0.5" />
                      <Text className="text-xs text-foreground/90 flex-1 leading-relaxed">{act}</Text>
                    </View>
                  ))}
                </Card>
              )}
            </View>
          )}
        </ScrollView>
      </ResponsiveContainer>
    </View>
  );
}
