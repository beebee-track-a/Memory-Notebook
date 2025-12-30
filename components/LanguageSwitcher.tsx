import React, { useState } from 'react';
import { Languages } from 'lucide-react';
import { useLocale } from '../hooks/useLocale';
import type { SupportedLanguage } from '../i18n/types';

const SUPPORTED_LANGUAGES: Array<{
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}> = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '简体中文' },
];

export default function LanguageSwitcher() {
  const { currentLanguage, changeLanguage } = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = async (language: SupportedLanguage) => {
    await changeLanguage(language);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-white/5 rounded-full transition-colors group"
        aria-label="Change language"
      >
        <Languages size={20} className="text-white/60 group-hover:text-white transition-colors" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute top-full right-0 mt-2 bg-black/90 border border-white/10 rounded-lg shadow-2xl backdrop-blur-xl z-50 min-w-[160px] overflow-hidden animate-fade-in">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                  currentLanguage === lang.code
                    ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{lang.nativeName}</span>
                  {currentLanguage === lang.code && (
                    <span className="text-emerald-400 text-xs">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
