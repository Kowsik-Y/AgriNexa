import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Card } from './Card';

interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
}

export const Popover = ({ open, onOpenChange, trigger, children }: PopoverProps) => {
  const { colors } = useTheme();

  return (
    <View>
      <TouchableOpacity onPress={() => onOpenChange(true)}>
        {trigger}
      </TouchableOpacity>
      <Modal
        transparent
        visible={open}
        onRequestClose={() => onOpenChange(false)}
        animationType="fade"
      >
        <TouchableWithoutFeedback onPress={() => onOpenChange(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
                <Card style={styles.card}>
                  {children}
                </Card>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export const PopoverContent = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.content}>{children}</View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    maxWidth: '80%',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  card: {
    borderWidth: 0,
  },
  content: {
    padding: 12,
  },
});
