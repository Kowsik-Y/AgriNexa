import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ViewStyle,
  KeyboardAvoidingViewProps,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  View,
  ScrollViewProps,
  StyleProp,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';

interface KeyboardResponsiveViewProps extends KeyboardAvoidingViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  dismissKeyboardOnTap?: boolean;
  useScrollView?: boolean;
  scrollViewProps?: Partial<ScrollViewProps>;
}

export const KeyboardResponsiveView = ({
  children,
  style,
  contentContainerStyle,
  dismissKeyboardOnTap = true,
  useScrollView = true,
  scrollViewProps,
  behavior = Platform.OS === 'ios' ? 'padding' : undefined,
  keyboardVerticalOffset,
  ...props
}: KeyboardResponsiveViewProps) => {
  const headerHeight = useHeaderHeight();
  const offset = keyboardVerticalOffset ?? (Platform.OS === 'ios' ? headerHeight : 0);

  const content = useScrollView ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      keyboardShouldPersistTaps={dismissKeyboardOnTap ? "handled" : "never"}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <KeyboardAvoidingView
      behavior={behavior}
      style={[styles.container, style]}
      keyboardVerticalOffset={offset}
      {...props}
    >
      {content}
    </KeyboardAvoidingView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
