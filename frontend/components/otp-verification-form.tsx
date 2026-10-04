import React, { useState, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';

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
import { Text } from '@/components/reusables/text';
import { useToast } from '@/components/Toast';
import { useApi } from '@/hooks/use-api';
import { setOnboardedFlag, setSession, setUserProfile } from '@/lib/auth-storage';

export interface OtpVerificationFormProps {
  identifier: string;
  onVerified?: (token?: string, user_id?: string) => void;
  onNavigateToSignIn?: () => void;
}

export function OtpVerificationForm({
  identifier,
  onVerified,
  onNavigateToSignIn,
}: OtpVerificationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { verifyOtp, sendOtp, getProfileRemote } = useApi();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      const res = await sendOtp({
        email: identifier,
        purpose: 'verification',
      });
      if (res?.status === 'success') {
        toast({
          title: 'Code resent',
          description: `A new 6-digit code has been sent to ${identifier}`,
          type: 'success',
        });
        setCooldown(60);
      } else {
        toast({
          title: 'Error',
          description: res?.message || 'Could not resend code. Please try again.',
          type: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Network error',
        description: 'Failed to request new code.',
        type: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const trimmed = otp.trim();
    if (!trimmed || trimmed.length < 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter the complete 6-digit verification code.',
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp({
        email: identifier,
        otp: trimmed,
        purpose: 'verification',
      });

      if (res?.verified) {
        toast({
          title: 'Verified!',
          description: 'Your account has been successfully verified.',
          type: 'success',
        });

        if (res.access_token && res.user_id) {
          await setSession({ id: res.user_id, method: 'email', token: res.access_token });
          const remoteProfile = await getProfileRemote(res.user_id);
          if (remoteProfile?.onboarded) {
            await setUserProfile(remoteProfile);
            await setOnboardedFlag(true);
            router.replace('/');
          } else {
            router.replace('/(auth)/onboarding');
          }
          return;
        }

        if (onVerified) {
          onVerified(res.access_token, res.user_id);
        } else if (onNavigateToSignIn) {
          onNavigateToSignIn();
        }
      } else {
        toast({
          title: 'Verification failed',
          description: res?.message || 'Invalid or expired code.',
          type: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Could not verify code. Please try again.',
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
          <View className="items-center mb-2">
            <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center">
              <ShieldCheck size={26} className="text-primary" />
            </View>
          </View>
          <CardTitle className="text-center text-xl">Verify your account</CardTitle>
          <CardDescription className="text-center">
            We sent a 6-digit verification code to{'\n'}
            <Text className="font-semibold text-foreground">{identifier}</Text>
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-4">
            <View className="gap-1.5">
              <Label htmlFor="otp-input" className="text-center">Enter 6-Digit Code</Label>
              <Input
                id="otp-input"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                returnKeyType="send"
                onSubmitEditing={handleVerify}
                editable={!loading}
                className="text-center text-xl tracking-widest font-mono"
              />
            </View>

            <Button
              className="w-full bg-primary h-11 mt-1"
              onPress={handleVerify}
              disabled={loading}
            >
              <Text className="font-semibold text-primary-foreground">
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </Text>
            </Button>

            <View className="flex-row items-center justify-center pt-1">
              <Text className="text-sm text-muted-foreground">Didn&apos;t receive a code? </Text>
              <Pressable onPress={handleResend} disabled={loading || cooldown > 0}>
                <Text className="text-sm font-semibold text-primary">
                  {cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend code'}
                </Text>
              </Pressable>
            </View>
          </View>

          {onNavigateToSignIn && (
            <Text className="text-center text-sm text-muted-foreground pt-1">
              <Pressable onPress={onNavigateToSignIn} disabled={loading}>
                <Text className="text-sm font-medium text-muted-foreground underline underline-offset-4">
                  Back to sign in
                </Text>
              </Pressable>
            </Text>
          )}
        </CardContent>
      </Card>
    </View>
  );
}
