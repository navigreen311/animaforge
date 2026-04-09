type Locale = 'en' | 'es' | 'fr';

const messages: Record<Locale, any> = {
  en: require('./en.json'),
  es: require('./es.json'),
  fr: require('./fr.json'),
};

export function t(key: string, locale: Locale = 'en'): string {
  const keys = key.split('.');
  let value: any = messages[locale];
  for (const k of keys) {
    value = value?.[k];
  }
  if (typeof value === 'string') return value;
  // Fallback to English
  let fallback: any = messages['en'];
  for (const k of keys) {
    fallback = fallback?.[k];
  }
  return typeof fallback === 'string' ? fallback : key;
}

export function useTranslation(locale?: Locale) {
  const currentLocale = locale || 'en';
  return {
    t: (key: string) => t(key, currentLocale),
    locale: currentLocale,
  };
}

export type { Locale };
