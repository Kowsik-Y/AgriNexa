import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
}

export const Tooltip = ({ children, content }: TooltipProps) => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View>
      <TouchableOpacity
        onLongPress={() => setVisible(true)}
        delayLongPress={300}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.overlay}>
            <View
              style={[
                styles.content,
                { backgroundColor: colors.foreground, shadowColor: '#000' },
              ]}
            >
              <Text style={[styles.text, { color: colors.background }]}>
                {content}
              </Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => children;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    maxWidth: 200,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
