import React from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle, StyleProp, Text } from 'react-native';
import { Typography } from './Typography';
import { useTheme } from '@/hooks/use-theme';

interface RadioGroupProps {
  value?: string;
  onValueChange?: (value: string) => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export const RadioGroup = ({ value, onValueChange, children, style }: RadioGroupProps) => {
  return (
    <View style={[styles.group, style]}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            // @ts-ignore
            checked: child.props.value === value,
            // @ts-ignore
            onPress: () => onValueChange?.(child.props.value),
          });
        }
        return child;
      })}
    </View>
  );
};

interface RadioGroupItemProps {
  value: string;
  checked?: boolean;
  onPress?: () => void;
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const RadioGroupItem = ({
  checked,
  onPress,
  label,
  disabled,
  style,
}: RadioGroupItemProps) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      style={[styles.itemContainer, style]}
    >
      <View
        style={[
          styles.radio,
          { borderColor: checked ? colors.primary : colors.input },
          disabled && { opacity: 0.5 },
        ]}
      >
        {checked && (
          <View style={[styles.inner, { backgroundColor: colors.primary }]} />
        )}
      </View>
      {label && (
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  group: {
    gap: 12,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radio: {
    height: 18,
    width: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    height: 10,
    width: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});
