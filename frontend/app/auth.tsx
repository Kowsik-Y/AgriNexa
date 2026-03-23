import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, TextInput, ScrollView, Image, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Phone, Chrome, ChevronRight, AlertCircle, ShieldCheck } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useApi } from '../hooks/use-api';
import { useThemeColors } from '../hooks/use-theme-colors';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { getProfileRemote, loginWithGoogle, register, login: loginApi } = useApi();
  const [method, setMethod] = useState<'email' | 'phone' | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [value, setValue] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  // Google Auth Hook using Environment Variables
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "YOUR_ANDROID_ID",
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "YOUR_IOS_ID",
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "YOUR_WEB_ID",
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      fetchUserInfo(authentication?.accessToken);
    }
  }, [response]);

  const fetchUserInfo = async (token?: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const info = await res.json();
      await handleSocialLogin('google', info.id, info.email, info.name);
    } catch (e) {
      console.error('Google Fetch Error:', e);
      Alert.alert('Login Error', 'Could not retrieve user info from Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string, googleId: string, email?: string, name?: string) => {
    setLoading(true);
    try {
      // Exchange Google ID for AgriNexa JWT
      const authResponse = await loginWithGoogle({ user_id: googleId, email, name });
      
      if (authResponse && authResponse.access_token) {
        const session = {
          id: googleId,
          method: provider,
          token: authResponse.access_token,
        };
        await AsyncStorage.setItem('user_session', JSON.stringify(session));

        console.log('Login successful for:', googleId);

        // Sync profile from MongoDB
        const remoteProfile = await getProfileRemote(googleId);
        if (remoteProfile && remoteProfile.onboarded) {
          await AsyncStorage.setItem('user_profile', JSON.stringify(remoteProfile));
          await AsyncStorage.setItem('onboarded', 'true');
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding');
        }
      } else {
        Alert.alert('Authentication failed', 'Could not verify social login.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Login error', 'A connection error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthAction = async () => {
    if (!value || !password) {
      Alert.alert('Missing Info', 'Please fill in all fields.');
      return;
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        Alert.alert('Mismatch', 'Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Weak Password', 'Password must be at least 6 characters.');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        email: method === 'email' ? value : undefined,
        phone: method === 'phone' ? value : undefined,
        password: password,
        name: isSignUp ? displayName : undefined
      };

      const res = isSignUp ? await register(payload) : await loginApi(payload);

      if (res && res.access_token) {
        const session = {
          id: res.user_id,
          method: method || 'custom',
          token: res.access_token,
        };
        await AsyncStorage.setItem('user_session', JSON.stringify(session));
        
        const remoteProfile = await getProfileRemote(res.user_id);
        if (remoteProfile && remoteProfile.onboarded) {
          await AsyncStorage.setItem('user_profile', JSON.stringify(remoteProfile));
          await AsyncStorage.setItem('onboarded', 'true');
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding');
        }
      } else {
        Alert.alert(isSignUp ? 'Registration Failed' : 'Login Failed', 'Please check your credentials.');
      }
    } catch (error) {
      console.error('Auth action error:', error);
      Alert.alert('Error', 'An unexpected error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.logoBox, { backgroundColor: colors.tint + '15' }]}>
          <ShieldCheck size={48} color={colors.tint} />
        </View>
        <ThemedText type="title" style={styles.title}>{isSignUp ? 'Create account' : 'Welcome back'}</ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
          {isSignUp ? 'Join AgriNexa to start your journey.' : 'Sign in to access your smart farm assistant.'}
        </ThemedText>
      </View>

      <View style={styles.optionsBox}>
        {!method && (
          <>
            <TouchableOpacity 
              style={[styles.socialBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => promptAsync()}
              disabled={loading || !request}
            >
              {loading ? (
                <ActivityIndicator color={colors.tint} />
              ) : (
                <>
                  <Chrome size={24} color="#4285F4" />
                  <ThemedText style={styles.socialText}>Continue with Google</ThemedText>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerBox}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <ThemedText style={[styles.orText, { color: colors.icon }]}>or</ThemedText>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>
          </>
        )}

        {!method ? (
          <View style={styles.buttonStack}>
            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: colors.tint }]}
              onPress={() => setMethod('email')}
              disabled={loading}
            >
              <Mail size={20} color="#fff" />
              <ThemedText style={styles.btnText}>Continue with Email</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => setMethod('phone')}
              disabled={loading}
            >
              <Phone size={20} color={colors.text} />
              <ThemedText style={[styles.btnText, { color: colors.text }]}>Continue with Phone</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputStack}>
            {isSignUp && (
              <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ThemedText style={{ marginRight: 8 }}>Name</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.icon}
                  value={displayName}
                  onChangeText={setDisplayName}
                  editable={!loading}
                />
              </View>
            )}

            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {method === 'email' ? <Mail size={20} color={colors.icon} /> : <Phone size={20} color={colors.icon} />}
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={method === 'email' ? 'Enter email address' : 'Enter phone number'}
                placeholderTextColor={colors.icon}
                value={value}
                onChangeText={setValue}
                keyboardType={method === 'email' ? 'email-address' : 'phone-pad'}
                editable={!loading}
              />
            </View>

            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ThemedText style={{ marginRight: 8 }}>Pass</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter password"
                secureTextEntry
                placeholderTextColor={colors.icon}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
            </View>

            {isSignUp && (
              <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ThemedText style={{ marginRight: 8 }}>Confirm</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Confirm password"
                  secureTextEntry
                  placeholderTextColor={colors.icon}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!loading}
                />
              </View>
            )}

            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: colors.tint }]}
              onPress={handleAuthAction}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <ThemedText style={styles.btnText}>{isSignUp ? 'Create Account' : 'Continue'}</ThemedText>
                  <ChevronRight size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            <View style={{ gap: 12 }}>
              <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} disabled={loading}>
                <ThemedText style={[styles.backText, { color: colors.tint }]}>
                  {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => { setMethod(null); setIsSignUp(false); }} disabled={loading}>
                <ThemedText style={[styles.backText, { color: colors.icon, fontSize: 13 }]}>Change login method</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <ThemedText style={[styles.footerText, { color: colors.icon }]}>
          By continuing, you agree to our Terms and Privacy Policy.
        </ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 32, paddingTop: 100, minHeight: '100%', justifyContent: 'space-between' },
  header: { alignItems: 'center' },
  logoBox: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', marginTop: 8, fontWeight: '500' },
  optionsBox: { marginVertical: 48, gap: 16 },
  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 20, borderWidth: 1, gap: 12, elevation: 1 },
  socialText: { fontSize: 16, fontWeight: '700' },
  dividerBox: { flexDirection: 'row', alignItems: 'center', marginVertical: 8, gap: 12 },
  line: { flex: 1, height: 1 },
  orText: { fontSize: 14, fontWeight: '600' },
  buttonStack: { gap: 16 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 20, gap: 12, elevation: 2 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  inputStack: { gap: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1, gap: 12 },
  input: { flex: 1, fontSize: 16, height: 40 },
  backText: { textAlign: 'center', fontWeight: '700', marginTop: 8 },
  footer: { alignItems: 'center', paddingBottom: 20 },
  footerText: { fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 },
});
