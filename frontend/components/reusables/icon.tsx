import { TextClassContext } from '@/components/reusables/text';
import { cn } from '@/lib/utils';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { cssInterop } from 'nativewind';
import * as React from 'react';
import { StyleSheet, type ColorValue } from 'react-native';

const TAILWIND_COLOR_MAP: Record<string, string> = {
  // Emerald
  'emerald-200': '#A7F3D0',
  'emerald-300': '#6EE7B7',
  'emerald-400': '#34D399',
  'emerald-500': '#10B981',
  'emerald-600': '#059669',
  'emerald-700': '#047857',
  // Amber
  'amber-200': '#FDE68A',
  'amber-300': '#FCD34D',
  'amber-400': '#FBBF24',
  'amber-500': '#F59E0B',
  'amber-600': '#D97706',
  'amber-700': '#B45309',
  // Violet
  'violet-200': '#DDD6FE',
  'violet-300': '#C4B5FD',
  'violet-400': '#A78BFA',
  'violet-500': '#8B5CF6',
  'violet-600': '#7C3AED',
  'violet-700': '#6D28D9',
  // Orange
  'orange-200': '#FED7AA',
  'orange-300': '#FDBA74',
  'orange-400': '#FB923C',
  'orange-500': '#F97316',
  'orange-600': '#EA580C',
  'orange-700': '#C2410C',
  // Lime
  'lime-200': '#D9F99D',
  'lime-300': '#BEF264',
  'lime-400': '#A3E635',
  'lime-500': '#84CC16',
  'lime-600': '#65A30D',
  'lime-700': '#4D7C0F',
  // Sky
  'sky-200': '#BAE6FD',
  'sky-300': '#7DD3FC',
  'sky-400': '#38BDF8',
  'sky-500': '#0EA5E9',
  'sky-600': '#0284C7',
  'sky-700': '#0369A1',
  // Red
  'red-200': '#FECACA',
  'red-300': '#FCA5A5',
  'red-400': '#F87171',
  'red-500': '#EF4444',
  'red-600': '#DC2626',
  'red-700': '#B91C1C',
  // Blue
  'blue-200': '#BFDBFE',
  'blue-300': '#93C5FD',
  'blue-400': '#60A5FA',
  'blue-500': '#3B82F6',
  'blue-600': '#2563EB',
  'blue-700': '#1D4ED8',
  // Teal
  'teal-200': '#99F6E4',
  'teal-300': '#5EEAD4',
  'teal-400': '#2DD4BF',
  'teal-500': '#14B8A6',
  'teal-600': '#0D9488',
  'teal-700': '#0F766E',
  // Indigo
  'indigo-200': '#C7D2FE',
  'indigo-300': '#A5B4FC',
  'indigo-400': '#818CF8',
  'indigo-500': '#6366F1',
  'indigo-600': '#4F46E5',
  'indigo-700': '#4338CA',
  // Cyan
  'cyan-200': '#A5F3FC',
  'cyan-300': '#67E8F9',
  'cyan-400': '#22D3EE',
  'cyan-500': '#06B6D4',
  'cyan-600': '#0891B2',
  'cyan-700': '#0E7490',
  // Slate
  'slate-200': '#E2E8F0',
  'slate-300': '#CBD5E1',
  'slate-400': '#94A3B8',
  'slate-500': '#64748B',
  'slate-600': '#475569',
  'slate-700': '#334155',
  // Rose
  'rose-200': '#FECDD3',
  'rose-300': '#FDA4AF',
  'rose-400': '#FB7185',
  'rose-500': '#F43F5E',
  'rose-600': '#E11D48',
  'rose-700': '#BE123C',
  // Gray
  'gray-200': '#E5E7EB',
  'gray-300': '#D1D5DB',
  'gray-400': '#9CA3AF',
  'gray-500': '#6B7280',
  'gray-600': '#4B5563',
  'gray-700': '#374151',
  // Zinc
  'zinc-200': '#E4E4E7',
  'zinc-300': '#D4D4D8',
  'zinc-400': '#A1A1AA',
  'zinc-500': '#71717A',
  'zinc-600': '#52525B',
  'zinc-700': '#3F3F46',
  // Basics
  'white': '#FFFFFF',
  'black': '#000000',
};

/**
 * Resolves Lucide icon colors to concrete hex/rgb values.
 * React Native SVG on Android cannot parse CSS variables like `hsl(var(--primary))`
 * or `currentColor`, so this ensures a valid color is always delivered to native Android.
 */
export function resolveLucideColor(
  rawColor: ColorValue | string | undefined,
  className: string | undefined,
  themeColors?: ReturnType<typeof useThemeColors>
): string {
  const isDark = Boolean(themeColors?.isDark);

  // 1. If explicit valid hex or rgb color passed
  if (rawColor && typeof rawColor === 'string' && rawColor !== 'currentColor') {
    if (rawColor.startsWith('#') || rawColor.startsWith('rgb(') || rawColor.startsWith('rgba(')) {
      return rawColor;
    }
    // Check if rawColor is a CSS variable like hsl(var(--primary)) or var(--...)
    if (themeColors) {
      if (rawColor.includes('--primary-foreground')) return themeColors.primaryForeground || (isDark ? '#0F172A' : '#FFFFFF');
      if (rawColor.includes('--primary')) return themeColors.primary || (isDark ? '#34D399' : '#10B981');
      if (rawColor.includes('--muted-foreground')) return themeColors.mutedForeground || (isDark ? '#94A3B8' : '#64748B');
      if (rawColor.includes('--foreground')) return themeColors.foreground || (isDark ? '#F1F5F9' : '#0F172A');
      if (rawColor.includes('--destructive')) return themeColors.destructive || '#EF4444';
      if (rawColor.includes('--card-foreground')) return themeColors.cardForeground || (isDark ? '#F1F5F9' : '#0F172A');
    }
  }

  // 2. Extract from className if present
  if (className && typeof className === 'string') {
    // If in dark theme, check dark: variants first
    if (isDark) {
      if (className.includes('dark:text-primary-foreground')) return themeColors?.primaryForeground || '#0F172A';
      if (className.includes('dark:text-primary')) return themeColors?.primary || '#34D399';
      if (className.includes('dark:text-muted-foreground')) return themeColors?.mutedForeground || '#94A3B8';
      if (className.includes('dark:text-foreground')) return themeColors?.foreground || '#F1F5F9';
      if (className.includes('dark:text-background')) return themeColors?.background || '#020817';
      if (className.includes('dark:text-destructive')) return themeColors?.destructive || '#F87171';
      if (className.includes('dark:text-white')) return '#FFFFFF';
      if (className.includes('dark:text-black')) return '#000000';

      const darkMatch = className.match(/\bdark:text-([a-z]+-[0-9]+)\b/);
      if (darkMatch && TAILWIND_COLOR_MAP[darkMatch[1]]) {
        return TAILWIND_COLOR_MAP[darkMatch[1]];
      }
    }

    // Standard classes
    if (className.includes('text-primary-foreground')) return themeColors?.primaryForeground || (isDark ? '#0F172A' : '#FFFFFF');
    if (className.includes('text-primary')) return themeColors?.primary || (isDark ? '#34D399' : '#10B981');
    if (className.includes('text-muted-foreground')) return themeColors?.mutedForeground || (isDark ? '#94A3B8' : '#64748B');
    if (className.includes('text-foreground')) return themeColors?.foreground || (isDark ? '#F1F5F9' : '#0F172A');
    if (className.includes('text-background')) return themeColors?.background || (isDark ? '#020817' : '#FFFFFF');
    if (className.includes('text-destructive')) return themeColors?.destructive || '#EF4444';
    if (className.includes('text-white')) return '#FFFFFF';
    if (className.includes('text-black')) return '#000000';

    const match = className.match(/(?:^|\s)text-([a-z]+-[0-9]+)\b/);
    if (match && TAILWIND_COLOR_MAP[match[1]]) {
      return TAILWIND_COLOR_MAP[match[1]];
    }
  }

  // 3. Fallback
  if (rawColor && typeof rawColor === 'string' && rawColor !== 'currentColor' && !rawColor.startsWith('hsl(')) {
    return rawColor;
  }

  return themeColors?.foreground || (isDark ? '#F1F5F9' : '#0F172A');
}

type IconProps = LucideProps & {
  as: LucideIcon;
} & React.RefAttributes<LucideIcon>;

/**
 * A wrapper component for Lucide icons with Nativewind `className` support via `cssInterop`.
 *
 * This component allows you to render any Lucide icon while applying utility classes
 * using `nativewind`. It ensures colors are safely resolved to hex values for Android compatibility
 * and dynamic light/dark mode changes.
 */
function Icon({ as: IconComponent, className, color, size = 14, style, ...props }: IconProps) {
  const textClass = React.useContext(TextClassContext);
  const themeColors = useThemeColors();

  const combinedClassName = cn(textClass, className);
  const flattened = StyleSheet.flatten(style) || {};
  const { color: styleColor, ...cleanStyle } = flattened as any;

  const resolvedColor = resolveLucideColor(color || styleColor, combinedClassName, themeColors);

  return (
    <IconComponent
      color={resolvedColor}
      size={size}
      style={cleanStyle}
      {...props}
    />
  );
}

cssInterop(Icon, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      height: 'size',
      width: 'size',
      color: true,
    },
  },
});

export { Icon };


