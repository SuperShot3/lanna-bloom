'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Partner } from '@/lib/bouquets';
import type { Bouquet } from '@/lib/bouquets';
import type { PartnerProduct } from '@/lib/sanity';
import { Card } from '@/components/partner/Card';
import { Badge } from '@/components/partner/Badge';
import { Btn } from '@/components/partner/Btn';
import type { Locale } from '@/lib/i18n';
import { getLineContactUrl } from '@/lib/messenger';
import { SUPPORT_EMAIL } from '@/lib/siteContact';

type DashboardT = {
  hello: string;
  quickActions: string;
  addProduct: string;
  myProducts: string;
  noProducts?: string;
  ordersSoon: string;
  contactSupport: string;
};

type BadgeT = Record<string, string>;

type PartnerDashboardClientProps = {
  lang: Locale;
  partner: Partner;
  bouquets: Bouquet[];
  products: PartnerProduct[];
  t: DashboardT;
  tBadge: BadgeT;
};

function partnerStatusToBadge(s: string): 'pending' | 'approved' | 'active' | 'rejected' | 'submitted' | 'needs_changes' {
  if (s === 'approved') return 'approved';
  if (s === 'pending_review') return 'pending';
  if (s === 'disabled') return 'rejected';
  return 'pending';
}

function bouquetStatusToBadge(s?: string): 'pending' | 'approved' | 'active' | 'rejected' | 'submitted' | 'needs_changes' {
  if (s === 'approved') return 'active';
  if (s === 'pending_review') return 'submitted';
  return 'submitted';
}

function productStatusToBadge(s?: string): 'pending' | 'approved' | 'active' | 'rejected' | 'submitted' | 'needs_changes' {
  if (s === 'live') return 'active';
  if (s === 'needs_changes') return 'needs_changes';
  return 'submitted';
}

export function PartnerDashboardClient({
  lang,
  partner,
  bouquets,
  products,
  t,
  tBadge,
}: PartnerDashboardClientProps) {
  const partnerLibraryHref: string | null = null;
  const supportLineUrl = useMemo(() => getLineContactUrl(), []);

  const supportCardRef = useRef<HTMLButtonElement>(null);
  const supportModalRef = useRef<HTMLDivElement>(null);
  const supportModalCloseRef = useRef<HTMLButtonElement>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const defaultSupportMessage = useMemo(() => {
    const page = typeof window !== 'undefined' ? window.location.pathname : '';
    return [
      'Hello Lanna Bloom support, I need help with my partner account.',
      '',
      `Shop name: ${partner.shopName ?? ''}`,
      'Issue:',
      `Page I am on: ${page}`,
      '',
    ].join('\n');
  }, [partner.shopName]);

  const [supportMessage, setSupportMessage] = useState(defaultSupportMessage);

  useEffect(() => {
    // Keep draft in sync if shop name is loaded/changed.
    setSupportMessage(defaultSupportMessage);
  }, [defaultSupportMessage]);

  useEffect(() => {
    if (!isSupportOpen) return;
    supportModalCloseRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSupportOpen(false);
        supportCardRef.current?.focus();
      }
      if (e.key === 'Tab') {
        const el = supportModalRef.current;
        if (!el) return;
        const focusable = el.querySelectorAll<HTMLElement>(
          'button, [href], textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      supportCardRef.current?.focus();
    };
  }, [isSupportOpen]);

  function handlePartnerLibraryClick() {
    if (typeof window !== 'undefined') {
      window.alert('Partner learning library is coming soon');
    }
  }

  async function handleCopySupportMessage() {
    try {
      await navigator.clipboard.writeText(supportMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.alert('Could not copy. Please copy manually.');
    }
  }

  function handleOpenLineSupport() {
    window.open(supportLineUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <>
      <Card className="partner-dashboard-welcome" style={{ background: 'linear-gradient(135deg, var(--color-sage-light) 0%, var(--color-cream) 100%)', marginBottom: 16 }}>
        <div className="partner-dashboard-welcome-top">
          <div>
            <div className="partner-dashboard-welcome-label">{t.hello}</div>
            <div className="partner-dashboard-welcome-shop">{partner.shopName} 🌸</div>
            <div className="partner-dashboard-welcome-sub">
              {partner.contactName} · {partner.city}
            </div>
          </div>
          <Badge status={partnerStatusToBadge(partner.status)} labelTh={tBadge[partnerStatusToBadge(partner.status)] ?? tBadge.pending} />
        </div>
        <div className="partner-dashboard-welcome-actions">
          {partnerLibraryHref ? (
            <Link href={partnerLibraryHref} className="partner-dashboard-link">
              <Btn small variant="ghost">
                Partner Library
                <span className="partner-soon-badge" aria-hidden="true">
                  Coming Soon
                </span>
              </Btn>
            </Link>
          ) : (
            <span className="partner-dashboard-link">
              <Btn small variant="ghost" className="partner-dashboard-soon-btn" onClick={handlePartnerLibraryClick}>
                Partner Library
                <span className="partner-soon-badge" aria-hidden="true">
                  Coming Soon
                </span>
              </Btn>
            </span>
          )}
        </div>
      </Card>

      <div className="partner-dashboard-section-title">{t.quickActions}</div>
      <div className="partner-dashboard-quick-actions">
        <Link href={`/${lang}/partner/products/new`} className="partner-dashboard-action-card">
          <Card style={{ padding: 16, cursor: 'pointer', height: '100%' }}>
            <div className="partner-dashboard-action-icon">➕</div>
            <div className="partner-dashboard-action-label">{t.addProduct}</div>
          </Card>
        </Link>
        <Link href={`/${lang}/partner/products`} className="partner-dashboard-action-card partner-dashboard-action-card--scroll">
          <Card style={{ padding: 16, cursor: 'pointer', height: '100%' }}>
            <div className="partner-dashboard-action-icon">📦</div>
            <div className="partner-dashboard-action-label">{t.myProducts}</div>
          </Card>
        </Link>
        <div className="partner-dashboard-action-card partner-dashboard-action-card--disabled">
          <Card style={{ padding: 16, opacity: 0.5, cursor: 'not-allowed', height: '100%' }}>
            <div className="partner-dashboard-action-icon">🛒</div>
            <div className="partner-dashboard-action-label">{t.ordersSoon}</div>
          </Card>
        </div>
        <button
          type="button"
          className="partner-dashboard-action-card partner-dashboard-action-card--button"
          onClick={() => setIsSupportOpen(true)}
          ref={supportCardRef}
        >
          <Card style={{ padding: 16, cursor: 'pointer', height: '100%' }}>
            <div className="partner-dashboard-action-icon">💬</div>
            <div className="partner-dashboard-action-label">{t.contactSupport}</div>
          </Card>
        </button>
      </div>

      {isSupportOpen && (
        <div className="partner-support-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="partner-support-modal-title" ref={supportModalRef}>
          <div
            className="partner-support-modal-backdrop"
            onClick={() => setIsSupportOpen(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsSupportOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close"
          />
          <div className="partner-support-modal-card">
            <div className="partner-support-modal-header">
              <div>
                <div id="partner-support-modal-title" className="partner-support-modal-title">
                  Contact support
                </div>
                <div className="partner-support-modal-subtitle">
                  Copy a message first, then choose LINE or email.
                </div>
                <div className="partner-support-modal-hint">
                  We'll reply as soon as possible.
                </div>
              </div>
              <button
                type="button"
                className="partner-support-modal-close"
                onClick={() => setIsSupportOpen(false)}
                ref={supportModalCloseRef}
                aria-label="Close"
              >
                <span aria-hidden>×</span>
              </button>
            </div>

            <div className="partner-support-modal-body">
              <div className="partner-support-modal-field">
                <div className="partner-support-modal-label">Message</div>
                <textarea
                  className="partner-support-modal-textarea"
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  rows={7}
                />
              </div>

              <div className="partner-support-modal-actions">
                <Btn small variant="secondary" onClick={handleCopySupportMessage}>
                  {copied ? 'Copied' : 'Copy message'}
                </Btn>
                <button type="button" className="partner-support-line-btn" onClick={handleOpenLineSupport}>
                  <span className="partner-support-line-logo" aria-hidden="true">
                    LINE
                  </span>
                  Open LINE
                </button>
                <a className="partner-support-email-btn" href={`mailto:${SUPPORT_EMAIL}`} target="_blank" rel="noopener noreferrer">
                  Email support
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="partner-dashboard-section-title">{t.myProducts}</div>
      <Card>
        {bouquets.length === 0 && products.length === 0 ? (
          <div className="partner-dashboard-products-empty">
            <p>{t.noProducts ?? 'No products yet'}</p>
            <Link href={`/${lang}/partner/products/new`}>
              <Btn variant="secondary" style={{ width: '100%', justifyContent: 'center' }}>
                + {t.addProduct}
              </Btn>
            </Link>
          </div>
        ) : (
          <>
            {bouquets.map((b) => {
              const minPrice = b.sizes?.length ? Math.min(...b.sizes.map((s) => s.price)) : 0;
              const name = lang === 'th' ? b.nameTh : b.nameEn;
              return (
                <div key={`bouquet-${b.id}`} className="partner-dashboard-product-row">
                  <div className="partner-dashboard-product-thumb">
                    {b.images?.[0] ? (
                      <img src={b.images[0]} alt="" width={44} height={44} style={{ objectFit: 'cover', borderRadius: 10 }} />
                    ) : (
                      <span>🌸</span>
                    )}
                  </div>
                  <div className="partner-dashboard-product-info">
                    <div className="partner-dashboard-product-name">{name}</div>
                    <div className="partner-dashboard-product-price">
                      {minPrice > 0 ? `฿${minPrice}` : '—'}
                    </div>
                  </div>
                  <Badge status={bouquetStatusToBadge(b.status)} labelTh={tBadge[bouquetStatusToBadge(b.status)] ?? tBadge.submitted} />
                </div>
              );
            })}
            {products.map((p) => {
              const name = lang === 'th' ? p.nameTh : p.nameEn;
              return (
                <div key={`product-${p.id}`} className="partner-dashboard-product-row">
                  <div className="partner-dashboard-product-thumb">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" width={44} height={44} style={{ objectFit: 'cover', borderRadius: 10 }} />
                    ) : (
                      <span>🎁</span>
                    )}
                  </div>
                  <div className="partner-dashboard-product-info">
                    <div className="partner-dashboard-product-name">{name}</div>
                    <div className="partner-dashboard-product-price">
                      {p.price > 0 ? `฿${p.price}` : '—'}
                    </div>
                  </div>
                  <Badge status={productStatusToBadge(p.moderationStatus)} labelTh={tBadge[productStatusToBadge(p.moderationStatus)] ?? tBadge.submitted} />
                </div>
              );
            })}
            <div className="partner-dashboard-products-add">
              <Link href={`/${lang}/partner/products/new`}>
                <Btn variant="secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  + {t.addProduct}
                </Btn>
              </Link>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
