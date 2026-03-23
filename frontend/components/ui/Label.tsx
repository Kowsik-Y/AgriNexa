import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface LabelProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  required?: boolean;
}

export const Label = ({ children, style, required }: LabelProps) => {
  const { colors } = useTheme();
  return (
    <Text style={[styles.label, { color: colors.foreground }, style]}>
      {children}
      {required && <Text style={{ color: colors.destructive }}> *</Text>}
    </Text>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 14,
    marginBottom: 8,
  },
});
