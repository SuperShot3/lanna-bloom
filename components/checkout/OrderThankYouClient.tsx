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

/** Poll while waiting for webhook/fulfillment to create the order — no cosmetic delay after paid. */
const POLL_MS = 800;
const MAX_MS = 90000;

export function OrderThankYouClient({ lang }: { lang: Locale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('session_id')?.trim() ?? '';
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError(
        lang === 'th'
          ? 'เราไม่สามารถยืนยันคำสั่งซื้อนี้ได้ในขณะนี้'
          : 'We could not confirm this order yet.'
      );
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
        const submissionToken = sessionStorage.getItem(CHECKOUT_SUBMISSION_TOKEN_SESSION_KEY) ?? '';
        const res = await fetch(`/api/stripe/order-status?session_id=${encodeURIComponent(sessionId)}`, {
          headers: submissionToken ? { 'x-checkout-submission-token': submissionToken } : undefined,
        });
        const data = (await res.json().catch(() => ({}))) as {
          status?: string;
          orderId?: string | null;
          token?: string | null;
        };
        if (cancelled) return;
        if (data.status === 'paid' && typeof data.orderId === 'string' && data.orderId.trim()) {
          const oid = data.orderId.trim();
          const publicToken = typeof data.token === 'string' ? data.token.trim() : '';

          // Thin resolver only: browser `purchase` fires on the order page via track_purchase=1.
          const token = sessionStorage.getItem(CHECKOUT_SUBMISSION_TOKEN_SESSION_KEY);
          const qs = new URLSearchParams();
          if (token && /^[0-9a-fA-F-]+$/.test(token) && token.length >= 8) {
            markCheckoutSubmissionCompleted(token);
            qs.set('checkout_token', token);
          }
          if (publicToken) {
            qs.set('token', publicToken);
          }
          qs.set('track_purchase', '1');
          qs.set('session_id', sessionId);
          try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([]));
            localStorage.removeItem(CART_FORM_STORAGE_KEY);
            localStorage.setItem('lanna-bloom-last-order-id', oid);
            if (publicToken) localStorage.setItem('lanna-bloom-last-order-token', publicToken);
          } catch {
            // ignore
          }

          if (!cancelled) {
            const query = qs.toString();
            window.location.replace(`/order/${encodeURIComponent(oid)}${query ? `?${query}` : ''}`);
          }
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
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 20,
        backgroundColor: 'var(--surface-sunken, #fcfaf8)',
      }}
    >
      {error ? (
        <>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }} aria-hidden>
            ⚠️
          </div>
          <p style={{ textAlign: 'center', maxWidth: 420, color: 'var(--error, #d32f2f)' }}>{error}</p>
          <button
            type="button"
            onClick={() => router.push(`/${lang}/cart`)}
            style={{
              marginTop: '1rem',
              padding: '12px 24px',
              borderRadius: '999px',
              border: '1px solid var(--border, #ddd)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              transition: 'all 0.2s',
            }}
          >
            {lang === 'th' ? 'กลับไปที่ตะกร้า' : 'Back to cart'}
          </button>
        </>
      ) : (
        <>
          <div className="spinner" />
          <h2
            style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--text)' }}
            role="status"
            aria-live="polite"
          >
            {lang === 'th' ? 'กำลังยืนยันการชำระเงิน…' : 'Confirming your payment…'}
          </h2>
          <style
            dangerouslySetInnerHTML={{
              __html: `
              .spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(180, 140, 90, 0.2);
                border-radius: 50%;
                border-top-color: var(--accent, #b48c5a);
                animation: spin 1s ease-in-out infinite;
              }
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `,
            }}
          />
        </>
      )}
    </div>
  );
}
