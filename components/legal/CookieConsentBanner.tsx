'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

export function CookieConsentBanner({ lang }: { lang: Locale }) {
  const { status, hydrated, accept } = useCookieConsent();
  const visible = hydrated && status !== 'accepted';
  const t = lang === 'th' ? translations.th.cookieBanner : translations.en.cookieBanner;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (visible) {
      document.body.classList.add('cookie-consent-banner-open');
    } else {
      document.body.classList.remove('cookie-consent-banner-open');
    }
    return () => {
      document.body.classList.remove('cookie-consent-banner-open');
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="cookie-consent-banner"
      role="dialog"
      aria-live="polite"
      aria-label={t.ariaLabel}
    >
      <div className="cookie-consent-banner__inner">
        <p className="cookie-consent-banner__message">
          {t.messageBeforeLink}{' '}
          <Link href={`/${lang}/privacy`} className="cookie-consent-banner__link">
            {t.privacyLinkLabel}
          </Link>
          {' & '}
          <Link href={`/${lang}/cookies`} className="cookie-consent-banner__link">
            {t.cookieLinkLabel}
          </Link>
          {t.messageAfterLink ? ` ${t.messageAfterLink}` : null}
        </p>
        <div className="cookie-consent-banner__actions">
          <button type="button" className="cookie-consent-banner__btn cookie-consent-banner__btn--accept" onClick={accept}>
            {t.acceptLabel}
          </button>
        </div>
      </div>

      <style jsx>{`
        .cookie-consent-banner {
          position: fixed;
          inset-inline: 0;
          bottom: 0;
          z-index: 80;
          padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px));
          background: rgba(253, 252, 248, 0.98);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-top: 1px solid rgba(87, 83, 78, 0.15);
          box-shadow: 0 -4px 24px rgba(26, 60, 52, 0.08);
        }

        .cookie-consent-banner__inner {
          max-width: 72rem;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .cookie-consent-banner__message {
          margin: 0;
          font-size: 0.8125rem;
          line-height: 1.5;
          color: #57534e;
        }

        .cookie-consent-banner__link {
          color: #1a3c34;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .cookie-consent-banner__link:hover {
          color: #c5a059;
        }

        .cookie-consent-banner__actions {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .cookie-consent-banner__btn {
          min-height: 44px;
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }

        .cookie-consent-banner__btn--accept {
          background: #1a3c34;
          color: #fff;
          border-color: #1a3c34;
        }

        .cookie-consent-banner__btn--accept:hover {
          background: #0f2e28;
        }

        @media (min-width: 768px) {
          .cookie-consent-banner__inner {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 1.5rem;
          }

          .cookie-consent-banner__message {
            flex: 1;
            font-size: 0.875rem;
          }

          .cookie-consent-banner__actions {
            flex-direction: row;
            flex-shrink: 0;
            gap: 0.75rem;
          }

          .cookie-consent-banner__btn {
            min-width: 7rem;
          }
        }
      `}</style>
    </div>
  );
}
