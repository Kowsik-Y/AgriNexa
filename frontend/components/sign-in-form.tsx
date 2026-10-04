import React, { useState, useRef, useEffect } from 'react';
import { Pressable, type TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';

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


export interface SignInFormProps {
  onNavigateToSignUp?: () => void;
  onNavigateToForgotPassword?: () => void;
  onNavigateToOtp?: (identifier: string) => void;
}

export function SignInForm({
  onNavigateToSignUp,
  onNavigateToForgotPassword,
  onNavigateToOtp,
}: SignInFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { login: loginApi, loginWithGoogle, getProfileRemote } = useApi();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordInputRef = useRef<TextInput>(null);

  const isGoogleConfigured = Boolean(
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID &&
    !process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.startsWith('YOUR_')
  );

  useEffect(() => {
    if (isGoogleConfigured) {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      });
    }
  }, [isGoogleConfigured]);

  const onGooglePress = async () => {
    if (!isGoogleConfigured) {
      toast({ title: 'Not Configured', description: 'Google Sign In is not set up.', type: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.data && response.data.user) {
        await handleGoogleLogin(response.data.user.id, response.data.user.email, response.data.user.name || undefined);
      } else {
        throw new Error('No user data returned');
      }
    } catch (error: any) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            break;
          case statusCodes.IN_PROGRESS:
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            toast({ title: 'Error', description: 'Play services not available.', type: 'destructive' });
            break;
          default:
            toast({ title: 'Login Error', description: 'Google Sign In failed.', type: 'destructive' });
        }
      } else {
        toast({ title: 'Login Error', description: 'Google Sign In failed.', type: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (googleId: string, email?: string, name?: string) => {
    setLoading(true);
    try {
      const authResponse = await loginWithGoogle({ user_id: googleId, email, name });
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
          description: 'Could not verify Google login.',
          type: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Login error',
        description: 'A connection error occurred.',
        type: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePress = async () => {
    if (!isGoogleConfigured) {
      toast({
        title: 'Google Sign-in',
        description: 'Google Client ID is not configured yet. Please sign in with Email/Password.',
        type: 'info',
      });
      return;
    }
    
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.data && response.data.user) {
        await handleGoogleLogin(response.data.user.id, response.data.user.email, response.data.user.name || undefined);
      } else {
        throw new Error('No user data returned');
      }
    } catch (error: any) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            break;
          case statusCodes.IN_PROGRESS:
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            toast({ title: 'Error', description: 'Play services not available.', type: 'destructive' });
            break;
          default:
            toast({ title: 'Login Error', description: 'Google Sign In failed.', type: 'destructive' });
        }
      } else {
        toast({ title: 'Login Error', description: 'Google Sign In failed.', type: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const onEmailSubmit = () => {
    passwordInputRef.current?.focus();
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

    setLoading(true);
    try {
      const isEmail = trimmed.includes('@');
      const payload = {
        email: isEmail ? trimmed : undefined,
        phone: !isEmail ? trimmed : undefined,
        password,
      };

      const res = await loginApi(payload);
      if (res?.access_token) {
        await setSession({ id: res.user_id, method: isEmail ? 'email' : 'phone', token: res.access_token });
        const remoteProfile = await getProfileRemote(res.user_id);
        if (remoteProfile?.onboarded) {
          await setUserProfile(remoteProfile);
          await setOnboardedFlag(true);
          router.replace('/');
        } else {
          router.replace('/(auth)/onboarding');
        }
      } else {
        const isUnverified = res?.status_code === 403 || res?.detail?.toLowerCase()?.includes('verify');
        const errorMsg = res?.detail || res?.message || 'Invalid credentials. Please try again.';
        toast({
          title: isUnverified ? 'Verification Required' : 'Login Failed',
          description: errorMsg,
          type: isUnverified ? 'warning' : 'destructive',
        });
        if (isUnverified && onNavigateToOtp && isEmail) {
          setTimeout(() => {
            onNavigateToOtp(trimmed);
          }, 1200);
        }
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
          <CardTitle className="text-center text-xl sm:text-left">Sign in to your account</CardTitle>
          <CardDescription className="text-center sm:text-left">
            Welcome back! Please sign in to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-4">
            <View className="gap-1.5">
              <Label htmlFor="email">Email or Phone</Label>
              <Input
                id="email"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={onEmailSubmit}
                returnKeyType="next"
                submitBehavior="submit"
                editable={!loading}
              />
            </View>

            <View className="gap-1.5">
              <View className="flex-row items-center">
                <Label htmlFor="password">Password</Label>
                {onNavigateToForgotPassword && (
                  <Button
                    variant="link"
                    size="sm"
                    className="web:h-fit ml-auto h-4 px-1 py-0 sm:h-4"
                    onPress={onNavigateToForgotPassword}
                    disabled={loading}
                  >
                    <Text className="font-normal leading-4 text-xs text-muted-foreground">
                      Forgot your password?
                    </Text>
                  </Button>
                )}
              </View>
              <View className="relative justify-center">
                <Input
                  ref={passwordInputRef}
                  id="password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="send"
                  onSubmitEditing={onSubmit}
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

            <Button className="w-full bg-primary h-11 mt-1" onPress={onSubmit} disabled={loading}>
              <Text className="font-semibold text-primary-foreground">
                {loading ? 'Signing in...' : 'Continue'}
              </Text>
            </Button>
          </View>

          {onNavigateToSignUp && (
            <Text className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Pressable onPress={onNavigateToSignUp} disabled={loading}>
                <Text className="text-sm font-semibold text-primary underline underline-offset-4">
                  Sign up
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
