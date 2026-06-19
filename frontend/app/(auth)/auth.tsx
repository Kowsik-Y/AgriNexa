import React, { useState, useEffect } from 'react';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Mail,
  Phone,
  ChevronRight,
  Lock,
  Eye,
  EyeOff,
  User,
  Sprout,
  ArrowLeft,
} from 'lucide-react-native';
import { AntDesign } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { setOnboardedFlag, setSession, setUserProfile } from '@/lib/auth-storage';

WebBrowser.maybeCompleteAuthSession();

type AuthMode = 'signin' | 'signup';

export default function AuthScreen() {
  const { colors, isDark } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const { getProfileRemote, loginWithGoogle, register, login: loginApi } = useApi();

  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [method, setMethod] = useState<'email' | 'phone' | null>(null);
  const [value, setValue] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSignUp = authMode === 'signup';

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    redirectUri: makeRedirectUri({ scheme: 'agrinexa', preferLocalhost: true }),
  });

  useEffect(() => {
    if (response?.type === 'success') {
      fetchUserInfo(response.authentication?.accessToken);
    }
  }, [response]);

  const switchMode = (mode: AuthMode) => {
    if (loading || mode === authMode) return;
    setAuthMode(mode);
    setMethod(null);
    setValue('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    if (mode === 'signin') setDisplayName('');
  };

  const fetchUserInfo = async (token?: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const info = await res.json();
      await handleSocialLogin('google', info.id, info.email, info.name);
    } catch {
      toast({ title: 'Login Error', description: 'Could not retrieve user info from Google.', type: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string, googleId: string, email?: string, name?: string) => {
    setLoading(true);
    try {
      const authResponse = await loginWithGoogle({ user_id: googleId, email, name });
      if (authResponse?.access_token) {
        await setSession({ id: googleId, method: provider, token: authResponse.access_token });
        const remoteProfile = await getProfileRemote(googleId);
        if (remoteProfile?.onboarded) {
          await setUserProfile(remoteProfile);
          await setOnboardedFlag(true);
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/onboarding');
        }
      } else {
        toast({ title: 'Authentication failed', description: 'Could not verify social login.', type: 'destructive' });
      }
    } catch {
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
        password,
        name: isSignUp ? displayName : undefined,
      };
      const res = isSignUp ? await register(payload) : await loginApi(payload);
      if (res?.access_token) {
        await setSession({ id: res.user_id, method: method || 'custom', token: res.access_token });
        const remoteProfile = await getProfileRemote(res.user_id);
        if (remoteProfile?.onboarded) {
          await setUserProfile(remoteProfile);
          await setOnboardedFlag(true);
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/onboarding');
        }
      } else {
        toast({ title: isSignUp ? 'Registration Failed' : 'Login Failed', description: 'Please check your credentials.', type: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred.', type: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMethod(null);
    setValue('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const muted = colors.mutedForeground;

  // ── Render ──────────────────────────────────────────────────────
  return (
    <KeyboardResponsiveView
      style={{ backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 12}
      contentContainerStyle={styles.scroll}
      scrollViewProps={{ keyboardDismissMode: 'on-drag', showsVerticalScrollIndicator: false }}
    >
      <ResponsiveContainer>
        {/* ── Brand ─────────────────────────────────────────── */}
        <View style={styles.brand}>
          <View style={[styles.logoCircle, { backgroundColor: colors.tint + '14' }]}>
            <Sprout size={32} color={colors.tint} strokeWidth={1.8} />
          </View>
          <Typography.H1 style={styles.appName} translate={false}>AgriNexa</Typography.H1>
          <Typography.P style={[styles.tagline, { color: muted }]}>
            {isSignUp ? 'Create your account' : 'Sign in to continue'}
          </Typography.P>
        </View>

        {/* ── Mode Toggle ──────────────────────────────────── */}
        <View style={[styles.toggle, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          {(['signin', 'signup'] as AuthMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              activeOpacity={0.8}
              onPress={() => switchMode(mode)}
              style={[
                styles.toggleBtn,
                authMode === mode && {
                  backgroundColor: colors.background,
                  shadowColor: '#000',
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                },
              ]}
            >
              <Typography.Small
                style={{ fontWeight: '600', fontSize: 14, color: authMode === mode ? colors.foreground : muted }}
                translate={false}
              >
                {mode === 'signin' ? 'Sign In' : 'Sign Up'}
              </Typography.Small>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Google Button ────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => promptAsync()}
          disabled={loading || !request}
          style={[
            styles.googleBtn,
            { borderColor: colors.border, opacity: loading ? 0.5 : 1 },
          ]}
        >
          <AntDesign name="google" size={18} color="#4285F4" />
          <Typography.P style={{ fontWeight: '600', color: colors.foreground }}>
            Continue with Google
          </Typography.P>
        </TouchableOpacity>

        {/* ── Divider ──────────────────────────────────────── */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Typography.Muted style={{ fontSize: 12, color: muted, paddingHorizontal: 12 }}>or</Typography.Muted>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* ── Method / Form ────────────────────────────────── */}
        {!method ? (
          <View style={styles.methods}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setMethod('email')}
              disabled={loading}
              style={[styles.methodBtn, { borderColor: colors.border }]}
            >
              <Mail size={18} color={muted} />
              <Typography.P style={{ flex: 1, fontWeight: '500', color: colors.foreground }}>
                {isSignUp ? 'Sign up with Email' : 'Sign in with Email'}
              </Typography.P>
              <ChevronRight size={16} color={muted} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setMethod('phone')}
              disabled={loading}
              style={[styles.methodBtn, { borderColor: colors.border }]}
            >
              <Phone size={18} color={muted} />
              <Typography.P style={{ flex: 1, fontWeight: '500', color: colors.foreground }}>
                {isSignUp ? 'Sign up with Phone' : 'Sign in with Phone'}
              </Typography.P>
              <ChevronRight size={16} color={muted} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.form, { borderColor: colors.border }]}>
            {/* Back */}
            <TouchableOpacity activeOpacity={0.7} onPress={resetForm} disabled={loading} style={styles.backRow}>
              <ArrowLeft size={16} color={muted} />
              <Typography.Small style={{ color: muted }}>
                {method === 'email' ? 'Email' : 'Phone'}
              </Typography.Small>
            </TouchableOpacity>

            {isSignUp && (
              <Input
                placeholder="Full name"
                value={displayName}
                onChangeText={setDisplayName}
                editable={!loading}
                leftIcon={<User size={16} color={muted} />}
              />
            )}

            <Input
              placeholder={method === 'email' ? 'Email address' : 'Phone number'}
              value={value}
              onChangeText={setValue}
              keyboardType={method === 'email' ? 'email-address' : 'phone-pad'}
              editable={!loading}
              leftIcon={method === 'email' ? <Mail size={16} color={muted} /> : <Phone size={16} color={muted} />}
            />

            <Input
              placeholder="Password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              leftIcon={<Lock size={16} color={muted} />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(p => !p)} disabled={loading}>
                  {showPassword ? <EyeOff size={16} color={muted} /> : <Eye size={16} color={muted} />}
                </TouchableOpacity>
              }
            />

            {isSignUp && (
              <Input
                placeholder="Confirm password"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
                leftIcon={<Lock size={16} color={muted} />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowConfirmPassword(p => !p)} disabled={loading}>
                    {showConfirmPassword ? <EyeOff size={16} color={muted} /> : <Eye size={16} color={muted} />}
                  </TouchableOpacity>
                }
              />
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleAuthAction}
              disabled={loading}
              style={[styles.submitBtn, { backgroundColor: colors.tint, opacity: loading ? 0.6 : 1 }]}
            >
              <Typography.P style={{ color: '#fff', fontWeight: '700' }}>
                {isSignUp ? 'Create Account' : 'Continue'}
              </Typography.P>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => switchMode(isSignUp ? 'signin' : 'signup')}
              disabled={loading}
              style={styles.switchLink}
            >
              <Typography.Small style={{ color: muted }}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              </Typography.Small>
              <Typography.Small style={{ color: colors.tint, fontWeight: '700' }} translate={false}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Typography.Small>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Footer ───────────────────────────────────────── */}
        <Typography.Muted style={[styles.footer, { color: muted }]}>
          By continuing, you agree to our Terms & Privacy Policy.
        </Typography.Muted>
      </ResponsiveContainer>
    </KeyboardResponsiveView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 40,
  },

  brand: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  tagline: {
    marginTop: 4,
    fontSize: 15,
  },

  toggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 24,
    borderWidth: 1,
  },
  toggleBtn: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },

  methods: {
    gap: 10,
  },
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
  },

  form: {
    gap: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },

  submitBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  switchLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 2,
  },

  footer: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 12,
    lineHeight: 18,
  },
});
