'use client';

import { useId, useState } from 'react';
import { CareGuideSection } from '@/components/CareGuideSection';
import { translations, type Locale } from '@/lib/i18n';
import { CompositionLines } from '@/components/pdp/CompositionLines';
import styles from './product-pdp.module.css';

export function ProductAboutSection({
  lang,
  description,
  compositionHeading,
  compositionText,
}: {
  lang: Locale;
  description: string;
  compositionHeading: string;
  compositionText: string;
}) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [compositionOpen, setCompositionOpen] = useState(false);
  const compositionPanelId = useId();
  const t = translations[lang].product;
  const needsClamp = description.length > 180;

  return (
    <section className={styles.aboutSection} id="product-about">
      <h2 className={styles.aboutHeading}>
        {(t as { aboutHeading?: string; descriptionHeading?: string }).aboutHeading ??
          (t as { descriptionHeading?: string }).descriptionHeading ??
          'About this bouquet'}
      </h2>
      <p
        className={`${styles.aboutDesc} ${!descExpanded && needsClamp ? styles.aboutDescClamped : ''}`}
      >
        {description}
      </p>
      {needsClamp ? (
        <button
          type="button"
          className={styles.aboutReadMore}
          onClick={() => setDescExpanded((v) => !v)}
          aria-expanded={descExpanded}
        >
          {descExpanded ? (t.readLess ?? 'Read less') : (t.readMore ?? 'Read more')}
        </button>
      ) : null}

      {compositionText ? (
        <div className={styles.compositionRow} id="product-composition">
          <button
            type="button"
            className={styles.compositionRowToggle}
            onClick={() => setCompositionOpen((v) => !v)}
            aria-expanded={compositionOpen}
            aria-controls={compositionPanelId}
          >
            <h3 className={styles.compositionRowHeading}>{compositionHeading}</h3>
            <span
              className={`${styles.compositionRowChevron} ${compositionOpen ? styles.compositionRowChevronOpen : ''}`}
              aria-hidden
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
          <div
            id={compositionPanelId}
            className={`${styles.compositionRowPanel} ${compositionOpen ? styles.compositionRowPanelOpen : ''}`}
            aria-hidden={!compositionOpen}
          >
            <div className={styles.compositionRowPanelInner}>
              <CompositionLines
                text={compositionText}
                className={styles.compositionRowText}
                lineClassName={styles.compositionRowTextLine}
              />
            </div>
          </div>
        </div>
      ) : null}

      <p className="product-seasonal-disclaimer" style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {t.seasonalDisclaimer}
      </p>
      <CareGuideSection lang={lang} />
    </section>
  );
}
