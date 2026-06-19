import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../assets/locales/en.json';
import ta from '../assets/locales/ta.json';
import hi from '../assets/locales/hi.json';
import ml from '../assets/locales/ml.json';
import kn from '../assets/locales/kn.json';
import te from '../assets/locales/te.json';

export const languageMap: Record<string, string> = {
  en: 'English',
  ta: 'Tamil',
  hi: 'Hindi',
  ml: 'Malayalam',
  kn: 'Kannada',
  te: 'Telugu'
};

const resources = {
  English: { translation: en },
  Tamil: { translation: ta },
  Hindi: { translation: hi },
  Malayalam: { translation: ml },
  Kannada: { translation: kn },
  Telugu: { translation: te }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'English',
    fallbackLng: 'English',
    interpolation: {
      escapeValue: false
    },
    keySeparator: false,
    react: {
      useSuspense: false
    }
  });

export default i18n;
