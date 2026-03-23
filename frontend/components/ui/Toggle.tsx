import React, { createContext, useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

const ToggleGroupContext = createContext<{
  value?: string | string[];
  onValueChange?: (value: any) => void;
  type?: 'single' | 'multiple';
}>({});

interface ToggleGroupProps {
  type?: 'single' | 'multiple';
  value?: string | string[];
  onValueChange?: (value: any) => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const ToggleGroup = ({
  type = 'single',
  value,
  onValueChange,
  children,
  style,
}: ToggleGroupProps) => {
  return (
    <ToggleGroupContext.Provider value={{ value, onValueChange, type }}>
      <View style={[styles.group, style]}>{children}</View>
    </ToggleGroupContext.Provider>
  );
};

interface ToggleProps {
  value: string;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Toggle = ({
  value,
  variant = 'default',
  size = 'default',
  children,
  style,
}: ToggleProps) => {
  const { colors } = useTheme();
  const { value: activeValue, onValueChange, type } = useContext(ToggleGroupContext);

  const isActive = Array.isArray(activeValue)
    ? activeValue.includes(value)
    : activeValue === value;

  const handlePress = () => {
    if (!onValueChange) return;

    if (type === 'multiple' && Array.isArray(activeValue)) {
      if (isActive) {
        onValueChange(activeValue.filter((v) => v !== value));
      } else {
        onValueChange([...activeValue, value]);
      }
    } else {
      onValueChange(isActive ? undefined : value);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={[
        styles.toggle,
        variant === 'outline' && { borderWidth: 1, borderColor: colors.border },
        isActive && { backgroundColor: colors.accent, borderColor: colors.accent },
        size === 'sm' && { height: 32, paddingHorizontal: 12 },
        size === 'lg' && { height: 44, paddingHorizontal: 32 },
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Text
          style={[
            styles.text,
            { color: isActive ? colors.foreground : colors.mutedForeground },
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    gap: 4,
  },
  toggle: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});
