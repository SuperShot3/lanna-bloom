'use client';

import { useId, useState, type FormEvent } from 'react';
import type { ProductReview, ProductReviewStats } from '@/lib/productReviews';
import { translations, type Locale } from '@/lib/i18n';
import { ProductReviewStars } from '@/components/pdp/ProductReviewStars';
import { OverlayReveal } from '@/components/ui/overlay-reveal';
import styles from './product-pdp.module.css';

export function ProductReviewsSection({
  lang,
  bouquetId,
  reviews,
  stats,
}: {
  lang: Locale;
  bouquetId: string;
  reviews: ProductReview[];
  stats: ProductReviewStats;
}) {
  const t = translations[lang].product;
  const formId = useId();
  const [formOpen, setFormOpen] = useState(reviews.length === 0);
  const [displayName, setDisplayName] = useState('');
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (rating < 1) {
      setError(t.reviewRatingRequired ?? 'Please choose a star rating.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/product-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bouquetId,
          displayName,
          rating,
          reviewText,
          locale: lang,
          website: honeypot,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : t.reviewError ?? 'Could not submit.');
        return;
      }
      setSubmitted(true);
      setDisplayName('');
      setReviewText('');
      setRating(0);
    } catch {
      setError(t.reviewError ?? 'Could not submit your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const countLabel =
    stats.count === 1
      ? t.reviewCountOne ?? '1 review'
      : (t.reviewCount ?? '{count} reviews').replace('{count}', String(stats.count));

  return (
    <section className={styles.reviewsSection} id="product-reviews">
      <div className={styles.reviewsHeader}>
        <h3 className={styles.aboutHeading}>{t.reviewsHeading ?? 'Reviews'}</h3>
        {stats.count > 0 ? (
          <p className={styles.reviewsSummary}>
            <ProductReviewStars rating={stats.average} size={16} />
            <span>{stats.average.toFixed(1)}</span>
            <span aria-hidden>·</span>
            <span>{countLabel}</span>
          </p>
        ) : (
          <p className={styles.reviewsEmpty}>{t.noProductReviewsYet ?? 'No product reviews yet.'}</p>
        )}
      </div>

      {reviews.length > 0 ? (
        <ul className={styles.reviewList}>
          {reviews.map((review) => (
            <li key={review.id} className={styles.reviewItem}>
              <div className={styles.reviewItemMeta}>
                <strong>{review.displayName}</strong>
                <ProductReviewStars rating={review.rating} size={13} />
              </div>
              <p className={styles.reviewItemText}>{review.reviewText}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {submitted ? (
        <p className={styles.reviewThanks} role="status">
          {t.reviewThanks ?? 'Thank you. Your review will appear after approval.'}
        </p>
      ) : (
        <>
          <button
            type="button"
            className={styles.reviewWriteToggle}
            onClick={() => setFormOpen((open) => !open)}
            aria-expanded={formOpen}
            aria-controls={formId}
          >
            {t.writeAReview ?? 'Write a review'}
          </button>
          <OverlayReveal open={formOpen} className={styles.reviewFormReveal}>
            <form id={formId} className={styles.reviewForm} onSubmit={handleSubmit}>
              <label className={styles.reviewField}>
                <span>{t.reviewNameLabel ?? 'Your name'}</span>
                <input
                  type="text"
                  name="displayName"
                  autoComplete="name"
                  required
                  maxLength={80}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </label>
              <div className={styles.reviewField}>
                <span id={`${formId}-rating`}>{t.reviewRatingLabel ?? 'Rating'}</span>
                <ProductReviewStars
                  rating={rating}
                  size={28}
                  interactive
                  disabled={submitting}
                  labelledBy={`${formId}-rating`}
                  onChange={setRating}
                  starLabel={(value) =>
                    value === 1
                      ? t.reviewStarOne ?? '1 star'
                      : (t.reviewStarCount ?? '{count} stars').replace('{count}', String(value))
                  }
                />
              </div>
              <label className={`${styles.reviewField} ${styles.reviewFieldFull}`}>
                <span>{t.reviewTextLabel ?? 'Your review'}</span>
                <textarea
                  name="reviewText"
                  required
                  minLength={8}
                  maxLength={1200}
                  rows={4}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                />
              </label>
              <div className={styles.reviewHoneypot} aria-hidden>
                <label>
                  Website
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </label>
              </div>
              {error ? <p className={styles.reviewFormError}>{error}</p> : null}
              <button type="submit" className={styles.reviewSubmit} disabled={submitting}>
                {submitting
                  ? t.reviewSubmitting ?? 'Submitting…'
                  : t.reviewSubmit ?? 'Submit review'}
              </button>
            </form>
          </OverlayReveal>
        </>
      )}
    </section>
  );
}
