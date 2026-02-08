'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessengerOrderButtons } from '@/components/MessengerOrderButtons';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Order } from '@/lib/orders';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function CheckoutSuccessClient({
  lang,
  orderId,
  publicOrderUrl: initialPublicOrderUrl,
  shareText: initialShareText,
}: {
  lang: Locale;
  orderId: string;
  publicOrderUrl?: string;
  shareText?: string;
}) {
  const t = translations[lang].checkoutSuccess;
  const tNav = translations[lang].nav;
  const [order, setOrder] = useState<Order | null>(null);
  const publicOrderUrl = initialPublicOrderUrl ?? '';
  const shareText = initialShareText ?? (publicOrderUrl ? `New order: ${orderId}. Details: ${publicOrderUrl}` : '');
  useEffect(() => {
    if (!orderId) return;
    let fired = false;
    const fireAdsConversion = (orderData: Order | null) => {
      if (fired) return;
      const params: Record<string, unknown> = { transaction_id: orderId };
      if (orderData?.pricing?.grandTotal != null) {
        params.value = orderData.pricing.grandTotal;
        params.currency = 'THB';
      }
      const send = () => {
        if (typeof window !== 'undefined' && window.gtag) {
          fired = true;
          window.gtag('event', 'ads_conversion_Success_Page_1', params);
        }
      };
      send();
      if (!fired) setTimeout(send, 800);
    };
    fetch(`/api/orders/${encodeURIComponent(orderId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setOrder(data);
        fireAdsConversion(data);
      })
      .catch(() => {
        setOrder(null);
        fireAdsConversion(null);
      });
  }, [orderId]);

  const [copied, setCopied] = useState<'link' | null>(null);
  const copyLink = async () => {
    if (!publicOrderUrl) return;
    try {
      await navigator.clipboard.writeText(publicOrderUrl);
      setCopied('link');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  };

  if (!orderId) {
    return (
      <div className="checkout-success-page">
        <div className="container">
          <h1 className="checkout-success-title">{t.orderCreated}</h1>
          <p className="checkout-success-text">No order ID. Please place an order from the cart.</p>
          <Link href={`/${lang}/cart`} className="checkout-success-link">
            {tNav.cart}
          </Link>
        </div>
      </div>
    );
  }

  const summaryLine =
    order?.items?.length &&
    order.items
      .map((i) => `${i.bouquetTitle} (${i.size})`)
      .join(', ');
  const totalLine = order?.pricing?.grandTotal != null ? `฿${order.pricing.grandTotal.toLocaleString()}` : '';

  return (
    <div className="checkout-success-page">
      <div className="container">
        <h1 className="checkout-success-title">{t.orderCreated}: {orderId}</h1>
        <p className="checkout-success-contact">{t.contactUsInMessenger}</p>
        {(summaryLine || totalLine) && (
          <div className="checkout-success-summary">
            <h2 className="checkout-success-summary-title">{t.orderSummaryTitle}</h2>
            {summaryLine && <p className="checkout-success-summary-line">{summaryLine}</p>}
            {totalLine && <p className="checkout-success-summary-total">{totalLine}</p>}
          </div>
        )}
        {publicOrderUrl && (
          <div className="checkout-success-save-link-notice">
            <h2 className="checkout-success-save-link-heading">{t.saveLinkLabel}</h2>
            <p className="checkout-success-save-link-text">{t.saveLinkNotice}</p>
            <p className="checkout-success-save-link-url">{publicOrderUrl}</p>
            <button
              type="button"
              className="checkout-success-copy-btn"
              onClick={copyLink}
              aria-label={t.copyLink}
            >
              {copied === 'link' ? (lang === 'th' ? 'คัดลอกแล้ว!' : 'Copied!') : t.copyLink}
            </button>
          </div>
        )}
        <MessengerOrderButtons lang={lang} prebuiltMessage={shareText} lineUseContactUrl pageLocation="checkout_success" />
        <p className="checkout-success-details">
          <Link href={`/order/${orderId}`} className="checkout-success-link" target="_blank" rel="noopener noreferrer">
            View full order details
          </Link>
        </p>
      </div>
      <style jsx>{`
        .checkout-success-page {
          padding: 24px 0 48px;
        }
        .checkout-success-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 12px;
        }
        .checkout-success-contact {
          font-size: 1rem;
          color: var(--text-muted);
          margin: 0 0 24px;
        }
        .checkout-success-summary {
          margin-bottom: 24px;
          padding: 16px;
          background: var(--pastel-cream);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
        }
        .checkout-success-summary-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-muted);
          margin: 0 0 8px;
        }
        .checkout-success-summary-line {
          font-size: 0.95rem;
          color: var(--text);
          margin: 0 0 4px;
        }
        .checkout-success-summary-total {
          font-size: 1rem;
          font-weight: 700;
          color: var(--accent);
          margin: 0;
        }
        .checkout-success-save-link-notice {
          margin-bottom: 24px;
          padding: 18px 20px;
          background: var(--pastel-cream);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-family: var(--font-sans);
        }
        .checkout-success-save-link-heading {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 10px;
        }
        .checkout-success-save-link-text {
          font-size: 1rem;
          line-height: 1.5;
          color: var(--text);
          margin: 0 0 12px;
        }
        .checkout-success-save-link-url {
          font-size: 0.95rem;
          word-break: break-all;
          color: var(--text-muted);
          margin: 0 0 12px;
        }
        .checkout-success-copy-btn {
          padding: 10px 16px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--accent);
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .checkout-success-copy-btn:hover {
          border-color: var(--accent);
          background: var(--accent-soft);
        }
        .checkout-success-details {
          margin-top: 24px;
        }
        .checkout-success-link {
          font-weight: 600;
          color: var(--accent);
          text-decoration: underline;
        }
        .checkout-success-link:hover {
          color: #967a4d;
        }
        .checkout-success-text {
          margin: 0 0 16px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
