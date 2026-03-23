import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';

interface AccordionProps {
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Accordion = ({ children, style }: AccordionProps) => {
  return <View style={[styles.accordion, style]}>{children}</View>;
};

interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const AccordionItem = ({ children, style }: AccordionItemProps) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.item, { borderBottomColor: colors.border }, style]}>
      {children}
    </View>
  );
};

export const AccordionTrigger = ({
  children,
  expanded,
  onPress,
}: {
  children: React.ReactNode;
  expanded?: boolean;
  onPress?: () => void;
}) => {
  const { colors } = useTheme();
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withSpring(expanded ? 180 : 0);
  }, [expanded]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.trigger}
    >
      <Text style={[styles.triggerText, { color: colors.foreground }]}>
        {children}
      </Text>
      <Animated.View style={animatedStyle}>
        <ChevronDown size={16} color={colors.mutedForeground} />
      </Animated.View>
    </TouchableOpacity>
  );
};

export const AccordionContent = ({
  children,
  expanded,
}: {
  children: React.ReactNode;
  expanded?: boolean;
}) => {
  const { colors } = useTheme();
  const height = useSharedValue(0);

  // Simplified version: in real apps, we'd measure content height
  React.useEffect(() => {
    height.value = withTiming(expanded ? 1 : 0, { duration: 200 });
  }, [expanded]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: height.value,
    maxHeight: interpolate(height.value, [0, 1], [0, 500]),
    overflow: 'hidden',
  }));

  return (
    <Animated.View style={[animatedStyle]}>
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
};

// Wrapper for easier use
export const AccordionRoot = ({ children }: { children: React.ReactNode }) => {
  const [expandedValue, setExpandedValue] = useState<string | null>(null);

  return (
    <View>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const itemValue = (child.props as any).value;
          return React.cloneElement(child, {
            children: React.Children.map((child.props as any).children, (innerChild) => {
              if (React.isValidElement(innerChild)) {
                if (innerChild.type === AccordionTrigger) {
                  return React.cloneElement(innerChild, {
                    expanded: expandedValue === itemValue,
                    onPress: () => setExpandedValue(expandedValue === itemValue ? null : itemValue),
                  } as any);
                }
                if (innerChild.type === AccordionContent) {
                  return React.cloneElement(innerChild, {
                    expanded: expandedValue === itemValue,
                  } as any);
                }
              }
              return innerChild;
            }),
          } as any);
        }
        return child;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  accordion: {
    width: '100%',
  },
  item: {
    borderBottomWidth: 1,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    paddingBottom: 16,
  },
});
