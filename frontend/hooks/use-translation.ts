import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppProvider'; // Keep useAppContext to provide appLanguage for compatibility

export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation(); // Get t and i18n from react-i18next
  const { appLanguage: contextAppLanguage } = useAppContext(); // Get appLanguage from original context

  // Determine the language to return. Prioritize react-i18next's language,
  // but fall back to the context's appLanguage if react-i18next's language is not set
  // or if the original appLanguage is explicitly needed for other parts of the app.
  // For compatibility, we'll return the language from react-i18next as appLanguage.
  const appLanguage = i18n.language || contextAppLanguage;

  return { t, appLanguage };
};
