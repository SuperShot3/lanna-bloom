'use client';

import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
import { PreorderOnlyModal } from './PreorderOnlyModal';

export interface PreorderModalWrapperProps {
  /** Optional override; when provided, skips pathname-based derivation */
  lang?: Locale;
}

export function PreorderModalWrapper({ lang: langOverride }: PreorderModalWrapperProps) {
  const pathname = usePathname();
  const derivedLang: Locale = pathname?.startsWith('/th') ? 'th' : 'en';
  const lang = langOverride ?? derivedLang;

  return <PreorderOnlyModal lang={lang} />;
}
