import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import English translation files
import enCommon from '../locales/en/common.json';
import enLanding from '../locales/en/landing.json';
import enSession from '../locales/en/session.json';
import enHistory from '../locales/en/history.json';
import enAuth from '../locales/en/auth.json';
import enSettings from '../locales/en/settings.json';
import enErrors from '../locales/en/errors.json';

// Import Chinese (Simplified) translation files
import zhCommon from '../locales/zh-CN/common.json';
import zhLanding from '../locales/zh-CN/landing.json';
import zhSession from '../locales/zh-CN/session.json';
import zhHistory from '../locales/zh-CN/history.json';
import zhAuth from '../locales/zh-CN/auth.json';
import zhSettings from '../locales/zh-CN/settings.json';
import zhErrors from '../locales/zh-CN/errors.json';

// Configure resources
const resources = {
  en: {
    common: enCommon,
    landing: enLanding,
    session: enSession,
    history: enHistory,
    auth: enAuth,
    settings: enSettings,
    errors: enErrors,
  },
  'zh-CN': {
    common: zhCommon,
    landing: zhLanding,
    session: zhSession,
    history: zhHistory,
    auth: zhAuth,
    settings: zhSettings,
    errors: zhErrors,
  },
} as const;

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'landing', 'session', 'history', 'auth', 'settings', 'errors'],

    interpolation: {
      escapeValue: false, // React already escapes values to prevent XSS
    },

    detection: {
      // Order of language detection methods
      order: ['localStorage', 'navigator'],
      // Cache user language preference
      caches: ['localStorage'],
      // localStorage key name
      lookupLocalStorage: 'hobbi-language',
    },

    react: {
      // Disable suspense to avoid loading states during migration
      useSuspense: false,
    },

    // Development options
    debug: false, // Set to true for debugging
  });

export default i18n;
