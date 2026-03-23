import React, { createContext, useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

const TabsContext = createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});

interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Tabs = ({ defaultValue, value: propValue, onValueChange, children, style }: TabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  const value = propValue ?? activeTab;
  const handleValueChange = onValueChange ?? setActiveTab;

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <View style={[styles.tabs, style]}>{children}</View>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.list, { backgroundColor: colors.muted }, style]}>
      {children}
    </View>
  );
};

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const TabsTrigger = ({ value, children, style, textStyle }: TabsTriggerProps) => {
  const { value: activeValue, onValueChange } = useContext(TabsContext);
  const { colors } = useTheme();
  const isActive = activeValue === value;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onValueChange?.(value)}
      style={[
        styles.trigger,
        isActive && { backgroundColor: colors.background, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: 1 },
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Text
          style={[
            styles.triggerText,
            { color: isActive ? colors.foreground : colors.mutedForeground },
            textStyle,
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

export const TabsContent = ({ value, children, style }: { value: string; children: React.ReactNode; style?: ViewStyle }) => {
  const { value: activeValue } = useContext(TabsContext);
  if (activeValue !== value) return null;
  return <View style={[styles.content, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  tabs: {
    width: '100%',
  },
  list: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  trigger: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    marginTop: 8,
  },
});
