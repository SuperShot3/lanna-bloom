'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { getOrCreateVisitorToken } from '@/lib/info/visitorToken';
import { getGuideCommentLabels } from './guideCommentLabels';
import styles from './guide-comments.module.css';

type GuideCommentFormProps = {
  guideSlug: string;
  lang: Locale;
  onSubmitted?: () => void;
};

export function GuideCommentForm({ guideSlug, lang, onSubmitted }: GuideCommentFormProps) {
  const labels = getGuideCommentLabels(lang);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<'success' | 'error' | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const trimmedName = name.trim();
    const trimmedBody = body.trim();
    if (!trimmedName) {
      setMessage('error');
      return;
    }
    if (!trimmedBody) {
      setMessage('error');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/info/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guideSlug,
          authorName: trimmedName,
          authorEmail: email.trim() || undefined,
          body: trimmedBody,
          locale: lang,
          visitorToken: getOrCreateVisitorToken(),
          company: honeypot || undefined,
        }),
      });

      if (!res.ok) {
        setMessage('error');
        return;
      }

      setMessage('success');
      setName('');
      setEmail('');
      setBody('');
      onSubmitted?.();
    } catch {
      setMessage('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.guideCommentForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.guideCommentHoneypot} aria-hidden="true">
        <label htmlFor="guide-comment-company">Company</label>
        <input
          id="guide-comment-company"
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div className={styles.guideCommentField}>
        <label htmlFor="guide-comment-name">{labels.name}</label>
        <input
          id="guide-comment-name"
          type="text"
          name="authorName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          required
          autoComplete="name"
        />
      </div>

      <div className={styles.guideCommentField}>
        <label htmlFor="guide-comment-email">
          {labels.email}{' '}
          <span className={styles.guideCommentOptional}>({labels.emailOptional})</span>
        </label>
        <input
          id="guide-comment-email"
          type="email"
          name="authorEmail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={254}
          autoComplete="email"
        />
      </div>

      <div className={styles.guideCommentField}>
        <label htmlFor="guide-comment-body">{labels.comment}</label>
        <textarea
          id="guide-comment-body"
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          required
        />
      </div>

      <button type="submit" className={`btn-premium ${styles.guideCommentSubmit}`} disabled={loading}>
        {loading ? labels.submitting : labels.submit}
      </button>

      {message === 'success' && (
        <p className={`${styles.guideCommentMessage} ${styles.guideCommentMessageSuccess}`}>
          {labels.success}
        </p>
      )}
      {message === 'error' && (
        <p className={`${styles.guideCommentMessage} ${styles.guideCommentMessageError}`}>
          {labels.error}
        </p>
      )}
    </form>
  );
}
