'use client';

import { useId, useState, type ReactNode } from 'react';
import { CareGuideSection } from '@/components/CareGuideSection';
import { ProductReviewsSection } from '@/components/pdp/ProductReviewsSection';
import { translations, type Locale } from '@/lib/i18n';
import { CompositionLines } from '@/components/pdp/CompositionLines';
import { OverlayReveal } from '@/components/ui/overlay-reveal';
import type { ProductReview, ProductReviewStats } from '@/lib/productReviews';
import styles from './product-pdp.module.css';

function AccordionRow({
  heading,
  children,
  defaultOpen = false,
}: {
  heading: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className={styles.compositionRow}>
      <button
        type="button"
        className={styles.compositionRowToggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <h3 className={styles.compositionRowHeading}>{heading}</h3>
        <span
          className={`${styles.compositionRowChevron} ${open ? styles.compositionRowChevronOpen : ''}`}
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
      <OverlayReveal open={open} className={styles.pdpAccordionReveal}>
        <div id={panelId} className={styles.compositionRowPanelInner}>
          {children}
        </div>
      </OverlayReveal>
    </div>
  );
}

export function ProductAboutSection({
  lang,
  description,
  floristNote,
  compositionText,
  bouquetId,
  reviews,
  reviewStats,
}: {
  lang: Locale;
  description: string;
  floristNote?: string;
  compositionText: string;
  bouquetId: string;
  reviews: ProductReview[];
  reviewStats: ProductReviewStats;
}) {
  const t = translations[lang].product;
  const note = floristNote?.trim() ?? '';

  return (
    <section className={styles.aboutSection} id="product-about">
      <h2 className={styles.aboutHeading}>{t.productIntroduction}</h2>
      {description ? (
        <p className={styles.aboutDesc}>{description}</p>
      ) : null}

      {note ? (
        <aside className={styles.teamNote} aria-label={t.teamNoteHeading}>
          <h3 className={styles.teamNoteHeading}>{t.teamNoteHeading}</h3>
          <p className={styles.teamNoteText}>{note}</p>
        </aside>
      ) : null}

      {compositionText ? (
        <AccordionRow heading={t.arrangementDetails}>
          <CompositionLines
            text={compositionText}
            className={styles.compositionRowText}
            lineClassName={styles.compositionRowTextLine}
          />
        </AccordionRow>
      ) : null}

      <CareGuideSection lang={lang} />

      <ProductReviewsSection
        lang={lang}
        bouquetId={bouquetId}
        reviews={reviews}
        stats={reviewStats}
      />

      <p className={styles.policyNote}>{t.seasonalDisclaimer}</p>
      <p className={styles.policyLinks}>
        <a href={`/${lang}/info/delivery-policy`}>
          {translations[lang].trustBadges.deliveryPolicyShort ?? 'Delivery policy'}
        </a>
      </p>
    </section>
  );
}
