'use client';

import { useEffect, useState } from 'react';
import type { PayLinkReceipt } from '@/lib/payLinks/adminPayLink';
import styles from '@/app/pay/[orderId]/pay-link.module.css';

const POLL_MS = 800;
const MAX_MS = 90000;

function formatThb(amount: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function PayLinkReturnClient({
  linkId,
  token,
  sessionId,
}: {
  linkId: string;
  token: string;
  sessionId: string;
}) {
  const [receipt, setReceipt] = useState<PayLinkReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    const poll = async () => {
      if (cancelled) return;
      if (Date.now() - started > MAX_MS) {
        setError('This is taking too long. If you were charged, the link is already used. Ask Lanna Bloom if you need a receipt.');
        return;
      }
      try {
        const res = await fetch('/api/pay-links/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ linkId, token, sessionId }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          status?: string;
          amount?: number;
          description?: string;
          orderId?: string;
        };
        if (cancelled) return;
        if (data.status === 'paid' && typeof data.amount === 'number') {
          setReceipt({
            amount: data.amount,
            description: typeof data.description === 'string' ? data.description : 'Payment',
            orderId: typeof data.orderId === 'string' ? data.orderId : undefined,
          });
          return;
        }
        if (data.status === 'disabled') {
          setError('This payment link is no longer active.');
          return;
        }
      } catch {
        // retry
      }
      setTimeout(poll, POLL_MS);
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [linkId, token, sessionId]);

  if (receipt) {
    return <PayLinkThankYouCard receipt={receipt} />;
  }

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <p className={styles.brand}>Lanna Bloom</p>
        {error ? (
          <>
            <h1 className={styles.title}>Could not confirm payment</h1>
            <p className={styles.error} role="alert">
              {error}
            </p>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Confirming your payment</h1>
            <p className={styles.hint}>Please wait a moment. Do not close this page.</p>
            <div className={styles.spinner} aria-hidden />
          </>
        )}
      </main>
    </div>
  );
}

export function PayLinkThankYouCard({ receipt }: { receipt: PayLinkReceipt }) {
  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <p className={styles.brand}>Lanna Bloom</p>
        <div className={styles.check} aria-hidden>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="2" />
            <path d="M11 21.5 L17.5 27.5 L29 14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className={styles.title}>Thank you. Payment received.</h1>
        <p className={styles.desc}>{receipt.description}</p>
        <p className={styles.amount}>{formatThb(receipt.amount)}</p>
        <p className={styles.hint}>This was not a flower delivery order. This payment link is now used and cannot be paid again.</p>
        {receipt.orderId ? <p className={styles.ref}>Reference {receipt.orderId}</p> : null}
      </main>
    </div>
  );
}
