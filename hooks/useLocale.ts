import { useTranslation } from 'react-i18next';
import type { SupportedLanguage } from '@/i18n/types';

/**
 * Custom hook for managing application locale/language
 *
 * Provides:
 * - currentLanguage: The currently active language code
 * - changeLanguage: Function to change the app language
 * - isEnglish: Boolean indicating if current language is English
 * - isChinese: Boolean indicating if current language is Chinese
 *
 * @example
 * const { currentLanguage, changeLanguage, isEnglish } = useLocale();
 *
 * // Change language
 * await changeLanguage('zh-CN');
 *
 * // Check current language
 * if (isEnglish) {
 *   // Do something for English users
 * }
 */
export const useLocale = () => {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language as SupportedLanguage;

  const changeLanguage = async (language: SupportedLanguage) => {
    await i18n.changeLanguage(language);
    // Persist to localStorage (handled automatically by i18next-browser-languagedetector)
    localStorage.setItem('hobbi-language', language);
  };

  return {
    currentLanguage,
    changeLanguage,
    isEnglish: currentLanguage === 'en',
    isChinese: currentLanguage === 'zh-CN',
  };
};
