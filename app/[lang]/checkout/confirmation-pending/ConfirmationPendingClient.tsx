'use client';

/**
 * Post-checkout confirmation-pending flow. Order stays in a non-paid pending state
 * until payment is truly confirmed.
 *
 * CRITICAL:
 * - This page MUST NOT fire GA4 purchase or behave like Stripe paid success.
 * - Purchase is only fired on the order details page (/order/[orderId]) when
 *   order status is confirmed paid (Stripe webhook or admin mark-paid).
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { OrderPendingConfirmation } from '@/components/OrderPendingConfirmation';
import { useCart } from '@/contexts/CartContext';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Order } from '@/lib/orders';

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_MS = 60000;
const CART_FORM_STORAGE_KEY = 'lanna-bloom-cart-form';

type OrderWithPaymentStatus = Order & {
  payment_status?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
};

export function ConfirmationPendingClient({
  lang,
  orderId: initialOrderId,
  sessionId,
}: {
  lang: Locale;
  orderId: string;
  publicOrderUrl?: string;
  shareText?: string;
  sessionId?: string;
}) {
  const t = translations[lang].confirmationPending;
  const tNav = translations[lang].nav;
  const { clearCart } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderId, setOrderId] = useState(initialOrderId);
  const [stripeStatus, setStripeStatus] = useState<'processing' | 'paid' | 'payment_failed' | null>(
    sessionId ? 'processing' : null
  );
  const pollStartRef = useRef<number | null>(null);
  const cartClearedRef = useRef(false);
  const redirectingRef = useRef(false);

  useEffect(() => {
    document.body.classList.add('checkout-confirmation-pending-page-active');
    return () => document.body.classList.remove('checkout-confirmation-pending-page-active');
  }, []);

  // Stripe order-status polling
  useEffect(() => {
    if (!sessionId || stripeStatus !== 'processing') return;
    const poll = async () => {
      if (pollStartRef.current && Date.now() - pollStartRef.current > POLL_MAX_MS) {
        return;
      }
      try {
        const res = await fetch(`/api/stripe/order-status?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json().catch(() => ({}));
        if (typeof data.orderId === 'string' && data.orderId.trim()) {
          setOrderId(data.orderId.trim());
        }
        if (data.status === 'paid' && data.order) {
          setOrder(data.order);
          setOrderId(data.order.orderId);
          setStripeStatus('paid');
          return;
        }
        if (data.status === 'payment_failed') {
          setStripeStatus('payment_failed');
          return;
        }
      } catch {
        // continue polling
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    };
    if (!pollStartRef.current) pollStartRef.current = Date.now();
    const tId = setTimeout(poll, 0);
    return () => clearTimeout(tId);
  }, [sessionId, stripeStatus]);

  // When Stripe confirms paid: redirect to order details page (single source of "final" order view and GA4 purchase)
  useEffect(() => {
    if (!sessionId || stripeStatus !== 'paid' || !orderId || redirectingRef.current) return;
    redirectingRef.current = true;
    window.location.href = `/order/${encodeURIComponent(orderId)}`;
  }, [sessionId, stripeStatus, orderId]);

  // Fetch order only when no sessionId (manual path) or when we need it for redirect target
  useEffect(() => {
    if (!orderId) return;
    if (sessionId && stripeStatus !== 'paid') return;

    fetch(`/api/orders/${encodeURIComponent(orderId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: OrderWithPaymentStatus | null) => {
        setOrder(data);
      })
      .catch(() => {
        setOrder(null);
      });
  }, [orderId, sessionId, stripeStatus]);

  // Cart clear: manual path when we have orderId; Stripe path when we're about to redirect (handled by redirect)
  useEffect(() => {
    if (cartClearedRef.current) return;
    const isManualPath = !sessionId;
    if (isManualPath && orderId) {
      clearCart();
      cartClearedRef.current = true;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(CART_FORM_STORAGE_KEY);
          window.localStorage.setItem('lanna-bloom-last-order-id', orderId);
        } catch {
          // ignore
        }
      }
    }
    // For Stripe paid we redirect; cart can be cleared on order page or we clear here before redirect
    if (sessionId && stripeStatus === 'paid') {
      clearCart();
      cartClearedRef.current = true;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(CART_FORM_STORAGE_KEY);
          if (orderId) window.localStorage.setItem('lanna-bloom-last-order-id', orderId);
        }
      } catch {
        // ignore
      }
    }
  }, [clearCart, orderId, sessionId, stripeStatus]);

  if (stripeStatus === 'payment_failed') {
    return (
      <div className="confirmation-pending-page">
        <div className="container">
          <h1 className="confirmation-pending-title">{t.orderCreated}</h1>
          <p className="confirmation-pending-text">
            {lang === 'th' ? 'การชำระเงินล้มเหลว กรุณาลองอีกครั้งหรือสั่งผ่านธนาคาร' : 'Payment failed. Please try again or place order via bank transfer.'}
          </p>
          <Link href={`/${lang}/cart`} className="confirmation-pending-link">
            {tNav.cart}
          </Link>
        </div>
        <style jsx>{confirmationPendingStyles}</style>
      </div>
    );
  }

  if (sessionId && stripeStatus === 'processing') {
    return (
      <div className="confirmation-pending-page">
        <div className="container">
          <h1 className="confirmation-pending-title">{t.orderCreated}</h1>
          <p className="confirmation-pending-text">
            {lang === 'th' ? 'การชำระเงินสำเร็จ กำลังดำเนินการออเดอร์ของคุณ...' : 'Payment confirmed, finalizing your order…'}
          </p>
        </div>
        <style jsx>{confirmationPendingStyles}</style>
      </div>
    );
  }

  if (!orderId && !sessionId) {
    return (
      <div className="confirmation-pending-page">
        <div className="container">
          <h1 className="confirmation-pending-title">{t.orderCreated}</h1>
          <p className="confirmation-pending-text">No order ID. Please place an order from the cart.</p>
          <Link href={`/${lang}/cart`} className="confirmation-pending-link">
            {tNav.cart}
          </Link>
        </div>
        <style jsx>{confirmationPendingStyles}</style>
      </div>
    );
  }

  // Manual path (no Stripe session) or any path with orderId before paid: show pending confirmation (contact us)
  return <OrderPendingConfirmation orderId={orderId} locale={lang} />;
}

const confirmationPendingStyles = `
  .confirmation-pending-page {
    padding: 24px 0 48px;
  }
  .confirmation-pending-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 12px;
  }
  .confirmation-pending-text {
    margin: 0 0 16px;
    color: var(--text-muted);
  }
  .confirmation-pending-link {
    font-weight: 600;
    color: var(--accent);
    text-decoration: underline;
  }
  .confirmation-pending-link:hover {
    color: #967a4d;
  }
`;
