import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

interface BadgeProps {
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export const Badge = ({
  variant = 'default',
  style,
  textStyle,
  children,
}: BadgeProps) => {
  const { colors } = useTheme();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return { backgroundColor: colors.secondary };
      case 'destructive':
        return { backgroundColor: colors.destructive };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        };
      default:
        return { backgroundColor: colors.primary };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'secondary':
        return { color: colors.secondaryForeground };
      case 'destructive':
        return { color: colors.destructiveForeground };
      case 'outline':
        return { color: colors.foreground };
      default:
        return { color: colors.primaryForeground };
    }
  };

  const renderChildren = () => {
    return React.Children.toArray(children).map((child, index) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return (
          <Text key={`badge-text-${index}`} style={[styles.text, getTextStyle(), textStyle]}>
            {child}
          </Text>
        );
      }

      return child;
    });
  };

  return (
    <View style={[styles.badge, getVariantStyle(), style]}>
      {renderChildren()}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
