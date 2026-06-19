import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from '@/constants/i18n';
import { languageMap } from '@/constants/i18n';
import { translationService } from '@/services/translation-service';

let hasWarnedMissingExpoProjectId = false;

type Theme = 'light' | 'dark';
type Language = 'English' | 'Tamil' | 'Hindi' | 'Malayalam' | 'Kannada' | 'Telugu';

interface AppContextType {
  theme: Theme;
  appLanguage: Language;
  responseLanguage: Language;
  region: string;
  currency: string;
  notifications: {
    enabled: boolean;
    weather: boolean;
    pest: boolean;
    price: boolean;
    agriFlow: boolean;
  };
  toggleTheme: (coords?: { x: number; y: number }) => void;
  setAppLanguage: (lang: Language) => void;
  setResponseLanguage: (lang: Language) => void;
  setRegion: (region: string) => void;
  setCurrency: (currency: string) => void;
  updateNotificationSetting: (key: string, value: boolean) => Promise<void>;
  isLoaded: boolean;
  themeTransitionCoords: { x: number; y: number } | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(systemColorScheme || 'light');
  const [appLanguage, setAppLanguageState] = useState<Language>('' as any);
  const [responseLanguage, setResponseLanguageState] = useState<Language>('English');
  const [region, setRegionState] = useState('India');
  const [currency, setCurrencyState] = useState('INR');
  const [notifications, setNotificationsState] = useState({
    enabled: true,
    weather: true,
    pest: true,
    price: true,
    agriFlow: true,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [themeTransitionCoords, setThemeTransitionCoords] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('app_theme');
        const storedAppLang = await AsyncStorage.getItem('app_language');
        const storedRespLang = await AsyncStorage.getItem('response_language');
        const storedRegion = await AsyncStorage.getItem('app_region');
        const storedCurrency = await AsyncStorage.getItem('app_currency');
        const storedNotifications = await AsyncStorage.getItem('app_notifications');

        // Auto-detect system language if not stored
        if (!storedAppLang) {
          const locales = Localization.getLocales();
          const systemCode = locales[0]?.languageCode || 'en';
          const detectedLang = languageMap[systemCode] || 'English';
          setAppLanguageState(detectedLang as Language);
          i18n.changeLanguage(detectedLang); // ← sync i18n at boot
          translationService.preload(detectedLang); // ← warm cache
        } else {
          setAppLanguageState(storedAppLang as Language);
          i18n.changeLanguage(storedAppLang); // ← sync i18n at boot
          translationService.preload(storedAppLang); // ← warm cache
        }

        if (storedTheme) setTheme(storedTheme as Theme);
        if (storedRespLang) setResponseLanguageState(storedRespLang as Language);
        if (storedRegion) setRegionState(storedRegion);
        if (storedCurrency) setCurrencyState(storedCurrency);
        if (storedNotifications) setNotificationsState(JSON.parse(storedNotifications));
      } catch (e) {
        console.error('Error loading app settings:', e);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, [systemColorScheme]);

  const toggleTheme = async (coords?: { x: number; y: number }) => {
    if (coords) setThemeTransitionCoords(coords);
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    await AsyncStorage.setItem('app_theme', newTheme);
  };

  const setAppLanguage = async (lang: Language) => {
    setAppLanguageState(lang);
    i18n.changeLanguage(lang);
    translationService.preload(lang); // warm dynamic cache for new language
    await AsyncStorage.setItem('app_language', lang);
    const profileStr = await AsyncStorage.getItem('user_profile');
    if (profileStr) {
      const profile = JSON.parse(profileStr);
      profile.appLang = lang;
      await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
    }
  };

  const setResponseLanguage = async (lang: Language) => {
    setResponseLanguageState(lang);
    await AsyncStorage.setItem('response_language', lang);
  };

  const setRegion = async (r: string) => {
    setRegionState(r);
    await AsyncStorage.setItem('app_region', r);
  };

  const setCurrency = async (c: string) => {
    setCurrencyState(c);
    await AsyncStorage.setItem('app_currency', c);
  };

  const requestNotificationPermissions = async () => {
    if (Platform.OS === 'web') return true;

    let Notifications: any = null;
    try {
      // Expo Go on newer SDKs does not support Android remote notifications.
      // Load lazily to avoid import-time crashes.
      Notifications = await import('expo-notifications');
    } catch (error) {
      console.warn('expo-notifications unavailable in current runtime:', error);
      return false;
    }

    const getExpoProjectId = async (): Promise<string | null> => {
      try {
        const Constants = await import('expo-constants');
        const easProjectId = (Constants as any)?.default?.easConfig?.projectId;
        const expoExtraProjectId = (Constants as any)?.default?.expoConfig?.extra?.eas?.projectId;
        return easProjectId || expoExtraProjectId || null;
      } catch {
        return null;
      }
    };

    const registerTokenWithBackend = async () => {
      try {
        const projectId = await getExpoProjectId();
        if (!projectId) {
          // In local/dev builds without EAS projectId, skip remote token registration.
          if (__DEV__ && !hasWarnedMissingExpoProjectId) {
            hasWarnedMissingExpoProjectId = true;
            console.warn('Push token registration skipped: missing Expo EAS projectId. Configure app.json/app.config for push notifications.');
          }
          return;
        }

        const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
        const expoPushToken = tokenResult.data;
        if (!expoPushToken) return;

        const sessionStr = await AsyncStorage.getItem('user_session');
        const session = sessionStr ? JSON.parse(sessionStr) : null;
        const authToken = session?.token;
        const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.87.60.107:8000';

        if (!authToken) return;

        await fetch(`${baseUrl}/notifications/register-token`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ expo_push_token: expoPushToken }),
        });
      } catch (error) {
        console.error('Failed to register Expo push token:', error);
      }
    };

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus === 'granted') {
      await registerTokenWithBackend();
    }

    return finalStatus === 'granted';
  };

  const updateNotificationSetting = async (key: string, value: boolean) => {
    let shouldUpdate = true;
    if (key === 'enabled' && value === true) {
      shouldUpdate = await requestNotificationPermissions();
    }

    if (shouldUpdate) {
      const newSettings = { ...notifications, [key]: value };
      setNotificationsState(newSettings);
      await AsyncStorage.setItem('app_notifications', JSON.stringify(newSettings));
    }
  };

  return (
    <AppContext.Provider value={{
      theme, appLanguage, responseLanguage, region, currency, notifications,
      toggleTheme, setAppLanguage, setResponseLanguage, setRegion, setCurrency,
      updateNotificationSetting,
      isLoaded, themeTransitionCoords
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
