import { Colors } from '@/constants/theme';
import { useAppContext } from '@/context/AppProvider';

/**
 * A hook to easily access theme colors based on the current color scheme.
 */
export const useThemeColors = () => {
  try {
    const { theme } = useAppContext();
    return Colors[theme];
  } catch (e) {
    // Fallback for cases where context is not yet available
    return Colors.light;
  }
};
