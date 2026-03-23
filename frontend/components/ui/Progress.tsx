import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface ProgressProps {
  value: number;
  max?: number;
  style?: StyleProp<ViewStyle>;
}

export const Progress = ({ value = 0, style }: ProgressProps) => {
  const { colors } = useTheme();
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(width, {
      toValue: Math.min(100, Math.max(0, value)),
      useNativeDriver: false, // width doesn't support native driver
      bounciness: 0,
    }).start();
  }, [value]);

  const animatedWidth = width.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, { backgroundColor: colors.muted }, style]}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: colors.primary,
            width: animatedWidth,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 8,
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
