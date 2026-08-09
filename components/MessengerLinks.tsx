'use client';

import {
  getWhatsAppContactUrl,
  getLineContactUrl,
} from '@/lib/messenger';
import { trackMessengerClick, type MessengerPageLocation } from '@/lib/analytics';
import { EmailIcon, LineIcon, WhatsAppIcon } from './icons';

const SUPPORT_EMAIL = 'support@lannabloom.shop';

const MESSENGERS = [
  {
    id: 'line' as const,
    name: 'LINE',
    getHref: getLineContactUrl,
    ariaLabel: 'Contact us on LINE',
    Icon: LineIcon,
    color: '#00B900',
  },
  {
    id: 'whatsapp' as const,
    name: 'WhatsApp',
    getHref: getWhatsAppContactUrl,
    ariaLabel: 'Contact us on WhatsApp',
    Icon: WhatsAppIcon,
    color: '#25D366',
  },
];

export function MessengerLinks({
  showEmail = false,
  pageLocation = 'header',
}: {
  showEmail?: boolean;
  pageLocation?: MessengerPageLocation;
} = {}) {
  return (
    <div className="messenger-links">
      {MESSENGERS.map((m) => {
        const href = m.getHref();
        return (
          <a
            key={m.id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="messenger-link"
            aria-label={m.ariaLabel}
            title={m.name}
            style={{ color: m.color }}
            onClick={() =>
              trackMessengerClick({
                channel: m.id,
                page_location: pageLocation,
                link_url: href,
              })
            }
          >
            <m.Icon size={24} className="messenger-icon" />
          </a>
        );
      })}
      {showEmail ? (
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="messenger-link"
          aria-label={`Email ${SUPPORT_EMAIL}`}
          title={SUPPORT_EMAIL}
          style={{ color: 'var(--text)' }}
        >
          <EmailIcon size={22} className="messenger-icon" />
        </a>
      ) : null}
      <style jsx>{`
        .messenger-links {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .messenger-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          background: var(--pastel-cream);
          transition: background 0.2s, transform 0.15s;
        }
        .messenger-link:hover {
          background: var(--accent-soft);
          transform: scale(1.05);
        }
        .messenger-icon {
          flex-shrink: 0;
        }
        @media (max-width: 600px) {
          .messenger-link {
            width: 36px;
            height: 36px;
          }
          .messenger-icon {
            width: 20px;
            height: 20px;
          }
        }
      `}</style>
    </div>
  );
}
