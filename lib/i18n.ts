import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/tr';

dayjs.extend(localizedFormat);

import en from './i18n/locales/en.json';
import tr from './i18n/locales/tr.json';

const LANGUAGE_KEY = 'user-language';

// Get default device language
const getDeviceLanguage = (): string => {
  const locales = getLocales();
  if (locales && locales.length > 0) {
    const code = locales[0].languageCode;
    if (code === 'tr' || code === 'en') {
      return code;
    }
  }
  return 'en';
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: { translation: en },
      tr: { translation: tr },
    },
  });
}

// Sync dayjs locale with i18n reactively
i18n.on('languageChanged', (lng) => {
  const baseLng = lng.split('-')[0];
  dayjs.locale(baseLng);
});

// Set initial dayjs locale based on initial configuration
dayjs.locale(i18n.language || 'en');

/**
 * Loads the user's saved language preference from secure storage.
 * If found, changes the active i18n language.
 * Falls back to system language.
 */
export const initLanguage = async (): Promise<string> => {
  try {
    const savedLanguage = await SecureStore.getItemAsync(LANGUAGE_KEY);
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'tr')) {
      dayjs.locale(savedLanguage);
      await i18n.changeLanguage(savedLanguage);
      return savedLanguage;
    }
  } catch (error) {
    console.error('Failed to load persisted language preference:', error);
  }
  const fallback = i18n.language || 'en';
  dayjs.locale(fallback.split('-')[0]);
  return fallback;
};

/**
 * Updates the active language and persists the choice in secure storage.
 */
export const changeLanguage = async (lang: 'en' | 'tr'): Promise<void> => {
  try {
    dayjs.locale(lang);
    await i18n.changeLanguage(lang);
    await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
  } catch (error) {
    console.error('Failed to save language preference:', error);
  }
};

export default i18n;
