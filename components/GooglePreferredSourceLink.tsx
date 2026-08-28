'use client';

import type { MouseEvent } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import {
  GOOGLE_PREFERRED_SOURCE_DEEPLINK,
  tryAddPreferredSource,
} from '@/lib/googlePreferredSource';
import { GoogleGIcon } from '@/components/icons/GoogleGIcon';
import styles from './google-preferred-source.module.css';

type Variant = 'hero' | 'footer';

type Props = {
  lang: Locale;
  variant: Variant;
  className?: string;
};

export function GooglePreferredSourceLink({ lang, variant, className = '' }: Props) {
  const t = translations[lang].hero;
  const rawLabel = t.preferredSourceLabel;
  const label = variant === 'footer' ? rawLabel.replace(/\n/g, ' ') : rawLabel;
  const iconSize = variant === 'hero' ? 36 : 18;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    if (tryAddPreferredSource()) {
      event.preventDefault();
    }
  };

  return (
    <a
      href={GOOGLE_PREFERRED_SOURCE_DEEPLINK}
      title={t.preferredSourceTitle}
      onClick={handleClick}
      className={`${styles.link} ${styles[variant]} ${className}`.trim()}
    >
      <span className={styles.icon}>
        <GoogleGIcon size={iconSize} />
      </span>
      <span className={styles.label}>{label}</span>
    </a>
  );
}
