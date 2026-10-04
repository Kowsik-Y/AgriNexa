import React, { forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Scan, Sprout, type LucideProps } from 'lucide-react-native';
import { cssInterop } from 'nativewind';
import { resolveLucideColor } from '@/components/reusables/icon';
import { useThemeColors } from '@/hooks/use-theme-colors';

/**
 * Composite Lucide icon for Crop Scan:
 * Merges the `Scan` viewfinder corners with a centered `Sprout` plant icon.
 */
export const CropScanIcon = forwardRef<View, LucideProps>(function CropScanIcon(
  { size = 20, color, strokeWidth = 2, style, ...props },
  ref
) {
  const themeColors = useThemeColors();
  const flattened = StyleSheet.flatten(style) || {};
  const { color: styleColor, ...cleanStyle } = flattened as any;
  const resolvedColor = resolveLucideColor(color || styleColor, (props as any)?.className, themeColors) || (themeColors.isDark ? '#34D399' : '#10B981');
  const numSize = typeof size === 'number' ? size : parseInt(String(size), 10) || 20;
  const innerSize = Math.max(10, Math.round(numSize * 0.56));

  return (
    <View
      ref={ref}
      style={[
        {
          width: numSize,
          height: numSize,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        },
        cleanStyle,
      ]}
      {...props}
    >
      <Scan
        size={numSize}
        color={resolvedColor}
        strokeWidth={strokeWidth}
        style={StyleSheet.absoluteFill}
      />
      <Sprout
        size={innerSize}
        color={resolvedColor}
        strokeWidth={strokeWidth}
      />
    </View>
  );
});

cssInterop(CropScanIcon, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      height: 'size',
      width: 'size',
      color: true,
    },
  },
});
