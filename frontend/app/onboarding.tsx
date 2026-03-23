import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Dimensions, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Languages, ShieldCheck, MapPin, Sprout, ChevronRight, CheckCircle2, 
  Bell, Camera, Mic, User, Heart, Globe, Tractor, CloudSun, 
  CircleDot, LayoutGrid
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { useTheme } from '@/hooks/use-theme';
import { useApi } from '@/hooks/use-api';
import { useToast } from '@/components/ui/Toast';

const { width } = Dimensions.get('window');

type Step = 'language' | 'profile' | 'permissions' | 'farm' | 'success';

const INTERESTS = [
  { id: 'crops', label: 'Crop Advice', icon: Sprout },
  { id: 'pests', label: 'Pest Detection', icon: ShieldCheck },
  { id: 'prices', label: 'Market Prices', icon: LayoutGrid },
  { id: 'weather', label: 'Weather Forecast', icon: CloudSun },
  { id: 'livestock', label: 'Livestock', icon: Heart },
  { id: 'schemes', label: 'Govt Schemes', icon: Globe },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState<Step>('language');
  const [loading, setLoading] = useState(false);
  
  // User Data
  const [appLang, setAppLang] = useState('English');
  const [name, setName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [mainCrops, setMainCrops] = useState('');
  const [permissions, setPermissions] = useState({ camera: false, mic: false, location: false });

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const requestPermissions = async () => {
    try {
      const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: micStatus } = await Audio.requestPermissionsAsync();
      // Add more permissions here as needed
      
      setPermissions({
        camera: camStatus === 'granted',
        mic: micStatus === 'granted',
        location: true // Mocked for now
      });
      setStep('farm');
    } catch (e) {
      console.error('Permission error:', e);
      setStep('farm');
    }
  };

  const { saveProfileRemote } = useApi();

  const finishOnboarding = async () => {
    if (!district || !state) {
      toast({ title: 'Missing Info', description: 'Please provide at least your district and state.', type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const sessionStr = await AsyncStorage.getItem('user_session');
      const session = sessionStr ? JSON.parse(sessionStr) : { id: 'user_' + Math.random().toString(36).substr(2, 9) };
      
      const userId = session.id;
      const profile = { 
        user_id: userId, 
        name,
        appLang, 
        village,
        district, 
        state,
        crops: mainCrops, 
        interests: selectedInterests,
        onboarded: true 
      };

      await saveProfileRemote(profile);
      await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
      await AsyncStorage.setItem('onboarded', 'true');
      
      setStep('success');
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 2000);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      toast({ title: 'Error', description: 'Could not save your profile.', type: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'language':
        return (
          <View style={styles.stepContent}>
            <View style={[styles.iconBox, { backgroundColor: colors.tint + '15' }]}>
              <Languages size={40} color={colors.tint} />
            </View>
            <Typography.H2 style={styles.stepTitle}>Choose your language</Typography.H2>
            <Typography.P style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>
              Select your preferred language for the app interface and voice assistant.
            </Typography.P>
            <View style={styles.optionStack}>
              {['English', 'Tamil'].map((lang) => (
                <Button
                  key={lang}
                  variant={appLang === lang ? 'default' : 'outline'}
                  onPress={() => setAppLang(lang)}
                  style={[styles.optionCard, { height: 'auto', paddingVertical: 20 }]}
                >
                  <View style={styles.optionContent}>
                    <Typography.Large style={{ color: appLang === lang ? colors.primaryForeground : colors.foreground }}>{lang}</Typography.Large>
                    {appLang === lang && <CheckCircle2 size={24} color={colors.primaryForeground} />}
                  </View>
                </Button>
              ))}
            </View>
          </View>
        );
      case 'profile':
        return (
          <View style={styles.stepContent}>
            <View style={[styles.iconBox, { backgroundColor: colors.tint + '15' }]}>
              <User size={40} color={colors.tint} />
            </View>
            <Typography.H2 style={styles.stepTitle}>Tell us about you</Typography.H2>
            <Typography.P style={[styles.stepSubtitle, { color: colors.mutedForeground, marginBottom: 20 }]}>
              Enter your name and select your interests.
            </Typography.P>
            <Input
              placeholder="Your Full Name"
              value={name}
              onChangeText={setName}
              leftIcon={<User size={20} color={colors.mutedForeground} />}
            />
            
            <Typography.P style={{ alignSelf: 'flex-start', marginTop: 24, fontWeight: '700', color: colors.foreground }}>
              What are you interested in?
            </Typography.P>
            <View style={styles.interestGrid}>
              {INTERESTS.map((int) => (
                <TouchableOpacity
                  key={int.id}
                  style={[
                    styles.interestItem,
                    { borderColor: selectedInterests.includes(int.id) ? colors.tint : colors.border },
                    selectedInterests.includes(int.id) && { backgroundColor: colors.tint + '10' }
                  ]}
                  onPress={() => toggleInterest(int.id)}
                >
                  <int.icon size={24} color={selectedInterests.includes(int.id) ? colors.tint : colors.mutedForeground} />
                  <Typography.Small style={{ marginTop: 8, textAlign: 'center' }}>{int.label}</Typography.Small>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 'permissions':
        return (
          <View style={styles.stepContent}>
            <View style={[styles.iconBox, { backgroundColor: colors.tint + '15' }]}>
              <ShieldCheck size={40} color={colors.tint} />
            </View>
            <Typography.H2 style={styles.stepTitle}>App Permissions</Typography.H2>
            <Typography.P style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>
              AgriNexa needs access to provide smart disease detection, location alerts, and voice support.
            </Typography.P>
            <View style={styles.permList}>
               <PermItem icon={Camera} label="Camera" desc="For scanning crop diseases" granted={permissions.camera} />
               <PermItem icon={Mic} label="Microphone" desc="For voice assistant support" granted={permissions.mic} />
               <PermItem icon={MapPin} label="Location" desc="Local weather and market alerts" granted={permissions.location} />
            </View>
            <Button
              onPress={requestPermissions}
              style={styles.primaryBtn}
            >
              <Typography.Large style={{ color: colors.primaryForeground }}>Enable Access</Typography.Large>
              <ChevronRight size={20} color={colors.primaryForeground} />
            </Button>
          </View>
        );
      case 'farm':
        return (
          <View style={styles.stepContent}>
            <View style={[styles.iconBox, { backgroundColor: colors.tint + '15' }]}>
              <Sprout size={40} color={colors.tint} />
            </View>
            <Typography.H2 style={styles.stepTitle}>Farm Location</Typography.H2>
            <Typography.P style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>
              Set your precise farm location and primary crops.
            </Typography.P>
            <View style={styles.formStack}>
              <Input
                placeholder="Village / Town"
                value={village}
                onChangeText={setVillage}
                leftIcon={<CircleDot size={20} color={colors.mutedForeground} />}
              />
              <Input
                placeholder="District"
                value={district}
                onChangeText={setDistrict}
                leftIcon={<MapPin size={20} color={colors.mutedForeground} />}
              />
              <Input
                placeholder="State"
                value={state}
                onChangeText={setState}
                leftIcon={<Globe size={20} color={colors.mutedForeground} />}
              />
              <Input
                placeholder="Main Crops (e.g. Rice, Tomato)"
                value={mainCrops}
                onChangeText={setMainCrops}
                leftIcon={<Sprout size={20} color={colors.mutedForeground} />}
              />
            </View>
          </View>
        );
      case 'success':
        return (
          <View style={styles.successContent}>
            <View style={[styles.successIcon, { backgroundColor: colors.success + '15' }]}>
              <CheckCircle2 size={72} color={colors.success} />
            </View>
            <Typography.H1 style={styles.successTitle}>You're all set!</Typography.H1>
            <Typography.P style={[styles.successSubtitle, { color: colors.mutedForeground }]}>
              Preparing your personalized farming dashboard...
            </Typography.P>
          </View>
        );
    }
  };

  const steps: Step[] = ['language', 'profile', 'permissions', 'farm'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <KeyboardResponsiveView 
      style={{ backgroundColor: colors.background }} 
      contentContainerStyle={styles.scrollContent}
    >
      {renderStep()}
      
      {step !== 'success' && (
        <View style={[styles.footer, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <View style={styles.progressRow}>
            {steps.map((s) => (
              <View 
                key={s} 
                style={[
                  styles.dot, 
                  { backgroundColor: step === s ? colors.tint : colors.border, width: step === s ? 24 : 8 }
                ]} 
              />
            ))}
          </View>
          
          <View style={styles.navRow}>
            {currentStepIndex > 0 && (
              <Button
                variant="ghost"
                onPress={() => setStep(steps[currentStepIndex - 1])}
              >
                <Typography.Large style={{ color: colors.mutedForeground }}>Back</Typography.Large>
              </Button>
            )}
            <View style={{ flex: 1 }} />
            <Button
              onPress={() => {
                if (step === 'language') setStep('profile');
                else if (step === 'profile') {
                  if (!name) {
                    toast({ title: 'Name required', description: 'Please enter your name.', type: 'warning' });
                    return;
                  }
                  setStep('permissions');
                }
                else if (step === 'permissions') setStep('farm');
                else if (step === 'farm') finishOnboarding();
              }}
              disabled={loading}
              loading={loading}
              style={styles.nextBtn}
            >
              <Typography.Large style={{ color: colors.primaryForeground }}>
                {step === 'farm' ? 'Get Started' : 'Next'}
              </Typography.Large>
              <ChevronRight size={20} color={colors.primaryForeground} />
            </Button>
          </View>
        </View>
      )}
    </KeyboardResponsiveView>
  );
}

const PermItem = ({ icon: Icon, label, desc, granted }: any) => {
  const { colors } = useTheme();
  return (
    <Card style={{ marginBottom: 12, borderColor: granted ? colors.success : colors.border }}>
      <View style={styles.permCard}>
        <View style={[styles.permIconBox, { backgroundColor: (granted ? colors.success : colors.tint) + '15' }]}>
          <Icon size={24} color={granted ? colors.success : colors.tint} />
        </View>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Typography.Large>{label}</Typography.Large>
          <Typography.Small style={{ color: colors.mutedForeground }}>{desc}</Typography.Small>
        </View>
        {granted && <CheckCircle2 size={24} color={colors.success} />}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 32, paddingTop: 60, paddingBottom: 160 },
  stepContent: { alignItems: 'center' },
  iconBox: { width: 80, height: 80, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  stepTitle: { textAlign: 'center' },
  stepSubtitle: { textAlign: 'center', marginTop: 12, lineHeight: 24, paddingHorizontal: 10 },
  optionStack: { width: '100%', marginTop: 32, gap: 16 },
  optionCard: { borderRadius: 20, borderWidth: 2 },
  optionContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 4 },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16, justifyContent: 'center' },
  interestItem: { width: (width - 88) / 2, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  permList: { width: '100%', marginTop: 32, marginBottom: 32 },
  permCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  permIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { width: '100%', borderRadius: 16, height: 56, gap: 12 },
  formStack: { width: '100%', marginTop: 32, gap: 20 },
  successContent: { alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: 100 },
  successIcon: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  successTitle: { textAlign: 'center' },
  successSubtitle: { marginTop: 12, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, width: width, padding: 24, paddingBottom: 40, borderTopWidth: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 24 },
  dot: { height: 8, borderRadius: 4 },
  navRow: { flexDirection: 'row', alignItems: 'center' },
  nextBtn: { borderRadius: 16, height: 52, paddingHorizontal: 24, gap: 8 },
});

