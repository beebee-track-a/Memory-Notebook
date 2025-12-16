import 'react-i18next';

// Import translation JSON types for type safety
import type common from '../locales/en/common.json';
import type landing from '../locales/en/landing.json';
import type session from '../locales/en/session.json';
import type history from '../locales/en/history.json';
import type auth from '../locales/en/auth.json';
import type settings from '../locales/en/settings.json';
import type errors from '../locales/en/errors.json';

// Extend react-i18next module to include custom type options
declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      landing: typeof landing;
      session: typeof session;
      history: typeof history;
      auth: typeof auth;
      settings: typeof settings;
      errors: typeof errors;
    };
  }
}

export type SupportedLanguage = 'en' | 'zh-CN';

export interface LocaleConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}
