/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// SoundMate Orange-Black Theme
const tintColorLight = '#FF6B35'; // Vibrant Orange
const tintColorDark = '#FF6B35';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#0D0D0D',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

// SoundMate Brand Colors - Dark Theme (Original)
export const SoundMateColors = {
  // Primary - Vibrant Orange
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryLight: '#FF8A5C',

  // Accent - Golden Orange
  accent: '#FFB347',
  accentDark: '#E5A23F',
  accentLight: '#FFCC80',

  // Background - Deep Blacks
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceLight: '#2D2D2D',
  surfaceElevated: '#3D3D3D',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textInverse: '#0D0D0D',

  // Borders
  border: '#374151',
  borderLight: '#4B5563',

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Gradients
  gradient: {
    orange: ['#FF6B35', '#E55A2B'],
    orangeLight: ['#FF8A5C', '#FF6B35'],
    orangeGold: ['#FF6B35', '#FFB347'],
    dark: ['#0D0D0D', '#1A1A1A', '#0D0D0D'],
  },
};

// SoundMate Light Theme - Cyan Blue (#55C5F1)
export const SoundMateLightColors = {
  // Primary - Cyan Blue
  primary: '#55C5F1',
  primaryDark: '#3BB5E8',
  primaryLight: '#7DD4F5',
  primaryGradientStart: '#7DD4F5',
  primaryGradientEnd: '#55C5F1',

  // Accent
  accent: '#55C5F1',
  accentDark: '#3BB5E8',
  accentLight: '#A8E4FA',

  // Background - Light
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceLight: '#F5F5F5',
  surfaceElevated: '#FFFFFF',

  // Text
  textPrimary: '#1E293B',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',
  textPlaceholder: '#55C5F1',

  // Modern UI Additions
  glass: {
    light: 'rgba(255, 255, 255, 0.7)',
    dark: 'rgba(255, 255, 255, 0.15)',
    border: 'rgba(255, 255, 255, 0.3)',
  },
  shadow: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  radius: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    full: 9999,
  },

  // Borders
  border: '#55C5F1',
  borderLight: '#D1D5DB',
  borderActive: '#55C5F1',

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#55C5F1',

  // Social
  google: '#4285F4',
  facebook: '#1877F2',

  // Gradients
  gradient: {
    primary: ['#7DD4F5', '#55C5F1'],
    light: ['#FAFAFA', '#FFFFFF'],
  },
};

// Add modern properties to SoundMateColors (Dark)
export const SoundMateDarkColors = {
  ...SoundMateColors,
  glass: {
    light: 'rgba(26, 26, 26, 0.7)',
    dark: 'rgba(0, 0, 0, 0.3)',
    border: 'rgba(255, 255, 255, 0.1)',
  },
  radius: SoundMateLightColors.radius,
  shadow: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.6,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
