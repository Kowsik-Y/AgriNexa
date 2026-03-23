import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Animated,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Switch = ({
  checked = false,
  onCheckedChange,
  disabled = false,
  style,
}: SwitchProps) => {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(checked ? 18 : 2)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: checked ? 18 : 2,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [checked]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onCheckedChange?.(!checked)}
      disabled={disabled}
      style={[
        styles.track,
        {
          backgroundColor: checked ? colors.primary : colors.input,
        },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            backgroundColor: colors.card,
            transform: [{ translateX }],
          },
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  track: {
    width: 36,
    height: 20,
    borderRadius: 999,
    justifyContent: 'center',
  },
  thumb: {
    width: 16,
    height: 16,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
});
