import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Sidebar = ({ open, onOpenChange, children }: SidebarProps) => {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(-SCREEN_WIDTH)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: open ? 0 : -SCREEN_WIDTH,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  }, [open]);

  return (
    <Modal
      transparent
      visible={open}
      onRequestClose={() => onOpenChange(false)}
      animationType="fade"
    >
      <TouchableWithoutFeedback onPress={() => onOpenChange(false)}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.sidebar,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  transform: [{ translateX }],
                },
              ]}
            >
              <View style={styles.header}>
                <TouchableOpacity onPress={() => onOpenChange(false)} style={styles.closeButton}>
                  <X size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              {children}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebar: {
    width: '80%',
    maxWidth: 300,
    height: '100%',
    borderRightWidth: 1,
    paddingTop: 48,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  closeButton: {
    padding: 4,
  },
});
