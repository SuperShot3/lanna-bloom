'use client';

import { useState } from 'react';
import styles from './pay-link.module.css';

function fmt(amount: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function PayLinkReviewClient({
  orderId,
  publicToken,
  description,
  amount,
  customerName,
}: {
  orderId: string;
  publicToken: string;
  description: string;
  amount: number;
  customerName: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout-session-for-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          publicToken,
          lang: 'en',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.url !== 'string') {
        setError(typeof data.error === 'string' ? data.error : 'Could not start payment. Try again.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <p className={styles.brand}>Lanna Bloom</p>
        <h1 className={styles.title}>Review and pay</h1>
        {customerName ? <p className={styles.who}>For {customerName}</p> : null}
        <p className={styles.desc}>{description}</p>
        <p className={styles.amount}>{fmt(amount)}</p>
        <p className={styles.hint}>You will continue to Stripe to pay securely.</p>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <button type="button" className={styles.pay} onClick={pay} disabled={loading}>
          {loading ? 'Redirecting…' : 'Pay with Stripe'}
        </button>
        <p className={styles.ref}>Reference {orderId}</p>
      </main>
    </div>
  );
}
