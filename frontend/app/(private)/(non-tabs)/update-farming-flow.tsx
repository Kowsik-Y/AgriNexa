import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, View, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapPin, Navigation, Save, Play, Check } from 'lucide-react-native';

import { Button } from '@/components/reusables/button';
import { Input } from '@/components/reusables/input';
import { Label } from '@/components/reusables/label';
import { Text } from '@/components/reusables/text';
import { Card } from '@/components/reusables/card';
import { Icon } from '@/components/reusables/icon';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';
import { useApi } from '@/hooks/use-api';

const STAGES = [
  'land_preparation',
  'sowing',
  'vegetative',
  'flowering',
  'harvest',
  'post_harvest',
];

export default function UpdateFarmingFlowScreen() {
  const router = useRouter();
  const { updateFarmingFlow, error } = useApi();

  const [fieldName, setFieldName] = useState('Primary Field');
  const [location, setLocation] = useState('');
  const [crop, setCrop] = useState('Rice');
  const [flowStage, setFlowStage] = useState('vegetative');
  const [growthStageDay, setGrowthStageDay] = useState('30');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const extractFirstCrop = (value: any): string => {
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]).trim();
    }
    if (typeof value === 'string') {
      const first = value.split(/[;,/]/).map((item) => item.trim()).find(Boolean);
      return first || '';
    }
    return '';
  };

  const isAllowedStage = (value: string): value is (typeof STAGES)[number] => {
    return STAGES.includes(value as (typeof STAGES)[number]);
  };

  const submit = async () => {
    if (!fieldName.trim() || !location.trim() || !crop.trim() || !flowStage.trim()) {
      Alert.alert('Required', 'Please fill all required fields.');
      return;
    }

    setSaving(true);
    try {
      const res = await updateFarmingFlow({
        field_name: fieldName.trim(),
        location: location.trim(),
        crop: crop.trim(),
        flow_stage: flowStage.trim(),
        growth_stage_day: Number(growthStageDay) || 1,
        notes: notes.trim() || undefined,
      });

      if (res?.status !== 'success') {
        const message = res?.message || error || 'Failed to update farming flow. Please retry.';
        Alert.alert('Error', message);
        return;
      }

      const profileRaw = await AsyncStorage.getItem('user_profile');
      const profile = profileRaw ? JSON.parse(profileRaw) : {};
      const nextProfile = {
        ...profile,
        farm_name: fieldName.trim(),
        crops: crop.trim(),
        flow_stage: flowStage.trim(),
        growth_stage_day: Number(growthStageDay) || 1,
      };
      await AsyncStorage.setItem('user_profile', JSON.stringify(nextProfile));
      await AsyncStorage.setItem('agriflow_refresh_nonce', String(Date.now()));

      Alert.alert('Updated', 'Farming flow updated successfully.', [
        { text: 'Go to AgriFlow', onPress: () => router.replace('/agriflow' as any) },
        { text: 'Test Model', onPress: () => router.push('/stage-model-test' as any) },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const fillLocationFromGps = async (options?: { silent?: boolean }) => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!options?.silent) {
          Alert.alert('Permission required', 'Please allow location access to auto-fill location.');
        }
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = current.coords.latitude;
      const lon = current.coords.longitude;

      const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      const place = places[0];

      if (place) {
        const readable = [
          place.subregion,
          place.city || place.district,
          place.region,
        ]
          .filter(Boolean)
          .join(', ');

        setLocation(readable || `${lat.toFixed(5)}, ${lon.toFixed(5)}`);
      } else {
        setLocation(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
      }
    } catch {
      if (!options?.silent) {
        Alert.alert('GPS error', 'Could not fetch current location. Try again.');
      }
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    const prefill = async () => {
      const profileRaw = await AsyncStorage.getItem('user_profile');
      const profile = profileRaw ? JSON.parse(profileRaw) : {};

      const profileFieldName = String(profile?.farm_name || '').trim();
      const profileCrop = extractFirstCrop(profile?.crops);
      const profileStage = String(profile?.flow_stage || '').trim().toLowerCase();
      const profileLocation = [profile?.village, profile?.district, profile?.state].filter(Boolean).join(', ').trim();

      if (profileFieldName) setFieldName(profileFieldName);
      if (profileCrop) setCrop(profileCrop);
      if (profileStage && isAllowedStage(profileStage)) setFlowStage(profileStage);
      if (profileLocation) {
        setLocation(profileLocation);
      } else {
        await fillLocationFromGps({ silent: true });
      }
    };

    prefill();
  }, []);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: 'Update Farming Flow' }} />
      <ResponsiveContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="p-5 pb-16 gap-5"
        >
          <Text variant="muted" className="text-sm -mt-1">
            Separate flow update route for your field and stage progression.
          </Text>

          <Card className="p-4 rounded-2xl border border-border bg-card gap-4">
            <View className="gap-1.5">
              <Label>Field Name</Label>
              <Input value={fieldName} onChangeText={setFieldName} placeholder="e.g. Primary Field" />
            </View>

            <View className="gap-1.5">
              <Label>Location</Label>
              <Input value={location} onChangeText={setLocation} placeholder="e.g. Village, District, State" />
            </View>

            <Button
              variant="outline"
              onPress={() => fillLocationFromGps()}
              disabled={locating}
              className="h-10 rounded-xl flex-row items-center justify-center gap-2"
            >
              <Icon as={Navigation} size={15} className="text-foreground" />
              <Text className="text-foreground text-xs font-semibold">
                {locating ? 'Fetching GPS...' : 'Use Current GPS Location'}
              </Text>
            </Button>

            <View className="gap-1.5">
              <Label>Crop</Label>
              <Input value={crop} onChangeText={setCrop} placeholder="e.g. Rice" />
            </View>

            {/* Stages Selector */}
            <View className="gap-2">
              <Label>Flow Stage</Label>
              <View className="gap-2">
                {STAGES.map((stage) => {
                  const selected = flowStage === stage;
                  return (
                    <Pressable
                      key={stage}
                      onPress={() => setFlowStage(stage)}
                      className={`flex-row items-center justify-between p-3.5 rounded-xl border transition-all ${
                        selected
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card'
                      }`}
                    >
                      <View className="flex-row items-center gap-3">
                        <View
                          className={`w-5 h-5 rounded-full border items-center justify-center ${
                            selected ? 'border-primary bg-primary' : 'border-muted-foreground/60'
                          }`}
                        >
                          {selected && <View className="w-2 h-2 rounded-full bg-primary-foreground" />}
                        </View>
                        <Text
                          className={`text-sm capitalize ${
                            selected ? 'font-bold text-foreground' : 'font-normal text-muted-foreground'
                          }`}
                        >
                          {stage.replace('_', ' ')}
                        </Text>
                      </View>
                      {selected && <Icon as={Check} size={16} className="text-primary" />}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="gap-1.5">
              <Label>Growth Stage Day</Label>
              <Input
                value={growthStageDay}
                onChangeText={setGrowthStageDay}
                keyboardType="numeric"
              />
            </View>

            <View className="gap-1.5">
              <Label>Notes</Label>
              <Input
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                placeholder="Add any additional notes about your crop progress"
              />
            </View>
          </Card>

          <Button
            onPress={submit}
            disabled={saving}
            className="h-12 rounded-xl flex-row items-center justify-center gap-2"
          >
            <Icon as={Save} size={18} className="text-primary-foreground" />
            <Text className="text-primary-foreground font-bold">
              {saving ? 'Saving...' : 'Save Farming Flow'}
            </Text>
          </Button>

          <Button
            variant="outline"
            onPress={() => router.push('/stage-model-test' as any)}
            className="h-12 rounded-xl flex-row items-center justify-center gap-2"
          >
            <Icon as={Play} size={16} className="text-foreground" />
            <Text className="text-foreground font-semibold">
              Open Stage Model Test Route
            </Text>
          </Button>
        </ScrollView>
      </ResponsiveContainer>
    </View>
  );
}
