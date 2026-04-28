'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CHECKOUT_SUBMISSION_TOKEN_SESSION_KEY,
  markCheckoutSubmissionCompleted,
} from '@/lib/checkout/submissionToken';
import type { Locale } from '@/lib/i18n';
import { trackCheckoutPurchase, trackPurchase } from '@/lib/analytics';
import type { OrderCustomerView } from '@/lib/orders';

const CART_STORAGE_KEY = 'lanna-bloom-cart';
const CART_FORM_STORAGE_KEY = 'lanna-bloom-cart-form';

const POLL_MS = 2000;
const MAX_MS = 90000;

export function CheckoutCompleteClient({ lang }: { lang: Locale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('session_id')?.trim() ?? '';
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
          order?: OrderCustomerView;
        };
        if (cancelled) return;
        if (data.status === 'paid' && typeof data.orderId === 'string' && data.orderId.trim()) {
          const oid = data.orderId.trim();
          
          setSuccess(true);

          if (data.order) {
            const rawItems = data.order.items ?? [];
            if (rawItems.length > 0) {
              const items = rawItems.map((it: any, i: number) => ({
                item_id: it.bouquetId,
                item_name: it.bouquetTitle,
                price: it.price,
                quantity: 1,
                index: i,
                item_variant: it.size,
                currency: 'THB' as const,
              }));
              const value = data.order.pricing?.grandTotal ?? (data.order as any).amountTotal ?? 0;
              trackPurchase({ orderId: oid, value, currency: 'THB', items });
              await trackCheckoutPurchase({
                orderId: oid,
                value,
                currency: data.order.currency?.toUpperCase() ?? 'THB',
                email: data.order.customerEmail,
                phone: data.order.phone,
                items,
              });
            }
          }

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

          // Redirect after GTM has received google_ads_purchase, or after its 5s eventTimeout.
          setTimeout(() => {
            if (!cancelled) {
              window.location.replace(`/order/${encodeURIComponent(oid)}${qs}`);
            }
          }, 0);

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

  if (success) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: 'var(--surface-sunken, #fcfaf8)',
          background: 'radial-gradient(circle at center, #ffffff 0%, var(--surface-sunken, #fcfaf8) 100%)',
          textAlign: 'center',
        }}
      >
        <div 
          style={{ 
            fontSize: '3.5rem', 
            marginBottom: '1rem',
            animation: 'bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }} 
          aria-hidden
        >
          🎉
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text, #1e1e1e)', marginBottom: '0.75rem', fontFamily: 'var(--font-serif)' }}>
          {lang === 'th' ? 'ชำระเงินสำเร็จ!' : 'Payment Successful!'}
        </h1>
        <p style={{ color: 'var(--text-muted, #666)', fontSize: '1rem', letterSpacing: '0.02em' }}>
          {lang === 'th' 
            ? 'ขอบคุณสำหรับคำสั่งซื้อของคุณ' 
            : 'Thank you for your order.'}
        </p>
        <p style={{ color: 'var(--text-muted, #999)', fontSize: '0.85rem', marginTop: '1rem', animation: 'pulse 2s infinite' }}>
          {lang === 'th' 
            ? 'กำลังพากลับไปยังหน้ารายละเอียดคำสั่งซื้อ...' 
            : 'Redirecting you to the order details...'}
        </p>
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes bounceIn {
            0% { transform: scale(0.3); opacity: 0; }
            50% { transform: scale(1.05); opacity: 1; }
            70% { transform: scale(0.9); }
            100% { transform: scale(1); }
          }
          @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
          }
        `}} />
      </div>
    );
  }

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
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }} aria-hidden>⚠️</div>
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
            <div className="spinner"></div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--text)' }} role="status" aria-live="polite">
              {lang === 'th' ? 'กำลังยืนยันการชำระเงิน…' : 'Confirming your payment…'}
            </h2>
            <style dangerouslySetInnerHTML={{__html: `
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
            `}} />
          </>
        )}
      </div>
  );
}
