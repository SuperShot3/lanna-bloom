'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { trackCtaClick } from '@/lib/analytics';
import styles from './intent-sticky-bar.module.css';

const SENTINEL_ID = 'intent-hero-sentinel';

export function IntentStickyBar({
  label,
  href,
  intentSlug,
}: {
  label: string;
  href: string;
  intentSlug: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById(SENTINEL_ID);
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`${styles.bar} ${visible ? styles.visible : ''}`}
      aria-hidden={!visible}
    >
      <div className={styles.inner}>
        <Link
          href={href}
          className={styles.btn}
          onClick={() =>
            trackCtaClick('cta_intent_sticky_browse', { intent_slug: intentSlug })
          }
        >
          {label}
        </Link>
      </div>
    </div>
  );
}
