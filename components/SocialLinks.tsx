'use client';

// Add your social profiles; messenger apps (LINE, WhatsApp, etc.) are in MessengerLinks
const SOCIAL = [
  {
    id: 'instagram',
    name: 'Instagram',
    href: 'https://instagram.com/yourshop',
    ariaLabel: 'Follow us on Instagram',
    icon: 'IG',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    href: 'https://facebook.com/yourshop',
    ariaLabel: 'Our Facebook page',
    icon: 'FB',
  },
] as const;

export function SocialLinks() {
  return (
    <div className="social-links">
      {SOCIAL.map((s) => (
        <a
          key={s.id}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          className="social-link"
          aria-label={s.ariaLabel}
          title={s.name}
        >
          <span className="social-icon">{s.icon}</span>
        </a>
      ))}
      <style jsx>{`
        .social-links {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .social-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          background: var(--pastel-cream);
          color: var(--text);
          font-size: 0.75rem;
          font-weight: 600;
          transition: background 0.2s, transform 0.15s;
        }
        .social-link:hover {
          background: var(--accent-soft);
          transform: scale(1.05);
        }
        .social-icon {
          line-height: 1;
        }
        @media (max-width: 600px) {
          .social-link {
            width: 32px;
            height: 32px;
            font-size: 0.7rem;
          }
        }
      `}</style>
    </div>
  );
}
