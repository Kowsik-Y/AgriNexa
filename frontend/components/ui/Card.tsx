import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp, Platform } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Card = ({ children, style }: CardProps) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export const CardHeader = ({ children, style }: CardProps) => (
  <View style={[styles.header, style]}>{children}</View>
);

import { Typography } from './Typography';

export const CardTitle = ({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => {
  const { colors } = useTheme();
  return (
    <Typography.H4 style={[{ color: colors.cardForeground }, style]}>
      {children}
    </Typography.H4>
  );
};

export const CardDescription = ({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => {
  const { colors } = useTheme();
  return (
    <Typography.Muted style={[{ color: colors.mutedForeground }, style]}>
      {children}
    </Typography.Muted>
  );
};

export const CardContent = ({ children, style }: CardProps) => (
  <View style={[styles.content, style]}>{children}</View>
);

export const CardFooter = ({ children, style }: CardProps) => (
  <View style={[styles.footer, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
      },
    }),
  },
  header: {
    padding: 24,
    paddingBottom: 0,
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
  },
  content: {
    padding: 24,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingTop: 0,
  },
});
