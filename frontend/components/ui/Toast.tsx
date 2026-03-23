import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ToastType = 'default' | 'success' | 'warning' | 'destructive' | 'info';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  type?: ToastType;
}

interface ToastContextType {
  toast: (props: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { colors } = useTheme();

  const toast = useCallback(({ title, description, type = 'default' }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} {...t} onRemove={() => removeToast(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastItem = ({ title, description, type, onRemove }: Toast & { onRemove: () => void }) => {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }),
    ]).start();
  }, []);

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle size={20} color={colors.success} />;
      case 'warning': return <AlertTriangle size={20} color={colors.warning} />;
      case 'destructive': return <AlertCircle size={20} color={colors.destructive} />;
      case 'info': return <Info size={20} color={colors.tint} />;
      default: return null;
    }
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: colors.card, borderColor: colors.border, opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.iconContainer}>{getIcon()}</View>
      <View style={styles.textContainer}>
        {title && <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>}
        {description && <Text style={[styles.description, { color: colors.mutedForeground }]}>{description}</Text>}
      </View>
      <TouchableOpacity onPress={onRemove} style={styles.close}>
        <X size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    width: '100%',
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    width: SCREEN_WIDTH - 32,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    marginTop: 2,
  },
  close: {
    padding: 4,
  },
});
