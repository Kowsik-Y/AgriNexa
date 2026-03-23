import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, TextInput, Dimensions, Switch, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Languages, ShieldCheck, MapPin, Sprout, ChevronRight, ChevronLeft, Camera, Mic, CheckCircle2, Bell } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useApi } from '@/hooks/use-api';

const { width } = Dimensions.get('window');

type Step = 'language' | 'permissions' | 'farm' | 'success';

export default function OnboardingScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [step, setStep] = useState<Step>('language');
  const [loading, setLoading] = useState(false);
  
  // State for onboarding data
  const [appLang, setAppLang] = useState('English');
  const [district, setDistrict] = useState('');
  const [mainCrops, setMainCrops] = useState('');
  const [permissions, setPermissions] = useState({ camera: false, mic: false, notifications: false });

  const requestPermissions = async () => {
    const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: micStatus } = await Audio.requestPermissionsAsync();
    const { status: notifStatus } = await Notifications.requestPermissionsAsync();
    
    setPermissions({
      camera: camStatus === 'granted',
      mic: micStatus === 'granted',
      notifications: notifStatus === 'granted'
    });
    setStep('farm');
  };

  const { saveProfileRemote } = useApi();

  const finishOnboarding = async () => {
    setLoading(true);
    try {
      const sessionStr = await AsyncStorage.getItem('user_session');
      const session = sessionStr ? JSON.parse(sessionStr) : { id: 'user_' + Math.random().toString(36).substr(2, 9) };
      
      const userId = session.id;
      const profile = {
        user_id: userId,
        appLang,
        district,
        crops: mainCrops,
        onboarded: true,
      };

      // Sync to Remote MongoDB
      await saveProfileRemote(profile);
      
      // Update local profile
      await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
      await AsyncStorage.setItem('onboarded', 'true');
      
      setStep('success');
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 2000);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
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
            <ThemedText type="subtitle" style={styles.stepTitle}>Choose your language</ThemedText>
            <ThemedText style={[styles.stepSubtitle, { color: colors.icon }]}>
              Select your preferred language for the app interface and voice assistant.
            </ThemedText>
            <View style={styles.optionStack}>
              {['English', 'Tamil'].map((lang) => (
                <TouchableOpacity 
                  key={lang}
                  style={[
                    styles.optionCard, 
                    { backgroundColor: colors.card, borderColor: appLang === lang ? colors.tint : colors.border }
                  ]}
                  onPress={() => setAppLang(lang)}
                >
                  <ThemedText style={[styles.optionLabel, { color: colors.text }]}>{lang}</ThemedText>
                  {appLang === lang && <CheckCircle2 size={24} color={colors.tint} />}
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
            <ThemedText type="subtitle" style={styles.stepTitle}>App Permissions</ThemedText>
            <ThemedText style={[styles.stepSubtitle, { color: colors.icon }]}>
              AgriNexa needs access to your camera and microphone to provide smart disease detection and voice support.
            </ThemedText>
            <View style={styles.permList}>
               <PermItem icon={Camera} label="Camera" desc="For scanning crop diseases" granted={permissions.camera} />
               <PermItem icon={Mic} label="Microphone" desc="For voice assistant support" granted={permissions.mic} />
               <PermItem icon={Bell} label="Notifications" desc="Alerts and farming tips" granted={permissions.notifications} />
            </View>
            <TouchableOpacity 
              style={[styles.primaryBtn, { backgroundColor: colors.tint }]}
              onPress={requestPermissions}
            >
              <ThemedText style={styles.primaryBtnText}>Enable Access</ThemedText>
              <ChevronRight size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        );
      case 'farm':
        return (
          <View style={styles.stepContent}>
            <View style={[styles.iconBox, { backgroundColor: colors.tint + '15' }]}>
              <Sprout size={40} color={colors.tint} />
            </View>
            <ThemedText type="subtitle" style={styles.stepTitle}>Farm Details</ThemedText>
            <ThemedText style={[styles.stepSubtitle, { color: colors.icon }]}>
              Tell us a bit about your farm to get personalized alerts and advice.
            </ThemedText>
            <View style={styles.formStack}>
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: colors.text }]}>Location (District)</ThemedText>
                <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <MapPin size={20} color={colors.icon} />
                  <TextInput 
                    style={[styles.input, { color: colors.text }]} 
                    placeholder="e.g. Thanjavur" 
                    placeholderTextColor={colors.icon}
                    value={district}
                    onChangeText={setDistrict}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: colors.text }]}>Main Crops</ThemedText>
                <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Sprout size={20} color={colors.icon} />
                  <TextInput 
                    style={[styles.input, { color: colors.text }]} 
                    placeholder="e.g. Rice, Tomato" 
                    placeholderTextColor={colors.icon}
                    value={mainCrops}
                    onChangeText={setMainCrops}
                  />
                </View>
              </View>
            </View>
          </View>
        );
      case 'success':
        return (
          <View style={styles.successContent}>
            <View style={[styles.successIcon, { backgroundColor: colors.success + '15' }]}>
              <CheckCircle2 size={72} color={colors.success} />
            </View>
            <ThemedText type="title" style={styles.successTitle}>You're all set!</ThemedText>
            <ThemedText style={[styles.successSubtitle, { color: colors.icon }]}>
              Preparing your personalized farming dashboard...
            </ThemedText>
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderStep()}
      </ScrollView>
      
      {step !== 'success' && (
        <View style={[styles.footer, { borderColor: colors.border }]}>
          <View style={styles.progressRow}>
            {(['language', 'permissions', 'farm'] as Step[]).map((s, i) => (
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
            {step !== 'language' && (
              <TouchableOpacity onPress={() => setStep(step === 'permissions' ? 'language' : 'permissions')}>
                <ThemedText style={{ color: colors.icon, fontWeight: '700' }}>Back</ThemedText>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity 
              style={[styles.nextBtn, { backgroundColor: colors.tint }]}
              onPress={() => {
                if (step === 'language') setStep('permissions');
                else if (step === 'farm') finishOnboarding();
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <ThemedText style={styles.nextBtnText}>
                    {step === 'farm' ? 'Get Started' : 'Next'}
                  </ThemedText>
                  <ChevronRight size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const PermItem = ({ icon: Icon, label, desc, granted }: any) => {
  const colors = useThemeColors();
  return (
    <View style={[styles.permCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.permIconBox, { backgroundColor: (granted ? colors.success : colors.tint) + '15' }]}>
        <Icon size={24} color={granted ? colors.success : colors.tint} />
      </View>
      <View style={{ flex: 1, marginLeft: 16 }}>
        <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{label}</ThemedText>
        <ThemedText style={{ fontSize: 13, color: colors.icon }}>{desc}</ThemedText>
      </View>
      {granted && <CheckCircle2 size={24} color={colors.success} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 32, paddingTop: 80, paddingBottom: 120 },
  stepContent: { alignItems: 'center' },
  iconBox: { width: 80, height: 80, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  stepTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  stepSubtitle: { fontSize: 16, textAlign: 'center', marginTop: 12, lineHeight: 24, fontWeight: '500' },
  optionStack: { width: '100%', marginTop: 40, gap: 16 },
  optionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 20, borderWidth: 2 },
  optionLabel: { fontSize: 18, fontWeight: '700' },
  permList: { width: '100%', marginTop: 32, gap: 16, marginBottom: 32 },
  permCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1 },
  permIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 20, gap: 12, elevation: 4 },
  primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  formStack: { width: '100%', marginTop: 32, gap: 24 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: '700', marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1, gap: 12 },
  input: { flex: 1, fontSize: 16, height: 40 },
  successContent: { alignItems: 'center', justifyContent: 'center', marginTop: 150 },
  successIcon: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  successTitle: { fontSize: 32, fontWeight: '800' },
  successSubtitle: { fontSize: 18, marginTop: 12, textAlign: 'center', fontWeight: '500' },
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 24, paddingBottom: 48, borderTopWidth: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 24 },
  dot: { height: 8, borderRadius: 4 },
  navRow: { flexDirection: 'row', alignItems: 'center' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, gap: 8, elevation: 2 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
