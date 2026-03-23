import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  PressableProps,
  Platform,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';

export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  textStyle?: TextStyle;
  children?: React.ReactNode;
}

export const Button = ({
  variant = 'default',
  size = 'default',
  loading = false,
  style,
  textStyle,
  children,
  disabled,
  ...props
}: ButtonProps) => {
  const { colors } = useTheme();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'destructive':
        return { backgroundColor: colors.destructive };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'secondary':
        return { backgroundColor: colors.secondary };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      case 'link':
        return { backgroundColor: 'transparent', paddingHorizontal: 0 };
      default:
        return { backgroundColor: colors.primary };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'destructive':
        return { color: colors.destructiveForeground };
      case 'outline':
        return { color: colors.foreground };
      case 'secondary':
        return { color: colors.secondaryForeground };
      case 'ghost':
        return { color: colors.foreground };
      case 'link':
        return { color: colors.primary, textDecorationLine: 'underline' };
      default:
        return { color: colors.primaryForeground };
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return { height: 32, paddingHorizontal: 12, borderRadius: 6 };
      case 'lg':
        return { height: 44, paddingHorizontal: 32, borderRadius: 8 };
      case 'icon':
        return { height: 36, width: 36, borderRadius: 6, paddingHorizontal: 0 };
      default:
        return { height: 40, paddingHorizontal: 16, borderRadius: 6 };
    }
  };

  const isDisabled = disabled || loading;

  return (
    <Pressable
      android_ripple={{
        color:
          variant === 'default' || variant === 'destructive'
            ? 'rgba(255,255,255,0.2)'
            : 'rgba(0,0,0,0.1)',
      }}
      style={({ pressed }) => [
        styles.base,
        getVariantStyle(),
        getSizeStyle(),
        isDisabled && { opacity: 0.5 },
        !isDisabled && pressed && Platform.OS === 'ios' && { opacity: 0.8 },
        style as ViewStyle,
      ]}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextStyle().color as string} size="small" />
      ) : typeof children === 'string' ? (
        <Text
          style={[
            styles.text,
            size === 'sm' && { fontSize: 13 },
            size === 'lg' && { fontSize: 16 },
            getTextStyle(),
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
