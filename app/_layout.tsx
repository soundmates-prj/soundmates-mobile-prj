import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { SoundMateLightColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Custom light theme with SoundMate colors
const SoundMateLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: SoundMateLightColors.primary,
    background: SoundMateLightColors.background,
    card: SoundMateLightColors.surface,
    text: SoundMateLightColors.textPrimary,
    border: SoundMateLightColors.border,
    notification: SoundMateLightColors.primary,
  },
};

export const unstable_settings = {
  initialRouteName: 'login',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={SoundMateLightTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

