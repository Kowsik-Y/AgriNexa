import React, { useState } from 'react';
import { StyleSheet, View, Dimensions, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Languages, MapPin, Sprout, ChevronRight, CheckCircle2,
  Camera, Mic, User, Globe, Tractor, CircleDot
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { useTheme } from '@/hooks/use-theme';
import { useApi } from '@/hooks/use-api';
import { useToast } from '@/components/ui/Toast';
import { getOrCreateSessionId, setOnboardedFlag, setUserProfile } from '@/lib/auth-storage';

const { width } = Dimensions.get('window');

type Step = 'language' | 'profile' | 'permissions' | 'farm' | 'agri_flow' | 'success';

const INTERESTS = [
  { id: 'crops', label: 'Crop Advice', icon: Sprout },
  { id: 'weather', label: 'Weather', icon: Globe },
  { id: 'pests', label: 'Pest Detection', icon: Sprout },
  { id: 'prices', label: 'Market Prices', icon: Tractor },
];

const FLOW_STAGES = ['Land Preparation', 'Sowing', 'Vegetative', 'Flowering', 'Harvesting', 'Marketing'];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState<Step>('language');
  const [loading, setLoading] = useState(false);

  const [appLang, setAppLang] = useState('English');
  const [name, setName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [mainCrops, setMainCrops] = useState('');
  const [permissions, setPermissions] = useState({ camera: false, mic: false, location: false });
  const [flowStage, setFlowStage] = useState('Land Preparation');
  const [nitrogen, setNitrogen] = useState('80');
  const [phosphorus, setPhosphorus] = useState('40');
  const [potassium, setPotassium] = useState('40');
  const [ph, setPh] = useState('6.5');

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const requestPermissions = async () => {
    try {
      const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: micStatus } = await Audio.requestPermissionsAsync();
      setPermissions({ camera: camStatus === 'granted', mic: micStatus === 'granted', location: true });
      setStep('farm');
    } catch { setStep('farm'); }
  };

  const handleGetLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { toast({ title: 'Permission Denied', description: 'Location access required.', type: 'warning' }); return; }
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

  const { saveProfileRemote } = useApi();

  const finishOnboarding = async () => {
    if (!flowStage) { toast({ title: 'Required', description: 'Select farming stage.', type: 'warning' }); return; }
    setLoading(true);
    try {
      const userId = await getOrCreateSessionId();
      const profile = {
        user_id: userId, name, appLang, village, district, state, crops: mainCrops,
        interests: selectedInterests, flow_stage: flowStage,
        nitrogen: parseFloat(nitrogen) || 80, phosphorus: parseFloat(phosphorus) || 40,
        potassium: parseFloat(potassium) || 40, ph: parseFloat(ph) || 6.5, onboarded: true,
      };
      await saveProfileRemote(profile);
      await setUserProfile(profile);
      await setOnboardedFlag(true);
      setStep('success');
      setTimeout(() => router.replace('/(tabs)'), 1500);
    } catch { toast({ title: 'Error', description: 'Could not save profile.', type: 'destructive' }); }
    finally { setLoading(false); }
  };

  const steps: Step[] = ['language', 'profile', 'permissions', 'farm', 'agri_flow'];
  const currentStepIndex = steps.indexOf(step);

  const renderStep = () => {
    switch (step) {
      case 'language':
        return (
          <View style={styles.stepContent}>
            <Typography.H2 style={[styles.stepTitle, { borderBottomWidth: 0 }]}>Choose language</Typography.H2>
            <Typography.Small style={{ color: colors.mutedForeground, marginTop: 4 }}>Select your preferred language.</Typography.Small>
            <View style={styles.optionStack}>
              {['English', 'Tamil'].map((lang) => (
                <Pressable
                  key={lang}
                  onPress={() => setAppLang(lang)}
                  style={[styles.optionRow, { borderColor: appLang === lang ? colors.tint : colors.border }]}
                >
                  <Typography.P style={{ fontWeight: '600' }}>{lang}</Typography.P>
                  {appLang === lang && <CheckCircle2 size={18} color={colors.tint} />}
                </Pressable>
              ))}
            </View>
          </View>
        );
      case 'profile':
        return (
          <View style={styles.stepContent}>
            <Typography.H2 style={[styles.stepTitle, { borderBottomWidth: 0 }]}>About you</Typography.H2>
            <Typography.Small style={{ color: colors.mutedForeground, marginTop: 4, marginBottom: 16 }}>Your name and interests.</Typography.Small>
            <Input placeholder="Your Full Name" value={name} onChangeText={setName} leftIcon={<User size={16} color={colors.mutedForeground} />} />
            <Typography.Small style={[styles.label, { color: colors.mutedForeground, marginTop: 20 }]}>INTERESTS</Typography.Small>
            <View style={styles.interestGrid}>
              {INTERESTS.map((int) => (
                <Pressable
                  key={int.id}
                  onPress={() => toggleInterest(int.id)}
                  style={[styles.interestItem, { borderColor: selectedInterests.includes(int.id) ? colors.tint : colors.border }]}
                >
                  <int.icon size={20} color={selectedInterests.includes(int.id) ? colors.tint : colors.mutedForeground} />
                  <Typography.Small style={{ textAlign: 'center' }}>{int.label}</Typography.Small>
                </Pressable>
              ))}
            </View>
          </View>
        );
      case 'permissions':
        return (
          <View style={styles.stepContent}>
            <Typography.H2 style={[styles.stepTitle, { borderBottomWidth: 0 }]}>Permissions</Typography.H2>
            <Typography.Small style={{ color: colors.mutedForeground, marginTop: 4, marginBottom: 20 }}>Required for full functionality.</Typography.Small>
            {[
              { icon: Camera, label: 'Camera', desc: 'Crop disease scanning', granted: permissions.camera },
              { icon: Mic, label: 'Microphone', desc: 'Voice assistant', granted: permissions.mic },
              { icon: MapPin, label: 'Location', desc: 'Local weather & alerts', granted: permissions.location },
            ].map((p) => (
              <View key={p.label} style={[styles.permRow, { borderColor: p.granted ? colors.tint : colors.border }]}>
                <p.icon size={18} color={p.granted ? colors.tint : colors.mutedForeground} />
                <View style={{ flex: 1 }}>
                  <Typography.P style={{ fontWeight: '600' }}>{p.label}</Typography.P>
                  <Typography.Small style={{ color: colors.mutedForeground }}>{p.desc}</Typography.Small>
                </View>
                {p.granted && <CheckCircle2 size={16} color={colors.tint} />}
              </View>
            ))}
            <Button onPress={requestPermissions} style={styles.primaryBtn}>Enable Access</Button>
          </View>
        );
      case 'farm':
        return (
          <View style={styles.stepContent}>
            <Typography.H2 style={[styles.stepTitle, { borderBottomWidth: 0 }]}>Farm Location</Typography.H2>
            <Typography.Small style={{ color: colors.mutedForeground, marginTop: 4, marginBottom: 16 }}>Your location and crops.</Typography.Small>
            <Button variant="outline" onPress={handleGetLocation} disabled={loading} style={{ marginBottom: 14, height: 44, borderRadius: 10, gap: 8 }}>
              <MapPin size={16} color={colors.tint} />
              <Typography.P style={{ color: colors.tint, fontWeight: '600' }}>Get Current Location</Typography.P>
            </Button>
            <View style={styles.formStack}>
              <Input placeholder="Village / Town" value={village} onChangeText={setVillage} leftIcon={<CircleDot size={16} color={colors.mutedForeground} />} />
              <Input placeholder="District" value={district} onChangeText={setDistrict} leftIcon={<MapPin size={16} color={colors.mutedForeground} />} />
              <Input placeholder="State" value={state} onChangeText={setState} leftIcon={<Globe size={16} color={colors.mutedForeground} />} />
              <Input placeholder="Main Crops (e.g. Rice, Tomato)" value={mainCrops} onChangeText={setMainCrops} leftIcon={<Sprout size={16} color={colors.mutedForeground} />} />
            </View>
          </View>
        );
      case 'agri_flow':
        return (
          <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Typography.H2 style={[styles.stepTitle, { borderBottomWidth: 0 }]}>Farming Stage</Typography.H2>
            <Typography.Small style={{ color: colors.mutedForeground, marginTop: 4, marginBottom: 16 }}>Where are you in your farming journey?</Typography.Small>
            <View style={styles.optionStack}>
              {FLOW_STAGES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setFlowStage(s)}
                  style={[styles.optionRow, { borderColor: flowStage === s ? colors.tint : colors.border }]}
                >
                  <Typography.P style={{ fontWeight: '500' }}>{s}</Typography.P>
                  {flowStage === s && <CheckCircle2 size={18} color={colors.tint} />}
                </Pressable>
              ))}
            </View>
            <Typography.Small style={[styles.label, { color: colors.mutedForeground, marginTop: 24 }]}>SOIL PARAMETERS (OPTIONAL)</Typography.Small>
            <View style={styles.formStack}>
              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}><Input placeholder="Nitrogen" value={nitrogen} onChangeText={setNitrogen} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Input placeholder="Phosphorus" value={phosphorus} onChangeText={setPhosphorus} keyboardType="numeric" /></View>
              </View>
              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}><Input placeholder="Potassium" value={potassium} onChangeText={setPotassium} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Input placeholder="Soil pH" value={ph} onChangeText={setPh} keyboardType="numeric" /></View>
              </View>
            </View>
          </ScrollView>
        );
      case 'success':
        return (
          <View style={styles.successContent}>
            <CheckCircle2 size={56} color={colors.tint} />
            <Typography.H2 style={{ textAlign: 'center', marginTop: 16, borderBottomWidth: 0 }}>You're all set!</Typography.H2>
            <Typography.P style={{ color: colors.mutedForeground, marginTop: 4, textAlign: 'center' }}>Loading your dashboard...</Typography.P>
          </View>
        );
    }
  };

  return (
    <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scrollContent}>
      <ResponsiveContainer>
        {renderStep()}
        {step !== 'success' && (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <View style={styles.dots}>
              {steps.map((s) => (
                <View key={s} style={[styles.dot, { backgroundColor: step === s ? colors.tint : colors.border, width: step === s ? 20 : 6 }]} />
              ))}
            </View>
            <View style={styles.navRow}>
              {currentStepIndex > 0 && (
                <Button variant="ghost" onPress={() => setStep(steps[currentStepIndex - 1])}>Back</Button>
              )}
              <View style={{ flex: 1 }} />
              <Button
                onPress={() => {
                  if (step === 'language') setStep('profile');
                  else if (step === 'profile') {
                    if (!name) { toast({ title: 'Required', description: 'Enter your name.', type: 'warning' }); return; }
                    setStep('permissions');
                  }
                  else if (step === 'permissions') setStep('farm');
                  else if (step === 'farm') setStep('agri_flow');
                  else if (step === 'agri_flow') finishOnboarding();
                }}
                disabled={loading}
                loading={loading}
                style={styles.nextBtn}
              >
                {step === 'agri_flow' ? 'Get Started' : 'Next'}
              </Button>
            </View>
          </View>
        )}
      </ResponsiveContainer>
    </KeyboardResponsiveView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 24, paddingTop: 56, paddingBottom: 140 },
  stepContent: { alignItems: 'center' },
  stepTitle: { fontWeight: '800', fontSize: 24, textAlign: 'center', letterSpacing: -0.5 },
  label: { fontWeight: '700', fontSize: 11, letterSpacing: 1, alignSelf: 'flex-start' },
  optionStack: { width: '100%', marginTop: 20, gap: 10 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, padding: 14, width: '100%' },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10, justifyContent: 'center' },
  interestItem: { width: (width - 70) / 2, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 6 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14, width: '100%', marginBottom: 10 },
  primaryBtn: { width: '100%', borderRadius: 12, height: 48, marginTop: 8 },
  formStack: { width: '100%', gap: 14 },
  inputRow: { flexDirection: 'row', width: '100%', gap: 10 },
  successContent: { alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: 120 },
  footer: { marginTop: 32, width: '100%', paddingVertical: 20, borderTopWidth: 1 },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 20 },
  dot: { height: 6, borderRadius: 3 },
  navRow: { flexDirection: 'row', alignItems: 'center' },
  nextBtn: { borderRadius: 12, height: 44, paddingHorizontal: 24 },
});
