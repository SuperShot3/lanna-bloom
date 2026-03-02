'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './review.module.css';

type FormTranslations = {
  leaveReviewTitle: string;
  leaveReviewSubtitle: string;
  namePlaceholder: string;
  commentPlaceholder: string;
  submitButton: string;
  successMessage: string;
  errorMessage: string;
  backToHome: string;
};

export function LeaveReviewForm({ t }: { t: FormTranslations }) {
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorDetail, setErrorDetail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;

    const trimmedName = name.trim();
    const trimmedComment = comment.trim();
    if (!trimmedName || !trimmedComment) return;

    setStatus('submitting');
    setErrorDetail('');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, comment: trimmedComment }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStatus('success');
        setName('');
        setComment('');
      } else {
        setStatus('error');
        setErrorDetail(data?.error || t.errorMessage);
      }
    } catch {
      setStatus('error');
      setErrorDetail(t.errorMessage);
    }
  };

  if (status === 'success') {
    return (
      <div className={styles.reviewSuccess}>
        <p className={styles.reviewSuccessMessage}>{t.successMessage}</p>
        <Link href="/en" className={styles.reviewSuccessLink}>
          {t.backToHome}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.reviewForm}>
      <div className={styles.reviewFormField}>
        <label htmlFor="review-name" className={styles.reviewFormLabel}>
          Name
        </label>
        <input
          id="review-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.namePlaceholder}
          required
          maxLength={200}
          className={styles.reviewFormInput}
          disabled={status === 'submitting'}
          autoComplete="name"
        />
      </div>
      <div className={styles.reviewFormField}>
        <label htmlFor="review-comment" className={styles.reviewFormLabel}>
          Comment
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t.commentPlaceholder}
          required
          maxLength={2000}
          rows={5}
          className={`${styles.reviewFormInput} ${styles.reviewFormTextarea}`}
          disabled={status === 'submitting'}
        />
      </div>
      {status === 'error' && (
        <p className={styles.reviewFormError} role="alert">
          {errorDetail}
        </p>
      )}
      <button
        type="submit"
        className={styles.reviewFormSubmit}
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? 'Submitting...' : t.submitButton}
      </button>
    </form>
  );
}
