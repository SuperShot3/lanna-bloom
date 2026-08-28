'use client';

import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { getGooglePreferredSourceDeeplink } from '@/lib/googlePreferredSource';
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
  const isHero = variant === 'hero';
  const [leadLine, ...restLines] = rawLabel.split('\n');
  const mainLine = restLines.join(' ');
  const iconSize = isHero ? 36 : 18;

  return (
    <a
      href={getGooglePreferredSourceDeeplink()}
      target="_blank"
      rel="noopener noreferrer"
      title={t.preferredSourceTitle}
      className={`${styles.link} ${styles[variant]} ${className}`.trim()}
    >
      <span className={styles.icon}>
        <GoogleGIcon size={iconSize} />
      </span>
      {isHero ? (
        <>
          <span className={styles.label}>
            <span className={styles.labelLead}>{leadLine}</span>
            {mainLine ? <span className={styles.labelMain}>{mainLine}</span> : null}
          </span>
          <span className={styles.chevron} aria-hidden>
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M6 3.5 10.5 8 6 12.5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </>
      ) : (
        <span className={styles.label}>{rawLabel.replace(/\n/g, ' ')}</span>
      )}
    </a>
  );
}
