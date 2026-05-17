'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useLocale } from '@/context/LocaleContext';
import enMessages from '@/messages/en.json';
import bnMessages from '@/messages/bn.json';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  const messages = locale === 'en' ? enMessages : bnMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
