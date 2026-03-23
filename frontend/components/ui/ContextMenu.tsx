import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Card } from './Card';

interface ContextMenuProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
}

export const ContextMenu = ({ children, trigger }: ContextMenuProps) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <TouchableOpacity
        onLongPress={() => setOpen(true)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        {trigger}
      </TouchableOpacity>
      <Modal
        transparent
        visible={open}
        onRequestClose={() => setOpen(false)}
        animationType="fade"
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
                <Card style={styles.card}>
                  <View style={styles.content}>{children}</View>
                </Card>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export const ContextMenuItem = ({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.item, { borderBottomColor: colors.border }]}
    >
      <Text style={[styles.itemText, { color: colors.foreground }]}>{children}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    width: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  card: {
    borderWidth: 0,
  },
  content: {
    padding: 4,
  },
  item: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    fontSize: 14,
  },
});
