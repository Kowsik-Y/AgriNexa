import { Colors } from '@/constants/theme';
import { useAppContext } from '@/context/AppProvider';

/**
 * A hook to easily access theme colors based on the current color scheme.
 */
export const useThemeColors = () => {
  const { theme } = useAppContext();
  return Colors[theme] || Colors.light;
};
