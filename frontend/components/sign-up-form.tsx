import React, { useState, useRef, useEffect } from 'react';
import { Pressable, type TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

import { SocialConnections } from '@/components/social-connections';
import { Button } from '@/components/reusables/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/reusables/card';
import { Input } from '@/components/reusables/input';
import { Label } from '@/components/reusables/label';
import { Separator } from '@/components/reusables/separator';
import { Text } from '@/components/reusables/text';
import { useToast } from '@/components/Toast';
import { useApi } from '@/hooks/use-api';
import { setOnboardedFlag, setSession, setUserProfile } from '@/lib/auth-storage';

WebBrowser.maybeCompleteAuthSession();

export interface SignUpFormProps {
  onNavigateToSignIn?: () => void;
  onNavigateToOtp?: (email: string) => void;
}

export function SignUpForm({ onNavigateToSignIn, onNavigateToOtp }: SignUpFormProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const { register: registerApi, loginWithGoogle, getProfileRemote } = useApi();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const isGoogleConfigured = Boolean(
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID &&
    !process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.startsWith('YOUR_')
  );

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

  const fetchUserInfo = async (token?: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const info = await res.json();
      await handleGoogleSignUp(info.id, info.email, info.name);
    } catch {
      toast({
        title: 'Sign Up Error',
        description: 'Could not retrieve user info from Google.',
        type: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async (googleId: string, userEmail?: string, name?: string) => {
    setLoading(true);
    try {
      const authResponse = await loginWithGoogle({ user_id: googleId, email: userEmail, name });
      if (authResponse?.access_token) {
        await setSession({ id: googleId, method: 'google', token: authResponse.access_token });
        const remoteProfile = await getProfileRemote(googleId);
        if (remoteProfile?.onboarded) {
          await setUserProfile(remoteProfile);
          await setOnboardedFlag(true);
          router.replace('/');
        } else {
          router.replace('/(auth)/onboarding');
        }
      } else {
        toast({
          title: 'Authentication failed',
          description: 'Could not verify Google sign up.',
          type: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Sign up error',
        description: 'A connection error occurred.',
        type: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePress = () => {
    if (!isGoogleConfigured) {
      toast({
        title: 'Google Sign-in',
        description: 'Google Client ID is not configured yet. Please sign up with Email/Password.',
        type: 'info',
      });
      return;
    }
    promptAsync();
  };

  const onSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !password) {
      toast({
        title: 'Missing fields',
        description: 'Please enter your email and password.',
        type: 'warning',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Weak password',
        description: 'Password must be at least 6 characters.',
        type: 'warning',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'Passwords do not match. Please check again.',
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await registerApi({
        name: displayName.trim() || undefined,
        email: trimmed,
        password,
      });

      if (res?.access_token) {
        toast({
          title: 'Account Created',
          description: 'Account created successfully.',
          type: 'success',
        });

        if (onNavigateToOtp) {
          onNavigateToOtp(trimmed);
        } else {
          await setSession({ id: res.user_id, method: 'email', token: res.access_token });
          router.replace('/(auth)/onboarding');
        }
      } else {
        toast({
          title: 'Sign Up Failed',
          description: res?.detail || 'Could not create account. Please check your details.',
          type: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected connection error occurred.',
        type: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="gap-6">
      <Card className="border-border/60 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">Create your account</CardTitle>
          <CardDescription className="text-center sm:text-left">
            Welcome! Please enter your details to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-4">
            <View className="gap-1.5">
              <Label htmlFor="signup-name">Full Name</Label>
              <Input
                id="signup-name"
                autoCapitalize="words"
                value={displayName}
                onChangeText={setDisplayName}
                onSubmitEditing={() => emailInputRef.current?.focus()}
                returnKeyType="next"
                editable={!loading}
              />
            </View>

            <View className="gap-1.5">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                ref={emailInputRef}
                id="signup-email"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                returnKeyType="next"
                editable={!loading}
              />
            </View>

            <View className="gap-1.5">
              <Label htmlFor="signup-password">Password</Label>
              <View className="relative justify-center">
                <Input
                  ref={passwordInputRef}
                  id="signup-password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                  returnKeyType="next"
                  editable={!loading}
                  className="pr-10"
                />
                <Pressable
                  onPress={() => setShowPassword((p) => !p)}
                  disabled={loading}
                  className="absolute right-3 p-1"
                  hitSlop={8}
                >
                  {showPassword ? (
                    <EyeOff size={16} color="#94a3b8" />
                  ) : (
                    <Eye size={16} color="#94a3b8" />
                  )}
                </Pressable>
              </View>
            </View>

            <View className="gap-1.5">
              <Label htmlFor="signup-confirm-password">Confirm Password</Label>
              <View className="relative justify-center">
                <Input
                  ref={confirmPasswordInputRef}
                  id="signup-confirm-password"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  returnKeyType="send"
                  onSubmitEditing={onSubmit}
                  editable={!loading}
                  className="pr-10"
                />
                <Pressable
                  onPress={() => setShowConfirmPassword((p) => !p)}
                  disabled={loading}
                  className="absolute right-3 p-1"
                  hitSlop={8}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} color="#94a3b8" />
                  ) : (
                    <Eye size={16} color="#94a3b8" />
                  )}
                </Pressable>
              </View>
            </View>

            <Button className="w-full bg-primary h-11 mt-1" onPress={onSubmit} disabled={loading}>
              <Text className="font-semibold text-primary-foreground">
                {loading ? 'Creating account...' : 'Create Account'}
              </Text>
            </Button>
          </View>

          {onNavigateToSignIn && (
            <Text className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Pressable onPress={onNavigateToSignIn} disabled={loading}>
                <Text className="text-sm font-semibold text-primary underline underline-offset-4">
                  Sign in
                </Text>
              </Pressable>
            </Text>
          )}

          <View className="flex-row items-center">
            <Separator className="flex-1" />
            <Text className="text-muted-foreground px-4 text-xs uppercase font-medium">or</Text>
            <Separator className="flex-1" />
          </View>

          <SocialConnections onGooglePress={handleGooglePress} loading={loading} />
        </CardContent>
      </Card>
    </View>
  );
}
