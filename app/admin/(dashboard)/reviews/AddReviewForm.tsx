'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AddReviewForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          comment: comment.trim(),
          rating,
          review_date: reviewDate.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data?.error ?? 'Failed to add review');
        return;
      }

      setStatus('success');
      setMessage('Review added successfully.');
      setName('');
      setComment('');
      setReviewDate('');
      setRating(5);
      router.refresh();
    } catch {
      setStatus('error');
      setMessage('Something went wrong.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      <div className="admin-form-group">
        <label htmlFor="review-name">Reviewer name</label>
        <input
          id="review-name"
          type="text"
          className="admin-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. John D."
          required
        />
      </div>
      <div className="admin-form-group">
        <label htmlFor="review-rating">Rating (1–5 stars)</label>
        <select
          id="review-rating"
          className="admin-input"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n > 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-form-group">
        <label htmlFor="review-comment">Review text</label>
        <textarea
          id="review-comment"
          className="admin-input"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Paste the review text from Google Maps..."
          required
        />
      </div>
      <div className="admin-form-group">
        <label htmlFor="review-date">Review date (optional)</label>
        <input
          id="review-date"
          type="date"
          className="admin-input"
          value={reviewDate}
          onChange={(e) => setReviewDate(e.target.value)}
        />
      </div>
      {message && (
        <p
          className={status === 'success' ? 'admin-costs-success' : 'admin-costs-error'}
          style={{ marginBottom: 12 }}
        >
          {message}
        </p>
      )}
      <button
        type="submit"
        className="admin-btn admin-btn-primary"
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Adding...' : 'Add review'}
      </button>
    </form>
  );
}
