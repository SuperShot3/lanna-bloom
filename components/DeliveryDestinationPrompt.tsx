'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Cross2Icon } from '@radix-ui/react-icons';
import { MapIcon } from '@/components/icons';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import {
  commitDeliveryDestination,
  DEFAULT_DELIVERY_DESTINATION_ID,
} from '@/lib/delivery/commitDeliveryDestination';
import {
  dismissDeliveryDestinationPrompt,
  readDeliveryDestinationPromptDismissed,
  shouldShowDeliveryDestinationPrompt,
} from '@/lib/delivery/deliveryDestinationPrompt';
import {
  destinationDisplayName,
  getNavMarkets,
  type DeliveryDestinationId,
} from '@/lib/delivery/markets';
import { translations, type Locale } from '@/lib/i18n';

export function DeliveryDestinationPrompt({
  lang,
  hasTopPromoBanner = false,
}: {
  lang: Locale;
  hasTopPromoBanner?: boolean;
}) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { status, hydrated } = useCookieConsent();
  const [dismissed, setDismissed] = useState(true);
  const [ready, setReady] = useState(false);
  const [pickingCity, setPickingCity] = useState(false);

  useEffect(() => {
    setDismissed(readDeliveryDestinationPromptDismissed());
    setReady(true);
  }, []);

  const visible =
    ready &&
    hydrated &&
    shouldShowDeliveryDestinationPrompt({
      pathname,
      lang,
      dismissed,
      cookieAccepted: status === 'accepted',
    });

  const hide = useCallback(() => {
    dismissDeliveryDestinationPrompt();
    setDismissed(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible, hide]);

  if (!visible) return null;

  const t =
    translations[lang].deliveryDestinationPrompt ??
    translations.en.deliveryDestinationPrompt;
  const cityName = destinationDisplayName(DEFAULT_DELIVERY_DESTINATION_ID, lang);
  const question = t.question.replace('{city}', cityName);

  const chooseCity = (destinationId: DeliveryDestinationId) => {
    if (destinationId !== DEFAULT_DELIVERY_DESTINATION_ID) {
      commitDeliveryDestination(destinationId, { lang, router });
    }
    hide();
  };

  const cities: { id: DeliveryDestinationId; label: string }[] = [
    {
      id: DEFAULT_DELIVERY_DESTINATION_ID,
      label: destinationDisplayName(DEFAULT_DELIVERY_DESTINATION_ID, lang),
    },
    ...getNavMarkets().map((market) => ({
      id: market.destinationId,
      label: lang === 'th' ? market.customerFacingNameTh : market.customerFacingNameEn,
    })),
  ];

  return (
    <div
      className={`delivery-dest-prompt${hasTopPromoBanner ? ' delivery-dest-prompt--promo' : ''}`}
      role="dialog"
      aria-modal="false"
      aria-label={t.ariaLabel}
      data-delivery-destination-prompt=""
    >
      <div className="delivery-dest-prompt__card">
        <button
          type="button"
          className="delivery-dest-prompt__close"
          onClick={hide}
          aria-label={t.close}
        >
          <Cross2Icon width={14} height={14} />
        </button>
        <div className="delivery-dest-prompt__row">
          <span className="delivery-dest-prompt__icon" aria-hidden>
            <MapIcon size={18} />
          </span>
          <p className="delivery-dest-prompt__question">{question}</p>
        </div>
        {pickingCity ? (
          <div className="delivery-dest-prompt__cities" role="list" aria-label={t.cityListLabel}>
            {cities.map((city) => (
              <button
                key={city.id}
                type="button"
                className="delivery-dest-prompt__city"
                onClick={() => chooseCity(city.id)}
              >
                {city.label}
              </button>
            ))}
          </div>
        ) : (
          <>
            <p className="delivery-dest-prompt__hint">{t.hint}</p>
            <div className="delivery-dest-prompt__actions">
              <button
                type="button"
                className="btn-premium delivery-dest-prompt__yes"
                onClick={hide}
              >
                {t.yes}
              </button>
              <button
                type="button"
                className="delivery-dest-prompt__other"
                onClick={() => setPickingCity(true)}
              >
                {t.chooseAnother}
              </button>
            </div>
          </>
        )}
      </div>
      <style jsx>{`
        .delivery-dest-prompt {
          position: fixed;
          z-index: 45;
          top: calc(3.5rem + 1px + env(safe-area-inset-top, 0px) + 8px);
          right: max(0.75rem, env(safe-area-inset-right));
          left: max(0.75rem, env(safe-area-inset-left));
          pointer-events: none;
        }
        .delivery-dest-prompt--promo {
          top: calc(3.5rem + 2.25rem + env(safe-area-inset-top, 0px) + 8px);
        }
        @media (min-width: 768px) {
          .delivery-dest-prompt {
            left: auto;
            top: calc(76px + 1px + env(safe-area-inset-top, 0px) + 8px);
            width: min(22rem, calc(100vw - 2rem));
          }
          .delivery-dest-prompt--promo {
            top: calc(76px + 2.25rem + env(safe-area-inset-top, 0px) + 8px);
          }
        }
        :global(html.site-header-collapsed) .delivery-dest-prompt,
        :global(html.site-header-collapsed) .delivery-dest-prompt--promo {
          top: calc(8px + env(safe-area-inset-top, 0px));
        }
        .delivery-dest-prompt__card {
          pointer-events: auto;
          position: relative;
          padding: 0.75rem 2rem 0.75rem 0.85rem;
          background: color-mix(in srgb, var(--surface) 96%, transparent);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          box-shadow: 0 8px 28px rgba(26, 60, 52, 0.12);
        }
        .delivery-dest-prompt__close {
          position: absolute;
          top: 0.4rem;
          right: 0.4rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.75rem;
          height: 1.75rem;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
        }
        .delivery-dest-prompt__close:hover {
          color: var(--text);
          background: var(--muted);
        }
        .delivery-dest-prompt__row {
          display: flex;
          align-items: flex-start;
          gap: 0.45rem;
        }
        .delivery-dest-prompt__icon {
          flex: 0 0 auto;
          display: inline-flex;
          margin-top: 0.1rem;
          color: #c5a059;
        }
        .delivery-dest-prompt__question {
          margin: 0;
          color: var(--text);
          font-size: 0.9rem;
          font-weight: 700;
          line-height: 1.3;
        }
        .delivery-dest-prompt__hint {
          margin: 0.35rem 0 0.65rem;
          color: var(--text-muted);
          font-size: 0.75rem;
          line-height: 1.4;
        }
        .delivery-dest-prompt__actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.45rem;
        }
        .delivery-dest-prompt__yes {
          min-height: 2rem;
          padding: 0.35rem 0.9rem;
          font-size: 0.8rem;
        }
        .delivery-dest-prompt__other {
          min-height: 2rem;
          padding: 0.35rem 0.75rem;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: transparent;
          color: var(--text);
          font: inherit;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
        }
        .delivery-dest-prompt__other:hover {
          background: var(--muted);
        }
        .delivery-dest-prompt__cities {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          margin-top: 0.55rem;
        }
        .delivery-dest-prompt__city {
          min-height: 1.85rem;
          padding: 0.2rem 0.7rem;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--bg);
          color: var(--text);
          font: inherit;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
        }
        .delivery-dest-prompt__city:hover {
          border-color: #c5a059;
          background: color-mix(in srgb, #c5a059 12%, var(--surface));
        }
      `}</style>
    </div>
  );
}
