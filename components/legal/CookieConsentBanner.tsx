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
        <div className="cookie-consent-banner__content">
          <p className="cookie-consent-banner__intro">{t.messageBeforeLink}</p>
          <p className="cookie-consent-banner__links">
            {t.linksIntro ? `${t.linksIntro} ` : null}
            <Link
              href={`/${lang}/privacy`}
              className="cookie-consent-banner__link font-bold underline underline-offset-2 decoration-1 text-[#1a3c34] hover:text-[#c5a059]"
            >
              {t.privacyLinkLabel}
            </Link>
            {' & '}
            <Link
              href={`/${lang}/cookies`}
              className="cookie-consent-banner__link font-bold underline underline-offset-2 decoration-1 text-[#1a3c34] hover:text-[#c5a059]"
            >
              {t.cookieLinkLabel}
            </Link>
            {t.messageAfterLink ? t.messageAfterLink : null}
          </p>
        </div>
        <div className="cookie-consent-banner__actions">
          <button type="button" className="cookie-consent-banner__btn cookie-consent-banner__btn--accept" onClick={accept}>
            {t.acceptLabel}
          </button>
        </div>
      </div>

      <style jsx>{`
        .cookie-consent-banner {
          position: fixed;
          right: 0.75rem;
          left: auto;
          bottom: calc(0.625rem + env(safe-area-inset-bottom, 0px));
          z-index: 80;
          width: fit-content;
          max-width: calc(100% - 1.5rem);
          padding: 0.4375rem 0.5rem 0.4375rem 0.5625rem;
          background: rgba(253, 252, 248, 0.97);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(87, 83, 78, 0.15);
          border-radius: 0.5rem;
          box-shadow: 0 4px 20px rgba(26, 60, 52, 0.1);
        }

        .cookie-consent-banner__inner {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 0.5rem;
        }

        .cookie-consent-banner__content {
          flex: 1;
          min-width: 0;
        }

        .cookie-consent-banner__intro,
        .cookie-consent-banner__links {
          margin: 0;
          font-size: 0.6875rem;
          line-height: 1.35;
          color: #57534e;
        }

        .cookie-consent-banner__links {
          margin-top: 0.125rem;
        }

        .cookie-consent-banner__actions {
          display: flex;
          flex-shrink: 0;
        }

        .cookie-consent-banner__btn {
          min-height: 28px;
          padding: 0.25rem 0.625rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
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
          .cookie-consent-banner {
            right: 1rem;
            bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
            padding: 0.5rem 0.5625rem 0.5rem 0.625rem;
          }

          .cookie-consent-banner__inner {
            gap: 0.625rem;
          }

          .cookie-consent-banner__intro,
          .cookie-consent-banner__links {
            display: inline;
            font-size: 0.75rem;
            line-height: 1.4;
          }

          .cookie-consent-banner__links {
            margin-top: 0;
          }

          .cookie-consent-banner__links::before {
            content: ' ';
          }

          .cookie-consent-banner__btn {
            min-height: 30px;
            padding: 0.3125rem 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
