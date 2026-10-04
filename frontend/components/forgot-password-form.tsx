import React, { useState, useRef } from 'react';
import { Pressable, type TextInput, View } from 'react-native';
import { Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react-native';

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

export interface ForgotPasswordFormProps {
  onNavigateToSignIn?: () => void;
}

export function ForgotPasswordForm({ onNavigateToSignIn }: ForgotPasswordFormProps) {
  const { toast } = useToast();
  const { forgotPassword, resetPassword } = useApi();

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const otpInputRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const startCooldown = () => {
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRequestOtp = async () => {
    const trimmed = identifier.trim();
    if (!trimmed) {
      toast({
        title: 'Missing information',
        description: 'Please enter your registered email address.',
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      const isEmail = trimmed.includes('@');
      const res = await forgotPassword({
        email: isEmail ? trimmed : undefined,
        phone: !isEmail ? trimmed : undefined,
      });

      if (res?.status === 'success') {
        toast({
          title: 'Code Sent',
          description: res.message || 'Reset code sent to your email.',
          type: 'success',
        });
        setStep('reset');
        startCooldown();
      } else {
        toast({
          title: 'Request Failed',
          description: res?.message || 'Could not send reset code. Please check your identifier.',
          type: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An error occurred while sending the reset code.',
        type: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const trimmedOtp = otp.trim();
    if (!trimmedOtp || !newPassword || !confirmPassword) {
      toast({
        title: 'Missing fields',
        description: 'Please complete all required fields.',
        type: 'warning',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Weak password',
        description: 'New password must be at least 6 characters long.',
        type: 'warning',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Mismatch',
        description: 'Passwords do not match.',
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      const trimmed = identifier.trim();
      const isEmail = trimmed.includes('@');
      const res = await resetPassword({
        email: isEmail ? trimmed : undefined,
        phone: !isEmail ? trimmed : undefined,
        otp: trimmedOtp,
        new_password: newPassword,
      });

      if (res?.status === 'success') {
        toast({
          title: 'Success!',
          description: 'Your password has been reset. Please sign in.',
          type: 'success',
        });
        if (onNavigateToSignIn) {
          onNavigateToSignIn();
        }
      } else {
        toast({
          title: 'Reset Failed',
          description: res?.message || 'Invalid or expired verification code.',
          type: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Could not reset password. Please check your verification code.',
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
          <CardTitle className="text-center text-xl sm:text-left">
            {step === 'request' ? 'Forgot your password?' : 'Reset your password'}
          </CardTitle>
          <CardDescription className="text-center sm:text-left">
            {step === 'request'
              ? 'Enter your email to receive a 6-digit verification code'
              : `Enter the 6-digit code sent to ${identifier} and your new password`}
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          {step === 'request' ? (
            <View className="gap-4">
              <View className="gap-1.5">
                <Label htmlFor="reset-identifier">Email</Label>
                <Input
                  id="reset-identifier"
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCapitalize="none"
                  value={identifier}
                  onChangeText={setIdentifier}
                  returnKeyType="send"
                  onSubmitEditing={handleRequestOtp}
                  editable={!loading}
                />
              </View>

              <Button
                className="w-full bg-primary h-11 mt-1"
                onPress={handleRequestOtp}
                disabled={loading}
              >
                <Text className="font-semibold text-primary-foreground">
                  {loading ? 'Sending code...' : 'Send Verification Code'}
                </Text>
              </Button>
            </View>
          ) : (
            <View className="gap-4">
              <View className="gap-1.5">
                <Label htmlFor="reset-otp">6-Digit Verification Code</Label>
                <Input
                  ref={otpInputRef}
                  id="reset-otp"
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  returnKeyType="next"
                  onSubmitEditing={() => newPasswordRef.current?.focus()}
                  editable={!loading}
                />
              </View>

              <View className="gap-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <View className="relative justify-center">
                  <Input
                    ref={newPasswordRef}
                    id="new-password"
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
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
                <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                <View className="relative justify-center">
                  <Input
                    ref={confirmPasswordRef}
                    id="confirm-new-password"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    returnKeyType="send"
                    onSubmitEditing={handleResetPassword}
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

              <Button
                className="w-full bg-primary h-11 mt-1"
                onPress={handleResetPassword}
                disabled={loading}
              >
                <Text className="font-semibold text-primary-foreground">
                  {loading ? 'Resetting password...' : 'Update Password'}
                </Text>
              </Button>

              <View className="flex-row items-center justify-between pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => setStep('request')}
                  disabled={loading}
                >
                  <Text className="text-xs text-muted-foreground">Change Email</Text>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={handleRequestOtp}
                  disabled={loading || cooldown > 0}
                >
                  <Text className="text-xs text-primary">
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </Text>
                </Button>
              </View>
            </View>
          )}

          {onNavigateToSignIn && (
            <Text className="text-center text-sm text-muted-foreground pt-1">
              Remember your password?{' '}
              <Pressable onPress={onNavigateToSignIn} disabled={loading}>
                <Text className="text-sm font-semibold text-primary underline underline-offset-4">
                  Sign in
                </Text>
              </Pressable>
            </Text>
          )}
        </CardContent>
      </Card>
    </View>
  );
}
