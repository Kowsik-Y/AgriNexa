import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Phone, Chrome, ChevronRight, AlertCircle, ShieldCheck } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '../hooks/use-api';
import { useTheme } from '@/hooks/use-theme';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const { colors } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const { getProfileRemote, loginWithGoogle, register, login: loginApi } = useApi();
  const [method, setMethod] = useState<'email' | 'phone' | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [value, setValue] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  // Google Auth Hook
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
      toast({ title: 'Login Error', description: 'Could not retrieve user info from Google.', type: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string, googleId: string, email?: string, name?: string) => {
    setLoading(true);
    try {
      const authResponse = await loginWithGoogle({ user_id: googleId, email, name });
      
      if (authResponse && authResponse.access_token) {
        const session = { id: googleId, method: provider, token: authResponse.access_token };
        await AsyncStorage.setItem('user_session', JSON.stringify(session));

        const remoteProfile = await getProfileRemote(googleId);
        if (remoteProfile && remoteProfile.onboarded) {
          await AsyncStorage.setItem('user_profile', JSON.stringify(remoteProfile));
          await AsyncStorage.setItem('onboarded', 'true');
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding');
        }
      } else {
        toast({ title: 'Authentication failed', description: 'Could not verify social login.', type: 'destructive' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Login error', description: 'A connection error occurred.', type: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAuthAction = async () => {
    if (!value || !password) {
      toast({ title: 'Missing Info', description: 'Please fill in all fields.', type: 'warning' });
      return;
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        toast({ title: 'Mismatch', description: 'Passwords do not match.', type: 'warning' });
        return;
      }
      if (password.length < 6) {
        toast({ title: 'Weak Password', description: 'Password must be at least 6 characters.', type: 'warning' });
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
        const session = { id: res.user_id, method: method || 'custom', token: res.access_token };
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
        toast({ title: isSignUp ? 'Registration Failed' : 'Login Failed', description: 'Please check your credentials.', type: 'destructive' });
      }
    } catch (error) {
      console.error('Auth action error:', error);
      toast({ title: 'Error', description: 'An unexpected error occurred.', type: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.logoBox, { backgroundColor: colors.tint + '15' }]}>
          <ShieldCheck size={48} color={colors.tint} />
        </View>
        <Typography.H1 style={styles.title}>{isSignUp ? 'Create account' : 'Welcome back'}</Typography.H1>
        <Typography.P style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {isSignUp ? 'Join AgriNexa to start your journey.' : 'Sign in to access your smart farm assistant.'}
        </Typography.P>
      </View>

      <View style={styles.optionsBox}>
        {!method && (
          <>
            <Button
              variant="outline"
              onPress={() => promptAsync()}
              disabled={loading || !request}
              style={styles.socialBtn}
            >
              <Chrome size={24} color="#4285F4" />
              <Typography.Large style={styles.socialText}>Continue with Google</Typography.Large>
            </Button>

            <View style={styles.dividerBox}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <Typography.Muted style={styles.orText}>or</Typography.Muted>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>
          </>
        )}

        {!method ? (
          <View style={styles.buttonStack}>
            <Button
              onPress={() => setMethod('email')}
              disabled={loading}
              style={styles.btn}
            >
              <Mail size={20} color={colors.primaryForeground} />
              <Typography.Large style={{ color: colors.primaryForeground }}>Continue with Email</Typography.Large>
            </Button>

            <Button
              variant="outline"
              onPress={() => setMethod('phone')}
              disabled={loading}
              style={styles.btn}
            >
              <Phone size={20} color={colors.foreground} />
              <Typography.Large>Continue with Phone</Typography.Large>
            </Button>
          </View>
        ) : (
          <View style={styles.inputStack}>
            {isSignUp && (
              <Input
                placeholder="Enter your name"
                value={displayName}
                onChangeText={setDisplayName}
                editable={!loading}
                leftIcon={<Typography.Small>Name</Typography.Small>}
              />
            )}

            <Input
              placeholder={method === 'email' ? 'Enter email address' : 'Enter phone number'}
              value={value}
              onChangeText={setValue}
              keyboardType={method === 'email' ? 'email-address' : 'phone-pad'}
              editable={!loading}
              leftIcon={method === 'email' ? <Mail size={20} color={colors.mutedForeground} /> : <Phone size={20} color={colors.mutedForeground} />}
            />

            <Input
              placeholder="Enter password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              leftIcon={<Typography.Small>Pass</Typography.Small>}
            />

            {isSignUp && (
              <Input
                placeholder="Confirm password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
                leftIcon={<Typography.Small>Confirm</Typography.Small>}
              />
            )}

            <Button
              onPress={handleAuthAction}
              disabled={loading}
              loading={loading}
              style={styles.btn}
            >
              <Typography.Large style={{ color: colors.primaryForeground }}>{isSignUp ? 'Create Account' : 'Continue'}</Typography.Large>
              <ChevronRight size={20} color={colors.primaryForeground} />
            </Button>

            <View style={{ gap: 12 }}>
              <Button
                variant="link"
                onPress={() => setIsSignUp(!isSignUp)}
                disabled={loading}
              >
                {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
              </Button>
              
              <Button
                variant="ghost"
                onPress={() => { setMethod(null); setIsSignUp(false); }}
                disabled={loading}
              >
                <Typography.Small style={{ color: colors.mutedForeground }}>Change login method</Typography.Small>
              </Button>
            </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Typography.Small style={[styles.footerText, { color: colors.mutedForeground }]}>
          By continuing, you agree to our Terms and Privacy Policy.
        </Typography.Small>
      </View>
    </KeyboardResponsiveView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 32, paddingTop: 60, minHeight: '100%', justifyContent: 'space-between' },
  header: { alignItems: 'center' },
  logoBox: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: 8 },
  optionsBox: { marginVertical: 40, gap: 16 },
  socialBtn: { paddingVertical: 12, borderRadius: 16, height: 56 },
  socialText: { fontWeight: '700' },
  dividerBox: { flexDirection: 'row', alignItems: 'center', marginVertical: 8, gap: 12 },
  line: { flex: 1, height: 1 },
  orText: { fontWeight: '600' },
  buttonStack: { gap: 16 },
  btn: { borderRadius: 16, height: 56, gap: 12 },
  inputStack: { gap: 16 },
  footer: { alignItems: 'center', paddingBottom: 20 },
  footerText: { textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 },
});
