'use client';

/**
 * INTERMEDIATE ORDER CONFIRMATION PAGE — "Order Placed, Pending Payment"
 *
 * This component is shown for orders that have been PLACED but NOT YET CONFIRMED AS PAID.
 * It acts as a buffer state between order creation and payment confirmation.
 *
 * CRITICAL ANALYTICS RULES:
 * - DO NOT fire GA4 `purchase` event from this component
 * - DO NOT fire any ecommerce completion tracking
 * - DO NOT treat this as a Stripe success page or final paid confirmation
 * - The real `purchase` event will ONLY be sent later through the controlled
 *   custom tracking flow, after admin manually confirms payment and the order
 *   status changes to PAID
 *
 * This page exists specifically to prevent premature GA4 purchase tracking.
 */

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

function CopyChip({ label, value, locale }: { label: string; value: string; locale: Locale }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="copy-chip">
      <span className="copy-chip-label">{label}</span>
      <div className="copy-chip-row">
        <span className="copy-chip-value">{value}</span>
        <button type="button" className="copy-chip-btn" onClick={copy} aria-label="Copy order ID">
          {copied ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06c755" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6L9 17l-5-5" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
          )}
        </button>
      </div>
      {copied && <span className="copy-chip-toast">{locale === 'th' ? 'คัดลอกแล้ว!' : 'Copied!'}</span>}

      <style jsx>{`
        .copy-chip {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          margin: 0 auto 28px;
          width: 100%;
          max-width: 340px;
        }
        .copy-chip-label {
          font-size: 0.82rem;
          color: #aaa;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .copy-chip-row {
          display: flex;
          align-items: center;
          gap: 0;
          width: auto;
          max-width: 100%;
          background: #fff;
          border: 1.5px solid #e8e0d8;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .copy-chip-value {
          flex: 1 1 auto;
          min-width: 0;
          padding: 10px 14px;
          font-family: ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
          font-size: 0.95rem;
          font-weight: 700;
          color: #444;
          letter-spacing: 0.04em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
        }
        .copy-chip-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          border: none;
          border-left: 1.5px solid #e8e0d8;
          background: #faf7f4;
          color: #b08d57;
          cursor: pointer;
          transition: background 0.15s;
        }
        .copy-chip-btn:hover {
          background: #f0ebe4;
        }
        .copy-chip-btn:active {
          background: #e8e0d8;
        }
        .copy-chip-toast {
          font-size: 0.78rem;
          font-weight: 600;
          color: #06c755;
          animation: chipFadeIn 0.2s ease;
        }
        @keyframes chipFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 480px) {
          .copy-chip-value {
            font-size: 0.85rem;
            padding: 9px 10px;
          }
          .copy-chip-btn {
            width: 38px;
            height: 38px;
          }
        }
        @media (max-width: 340px) {
          .copy-chip-value {
            font-size: 0.78rem;
            padding: 8px 8px;
            letter-spacing: 0.02em;
          }
        }
      `}</style>
    </div>
  );
}

function EmailIcon({ size = 24 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 6L2 7" />
    </svg>
  );
}

function isPaid(paymentStatus: string | null | undefined): boolean {
  return String(paymentStatus ?? '').toUpperCase() === 'PAID';
}

export function OrderPendingConfirmation({
  orderId,
  locale = 'en',
}: {
  orderId: string;
  locale?: Locale;
}) {
  // NEW BEHAVIOUR: this component is now just a thin redirector to the main order page.
  // The full pending / paid experience lives on /order/[orderId] with the new design.
  const t = translations[locale].pendingConfirmation;
  const [redirecting, setRedirecting] = useState(false);

  // Immediately send user to the unified order page.
  useEffect(() => {
    if (!orderId || redirecting) return;
    setRedirecting(true);
    const url = `/order/${encodeURIComponent(orderId)}?v=${Date.now()}`;
    window.location.href = url;
  }, [orderId, redirecting]);

  return (
    <div className="pending-page">
      <div className="pending-card">
        <div className="pending-wreath">
          <Image
            src="/check_out/2-removebg-preview.svg"
            alt=""
            width={220}
            height={330}
            priority
            unoptimized
          />
        </div>

        <h1 className="pending-title">{t.title}</h1>
        <p className="pending-subtitle">
          {t.paymentConfirmed}
        </p>
        <p className="pending-status-msg" role="status">
          {locale === 'th'
            ? 'กำลังพาคุณไปหน้ารายละเอียดออเดอร์...'
            : 'Taking you to your order details page…'}
        </p>
      </div>


      <style jsx>{`
        .pending-page {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 40px 20px 0;
          background: linear-gradient(180deg, #ffffff 0%, #fefbf8 30%, #faf5f0 60%, #f5ede5 100%);
          position: relative;
          overflow-x: hidden;
        }
        .pending-card {
          width: 100%;
          max-width: 460px;
          text-align: center;
          position: relative;
          z-index: 1;
          padding-bottom: 40px;
        }

        /* ---------- Wreath image ---------- */
        .pending-wreath {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }

        /* ---------- Typography ---------- */
        .pending-title {
          font-family: var(--font-serif, Georgia, 'Times New Roman', serif);
          font-size: 1.75rem;
          font-weight: 700;
          color: #1e1e1e;
          margin: 0 0 14px;
          line-height: 1.25;
          letter-spacing: -0.015em;
        }
        .pending-subtitle {
          font-size: 1.08rem;
          color: #777;
          margin: 0 0 20px;
          line-height: 1.55;
        }



        /* ---------- Divider ---------- */
        .pending-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin: 0 auto 28px;
          width: 70%;
          max-width: 240px;
        }
        .pending-divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, #ddd5cc 30%, #ddd5cc 70%, transparent);
        }
        .pending-divider-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #d4c8bc;
          flex-shrink: 0;
        }

        /* ---------- Contact heading ---------- */
        .pending-contact-heading {
          font-size: 0.94rem;
          color: #999;
          margin: 0 0 22px;
          letter-spacing: 0.02em;
        }

        /* ---------- Icon row ---------- */
        .pending-icons-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          margin: 0 auto;
        }
        .pending-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: 14px;
          color: #fff;
          text-decoration: none;
          transition: transform 0.15s ease, box-shadow 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .pending-icon:hover {
          transform: translateY(-3px);
        }
        .pending-icon:active {
          transform: scale(0.92);
        }
        .icon-line {
          background: #06c755;
          box-shadow: 0 3px 12px rgba(6, 199, 85, 0.3);
        }
        .icon-line:hover {
          box-shadow: 0 5px 20px rgba(6, 199, 85, 0.4);
        }
        .icon-whatsapp {
          background: #25d366;
          box-shadow: 0 3px 12px rgba(37, 211, 102, 0.3);
        }
        .icon-whatsapp:hover {
          box-shadow: 0 5px 20px rgba(37, 211, 102, 0.4);
        }
        .icon-email {
          background: #f6f2ed;
          color: #888;
          border: 1.5px solid #e8e0d8;
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
        }
        .icon-email:hover {
          background: #f0ebe4;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
        }

        /* ---------- Check status ---------- */
        .pending-check-status-wrap {
          margin-top: 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .pending-check-status-btn {
          padding: 12px 24px;
          font-size: 0.95rem;
          font-weight: 600;
          color: #fff;
          background: #b08d57;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s, opacity 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        .pending-check-status-btn:hover:not(:disabled) {
          background: #967a4d;
        }
        .pending-check-status-btn:disabled {
          opacity: 0.8;
          cursor: not-allowed;
        }
        .pending-status-msg {
          font-size: 0.9rem;
          color: #777;
          margin: 0;
          text-align: center;
          max-width: 320px;
        }

        /* ---------- Mobile ---------- */
        @media (max-width: 480px) {
          .pending-page {
            padding: 28px 16px 0;
          }
          .pending-title {
            font-size: 1.45rem;
          }
          .pending-subtitle {
            font-size: 1rem;
          }
          .pending-icons-row {
            gap: 14px;
          }
          .pending-icon {
            width: 46px;
            height: 46px;
          }
        }
      `}</style>
    </div>
  );
}
