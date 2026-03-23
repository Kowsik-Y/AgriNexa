import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ViewStyle,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import { Button } from './Button';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  const { colors } = useTheme();

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
            <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
              <Card style={styles.card}>
                {children}
                <TouchableOpacity
                  onPress={() => onOpenChange(false)}
                  style={styles.closeButton}
                >
                  <X size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </Card>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export const AlertDialog = ({ open, onOpenChange, children }: DialogProps) => {
  const { colors } = useTheme();
  return (
    <Modal
      transparent
      visible={open}
      onRequestClose={() => onOpenChange(false)}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
          <Card style={styles.card}>
            {children}
          </Card>
        </View>
      </View>
    </Modal>
  );
};

export { CardHeader as DialogHeader, CardTitle as DialogTitle, CardDescription as DialogDescription, CardContent as DialogContent, CardFooter as DialogFooter };
export { CardHeader as AlertDialogHeader, CardTitle as AlertDialogTitle, CardDescription as AlertDialogDescription, CardContent as AlertDialogContent, CardFooter as AlertDialogFooter };

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 8,
    overflow: 'hidden',
  },
  card: {
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
});
