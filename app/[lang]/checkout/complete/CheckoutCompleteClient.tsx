'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CHECKOUT_SUBMISSION_TOKEN_SESSION_KEY,
  markCheckoutSubmissionCompleted,
} from '@/lib/checkout/submissionToken';
import type { Locale } from '@/lib/i18n';

const CART_STORAGE_KEY = 'lanna-bloom-cart';
const CART_FORM_STORAGE_KEY = 'lanna-bloom-cart-form';

const POLL_MS = 2000;
const MAX_MS = 90000;

export function CheckoutCompleteClient({ lang }: { lang: Locale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('session_id')?.trim() ?? '';
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError(lang === 'th' ? 'ไม่พบการชำระเงิน' : 'Missing payment session');
      return;
    }
    let cancelled = false;
    const started = Date.now();

    const poll = async () => {
      if (cancelled) return;
      if (Date.now() - started > MAX_MS) {
        setError(
          lang === 'th'
            ? 'ใช้เวลานานเกินไป กรุณาตรวจสอบอีเมลหรือติดต่อเรา'
            : 'This is taking too long. Please check your email or contact us.'
        );
        return;
      }
      try {
        const res = await fetch(`/api/stripe/order-status?session_id=${encodeURIComponent(sessionId)}`);
        const data = (await res.json().catch(() => ({}))) as {
          status?: string;
          orderId?: string | null;
        };
        if (cancelled) return;
        if (data.status === 'paid' && typeof data.orderId === 'string' && data.orderId.trim()) {
          const oid = data.orderId.trim();
          const token = sessionStorage.getItem(CHECKOUT_SUBMISSION_TOKEN_SESSION_KEY);
          let qs = '';
          if (token && /^[0-9a-fA-F-]+$/.test(token) && token.length >= 8) {
            markCheckoutSubmissionCompleted(token);
            qs = `?checkout_token=${encodeURIComponent(token)}`;
          }
          try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([]));
            localStorage.removeItem(CART_FORM_STORAGE_KEY);
          } catch {
            // ignore
          }
          window.location.replace(`/order/${encodeURIComponent(oid)}${qs}`);
          return;
        }
        if (data.status === 'payment_failed') {
          setError(lang === 'th' ? 'การชำระเงินไม่สำเร็จ' : 'Payment was not successful.');
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
  }, [sessionId, lang]);

  return (
    <div
      style={{
        minHeight: '50vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 16,
      }}
    >
      {error ? (
        <>
          <p style={{ textAlign: 'center', maxWidth: 420 }}>{error}</p>
          <button
            type="button"
            onClick={() => router.push(`/${lang}/cart`)}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid var(--border, #ddd)',
              background: 'var(--pastel-cream, #faf8f5)',
              cursor: 'pointer',
            }}
          >
            {lang === 'th' ? 'กลับไปที่ตะกร้า' : 'Back to cart'}
          </button>
        </>
      ) : (
        <p role="status" aria-live="polite">
          {lang === 'th' ? 'กำลังยืนยันการชำระเงิน…' : 'Confirming your payment…'}
        </p>
      )}
    </div>
  );
}
