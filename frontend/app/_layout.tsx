import '../global.css';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { PortalHost } from '@rn-primitives/portal';

// import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import { AppProvider, useAppContext } from '../context/AppProvider';
import { useApi } from '../hooks/use-api';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { getOnboardedFlag, getSession, getUserProfile, setOnboardedFlag, setUserProfile } from '@/lib/auth-storage';
import { SplashScreen } from '@/components/SplashScreen';
import * as NativeSplashScreen from 'expo-splash-screen';

NativeSplashScreen.preventAutoHideAsync().catch(() => { });

/* 
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
*/


function RootLayoutNav() {
  const { theme, isLoaded } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'onboarding' | 'unauthenticated'>('loading');
  const { getProfileRemote } = useApi();

  // Check session ONCE on app load
  useEffect(() => {
    // Manually hide the native splash screen early to hand over to the animated screen
    NativeSplashScreen.hideAsync().catch(() => { });

    if (!isLoaded) return;

    const checkSession = async () => {
      try {
        const session = await getSession();
        console.log('[Auth] Session retrieved:', session ? 'exists' : 'null');

        if (!session || !session.id) {
          console.log('[Auth] No valid session, redirecting to login');
          setAuthState('unauthenticated');
        } else {
          const isOnboarded = await getOnboardedFlag();
          console.log('[Auth] Onboarded flag:', isOnboarded);

          if (isOnboarded) {
            setAuthState('authenticated');
          } else {
            setAuthState('onboarding');
          }

          // Fetch remote profile if local is missing
          const profile = await getUserProfile();
          if (!profile && session.id) {
            console.log('[Auth] Fetching remote profile...');
            const remote = await getProfileRemote(session.id);
            if (remote) {
              await setUserProfile(remote);
              if (remote.onboarded) {
                await setOnboardedFlag(true);
                setAuthState('authenticated');
              }
            }
          }
        }
      } catch (e) {
        console.error('[Auth] Session check error:', e);
        setAuthState('unauthenticated');
      } finally {
        setIsReady(true);
      }
    };

    checkSession();
  }, [isLoaded, pathname]);

  // Keep users on their current route when allowed, only redirect when access is invalid.
  useEffect(() => {
    if (!isReady || authState === 'loading') return;

    const inAuthGroup = segments[0] === '(auth)';
    const isAuthPath = pathname === '/auth';
    const isOnboardingPath = pathname === '/onboarding';
    const inAuthFlow = inAuthGroup || isAuthPath || isOnboardingPath;

    console.log('[Navigation] authState:', authState, 'pathname:', pathname, 'segments:', segments);

    if (authState === 'unauthenticated' && !isAuthPath) {
      console.log('[Navigation] Session missing, redirecting to auth');
      router.replace('/(auth)/auth');
    } else if (authState === 'onboarding' && !isOnboardingPath) {
      console.log('[Navigation] Onboarding required, redirecting');
      router.replace('/(auth)/onboarding');
    } else if (authState === 'authenticated' && inAuthFlow) {
      console.log('[Navigation] Auth complete, navigating to home');
      router.replace('/(private)/(tabs)');
    }
  }, [authState, isReady, pathname, segments, router]);


  const { width } = useWindowDimensions();
  const inAuthFlow = segments[0] === '(auth)';
  const showSidebar = width >= 768 && !inAuthFlow;

  if (!isLoaded || !isReady) return null;

  return (
    <View
      className="flex-1 bg-background"
      style={{ backgroundColor: theme === 'dark' ? '#0F172A' : '#F8FAFC' }}
    >
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} theme={theme} />
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(private)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <PortalHost />
    </View>
  );
}


import { I18nextProvider } from 'react-i18next';
import i18n from '@/constants/i18n';
import { ToastProvider } from '@/components/Toast';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

function ThemedRootLayout() {
  const { theme } = useAppContext();
  const bgColor = theme === 'dark' ? '#0F172A' : '#F8FAFC';

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: bgColor }}
      className="flex-1 bg-background"
    >
      <ToastProvider>
        <RootLayoutNav />
      </ToastProvider>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <AppProvider>
          <ThemedRootLayout />
        </AppProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
