import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface TypographyProps extends TextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  className?: string; // Not used but kept for consistency if NativeWind is added later
}

export const H1 = ({ children, style, ...props }: TypographyProps) => {
  const { colors } = useTheme();
  return (
    <Text
      style={[styles.h1, { color: colors.foreground }, style]}
      {...props}
    >
      {children}
    </Text>
  );
};

export const H2 = ({ children, style, ...props }: TypographyProps) => {
  const { colors } = useTheme();
  return (
    <Text
      style={[styles.h2, { color: colors.foreground }, style]}
      {...props}
    >
      {children}
    </Text>
  );
};

export const H3 = ({ children, style, ...props }: TypographyProps) => {
  const { colors } = useTheme();
  return (
    <Text
      style={[styles.h3, { color: colors.foreground }, style]}
      {...props}
    >
      {children}
    </Text>
  );
};

export const H4 = ({ children, style, ...props }: TypographyProps) => {
  const { colors } = useTheme();
  return (
    <Text
      style={[styles.h4, { color: colors.foreground }, style]}
      {...props}
    >
      {children}
    </Text>
  );
};

export const P = ({ children, style, ...props }: TypographyProps) => {
  const { colors } = useTheme();
  return (
    <Text
      style={[styles.p, { color: colors.foreground }, style]}
      {...props}
    >
      {children}
    </Text>
  );
};

export const Lead = ({ children, style, ...props }: TypographyProps) => {
  const { colors } = useTheme();
  return (
    <Text
      style={[styles.lead, { color: colors.mutedForeground }, style]}
      {...props}
    >
      {children}
    </Text>
  );
};

export const Large = ({ children, style, ...props }: TypographyProps) => {
  const { colors } = useTheme();
  return (
    <Text
      style={[styles.large, { color: colors.foreground }, style]}
      {...props}
    >
      {children}
    </Text>
  );
};

export const Small = ({ children, style, ...props }: TypographyProps) => {
  const { colors } = useTheme();
  return (
    <Text
      style={[styles.small, { color: colors.foreground }, style]}
      {...props}
    >
      {children}
    </Text>
  );
};

export const Muted = ({ children, style, ...props }: TypographyProps) => {
  const { colors } = useTheme();
  return (
    <Text
      style={[styles.muted, { color: colors.mutedForeground }, style]}
      {...props}
    >
      {children}
    </Text>
  );
};

export const Typography = {
  H1,
  H2,
  H3,
  H4,
  P,
  Lead,
  Large,
  Small,
  Muted,
};

const styles = StyleSheet.create({
  h1: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.75,
    lineHeight: 36,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.5,
    lineHeight: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0', // Adjust in component if needed
    paddingBottom: 8,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.25,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  p: {
    fontSize: 16,
    lineHeight: 24,
  },
  lead: {
    fontSize: 20,
    lineHeight: 28,
  },
  large: {
    fontSize: 18,
    fontWeight: '600',
  },
  small: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 14,
  },
  muted: {
    fontSize: 14,
    lineHeight: 14,
  },
});
