/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#10B981'; // Emerald 500
const tintColorDark = '#34D399'; // Emerald 400

export const Colors = {
  light: {
    text: '#1E293B', // Slate 800
    background: '#F8FAFC', // Slate 50
    tint: tintColorLight,
    icon: '#64748B', // Slate 500
    tabIconDefault: '#94A3B8', // Slate 400
    tabIconSelected: tintColorLight,
    card: '#FFFFFF',
    border: '#E2E8F0', // Slate 200
    notification: '#EF4444', // Red 500
    success: '#10B981',
    warning: '#F59E0B',
  },
  dark: {
    text: '#F1F5F9', // Slate 100
    background: '#0F172A', // Slate 900
    tint: tintColorDark,
    icon: '#94A3B8', // Slate 400
    tabIconDefault: '#475569', // Slate 600
    tabIconSelected: tintColorDark,
    card: '#1E293B', // Slate 800
    border: '#334155', // Slate 700
    notification: '#F87171', // Red 400
    success: '#34D399',
    warning: '#FBBF24',
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
