import React, { useState } from 'react';
import { View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MapPin, Sprout, CheckCircle2, Camera, Mic, CloudSun, LineChart, Bug, Sparkles,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import * as Location from 'expo-location';

import { Button } from '@/components/reusables/button';
import { Input } from '@/components/reusables/input';
import { Label } from '@/components/reusables/label';
import { Text } from '@/components/reusables/text';
import { Switch } from '@/components/reusables/switch';
import { Progress } from '@/components/reusables/progress';
import { Separator } from '@/components/reusables/separator';
import { Icon } from '@/components/reusables/icon';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from '@/components/reusables/select';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from '@/components/reusables/card';
import { KeyboardResponsiveView } from '@/components/KeyboardResponsiveView';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';
import { useTheme } from '@/hooks/use-theme';
import { useApi } from '@/hooks/use-api';
import { useAppContext } from '@/context/AppProvider';
import { useToast } from '@/components/Toast';
import { getOrCreateSessionId, setOnboardedFlag, setUserProfile } from '@/lib/auth-storage';

/**
 * Onboarding workflow (3 steps + success):
 *  1. You   – language, name, interests
 *  2. Farm  – location (auto-detect or manual), crops, current farming stage
 *  3. Finish – optional soil values and permissions (requested when toggled), then save
 */
type Step = 'you' | 'farm' | 'finish' | 'success';
const STEPS: Exclude<Step, 'success'>[] = ['you', 'farm', 'finish'];
const STEP_META: Record<Exclude<Step, 'success'>, { title: string; description: string }> = {
  you: { title: 'Welcome to AgriNexa', description: 'Tell us a little about you.' },
  farm: { title: 'Your farm', description: 'Where you grow and what you grow.' },
  finish: { title: 'Almost done', description: 'Optional soil details and permissions.' },
};

const LANGUAGES = ['English', 'Tamil'] as const;
const FLOW_STAGES = ['Land Preparation', 'Sowing', 'Vegetative', 'Flowering', 'Harvesting', 'Marketing'];
const INTERESTS = [
  { id: 'crops', label: 'Crop Advice', icon: Sprout },
  { id: 'weather', label: 'Weather', icon: CloudSun },
  { id: 'pests', label: 'Pest Detection', icon: Bug },
  { id: 'prices', label: 'Market Prices', icon: LineChart },
];

type PermKey = 'camera' | 'mic' | 'location';

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const selectInsets = { top: insets.top, bottom: insets.bottom, left: 12, right: 12 };
  const { setAppLanguage } = useAppContext();
  const { saveProfileRemote } = useApi();

  const [step, setStep] = useState<Step>('you');
  const [loading, setLoading] = useState(false);

  const [appLang, setAppLang] = useState<string>('English');
  const [name, setName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [mainCrops, setMainCrops] = useState('');
  const [flowStage, setFlowStage] = useState('Land Preparation');
  const [nitrogen, setNitrogen] = useState('80');
  const [phosphorus, setPhosphorus] = useState('40');
  const [potassium, setPotassium] = useState('40');
  const [ph, setPh] = useState('6.5');
  const [permissions, setPermissions] = useState<Record<PermKey, boolean>>({
    camera: false, mic: false, location: false,
  });

  const stepIndex = STEPS.indexOf(step as any);

  const toggleInterest = (id: string) =>
    setInterests((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const onLanguageChange = (lang: string) => {
    setAppLang(lang);
    try { setAppLanguage(lang as any); } catch { /* language switch is best-effort */ }
  };

  const setPermission = async (key: PermKey, enabled: boolean) => {
    if (!enabled) { setPermissions((p) => ({ ...p, [key]: false })); return; }
    try {
      let granted = false;
      if (key === 'camera') granted = (await ImagePicker.requestCameraPermissionsAsync()).status === 'granted';
      if (key === 'mic') granted = (await requestRecordingPermissionsAsync()).granted;
      if (key === 'location') granted = (await Location.requestForegroundPermissionsAsync()).status === 'granted';
      setPermissions((p) => ({ ...p, [key]: granted }));
      if (!granted) toast({ title: 'Permission denied', description: 'You can enable it later in settings.', type: 'warning' });
    } catch {
      setPermissions((p) => ({ ...p, [key]: false }));
    }
  };

  const handleGetLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { toast({ title: 'Permission Denied', description: 'Location access required.', type: 'warning' }); return; }
      setPermissions((p) => ({ ...p, location: true }));
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      let dv = '', dd = '', ds = '';

      if (Platform.OS === 'web') {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${loc.coords.latitude}&lon=${loc.coords.longitude}`);
        const data = await res.json();
        if (data.address) { dv = data.address.suburb || data.address.village || ''; dd = data.address.county || data.address.city || ''; ds = data.address.state || ''; }
      } else {
        const reverse = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (reverse.length > 0) { const p = reverse[0]; dv = p.name || p.city || ''; dd = p.district || p.subregion || ''; ds = p.region || ''; }
      }

      if (dv || dd || ds) { setVillage(dv); setDistrict(dd); setState(ds); toast({ title: 'Location detected', description: `Set to ${dv || dd}`, type: 'success' }); }
      else { toast({ title: 'Error', description: 'Could not resolve location.', type: 'warning' }); }
    } catch { toast({ title: 'Error', description: 'Could not fetch location.', type: 'destructive' }); }
    finally { setLoading(false); }
  };

  const finishOnboarding = async () => {
    setLoading(true);
    try {
      const userId = await getOrCreateSessionId();
      const profile = {
        user_id: userId, name, appLang, village, district, state, crops: mainCrops,
        interests, flow_stage: flowStage,
        nitrogen: parseFloat(nitrogen) || 80, phosphorus: parseFloat(phosphorus) || 40,
        potassium: parseFloat(potassium) || 40, ph: parseFloat(ph) || 6.5, onboarded: true,
      };
      await saveProfileRemote(profile);
      await setUserProfile(profile);
      await setOnboardedFlag(true);
      setStep('success');
      setTimeout(() => router.replace('/'), 1500);
    } catch { toast({ title: 'Error', description: 'Could not save profile.', type: 'destructive' }); }
    finally { setLoading(false); }
  };

  const goNext = () => {
    if (step === 'you') {
      if (!name.trim()) { toast({ title: 'Required', description: 'Enter your name.', type: 'warning' }); return; }
      setStep('farm');
    } else if (step === 'farm') {
      if (!flowStage) { toast({ title: 'Required', description: 'Select your farming stage.', type: 'warning' }); return; }
      setStep('finish');
    } else if (step === 'finish') {
      finishOnboarding();
    }
  };

  const goBack = () => { if (stepIndex > 0) setStep(STEPS[stepIndex - 1]); };

  const renderBody = () => {
    switch (step) {
      case 'you':
        return (
          <CardContent className="gap-4">
            <View className="gap-1.5">
              <Label>Language</Label>
              <Select value={{ value: appLang, label: appLang }} onValueChange={(o) => o && onLanguageChange(o.value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent insets={selectInsets} className="w-full">
                  <SelectGroup>
                    {LANGUAGES.map((l) => <SelectItem key={l} label={l} value={l}>{l}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </View>
            <View className="gap-1.5">
              <Label>Full name</Label>
              <Input placeholder="Enter your full name" value={name} onChangeText={setName} />
            </View>
            <Separator />
            <View className="gap-2">
              <Label>What are you interested in?</Label>
              <View className="flex-row flex-wrap gap-2">
                {INTERESTS.map((i) => {
                  const active = interests.includes(i.id);
                  return (
                    <Button
                      key={i.id}
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      className="rounded-full"
                      onPress={() => toggleInterest(i.id)}>
                      <Icon as={i.icon} size={14} className={active ? 'text-primary-foreground' : 'text-muted-foreground'} />
                      <Text className={active ? 'text-primary-foreground' : 'text-foreground'}>{i.label}</Text>
                    </Button>
                  );
                })}
              </View>
            </View>
          </CardContent>
        );
      case 'farm':
        return (
          <CardContent className="gap-4">
            <Button variant="outline" onPress={handleGetLocation} disabled={loading}>
              <Icon as={MapPin} size={16} className="text-primary" />
              <Text className="text-primary font-semibold">Use my current location</Text>
            </Button>
            <View className="gap-1.5">
              <Label>Village / Town</Label>
              <Input placeholder="Village / Town" value={village} onChangeText={setVillage} />
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1.5">
                <Label>District</Label>
                <Input placeholder="District" value={district} onChangeText={setDistrict} />
              </View>
              <View className="flex-1 gap-1.5">
                <Label>State</Label>
                <Input placeholder="State" value={state} onChangeText={setState} />
              </View>
            </View>
            <Separator />
            <View className="gap-1.5">
              <Label>Main crops</Label>
              <Input placeholder="e.g. Rice, Tomato" value={mainCrops} onChangeText={setMainCrops} />
            </View>
            <View className="gap-1.5">
              <Label>Current farming stage</Label>
              <Select value={{ value: flowStage, label: flowStage }} onValueChange={(o) => o && setFlowStage(o.value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent insets={selectInsets} className="w-full">
                  <SelectGroup>
                    {FLOW_STAGES.map((s) => <SelectItem key={s} label={s} value={s}>{s}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </View>
          </CardContent>
        );
      case 'finish':
        return (
          <CardContent className="gap-4">
            <View className="gap-2">
              <Label>Soil parameters (optional)</Label>
              <View className="flex-row gap-3">
                <View className="flex-1 gap-1.5">
                  <Text className="text-xs text-muted-foreground">Nitrogen</Text>
                  <Input placeholder="80" value={nitrogen} onChangeText={setNitrogen} keyboardType="numeric" />
                </View>
                <View className="flex-1 gap-1.5">
                  <Text className="text-xs text-muted-foreground">Phosphorus</Text>
                  <Input placeholder="40" value={phosphorus} onChangeText={setPhosphorus} keyboardType="numeric" />
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1 gap-1.5">
                  <Text className="text-xs text-muted-foreground">Potassium</Text>
                  <Input placeholder="40" value={potassium} onChangeText={setPotassium} keyboardType="numeric" />
                </View>
                <View className="flex-1 gap-1.5">
                  <Text className="text-xs text-muted-foreground">Soil pH</Text>
                  <Input placeholder="6.5" value={ph} onChangeText={setPh} keyboardType="numeric" />
                </View>
              </View>
            </View>
            <Separator />
            <View className="gap-3">
              <Label>Permissions (optional)</Label>
              {([
                { key: 'camera', icon: Camera, label: 'Camera', desc: 'Crop disease scanning' },
                { key: 'mic', icon: Mic, label: 'Microphone', desc: 'Voice assistant' },
                { key: 'location', icon: MapPin, label: 'Location', desc: 'Local weather & alerts' },
              ] as { key: PermKey; icon: any; label: string; desc: string }[]).map((p) => (
                <View key={p.key} className="flex-row items-center gap-3">
                  <Icon as={p.icon} size={18} className="text-muted-foreground" />
                  <View className="flex-1">
                    <Text className="font-medium">{p.label}</Text>
                    <Text className="text-xs text-muted-foreground">{p.desc}</Text>
                  </View>
                  <Switch checked={permissions[p.key]} onCheckedChange={(v) => setPermission(p.key, v)} />
                </View>
              ))}
            </View>
          </CardContent>
        );
      default:
        return null;
    }
  };

  if (step === 'success') {
    return (
      <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 24, paddingTop: 80 }}>
        <ResponsiveContainer>
          <Card className="items-center rounded-2xl border-border/70 p-8 gap-0">
            <Icon as={CheckCircle2} size={56} className="text-primary" />
            <Text variant="h3" className="mt-4 border-b-0 text-center">You're all set!</Text>
            <Text variant="muted" className="mt-1 text-center">Loading your dashboard...</Text>
          </Card>
        </ResponsiveContainer>
      </KeyboardResponsiveView>
    );
  }

  const meta = STEP_META[step];
  return (
    <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 24, paddingTop: 56, paddingBottom: 48 }}>
      <ResponsiveContainer>
        <View className="mb-4 gap-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Step {stepIndex + 1} of {STEPS.length}
              </Text>
            </View>
            <Text className="text-xs text-muted-foreground">{Math.round(((stepIndex + 1) / STEPS.length) * 100)}%</Text>
          </View>
          <Progress value={((stepIndex + 1) / STEPS.length) * 100} />
        </View>

        <Card className="rounded-2xl border-border/70">
          <CardHeader>
            <CardTitle>{meta.title}</CardTitle>
            <CardDescription>{meta.description}</CardDescription>
          </CardHeader>
          {renderBody()}
          <CardFooter className="justify-between gap-3">
            {stepIndex > 0 ? (
              <Button variant="ghost" onPress={goBack} disabled={loading}>
                <Text>Back</Text>
              </Button>
            ) : <View />}
            <Button onPress={goNext} disabled={loading}>
              <Text className="font-semibold">{step === 'finish' ? 'Get Started' : 'Continue'}</Text>
            </Button>
          </CardFooter>
        </Card>
      </ResponsiveContainer>
    </KeyboardResponsiveView>
  );
}
