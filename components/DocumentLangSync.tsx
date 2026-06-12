'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n';

const HTML_LANG: Record<string, string> = {
  en: 'en',
  th: 'th',
  ru: 'ru',
  'zh-sg': 'zh-Hans',
  'zh-hk': 'zh-Hant',
};

export function DocumentLangSync() {
  const pathname = usePathname();

  useEffect(() => {
    const segment = pathname?.split('/').filter(Boolean)[0];
    if (!segment || !isValidLocale(segment)) return;
    document.documentElement.lang = HTML_LANG[segment] ?? segment;
  }, [pathname]);

  return null;
}
