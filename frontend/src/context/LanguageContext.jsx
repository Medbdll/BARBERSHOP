import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { translations } from '../data/translations';

const STORAGE_KEY = 'app_lang';
const SUPPORTED_LANGS = ['fr', 'ar'];
const DEFAULT_LANG = 'fr';

const LanguageContext = createContext(null);

/**
 * Safely read stored language before first render to prevent resets
 */
function getStoredLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGS.includes(stored)) {
      return stored;
    }
  } catch (err) {
    console.warn('[LanguageContext] Failed to access localStorage:', err);
  }
  return DEFAULT_LANG;
}

/**
 * Synchronize DOM <html> attributes with active language
 */
function applyDomLanguage(lang) {
  if (typeof document === 'undefined') return;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
  document.documentElement.setAttribute('data-theme-lang', lang);
}

export function LanguageProvider({ children }) {
  // Lazy state initializer: reads localStorage ONCE before initial paint
  const [lang, setLangState] = useState(getStoredLanguage);

  // Switch language and persist to localStorage
  const setLang = useCallback((newLang) => {
    const validLang = SUPPORTED_LANGS.includes(newLang) ? newLang : DEFAULT_LANG;
    setLangState(validLang);
    try {
      localStorage.setItem(STORAGE_KEY, validLang);
    } catch (err) {
      console.warn('[LanguageContext] Failed to persist lang to localStorage:', err);
    }
    applyDomLanguage(validLang);
  }, []);

  // Toggle between 'fr' and 'ar'
  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'fr' ? 'ar' : 'fr'));
  }, [setLang]);

  // Keep DOM updated on mount & lang change
  useEffect(() => {
    applyDomLanguage(lang);
  }, [lang]);

  // Listen for storage events across tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY && e.newValue && SUPPORTED_LANGS.includes(e.newValue)) {
        setLangState(e.newValue);
        applyDomLanguage(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const isRtl = lang === 'ar';
  const t = useMemo(() => translations[lang] || translations[DEFAULT_LANG], [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang,
      dir,
      isRtl,
      t,
      supportedLangs: SUPPORTED_LANGS,
    }),
    [lang, setLang, toggleLang, dir, isRtl, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a <LanguageProvider>');
  }
  return context;
}

export default LanguageContext;

