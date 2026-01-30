'use client';

const MESSENGERS = [
  {
    id: 'line',
    name: 'LINE',
    href: 'https://line.me/R/ti/p/@yourshop',
    icon: 'LINE',
    ariaLabel: 'Contact us on LINE',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    href: 'https://wa.me/66812345678',
    icon: 'WhatsApp',
    ariaLabel: 'Contact us on WhatsApp',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    href: 'https://t.me/yourshop',
    icon: 'Telegram',
    ariaLabel: 'Contact us on Telegram',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    href: 'https://facebook.com/yourshop',
    icon: 'Facebook',
    ariaLabel: 'Our Facebook page',
  },
] as const;

export function MessengerLinks() {
  return (
    <div className="messenger-links">
      {MESSENGERS.map((m) => (
        <a
          key={m.id}
          href={m.href}
          target="_blank"
          rel="noopener noreferrer"
          className="messenger-link"
          aria-label={m.ariaLabel}
          title={m.name}
        >
          <span className="messenger-icon">{m.icon.charAt(0)}</span>
        </a>
      ))}
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
          color: var(--text);
          font-size: 0.85rem;
          font-weight: 600;
          transition: background 0.2s, transform 0.15s;
        }
        .messenger-link:hover {
          background: var(--accent-soft);
          transform: scale(1.05);
        }
        .messenger-icon {
          line-height: 1;
        }
      `}</style>
    </div>
  );
}
