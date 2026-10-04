import { Colors } from '@/constants/theme';
import { useAppContext } from '@/context/AppProvider';

/**
 * A hook to easily access theme colors based on the current color scheme.
 */
export const useThemeColors = () => {
  const { theme } = useAppContext();
  const colors = Colors[theme] || Colors.light;
  return {
    ...colors,
    theme: theme || 'light',
    isDark: theme === 'dark',
  };
};
