import React from 'react';
import { View, StyleSheet, useWindowDimensions, ViewStyle } from 'react-native';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  maxWidth?: number;
}

export const ResponsiveContainer = ({ 
  children, 
  style, 
  maxWidth = 1000 
}: ResponsiveContainerProps) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <View style={[
      styles.base,
      isDesktop && { 
        maxWidth: maxWidth, 
        width: '100%', 
        alignSelf: 'center',
        paddingHorizontal: 40 
      },
      style
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
});
