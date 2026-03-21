import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

interface ThemeContextValue {
  themePreference: ThemePreference;
  effectiveTheme: EffectiveTheme;
  isDarkMode: boolean;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
}

const STORAGE_KEY = 'appThemePreference';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedValue === 'light' || storedValue === 'dark' || storedValue === 'system') {
          setThemePreferenceState(storedValue);
        }
      } catch {
        // Ignore read failures and keep default preference.
      }
    };

    void loadThemePreference();
  }, []);

  const setThemePreference = async (preference: ThemePreference) => {
    setThemePreferenceState(preference);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Preference is still applied in memory even if persistence fails.
    }
  };

  const effectiveTheme: EffectiveTheme =
    themePreference === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : themePreference;

  const value = useMemo(
    () => ({
      themePreference,
      effectiveTheme,
      isDarkMode: effectiveTheme === 'dark',
      setThemePreference,
    }),
    [effectiveTheme, themePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
