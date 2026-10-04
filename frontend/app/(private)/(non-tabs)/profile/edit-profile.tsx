import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  MapPin,
  Sprout,
  Save,
  Tractor,
  CheckCircle2,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/reusables/card';
import { Label } from '@/components/reusables/label';
import { Text } from '@/components/reusables/text';
import { Input } from '@/components/reusables/input';
import { Button } from '@/components/reusables/button';
import { Icon } from '@/components/reusables/icon';
import { Spinner } from '@/components/Spinner';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';
import { useApi } from '@/hooks/use-api';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/utils';

const FLOW_STAGES = [
  'Land Preparation',
  'Sowing',
  'Vegetative',
  'Flowering',
  'Harvesting',
  'Marketing',
];

export default function EditProfileScreen() {
  const { toast } = useToast();
  const router = useRouter();
  const { saveProfileRemote } = useApi();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile State
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [mainCrops, setMainCrops] = useState('');
  const [flowStage, setFlowStage] = useState('');
  const [nitrogen, setNitrogen] = useState('');
  const [phosphorus, setPhosphorus] = useState('');
  const [potassium, setPotassium] = useState('');
  const [ph, setPh] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileStr = await AsyncStorage.getItem('user_profile');
        if (profileStr) {
          const p = JSON.parse(profileStr);
          setName(p.name || '');
          setVillage(p.village || '');
          setDistrict(p.district || '');
          setState(p.state || '');
          setMainCrops(p.crops || '');
          setFlowStage(p.flow_stage || 'Land Preparation');
          setNitrogen(String(p.nitrogen || '80'));
          setPhosphorus(String(p.phosphorus || '40'));
          setPotassium(String(p.potassium || '40'));
          setPh(String(p.ph || '6.5'));
        }
      } catch (e) {
        console.error('Error loading profile:', e);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleGetLocation = async () => {
    setSaving(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast({ title: 'Permission Denied', description: 'Location access is required.', type: 'warning' });
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      let detectedVillage = '';
      let detectedDistrict = '';
      let detectedState = '';

      if (Platform.OS === 'web') {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${loc.coords.latitude}&lon=${loc.coords.longitude}`);
        const data = await res.json();
        if (data.address) {
          detectedVillage = data.address.suburb || data.address.village || data.address.town || data.address.neighbourhood || '';
          detectedDistrict = data.address.county || data.address.city_district || data.address.city || '';
          detectedState = data.address.state || '';
        }
      } else {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (reverse.length > 0) {
          const place = reverse[0];
          detectedVillage = place.name || place.city || place.street || '';
          detectedDistrict = place.district || place.subregion || place.city || '';
          detectedState = place.region || '';
        }
      }

      if (detectedVillage || detectedDistrict || detectedState) {
        setVillage(detectedVillage);
        setDistrict(detectedDistrict);
        setState(detectedState);

        toast({
          title: 'Location updated',
          description: `Set to ${detectedVillage || detectedDistrict}`,
          type: 'success',
        });
      } else {
        toast({ title: 'Location Error', description: 'Could not resolve location address.', type: 'warning' });
      }
    } catch (e) {
      console.error('Location error:', e);
      toast({ title: 'Error', description: 'Could not fetch location.', type: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const sessionStr = await AsyncStorage.getItem('user_session');
      const session = sessionStr ? JSON.parse(sessionStr) : null;

      if (!session) {
        toast({ title: 'Error', description: 'Session not found. Please login again.', type: 'destructive' });
        return;
      }

      const updatedProfile = {
        user_id: session.id,
        name,
        village,
        district,
        state,
        crops: mainCrops,
        flow_stage: flowStage,
        nitrogen: parseFloat(nitrogen) || 0,
        phosphorus: parseFloat(phosphorus) || 0,
        potassium: parseFloat(potassium) || 0,
        ph: parseFloat(ph) || 0,
        onboarded: true,
      };

      await saveProfileRemote(updatedProfile);
      await AsyncStorage.setItem('user_profile', JSON.stringify(updatedProfile));

      toast({ title: 'Profile Updated', description: 'Your changes have been saved successfully.', type: 'success' });
      router.back();
    } catch (e) {
      console.error('Error saving profile:', e);
      toast({ title: 'Save Failed', description: 'An error occurred while saving your profile.', type: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Spinner size={36} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ResponsiveContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="p-5 pb-16 gap-6"
        >
          {/* Personal Information */}
          <Section title="Personal Information" icon={User}>
            <View className="gap-1.5">
              <Label>Full Name</Label>
              <Input
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
              />
            </View>
          </Section>

          {/* Farm Location */}
          <Section title="Farm Location" icon={MapPin}>
            <Button
              variant="outline"
              onPress={handleGetLocation}
              disabled={saving}
              className="flex-row items-center justify-center gap-2 h-11 rounded-xl mb-4 border-primary/40 bg-primary/5 active:bg-primary/10"
            >
              <Icon as={MapPin} size={18} className="text-primary" />
              <Text className="text-primary font-semibold text-sm">Auto-detect Location</Text>
            </Button>
            <View className="gap-3">
              <View className="gap-1.5">
                <Label>Village / Town</Label>
                <Input
                  placeholder="Village / Town"
                  value={village}
                  onChangeText={setVillage}
                />
              </View>
              <View className="gap-1.5">
                <Label>District</Label>
                <Input
                  placeholder="District"
                  value={district}
                  onChangeText={setDistrict}
                />
              </View>
              <View className="gap-1.5">
                <Label>State</Label>
                <Input
                  placeholder="State"
                  value={state}
                  onChangeText={setState}
                />
              </View>
              <View className="gap-1.5">
                <Label>Main Crops</Label>
                <Input
                  placeholder="e.g. Paddy, Cotton, Tomato"
                  value={mainCrops}
                  onChangeText={setMainCrops}
                />
              </View>
            </View>
          </Section>

          {/* Farming Stage */}
          <Section title="Farming Stage" icon={Tractor}>
            <View className="flex-row flex-wrap gap-2.5">
              {FLOW_STAGES.map((s) => {
                const selected = flowStage === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setFlowStage(s)}
                    className={cn(
                      'flex-row items-center justify-between px-3.5 py-2.5 rounded-xl border min-w-[46%] flex-1',
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card'
                    )}
                  >
                    <Text
                      className={cn(
                        'text-xs font-semibold',
                        selected ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {s}
                    </Text>
                    {selected && <Icon as={CheckCircle2} size={16} className="text-primary shrink-0 ml-1" />}
                  </Pressable>
                );
              })}
            </View>
          </Section>

          {/* Soil Data */}
          <Section title="Soil Data" icon={Sprout}>
            <View className="flex-row flex-wrap justify-between gap-3">
              <View className="w-[47%] gap-1.5">
                <Label>Nitrogen (N)</Label>
                <Input placeholder="e.g. 80" value={nitrogen} onChangeText={setNitrogen} keyboardType="numeric" />
              </View>
              <View className="w-[47%] gap-1.5">
                <Label>Phosphorus (P)</Label>
                <Input placeholder="e.g. 40" value={phosphorus} onChangeText={setPhosphorus} keyboardType="numeric" />
              </View>
              <View className="w-[47%] gap-1.5">
                <Label>Potassium (K)</Label>
                <Input placeholder="e.g. 40" value={potassium} onChangeText={setPotassium} keyboardType="numeric" />
              </View>
              <View className="w-[47%] gap-1.5">
                <Label>Soil pH</Label>
                <Input placeholder="e.g. 6.5" value={ph} onChangeText={setPh} keyboardType="numeric" />
              </View>
            </View>
          </Section>

          <Button
            onPress={handleSave}
            disabled={saving}
            className="h-12 rounded-xl flex-row items-center justify-center gap-2 mt-2"
          >
            <Icon as={Save} size={18} className="text-primary-foreground" />
            <Text className="text-primary-foreground font-bold text-base">
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </Button>
        </ScrollView>
      </ResponsiveContainer>
    </View>
  );
}

const Section = ({ title, icon: IconComponent, children }: any) => {
  return (
    <Card className="rounded-2xl border border-border bg-card p-4 gap-3">
      <CardHeader className="p-0 flex-row items-center gap-2">
        <Icon as={IconComponent} size={18} className="text-primary" />
        <CardTitle className="text-base font-bold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {children}
      </CardContent>
    </Card>
  );
};
