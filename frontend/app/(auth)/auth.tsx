import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SignInForm } from '@/components/sign-in-form';
import { SignUpForm } from '@/components/sign-up-form';
import { ForgotPasswordForm } from '@/components/forgot-password-form';
import { OtpVerificationForm } from '@/components/otp-verification-form';

export default function AuthScreen() {
  const [authView, setAuthView] = useState<'signin' | 'signup' | 'forgot-password' | 'otp-verification'>('signin');
  const [pendingIdentifier, setPendingIdentifier] = useState('');

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="flex-1 items-center justify-center p-4 py-8 sm:py-4 sm:p-6 mt-safe"
      keyboardDismissMode="interactive"
      className="flex-1 bg-background"
    >
      <View className="w-full max-w-sm">
        {authView === 'signin' && (
          <SignInForm
            onNavigateToSignUp={() => setAuthView('signup')}
            onNavigateToForgotPassword={() => setAuthView('forgot-password')}
            onNavigateToOtp={(identifier) => {
              setPendingIdentifier(identifier);
              setAuthView('otp-verification');
            }}
          />
        )}
        {authView === 'signup' && (
          <SignUpForm
            onNavigateToSignIn={() => setAuthView('signin')}
            onNavigateToOtp={(identifier) => {
              setPendingIdentifier(identifier);
              setAuthView('otp-verification');
            }}
          />
        )}
        {authView === 'forgot-password' && (
          <ForgotPasswordForm
            onNavigateToSignIn={() => setAuthView('signin')}
          />
        )}
        {authView === 'otp-verification' && (
          <OtpVerificationForm
            identifier={pendingIdentifier}
            onNavigateToSignIn={() => setAuthView('signin')}
          />
        )}
      </View>
    </ScrollView>
  );
}
