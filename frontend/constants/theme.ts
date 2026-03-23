/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#10B981'; // Emerald 500
const tintColorDark = '#34D399'; // Emerald 400

export const Colors = {
  light: {
    background: '#F8FAFC', // Slate 50
    foreground: '#0F172A', // Slate 900
    card: '#FFFFFF',
    cardForeground: '#0F172A',
    popover: '#FFFFFF',
    popoverForeground: '#0F172A',
    primary: tintColorLight,
    primaryForeground: '#FFFFFF',
    secondary: '#F1F5F9', // Slate 100
    secondaryForeground: '#0F172A',
    muted: '#F1F5F9',
    mutedForeground: '#64748B', // Slate 500
    accent: '#F1F5F9',
    accentForeground: '#0F172A',
    destructive: '#EF4444', // Red 500
    destructiveForeground: '#FFFFFF',
    border: '#E2E8F0', // Slate 200
    input: '#E2E8F0',
    ring: tintColorLight,
    text: '#1E293B',
    tint: tintColorLight,
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorLight,
    success: '#10B981',
    warning: '#F59E0B',
    notification: '#EF4444',
  },
  dark: {
    background: '#0F172A', // Slate 900
    foreground: '#F1F5F9', // Slate 100
    card: '#1E293B', // Slate 800
    cardForeground: '#F1F5F9',
    popover: '#0F172A',
    popoverForeground: '#F1F5F9',
    primary: tintColorDark,
    primaryForeground: '#0F172A',
    secondary: '#1E293B',
    secondaryForeground: '#F1F5F9',
    muted: '#1E293B',
    mutedForeground: '#94A3B8', // Slate 400
    accent: '#1E293B',
    accentForeground: '#F1F5F9',
    destructive: '#7F1D1D', // Red 900
    destructiveForeground: '#F1F5F9',
    border: '#334155', // Slate 700
    input: '#334155',
    ring: tintColorDark,
    text: '#F1F5F9',
    tint: tintColorDark,
    icon: '#94A3B8',
    tabIconDefault: '#475569',
    tabIconSelected: tintColorDark,
    success: '#34D399',
    warning: '#FBBF24',
    notification: '#F87171',
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
