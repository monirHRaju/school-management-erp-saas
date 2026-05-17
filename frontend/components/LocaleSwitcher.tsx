'use client';

import { useLocale, type Locale } from '@/context/LocaleContext';

const OPTIONS: { locale: Locale; flag: string; label: string; title: string }[] = [
  { locale: 'bn', flag: '🇧🇩', label: 'বাং', title: 'বাংলায় পরিবর্তন করুন' },
  { locale: 'en', flag: '🇬🇧', label: 'EN', title: 'Switch to English' },
];

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      role="group"
      aria-label="Language switcher"
      className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = locale === opt.locale;
        return (
          <button
            key={opt.locale}
            onClick={() => setLocale(opt.locale)}
            title={opt.title}
            aria-pressed={active}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-all ${
              active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="text-sm leading-none">{opt.flag}</span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
