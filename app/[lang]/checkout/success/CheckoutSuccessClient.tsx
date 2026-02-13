'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MessengerOrderButtons } from '@/components/MessengerOrderButtons';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Order } from '@/lib/orders';
import { trackPurchase } from '@/lib/analytics';
import type { AnalyticsItem } from '@/lib/analytics';

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
      .then((data: Order | null) => {
        setOrder(data);
        fireAdsConversion(data);
        if (data?.pricing?.grandTotal != null && data?.items?.length) {
          const purchaseItems: AnalyticsItem[] = data.items.map((it, i) => ({
            item_id: it.bouquetId,
            item_name: it.bouquetTitle,
            item_variant: it.size,
            price: it.price,
            quantity: 1,
            index: i,
          }));
          trackPurchase({
            orderId,
            value: data.pricing.grandTotal,
            currency: 'THB',
            items: purchaseItems,
            transactionId: orderId,
          });
        }
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

  const hasItems = order?.items?.length;
  const totalLine = order?.pricing?.grandTotal != null ? `฿${order.pricing.grandTotal.toLocaleString()}` : '';

  return (
    <div className="checkout-success-page">
      <div className="container">
        <h1 className="checkout-success-title">{t.orderCreated}: {orderId}</h1>
        <p className="checkout-success-contact">{t.contactUsInMessenger}</p>
        {(hasItems || totalLine) && (
          <div className="checkout-success-summary">
            <h2 className="checkout-success-summary-title">{t.orderSummaryTitle}</h2>
            {hasItems && (
              <ul className="checkout-success-summary-items">
                {order!.items.map((item, i) => (
                  <li key={i} className="checkout-success-summary-item">
                    {item.imageUrl && (
                      <div className="checkout-success-summary-thumb">
                        <Image
                          src={item.imageUrl}
                          alt=""
                          width={56}
                          height={56}
                          className="checkout-success-summary-img"
                          unoptimized={item.imageUrl.startsWith('data:')}
                        />
                      </div>
                    )}
                    <div className="checkout-success-summary-item-text">
                      <span className="checkout-success-summary-item-name">{item.bouquetTitle}</span>
                      <span className="checkout-success-summary-item-meta"> — {item.size}</span>
                      <span className="checkout-success-summary-item-price"> ฿{item.price.toLocaleString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {totalLine && (order!.items.length > 1) && <p className="checkout-success-summary-total">{totalLine}</p>}
          </div>
        )}
        {publicOrderUrl && (
          <div className="checkout-success-save-link-notice">
            <h2 className="checkout-success-save-link-heading">{t.saveLinkLabel}</h2>
            <p className="checkout-success-save-link-text">{t.saveLinkNotice}</p>
            <p className="checkout-success-save-link-url">{publicOrderUrl}</p>
            <div className="checkout-success-actions">
              <button
                type="button"
                className="checkout-success-copy-btn"
                onClick={copyLink}
                aria-label={t.copyLink}
              >
                {copied === 'link' ? (lang === 'th' ? 'คัดลอกแล้ว!' : 'Copied!') : t.copyLink}
              </button>
              <Link href={`/order/${orderId}`} className="checkout-success-view-details-btn" target="_blank" rel="noopener noreferrer">
                {t.viewFullOrderDetails}
              </Link>
            </div>
          </div>
        )}
        <MessengerOrderButtons lang={lang} prebuiltMessage={shareText} lineUseContactUrl pageLocation="checkout_success" />
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
        .checkout-success-summary-items {
          list-style: none;
          padding: 0;
          margin: 0 0 12px;
        }
        .checkout-success-summary-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid var(--border);
          font-size: 0.95rem;
          color: var(--text);
        }
        .checkout-success-summary-item:last-child {
          border-bottom: none;
        }
        .checkout-success-summary-thumb {
          flex-shrink: 0;
          width: 56px;
          height: 56px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: var(--pastel-cream, #f9f5f0);
        }
        .checkout-success-summary-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .checkout-success-summary-item-text {
          flex: 1;
          min-width: 0;
        }
        .checkout-success-summary-item-name {
          font-weight: 600;
          color: var(--text);
        }
        .checkout-success-summary-item-meta {
          color: var(--text-muted);
        }
        .checkout-success-summary-item-price {
          font-weight: 700;
          color: var(--accent);
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
        .checkout-success-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 12px;
        }
        .checkout-success-view-details-btn {
          display: inline-flex;
          align-items: center;
          padding: 10px 18px;
          font-size: 0.95rem;
          font-weight: 700;
          color: #fff;
          background: var(--accent);
          border: 1px solid var(--accent);
          border-radius: var(--radius-sm);
          text-decoration: none;
          transition: background 0.2s, transform 0.15s;
        }
        .checkout-success-view-details-btn:hover {
          background: #b39868;
          color: #fff;
          transform: translateY(-1px);
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
