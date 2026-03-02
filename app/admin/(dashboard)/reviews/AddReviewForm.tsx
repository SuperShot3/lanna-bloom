'use client';

import { useState } from 'react';

export function AddReviewForm() {
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
      window.location.reload();
    } catch {
      setStatus('error');
      setMessage('Something went wrong.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-v2-form">
      <div className="admin-v2-form-group">
        <label htmlFor="review-name">Reviewer name</label>
        <input
          id="review-name"
          type="text"
          className="admin-v2-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. John D."
          required
        />
      </div>
      <div className="admin-v2-form-group">
        <label htmlFor="review-rating">Rating (1–5 stars)</label>
        <select
          id="review-rating"
          className="admin-v2-input"
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
      <div className="admin-v2-form-group">
        <label htmlFor="review-comment">Review text</label>
        <textarea
          id="review-comment"
          className="admin-v2-input"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Paste the review text from Google Maps..."
          required
        />
      </div>
      <div className="admin-v2-form-group">
        <label htmlFor="review-date">Review date (optional)</label>
        <input
          id="review-date"
          type="date"
          className="admin-v2-input"
          value={reviewDate}
          onChange={(e) => setReviewDate(e.target.value)}
        />
      </div>
      {message && (
        <p
          className={status === 'success' ? 'admin-v2-costs-success' : 'admin-v2-costs-error'}
          style={{ marginBottom: 12 }}
        >
          {message}
        </p>
      )}
      <button
        type="submit"
        className="admin-v2-btn admin-v2-btn-primary"
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Adding...' : 'Add review'}
      </button>
    </form>
  );
}
