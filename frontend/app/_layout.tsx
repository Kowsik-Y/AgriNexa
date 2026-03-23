import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import { AppProvider, useAppContext } from '../context/AppProvider';
import { useApi } from '../hooks/use-api';

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
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const { getProfileRemote } = useApi();

  useEffect(() => {
    if (!isLoaded) return;
    
    const checkSession = async () => {
      try {
        const sessionStr = await AsyncStorage.getItem('user_session');
        const inAuthGroup = segments[0] === 'auth';

        if (sessionStr) {
          if (inAuthGroup) {
            router.replace('/(tabs)');
          }
        } else if (!inAuthGroup) {
          router.replace('/auth');
        }
      } catch (e) {
        console.error('Session check error:', e);
      } finally {
        setIsReady(true);
      }
    };

    checkSession();
  }, [segments, isLoaded]);

  // Separate effect for profile fetching to avoid redundant calls on navigation
  useEffect(() => {
    if (!isLoaded) return;
    
    const fetchProfile = async () => {
      const sessionStr = await AsyncStorage.getItem('user_session');
      const profileStr = await AsyncStorage.getItem('user_profile');
      
      if (sessionStr && !profileStr) {
        const session = JSON.parse(sessionStr);
        if (session.id) {
          const remote = await getProfileRemote(session.id);
          if (remote) {
            await AsyncStorage.setItem('user_profile', JSON.stringify(remote));
            await AsyncStorage.setItem('onboarded', 'true');
          }
        }
      }
    };
    fetchProfile();
  }, [isLoaded]);


  if (!isLoaded || !isReady) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" options={{ gestureEnabled: false }} />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

import { ToastProvider } from '@/components/ui/Toast';

export default function RootLayout() {
  return (
    <AppProvider>
      <ToastProvider>
        <RootLayoutNav />
      </ToastProvider>
    </AppProvider>
  );
}
