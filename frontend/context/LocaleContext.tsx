'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Locale = 'en' | 'bn';

const LOCALE_KEY = 'app-locale';
const DEFAULT_LOCALE: Locale = 'bn';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

function readSavedLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const saved = localStorage.getItem(LOCALE_KEY) as Locale | null;
    return saved === 'en' || saved === 'bn' ? saved : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readSavedLocale);

  // Sync the document lang attribute whenever locale changes
  useEffect(() => {
    document.documentElement.lang = locale === 'bn' ? 'bn' : 'en';
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    try { localStorage.setItem(LOCALE_KEY, l); } catch { /* ignore */ }
    setLocaleState(l);
    document.documentElement.lang = l === 'bn' ? 'bn' : 'en';
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export const useLocale = () => useContext(LocaleContext);
