import type { SupportedLanguage } from './types';

/**
 * Get the locale string for date/time formatting from a language code
 */
export const getLocaleFromLanguage = (language: SupportedLanguage): string => {
  const localeMap: Record<SupportedLanguage, string> = {
    'en': 'en-US',
    'zh-CN': 'zh-CN',
  };
  return localeMap[language];
};

/**
 * Format a timestamp to a localized time string
 * English: 12-hour format (e.g., "11:51 AM")
 * Chinese: 24-hour format (e.g., "11:51")
 */
export const formatTime = (timestamp: number, language: SupportedLanguage): string => {
  const locale = getLocaleFromLanguage(language);
  return new Date(timestamp).toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: language === 'en', // 12-hour for English, 24-hour for Chinese
  });
};

/**
 * Format a timestamp to a localized date string
 * e.g., "December 15, 2024" or "2024年12月15日"
 */
export const formatDate = (timestamp: number, language: SupportedLanguage): string => {
  const locale = getLocaleFromLanguage(language);
  return new Date(timestamp).toLocaleDateString(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format a date object to "Month Year" string
 * e.g., "December 2024" or "2024年12月"
 */
export const formatMonthYear = (date: Date, language: SupportedLanguage): string => {
  const locale = getLocaleFromLanguage(language);
  return date.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Get an array of localized month names
 * Returns: ["January", "February", ...] or ["一月", "二月", ...]
 */
export const getMonthNames = (language: SupportedLanguage): string[] => {
  const locale = getLocaleFromLanguage(language);
  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(2000, i, 1);
    return date.toLocaleDateString(locale, { month: 'long' });
  });
};

/**
 * Get an array of weekday initials
 * Returns: ["S", "M", "T", "W", "T", "F", "S"] or ["日", "一", "二", "三", "四", "五", "六"]
 */
export const getWeekdayInitials = (language: SupportedLanguage): string[] => {
  const locale = getLocaleFromLanguage(language);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2000, 0, 2 + i); // Start from Sunday (Jan 2, 2000 was a Sunday)
    return date.toLocaleDateString(locale, { weekday: 'narrow' });
  });
};

/**
 * Format a timestamp to a short date string (YYYY-MM-DD)
 * This format is locale-independent and used for internal purposes
 */
export const formatDateISO = (timestamp: number): string => {
  return new Date(timestamp).toISOString().split('T')[0];
};
