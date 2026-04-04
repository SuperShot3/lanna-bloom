'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  getLineOrderUrl,
  getWhatsAppOrderUrl,
  getLineContactUrl,
  getWhatsAppContactUrl,
} from '@/lib/messenger';
import { LineIcon, WhatsAppIcon, HomeIcon } from '@/components/icons';
import { translations } from '@/lib/i18n';
import type { Order } from '@/lib/orders';
import type { Locale } from '@/lib/i18n';
import {
  markCheckoutSubmissionCompleted,
  readCheckoutTokenFromUrl,
  stripCheckoutTokenFromUrl,
} from '@/lib/checkout/submissionToken';
import { SUPPORT_EMAIL } from '@/lib/siteContact';

function EmailIconSmall({ size = 18 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 6L2 7" />
    </svg>
  );
}

/** Mini QR motif for payment method tab — matches emoji icon size (~20px). */
function QrTabIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      className="order-redesign-qr-tab-svg"
    >
      {/* Corner finders (stroke frame + inner square) */}
      <rect x="2" y="2" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <rect x="4.25" y="4.25" width="2.5" height="2.5" fill="currentColor" />
      <rect x="15" y="2" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <rect x="17.25" y="4.25" width="2.5" height="2.5" fill="currentColor" />
      <rect x="2" y="15" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <rect x="4.25" y="17.25" width="2.5" height="2.5" fill="currentColor" />
      {/* Data modules */}
      <rect x="11" y="3" width="2" height="2" fill="currentColor" />
      <rect x="11" y="7" width="2" height="2" fill="currentColor" />
      <rect x="13" y="11" width="2" height="2" fill="currentColor" />
      <rect x="17" y="11" width="2" height="2" fill="currentColor" />
      <rect x="11" y="13" width="2" height="2" fill="currentColor" />
      <rect x="15" y="13" width="2" height="2" fill="currentColor" />
      <rect x="19" y="13" width="2" height="2" fill="currentColor" />
      <rect x="13" y="15" width="2" height="2" fill="currentColor" />
      <rect x="17" y="15" width="2" height="2" fill="currentColor" />
      <rect x="11" y="17" width="2" height="2" fill="currentColor" />
      <rect x="15" y="17" width="2" height="2" fill="currentColor" />
      <rect x="19" y="17" width="2" height="2" fill="currentColor" />
      <rect x="13" y="19" width="2" height="2" fill="currentColor" />
      <rect x="17" y="19" width="2" height="2" fill="currentColor" />
    </svg>
  );
}

/** Align with CartContext + cart checkout (order route is outside CartProvider). */
const CART_STORAGE_KEY = 'lanna-bloom-cart';
const CART_FORM_STORAGE_KEY = 'lanna-bloom-cart-form';

function formatDisplayDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function parsePreferredTimeSlot(slot: string): { date: string; time: string } {
  const parts = slot.trim().split(/\s+/);
  if (parts.length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
    return { date: parts[0], time: parts.slice(1).join(' ') };
  }
  if (parts.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
    return { date: parts[0], time: '' };
  }
  return { date: slot, time: '' };
}

function getFulfillmentLabel(status: string, t: Record<string, string>): string {
  const map: Record<string, string> = {
    new: t.orderStatusNew ?? 'New',
    confirmed: t.orderStatusConfirmed ?? 'Confirmed',
    preparing: t.orderStatusPreparing ?? 'Preparing',
    ready_to_dispatch: t.orderStatusReadyToDispatch ?? 'Ready to dispatch',
    dispatched: t.orderStatusDispatched ?? 'Dispatched',
    delivered: t.orderStatusDelivered ?? 'Delivered',
    cancelled: t.orderStatusCancelled ?? 'Cancelled',
    issue: t.orderStatusIssue ?? 'Issue',
  };
  return map[status] ?? status;
}

export function OrderPageClient({
  order,
  orderId,
  detailsUrl,
  baseUrl,
  paid,
  canPay,
  fulfillmentStatus,
  fulfillmentStatusUpdatedAt,
  supabasePaymentMethod,
  supabasePaidAt,
  locale = 'en',
}: {
  order: Order;
  orderId: string;
  detailsUrl: string;
  baseUrl: string;
  paid: boolean;
  canPay: boolean;
  fulfillmentStatus?: string;
  fulfillmentStatusUpdatedAt?: string;
  supabasePaymentMethod?: string;
  supabasePaidAt?: string;
  locale?: Locale;
}) {
  const router = useRouter();
  const t = translations[locale].orderPage;
  const tCustom = translations[locale].customOrder;
  const tr = t as Record<string, string>;
  const qrOrderIdLine = tr.qrOrderIdReminder?.replace('{orderId}', orderId) ?? `Order ID: ${orderId}`;

  useEffect(() => {
    const token = readCheckoutTokenFromUrl();
    if (token) {
      markCheckoutSubmissionCompleted(token);
      stripCheckoutTokenFromUrl();
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([]));
        localStorage.removeItem(CART_FORM_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  const [activeTab, setActiveTab] = useState<'details' | 'pay'>('details');
  const [stripeSyncing, setStripeSyncing] = useState(false);

  // After Stripe Checkout redirect, the webhook may lag; verify the session server-side and refresh.
  useEffect(() => {
    if (paid) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id')?.trim();
    if (!sessionId) return;

    const doneKey = `stripe_sync_ok_${orderId}_${sessionId}`;
    try {
      if (sessionStorage.getItem(doneKey) === '1') {
        if (params.has('session_id') || params.has('stripe')) {
          const url = new URL(window.location.href);
          url.searchParams.delete('session_id');
          url.searchParams.delete('stripe');
          const qs = url.searchParams.toString();
          window.history.replaceState({}, '', `${url.pathname}${qs ? `?${qs}` : ''}`);
        }
        router.refresh();
        return;
      }
    } catch {
      // ignore
    }

    if (params.get('stripe') === 'success') {
      setActiveTab('pay');
    }

    setStripeSyncing(true);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/stripe/sync-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, orderId }),
        });
        const data = (await res.json().catch(() => ({}))) as { paid?: boolean };
        if (cancelled) return;
        if (res.ok && data.paid) {
          try {
            sessionStorage.setItem(doneKey, '1');
          } catch {
            // ignore
          }
          router.refresh();
          const url = new URL(window.location.href);
          url.searchParams.delete('session_id');
          url.searchParams.delete('stripe');
          const qs = url.searchParams.toString();
          window.history.replaceState({}, '', `${url.pathname}${qs ? `?${qs}` : ''}`);
        } else {
          // Webhook may have updated the order while sync failed or raced.
          router.refresh();
        }
      } finally {
        if (!cancelled) setStripeSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paid, orderId, router]);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'qr' | 'bank'>('qr');
  const [copied, setCopied] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  const { date: deliveryDate, time: preferredTime } = parsePreferredTimeSlot(
    order.delivery?.preferredTimeSlot ?? ''
  );
  const grandTotal = order.pricing?.grandTotal ?? order.amountTotal ?? 0;
  const orderMessage = `Order ${orderId}\n${detailsUrl}`;
  const fulfillmentLabel = getFulfillmentLabel(
    String(fulfillmentStatus ?? 'new'),
    t as unknown as Record<string, string>
  );

  const copyOrderId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [orderId]);

  const payWithCard = useCallback(async () => {
    if (payLoading || paid) return;
    setPayLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout-session-for-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, lang: locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      alert(data.error || (locale === 'th' ? 'ไม่สามารถเปิดหน้าชำระเงินได้' : 'Could not open payment page'));
    } finally {
      setPayLoading(false);
    }
  }, [orderId, locale, payLoading, paid]);

  const contactChannels = [
    { id: 'line' as const, getUrl: () => getLineOrderUrl(orderMessage), Icon: LineIcon, label: 'LINE' },
    { id: 'whatsapp' as const, getUrl: () => getWhatsAppOrderUrl(orderMessage), Icon: WhatsAppIcon, label: 'WhatsApp' },
  ];

  const contactQuickLinks = {
    line: getLineContactUrl(),
    whatsapp: getWhatsAppContactUrl(),
  };

  const emphasizePayTab = !paid && canPay && activeTab === 'details';
  const slipWhatsAppMessage =
    locale === 'th'
      ? `สวัสดีค่ะ ส่งสลิปชำระเงินสำหรับออเดอร์ ${orderId} ค่ะ`
      : `Hi — here is my payment slip for order ${orderId}. Thank you!`;
  const slipWhatsAppUrl = getWhatsAppOrderUrl(slipWhatsAppMessage);
  const paymentSlipMailto = (() => {
    const subject =
      locale === 'th' ? `สลิปชำระเงิน — ${orderId}` : `Payment slip — Order ${orderId}`;
    const body =
      locale === 'th'
        ? `รหัสออเดอร์: ${orderId}\n\nแนบหรือส่งสลิปชำระเงินด้านล่างค่ะ\n`
        : `Order ID: ${orderId}\n\nI am sending my payment slip below.\n`;
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  })();

  // Tooltip for disabled \"Make payment\" tab (order under review).
  const [showPayTooltip, setShowPayTooltip] = useState(false);
  const payTabWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showPayTooltip) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!payTabWrapRef.current || !target) return;
      if (!payTabWrapRef.current.contains(target)) {
        setShowPayTooltip(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showPayTooltip]);

  return (
    <div className="order-redesign">
      <header className="order-redesign-header">
        <div className="order-redesign-logo">
          <button
            type="button"
            className="order-redesign-logo-button"
            onClick={() => router.push(baseUrl)}
            aria-label={t.goToHome}
          >
            <Image
              src="/logo_icon_64.png"
              alt=""
              width={40}
              height={40}
              className="order-redesign-logo-img"
            />
          </button>
        </div>
        <div>
          <div className="order-redesign-shop-name">Lanna Bloom</div>
          <div className="order-redesign-shop-sub">{t.flowerDeliveryChiangMai}</div>
        </div>
      </header>

      {stripeSyncing && !paid && (
        <div className="order-redesign-stripe-sync" role="status" aria-live="polite">
          {locale === 'th' ? 'กำลังยืนยันการชำระเงิน…' : 'Confirming your payment…'}
        </div>
      )}

      <div className="order-redesign-tabs">
        <button
          type="button"
          className={`order-redesign-tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('details');
            setShowPayTooltip(false);
          }}
        >
          {t.orderDetails}
          <span className="order-redesign-badge badge-status">
            {fulfillmentLabel}
          </span>
        </button>
        <div className="order-redesign-tab-wrap" ref={payTabWrapRef}>
          <button
            type="button"
            className={`order-redesign-tab ${activeTab === 'pay' ? 'active' : ''} ${
              !paid && !canPay ? 'order-redesign-tab-disabled' : ''
            } ${emphasizePayTab ? 'order-redesign-tab-pay-cta' : ''}`}
            onClick={() => {
              if (!paid && !canPay) {
                setShowPayTooltip((prev) => !prev);
                return;
              }
              setActiveTab('pay');
              setShowPayTooltip(false);
            }}
            aria-disabled={!paid && !canPay}
            title={emphasizePayTab ? tr.payTabCtaHint : undefined}
            aria-label={
              emphasizePayTab ? `${t.makePayment}. ${tr.payTabCtaHint ?? ''}` : undefined
            }
          >
            {t.makePayment}
            <span
              className={`order-redesign-badge ${
                paid ? 'badge-paid' : canPay ? 'badge-ready' : 'badge-locked'
              }`}
            >
              {paid ? t.tabPaid : canPay ? t.tabReadyToPay : t.tabLocked}
            </span>
          </button>
          {!paid && !canPay && showPayTooltip && (
            <div className="order-redesign-tooltip" role="dialog" aria-label={t.orderUnderReview}>
              <div className="order-redesign-tooltip-arrow" />
              <div className="order-redesign-tooltip-title">
                {t.orderUnderReview}
              </div>
              <div className="order-redesign-tooltip-text">
                {t.orderUnderReviewText}
              </div>
              <div className="order-redesign-tooltip-chips">
                <a
                  href={contactQuickLinks.line}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="order-redesign-tooltip-chip"
                >
                  <LineIcon size={14} /> LINE
                </a>
                <a
                  href={contactQuickLinks.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="order-redesign-tooltip-chip"
                >
                  <WhatsAppIcon size={14} /> WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'details' && (
        <section className="order-redesign-panel">
          <div className="order-redesign-meta">
            <div className="order-redesign-meta-card full">
              <div className="order-redesign-meta-label">Order ID</div>
              <div className="order-redesign-meta-value mono">{orderId}</div>
              <button
                type="button"
                className="order-redesign-copy-btn"
                onClick={copyOrderId}
                aria-label={t.copyOrderId}
              >
                {copied ? t.copied : t.copyOrderId}
              </button>
            </div>
            <div className="order-redesign-meta-card">
              <div className="order-redesign-meta-label">{t.deliveryDate}</div>
              <div className="order-redesign-meta-value">{formatDisplayDate(deliveryDate) || '—'}</div>
            </div>
            <div className="order-redesign-meta-card">
              <div className="order-redesign-meta-label">{t.preferredTime}</div>
              <div className="order-redesign-meta-value">{preferredTime || '—'}</div>
            </div>
            <div className="order-redesign-meta-card full">
              <div className="order-redesign-meta-label">{t.address}</div>
              <div className="order-redesign-meta-value">{order.delivery?.address || '—'}</div>
            </div>
          </div>

          {order.customOrderDetails && (
            <div className="order-redesign-custom-details">
              <div className="order-redesign-section-title">{tCustom.title}</div>
              <div className="order-redesign-meta-card full">
                <div className="order-redesign-meta-label">{tCustom.giftDescription}</div>
                <div className="order-redesign-meta-value">{order.customOrderDetails.giftDescription}</div>
              </div>
              {order.customOrderDetails.occasion && (
                <div className="order-redesign-meta-card">
                  <div className="order-redesign-meta-label">{tCustom.occasion}</div>
                  <div className="order-redesign-meta-value">{order.customOrderDetails.occasion}</div>
                </div>
              )}
              {order.customOrderDetails.referenceImageUrl && (
                <div className="order-redesign-meta-card full">
                  <div className="order-redesign-meta-label">{tCustom.attachImage}</div>
                  <a
                    href={order.customOrderDetails.referenceImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="order-redesign-meta-value order-redesign-link"
                  >
                    {order.customOrderDetails.referenceImageFilename || tCustom.submitSuccessViewOrder}
                  </a>
                </div>
              )}
              {order.customOrderDetails.customerComments && (
                <div className="order-redesign-meta-card full">
                  <div className="order-redesign-meta-label">{tCustom.comments}</div>
                  <div className="order-redesign-meta-value">{order.customOrderDetails.customerComments}</div>
                </div>
              )}
            </div>
          )}

          <div className="order-redesign-section-title">{t.item}</div>
          {(order.items ?? []).map((item, i) => (
            <div key={i} className="order-redesign-item-row">
              <div className="order-redesign-item-img">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt="" width={44} height={44} className="order-redesign-item-img-inner" unoptimized={item.imageUrl.startsWith('data:')} />
                ) : (
                  <span aria-hidden>🌸</span>
                )}
              </div>
              <div className="order-redesign-item-info">
                <div className="order-redesign-item-name">{item.bouquetTitle}</div>
                <div className="order-redesign-item-sub">{item.size}</div>
              </div>
              <div className="order-redesign-item-price">฿{item.price.toLocaleString()}</div>
            </div>
          ))}

          <div className="order-redesign-totals">
            <div className="order-redesign-totals-row">
              <span>{t.bouquetPrice}</span>
              <span>฿{(order.pricing?.itemsTotal ?? 0).toLocaleString()}</span>
            </div>
            <div className="order-redesign-totals-row">
              <span>{t.deliveryFee}</span>
              <span>฿{(order.pricing?.deliveryFee ?? 0).toLocaleString()}</span>
            </div>
            {order.referralDiscount != null && order.referralDiscount > 0 && (
              <div className="order-redesign-totals-row">
                <span>{t.discount}</span>
                <span>-฿{order.referralDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="order-redesign-totals-row total">
              <span>{t.total}</span>
              <span>฿{grandTotal.toLocaleString()}</span>
            </div>
          </div>

          {(order.customerName || order.phone) && (
            <>
              <div className="order-redesign-section-title">{t.sender}</div>
              <div className="order-redesign-meta-card">
                <div className="order-redesign-meta-value">{order.customerName || '—'}</div>
                <div className="order-redesign-meta-sub">
                  {order.phone ?? ''} {order.phone && order.customerEmail ? '·' : ''} {order.customerEmail ?? ''}
                </div>
              </div>
            </>
          )}

          <div className="order-redesign-contact-bar">
            <span className="order-redesign-contact-bar-label">{t.contactLannaBloom}:</span>
            <div className="order-redesign-contact-icons">
              {contactChannels.map((ch) => (
                <a
                  key={ch.id}
                  href={ch.getUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="order-redesign-contact-icon"
                  title={ch.label}
                  aria-label={ch.label}
                >
                  <ch.Icon size={18} />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'pay' && (
        <section className="order-redesign-panel">
          {paid ? (
            <div className="order-redesign-paid-view">
              <div className="order-redesign-paid-check" aria-hidden>✓</div>
              <div className="order-redesign-paid-title">{t.paymentConfirmedTitle}</div>
              <div className="order-redesign-paid-sub">
                {supabasePaidAt
                  ? new Date(supabasePaidAt).toLocaleString(locale === 'th' ? 'th-TH' : undefined)
                  : ''}
                <br />
                {t.paymentConfirmedSub}
              </div>
              <div className="order-redesign-paid-details">
                <div className="order-redesign-totals-row">
                  <span>{t.amountPaid}</span>
                  <span>฿{grandTotal.toLocaleString()}</span>
                </div>
                <div className="order-redesign-totals-row">
                  <span>{t.method}</span>
                  <span>{(supabasePaymentMethod ?? 'Card').replace(/_/g, ' ')}</span>
                </div>
                <div className="order-redesign-totals-row">
                  <span>{t.reference}</span>
                  <span className="mono">{orderId}</span>
                </div>
              </div>
            </div>
          ) : !canPay ? (
            <div className="order-redesign-paid-view">
              <div className="order-redesign-paid-check" aria-hidden>🌸</div>
              <div className="order-redesign-paid-title">
                {locale === 'th' ? 'ออเดอร์อยู่ระหว่างตรวจสอบ' : 'Your order is under review'}
              </div>
              <div className="order-redesign-paid-sub">
                {locale === 'th'
                  ? 'เราจะเปิดให้ชำระเงินที่หน้านี้หลังจากแอดมินยืนยันออเดอร์แล้ว'
                  : 'We will enable payment here after our team confirms your order.'}
              </div>
            </div>
          ) : (
            <>
              <div className="order-redesign-pay-banner ready">
                🌸 {t.orderConfirmedReady}
              </div>

              <div className="order-redesign-method-tabs">
                <button
                  type="button"
                  className={`order-redesign-method-tab ${paymentMethod === 'qr' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('qr')}
                >
                  <span className="order-redesign-method-icon order-redesign-method-icon-qr" aria-hidden>
                    <QrTabIcon size={20} />
                  </span>
                  <div className="order-redesign-method-name">{t.paymentMethodQr}</div>
                  <div className="order-redesign-method-sub">{t.promptPay}</div>
                </button>
                <button
                  type="button"
                  className={`order-redesign-method-tab ${paymentMethod === 'card' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <span className="order-redesign-method-icon">💳</span>
                  <div className="order-redesign-method-name">{t.paymentMethodCard}</div>
                  <div className="order-redesign-method-sub">{t.visaMastercard}</div>
                </button>
                <button
                  type="button"
                  className={`order-redesign-method-tab ${paymentMethod === 'bank' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('bank')}
                >
                  <span className="order-redesign-method-icon">🏦</span>
                  <div className="order-redesign-method-name">{t.paymentMethodBank}</div>
                  <div className="order-redesign-method-sub">{t.directDeposit}</div>
                </button>
              </div>

              {paymentMethod === 'card' && (
                <div className="order-redesign-method-content">
                  <p className="order-redesign-card-intro">{tr.cardPaymentIntro}</p>
                  <button
                    type="button"
                    className="order-redesign-pay-btn"
                    onClick={payWithCard}
                    disabled={payLoading}
                  >
                    {payLoading
                      ? (locale === 'th' ? 'กำลังเปิด…' : 'Opening…')
                      : t.payAmount.replace('{amount}', grandTotal.toLocaleString())}
                  </button>
                  <div className="order-redesign-secured-note">{t.securedNote}</div>
                </div>
              )}

              {paymentMethod === 'qr' && (
                <div className="order-redesign-method-content">
                  <div className="order-redesign-qr-above-image">
                    <p className="order-redesign-qr-step">{tr.qrPaymentIntro}</p>
                    <p className="order-redesign-qr-step order-redesign-qr-step-slip">{tr.qrAfterPaySlip}</p>
                    <div
                      className="order-redesign-qr-amount-block"
                      role="group"
                      aria-label={`${tr.qrAmountToPayLabel}. ${tr.sendSlipContactHeading}`}
                    >
                      <div className="order-redesign-qr-amount-label">{tr.qrAmountToPayLabel}</div>
                      <div className="order-redesign-qr-amount-value">฿{grandTotal.toLocaleString()}</div>
                      <div className="order-redesign-slip-heading order-redesign-slip-heading--inAmount">
                        {tr.sendSlipContactHeading}
                      </div>
                      <div className="order-redesign-slip-row order-redesign-slip-row--inAmount">
                        <a
                          href={contactQuickLinks.line}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="order-redesign-slip-btn"
                        >
                          <LineIcon size={18} /> {tr.slipContactLine}
                        </a>
                        <a
                          href={slipWhatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="order-redesign-slip-btn"
                        >
                          <WhatsAppIcon size={18} /> {tr.slipContactWhatsApp}
                        </a>
                        <a href={paymentSlipMailto} className="order-redesign-slip-btn">
                          <EmailIconSmall size={18} /> {tr.slipContactEmail}
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="order-redesign-qr-wrap">
                    <Image
                      src="/payments/promptpay-static-ttb.png"
                      alt="PromptPay QR code"
                      width={260}
                      height={460}
                      className="order-redesign-qr-img"
                    />
                  </div>
                  <p className="order-redesign-qr-actions">
                    <a
                      href="/payments/promptpay-static-ttb.png"
                      download="promptpay-qr.png"
                      className="order-redesign-qr-download-btn"
                    >
                      {locale === 'th' ? 'ดาวน์โหลด QR' : 'Download QR'}
                    </a>
                  </p>
                  <div className="order-redesign-qr-below-image">
                    <p className="order-redesign-qr-order-id mono">{qrOrderIdLine}</p>
                    <div className="order-redesign-line-id-row">
                      <div className="order-redesign-line-id-pair">
                        <span className="order-redesign-line-id-label">{tr.qrLineIdLabel}</span>
                        <span className="order-redesign-line-id-value">{tr.lineIdDisplay}</span>
                      </div>
                      <div className="order-redesign-line-id-pair">
                        <span className="order-redesign-line-id-label">{tr.qrEmailLabel}</span>
                        <span className="order-redesign-line-id-value order-redesign-line-id-email">
                          {SUPPORT_EMAIL}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'bank' && (
                <div className="order-redesign-method-content">
                  <p className="order-redesign-card-intro">
                    {locale === 'th'
                      ? 'โอนเข้าบัญชีด้านล่าง แล้วส่งสลิปให้เราทาง LINE หรือแชท'
                      : 'Make a bank transfer using the details below, then send your slip to us via LINE or chat.'}
                  </p>
                  <div className="order-redesign-bank-card">
                    <div className="order-redesign-bank-row">
                      <span className="order-redesign-bank-label">Bank</span>
                      <span className="order-redesign-bank-value">ttb</span>
                    </div>
                    <div className="order-redesign-bank-row">
                      <span className="order-redesign-bank-label">Account number</span>
                      <span className="order-redesign-bank-value">592-2-11790-7</span>
                    </div>
                    <div className="order-redesign-bank-row">
                      <span className="order-redesign-bank-label">Account name (TH)</span>
                      <span className="order-redesign-bank-value">นส.วรพรรณ นันทเศรษฐา</span>
                    </div>
                    <div className="order-redesign-bank-row">
                      <span className="order-redesign-bank-label">Account name (EN)</span>
                      <span className="order-redesign-bank-value">Ms. Woraphan Nantaseththa</span>
                    </div>
                    <div className="order-redesign-bank-row">
                      <span className="order-redesign-bank-label">Amount</span>
                      <span className="order-redesign-bank-value">฿{grandTotal.toLocaleString()}</span>
                    </div>
                    <div className="order-redesign-bank-row">
                      <span className="order-redesign-bank-label">Reference</span>
                      <span className="order-redesign-bank-value">{orderId}</span>
                    </div>
                  </div>
                  <p className="order-redesign-coming-text">
                    {locale === 'th'
                      ? 'หลังจากโอนแล้ว กรุณาส่งสลิปและหมายเลขออเดอร์ให้เราทาง LINE หรือช่องทางแชทที่คุณใช้'
                      : 'After transfer, please send your slip and order ID to us via LINE or your preferred chat channel.'}
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <div className="order-redesign-footer">
        <button
          type="button"
          className="order-redesign-home-link"
          onClick={() => router.push(baseUrl)}
        >
          <span className="order-redesign-home-icon" aria-hidden>
            <HomeIcon size={16} />
          </span>
          <span className="order-redesign-home-text">{t.goToHome}</span>
        </button>
      </div>

      <style jsx>{`
        .order-redesign {
          max-width: 680px;
          margin: 0 auto;
          padding: 1rem 0 2rem;
        }
        .order-redesign-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }
        .order-redesign-logo {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          flex-shrink: 0;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .order-redesign-logo-button {
          display: block;
          width: 100%;
          height: 100%;
          padding: 0;
          margin: 0;
          border: none;
          background: none;
          cursor: pointer;
        }
        .order-redesign-logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .order-redesign-shop-name {
          font-family: var(--font-serif);
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text);
          letter-spacing: 0.04em;
        }
        .order-redesign-shop-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .order-redesign-stripe-sync {
          font-size: 13px;
          color: var(--text-muted);
          text-align: center;
          padding: 10px 12px;
          margin-bottom: 0.75rem;
          background: var(--pastel-cream);
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
        }
        .order-redesign-tabs {
          display: flex;
          border-bottom: 1px solid var(--border);
          margin-bottom: 0;
        }
        .order-redesign-tab {
          flex: 1;
          padding: 12px 8px;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.03em;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          position: relative;
          transition: color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .order-redesign-tab-disabled {
          cursor: pointer;
          opacity: 0.7;
        }
        .order-redesign-tab-wrap {
          position: relative;
          flex: 1;
          display: flex;
          justify-content: center;
        }
        .order-redesign-tooltip {
          position: absolute;
          top: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%);
          max-width: 260px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 12px 14px;
          z-index: 10;
          font-size: 11px;
          color: var(--text-muted);
        }
        .order-redesign-tooltip-arrow {
          position: absolute;
          top: -5px;
          left: 50%;
          transform: translateX(-50%) rotate(45deg);
          width: 9px;
          height: 9px;
          background: var(--surface);
          border-left: 1px solid var(--border);
          border-top: 1px solid var(--border);
        }
        .order-redesign-tooltip-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 4px;
        }
        .order-redesign-tooltip-text {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 10px;
        }
        .order-redesign-tooltip-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .order-redesign-tooltip-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: transparent;
          font-size: 11px;
          color: var(--text-muted);
          cursor: pointer;
          text-decoration: none;
          transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
        }
        .order-redesign-tooltip-chip:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--accent-soft, #f3e7d6);
        }
        .order-redesign-tab:hover {
          color: var(--text);
        }
        .order-redesign-tab.active {
          color: var(--accent);
        }
        .order-redesign-tab.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--accent);
          border-radius: 2px 2px 0 0;
        }
        .order-redesign-tab.order-redesign-tab-pay-cta {
          margin: 4px 4px 0;
          border-radius: var(--radius-sm);
          background: linear-gradient(145deg, var(--accent-soft, #f3e7d6), var(--pastel-cream));
          border: 1px solid var(--accent-border, #c4a574);
          box-shadow: 0 0 0 1px rgba(180, 140, 90, 0.2);
          animation: orderPayTabPulse 2.5s ease-in-out infinite;
          color: var(--text);
        }
        .order-redesign-tab.order-redesign-tab-pay-cta:hover {
          color: var(--accent);
        }
        @keyframes orderPayTabPulse {
          0%,
          100% {
            box-shadow: 0 0 0 1px rgba(180, 140, 90, 0.2);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(180, 140, 90, 0.12);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .order-redesign-tab.order-redesign-tab-pay-cta {
            animation: none;
          }
        }
        .order-redesign-badge {
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 20px;
          font-weight: 500;
        }
        .badge-new {
          background: var(--pastel-cream);
          color: var(--text-muted);
        }
        .badge-ready {
          background: var(--accent-soft);
          color: var(--accent-border, #a88b5c);
        }
        .badge-paid {
          background: var(--pastel-mint);
          color: #1a5f4a;
        }
        .badge-status {
          background: var(--pastel-cream);
          color: var(--text-muted);
        }
        .order-redesign-panel {
          padding: 1.25rem 0;
        }
        .order-redesign-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 1rem;
        }
        .order-redesign-meta-card {
          background: var(--pastel-cream);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
        }
        .order-redesign-meta-card.full {
          grid-column: 1 / -1;
        }
        .order-redesign-meta-label {
          font-size: 11px;
          color: var(--text-muted);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 3px;
        }
        .order-redesign-meta-value {
          font-size: 13px;
          color: var(--text);
          font-weight: 500;
        }
        .order-redesign-meta-value.mono {
          font-family: ui-monospace, monospace;
          font-size: 12px;
          letter-spacing: 0.05em;
        }
        a.order-redesign-link {
          color: var(--accent);
          text-decoration: underline;
          font-weight: 600;
        }
        .order-redesign-meta-sub {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 3px;
        }
        .order-redesign-copy-btn {
          font-size: 10px;
          margin-top: 6px;
          padding: 3px 8px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-muted);
          cursor: pointer;
        }
        .order-redesign-copy-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
        }
        .order-redesign-section-title {
          font-size: 11px;
          color: var(--text-muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin: 1rem 0 8px;
        }
        .order-redesign-item-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
        }
        .order-redesign-item-row:last-of-type {
          border-bottom: none;
        }
        .order-redesign-item-img {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-sm);
          background: linear-gradient(135deg, var(--pastel-cream), var(--accent-soft));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
          overflow: hidden;
        }
        .order-redesign-item-img-inner {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .order-redesign-item-info {
          flex: 1;
          min-width: 0;
        }
        .order-redesign-item-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
        }
        .order-redesign-item-sub {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .order-redesign-item-price {
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
        }
        .order-redesign-totals {
          padding: 12px 0 4px;
        }
        .order-redesign-totals-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          font-size: 13px;
          color: var(--text-muted);
        }
        .order-redesign-totals-row.total {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          border-top: 1px solid var(--border);
          padding-top: 10px;
          margin-top: 4px;
        }
        .order-redesign-contact-bar {
          background: var(--pastel-cream);
          border-radius: var(--radius-sm);
          padding: 12px 14px;
          margin-top: 1rem;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .order-redesign-contact-bar-label {
          font-size: 12px;
          color: var(--text-muted);
        }
        .order-redesign-contact-icons {
          display: flex;
          gap: 8px;
        }
        .order-redesign-contact-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: var(--surface);
          color: var(--text-muted);
          text-decoration: none;
          transition: border-color 0.15s, color 0.15s;
        }
        .order-redesign-contact-icon:hover {
          border-color: var(--accent);
          color: var(--accent);
        }
        .order-redesign-pay-banner {
          border-radius: var(--radius-sm);
          padding: 12px 16px;
          margin-bottom: 1.25rem;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .order-redesign-pay-banner.paid {
          background: var(--pastel-mint);
          color: #1a5f4a;
        }
        .order-redesign-pay-banner.ready {
          background: var(--pastel-pink);
          color: #8b3a3a;
        }
        .order-redesign-method-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
        }
        .order-redesign-method-tab {
          flex: 1;
          min-width: 100px;
          padding: 10px 8px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: var(--surface);
          cursor: pointer;
          text-align: center;
          transition: all 0.15s;
        }
        .order-redesign-method-tab:hover:not(:disabled) {
          border-color: var(--accent);
        }
        .order-redesign-method-tab.active {
          border-color: var(--accent);
          background: var(--accent-soft);
        }
        .order-redesign-method-tab:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }
        .order-redesign-method-icon {
          font-size: 20px;
          display: block;
          margin-bottom: 4px;
        }
        .order-redesign-method-icon-qr {
          font-size: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: auto;
          margin-right: auto;
          margin-bottom: 4px;
          width: 20px;
          height: 20px;
          color: var(--text-muted);
        }
        .order-redesign-method-tab.active .order-redesign-method-icon-qr {
          color: var(--accent);
        }
        .order-redesign-qr-tab-svg {
          display: block;
          flex-shrink: 0;
        }
        .order-redesign-method-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--text);
        }
        .order-redesign-method-tab.active .order-redesign-method-name {
          color: var(--accent);
        }
        .order-redesign-method-sub {
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .order-redesign-method-content {
          margin-top: 0;
        }
        .order-redesign-card-intro {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0 0 12px;
        }
        .order-redesign-pay-btn {
          width: 100%;
          padding: 14px;
          background: var(--accent);
          color: var(--accent-cta-text, #fff);
          border: 2px solid var(--accent-border);
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.03em;
          margin-top: 6px;
          transition: background 0.15s, transform 0.15s;
          font-family: inherit;
        }
        .order-redesign-pay-btn:hover:not(:disabled) {
          background: var(--accent-border);
          transform: translateY(-1px);
        }
        .order-redesign-pay-btn:disabled {
          opacity: 0.8;
          cursor: wait;
        }
        .order-redesign-secured-note {
          font-size: 11px;
          color: var(--text-muted);
          text-align: center;
          margin-top: 10px;
        }
        .order-redesign-coming-soon {
          font-size: 14px;
          font-weight: 600;
          color: var(--accent);
          margin-bottom: 8px;
        }
        .order-redesign-coming-text {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0;
        }
        .order-redesign-qr-below-image {
          margin-top: 12px;
        }
        .order-redesign-qr-wrap {
          margin: 12px 0;
          display: flex;
          justify-content: center;
        }
        .order-redesign-qr-img {
          max-width: 260px;
          width: 100%;
          height: auto;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: var(--surface);
        }
        .order-redesign-qr-actions {
          text-align: center;
          margin: 8px 0 4px;
        }
        .order-redesign-qr-download-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--surface);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text);
          text-decoration: none;
          transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
        }
        .order-redesign-qr-download-btn:hover {
          background: var(--accent-soft, #f3e7d6);
          border-color: var(--accent);
          transform: translateY(-1px);
        }
        .order-redesign-qr-above-image {
          margin-bottom: 1rem;
        }
        .order-redesign-qr-step {
          font-size: 14px;
          line-height: 1.55;
          color: var(--text-muted);
          margin: 0 0 10px;
        }
        .order-redesign-qr-step-slip {
          font-weight: 600;
          color: var(--text);
          margin-bottom: 14px;
        }
        .order-redesign-qr-amount-block {
          text-align: center;
          padding: 16px 18px 18px;
          margin: 0 0 12px;
          border-radius: var(--radius-sm);
          border: 2px solid var(--accent-border, #c4a574);
          background: linear-gradient(180deg, var(--surface), var(--pastel-cream));
        }
        .order-redesign-qr-amount-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 6px;
        }
        .order-redesign-qr-amount-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text);
          letter-spacing: 0.02em;
          line-height: 1.15;
        }
        .order-redesign-qr-order-id {
          font-family: ui-monospace, 'Cascadia Code', monospace;
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          text-align: center;
          margin: 0 0 12px;
          letter-spacing: 0.04em;
        }
        .order-redesign-line-id-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 16px;
          align-items: start;
          margin-bottom: 12px;
          padding: 12px 14px;
          background: var(--pastel-cream);
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
        }
        @media (max-width: 520px) {
          .order-redesign-line-id-row {
            grid-template-columns: 1fr;
          }
        }
        .order-redesign-line-id-pair {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .order-redesign-line-id-label {
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.03em;
        }
        .order-redesign-line-id-value {
          font-weight: 700;
          color: var(--text);
          font-size: 13px;
        }
        .order-redesign-line-id-email {
          font-weight: 600;
          word-break: break-all;
          line-height: 1.35;
        }
        .order-redesign-slip-heading {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-muted);
          text-align: center;
          margin: 16px 0 10px;
        }
        .order-redesign-slip-heading--inAmount {
          margin: 14px 0 10px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }
        .order-redesign-slip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          margin-bottom: 4px;
        }
        .order-redesign-slip-row--inAmount {
          margin: 0;
          max-width: 100%;
        }
        .order-redesign-qr-amount-block .order-redesign-slip-btn {
          padding: 8px 12px;
          font-size: 0.8rem;
        }
        .order-redesign-slip-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: var(--surface);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text);
          text-decoration: none;
          cursor: pointer;
          font-family: inherit;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .order-redesign-slip-btn:hover {
          border-color: var(--accent);
          background: var(--accent-soft, #f3e7d6);
          color: var(--accent);
        }
        .order-redesign-bank-card {
          margin: 8px 0 10px;
          padding: 12px 14px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: var(--surface);
        }
        .order-redesign-bank-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          padding: 3px 0;
        }
        .order-redesign-bank-label {
          color: var(--text-muted);
        }
        .order-redesign-bank-value {
          font-weight: 500;
          color: var(--text);
        }
        .order-redesign-paid-view {
          padding: 2rem 0;
          text-align: center;
        }
        .order-redesign-paid-check {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--pastel-mint);
          color: #1a5f4a;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          font-size: 24px;
          font-weight: 700;
        }
        .order-redesign-paid-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1a5f4a;
          margin-bottom: 6px;
        }
        .order-redesign-paid-sub {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.7;
          margin-bottom: 0;
        }
        .order-redesign-paid-details {
          background: var(--pastel-cream);
          border-radius: var(--radius-sm);
          padding: 12px 14px;
          margin-top: 16px;
          text-align: left;
        }
        .order-redesign-paid-details .mono {
          font-family: ui-monospace, monospace;
          font-size: 12px;
        }
        .order-redesign-footer {
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }
        .order-redesign-home-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          font-size: 0.9rem;
          color: var(--accent);
          font-weight: 600;
          text-decoration: none;
          background: color-mix(in srgb, var(--accent-soft, #f3e7d6) 70%, #fff 30%);
          border: 1px solid var(--accent-border, #d1b68a);
          border-radius: 999px;
          cursor: pointer;
          font-family: inherit;
        }
        .order-redesign-home-link:hover {
          background: color-mix(in srgb, var(--accent-soft, #f3e7d6) 85%, #fff 15%);
        }
        .order-redesign-home-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 999px;
        }
        .order-redesign-home-icon svg {
          margin-bottom: 2px;
        }
        .order-redesign-home-text {
          line-height: 1;
        }
      `}</style>
    </div>
  );
}
