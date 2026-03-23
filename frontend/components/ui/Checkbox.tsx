import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Animated,
  StyleProp,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Checkbox = ({
  checked = false,
  onCheckedChange,
  disabled = false,
  style,
}: CheckboxProps) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onCheckedChange?.(!checked)}
      disabled={disabled}
      style={[
        styles.checkbox,
        {
          borderColor: checked ? colors.primary : colors.input,
          backgroundColor: checked ? colors.primary : 'transparent',
        },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {checked && <Check size={14} color={colors.primaryForeground} strokeWidth={3} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  checkbox: {
    height: 18,
    width: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
