import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';
type Language = 'English' | 'Tamil';

interface AppContextType {
  theme: Theme;
  language: Language;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  isLoaded: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(systemColorScheme || 'light');
  const [language, setLanguageState] = useState<Language>('English');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('app_theme');
        const storedProfile = await AsyncStorage.getItem('user_profile');
        
        if (storedTheme) {
          setTheme(storedTheme as Theme);
        } else if (systemColorScheme) {
          setTheme(systemColorScheme);
        }

        if (storedProfile) {
          const profile = JSON.parse(storedProfile);
          if (profile.appLang) {
            setLanguageState(profile.appLang as Language);
          }
        }
      } catch (e) {
        console.error('Error loading app settings:', e);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, [systemColorScheme]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    await AsyncStorage.setItem('app_theme', newTheme);
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    const profileStr = await AsyncStorage.getItem('user_profile');
    if (profileStr) {
      const profile = JSON.parse(profileStr);
      profile.appLang = lang;
      await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
    }
  };

  return (
    <AppContext.Provider value={{ theme, language, toggleTheme, setLanguage, isLoaded }}>
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
