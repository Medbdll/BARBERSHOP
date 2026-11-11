import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Modern Luxury Language Switcher Component
 * Supports:
 * - variant="pills" (default: sleek dual segmented pill FR | العربية)
 * - variant="toggle" (compact button showing next/current language)
 */
export default function LanguageSwitcher({
  variant = 'pills',
  className = '',
}) {
  const { lang, setLang, toggleLang } = useLanguage();

  if (variant === 'toggle') {
    const isFr = lang === 'fr';
    return (
      <button
        type="button"
        onClick={toggleLang}
        aria-label={isFr ? 'Basculer en Arabe' : 'Passer en Français'}
        title={isFr ? 'Passer en Arabe (العربية)' : 'Passer en Français (FR)'}
        className={`inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-800 bg-gray-950/80 text-amber-400 hover:text-amber-300 hover:border-amber-500/40 hover:bg-gray-900 transition-all duration-200 cursor-pointer shadow-sm ${className}`}
      >
        <span className="text-[11px] opacity-75" aria-hidden="true">🌐</span>
        <span className={isFr ? 'font-arabic tracking-normal' : 'tracking-wider'}>
          {isFr ? 'العربية' : 'FR'}
        </span>
      </button>
    );
  }

  // Dual segmented control (FR | العربية)
  return (
    <div
      role="group"
      aria-label="Sélection de la langue"
      className={`inline-flex items-center p-0.5 rounded-lg bg-gray-950/80 border border-gray-800 text-xs font-bold select-none ${className}`}
    >
      <button
        type="button"
        onClick={() => setLang('fr')}
        aria-pressed={lang === 'fr'}
        title="Français"
        className={`relative px-2.5 py-1 rounded-md transition-all duration-200 cursor-pointer ${
          lang === 'fr'
            ? 'bg-amber-500 text-gray-950 font-black shadow-sm shadow-amber-500/30'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60'
        }`}
      >
        FR
      </button>

      <button
        type="button"
        onClick={() => setLang('ar')}
        aria-pressed={lang === 'ar'}
        title="العربية"
        className={`relative px-2.5 py-1 rounded-md transition-all duration-200 cursor-pointer ${
          lang === 'ar'
            ? 'bg-amber-500 text-gray-950 font-black shadow-sm shadow-amber-500/30'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60'
        }`}
      >
        العربية
      </button>
    </div>
  );
}

