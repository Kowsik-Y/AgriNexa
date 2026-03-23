import React, { useState } from 'react';
import { View, StyleSheet, PanResponder, Animated, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface ResizableProps {
  children: [React.ReactNode, React.ReactNode];
  direction?: 'horizontal' | 'vertical';
  style?: StyleProp<ViewStyle>;
}

export const Resizable = ({
  children,
  direction = 'horizontal',
  style,
}: ResizableProps) => {
  const { colors } = useTheme();
  const [size, setSize] = useState(200);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      const delta = direction === 'horizontal' ? gestureState.dx : gestureState.dy;
      setSize((prev) => Math.max(50, prev + delta));
    },
  });

  return (
    <View
      style={[
        styles.container,
        direction === 'horizontal' ? styles.row : styles.column,
        style,
      ]}
    >
      <View
        style={[
          direction === 'horizontal' ? { width: size } : { height: size },
          { overflow: 'hidden' },
        ]}
      >
        {children[0]}
      </View>
      <View
        {...panResponder.panHandlers}
        style={[
          { backgroundColor: colors.border },
          direction === 'horizontal' ? styles.headerHorizontal : styles.headerVertical,
        ]}
      />
      <View style={{ flex: 1 }}>{children[1]}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
  handle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerHorizontal: {
    width: 8,
    height: '100%',
  },
  headerVertical: {
    height: 8,
    width: '100%',
  },
});
