import { useAppContext } from '@/context/AppProvider';
import { Colors } from '@/constants/theme';

export function useTheme() {
  const { theme, toggleTheme } = useAppContext();
  const colors = Colors[theme];

  return {
    theme,
    colors,
    toggleTheme,
    isDark: theme === 'dark',
  };
}
