import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, NativeEventEmitter } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface InputOTPProps {
  length?: number;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

export const InputOTP = ({
  length = 6,
  value = '',
  onValueChange,
  disabled = false,
}: InputOTPProps) => {
  const { colors } = useTheme();
  const inputs = useRef<TextInput[]>([]);

  const handleChange = (text: string, index: number) => {
    const newValue = value.split('');
    newValue[index] = text;
    const finalValue = newValue.join('');
    onValueChange?.(finalValue);

    if (text && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, i) => (
        <TextInput
          key={i}
          ref={(ref) => {
            if (ref) inputs.current[i] = ref;
          }}
          style={[
            styles.input,
            {
              borderColor: value[i] ? colors.primary : colors.input,
              color: colors.foreground,
              backgroundColor: colors.background,
            },
          ]}
          maxLength={1}
          keyboardType="number-pad"
          value={value[i] || ''}
          onChangeText={(text) => handleChange(text, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          editable={!disabled}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  input: {
    width: 40,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
});
