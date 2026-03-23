import React, { useState } from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';

interface InputProps extends TextInputProps {
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
}

export const Input = ({
  containerStyle,
  style,
  error,
  leftIcon,
  rightIcon,
  clearable,
  onFocus,
  onBlur,
  onChangeText,
  value,
  ...props
}: InputProps) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: error
            ? colors.destructive
            : isFocused
            ? colors.primary
            : colors.input,
          backgroundColor: colors.background,
        },
        containerStyle,
      ]}
    >
      {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
      <TextInput
        style={[styles.input, { color: colors.foreground }, style]}
        placeholderTextColor={colors.mutedForeground}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        onChangeText={onChangeText}
        value={value}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
      {clearable && value && value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText?.('')} style={styles.rightIcon}>
          <X size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}
      {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
    </View>
  );
};

export const Textarea = ({ style, ...props }: InputProps) => {
  return (
    <Input
      multiline
      numberOfLines={4}
      style={[styles.textarea, style]}
      textAlignVertical="top"
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    height: 44,
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  textarea: {
    height: 100,
    paddingVertical: 12,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
});
