'use client';

import {
  getLineContactUrl,
  getWhatsAppContactUrl,
  getTelegramContactUrl,
} from '@/lib/messenger';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { LineIcon, WhatsAppIcon, TelegramIcon } from '@/components/icons';

const MAP_EMBED_SRC =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d135191.1219770273!2d98.84911349726562!3d18.790684900000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30da3aa55e42373d%3A0x21d25773d6402e79!2sFlorist%20Market%20Mueang%20Chiang%20Mai!5e1!3m2!1sen!2sth!4v1770516315547!5m2!1sen!2sth';

export function ContactPageClient({ lang }: { lang: Locale }) {
  const t = translations[lang].contact;
  const tLocation = translations[lang].location;

  const channels = [
    { id: 'line' as const, label: t.line, href: getLineContactUrl(), Icon: LineIcon, color: '#00B900' },
    { id: 'whatsapp' as const, label: t.whatsapp, href: getWhatsAppContactUrl(), Icon: WhatsAppIcon, color: '#25D366' },
    { id: 'telegram' as const, label: t.telegram, href: getTelegramContactUrl(), Icon: TelegramIcon, color: '#26A5E4' },
  ];

  return (
    <div className="contact-page">
      <div className="container">
        <h1 className="contact-title">{t.title}</h1>
        <p className="contact-intro">{t.intro}</p>

        <section className="contact-section">
          <h2 className="contact-heading">{t.fastestWay}</h2>
          <p className="contact-label">{t.messageUs}</p>
          <div className="contact-channels">
            {channels.map(({ label, href, Icon, color }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-channel-link"
                style={{ color }}
              >
                <Icon size={22} />
                <span>{label}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="contact-section">
          <h2 className="contact-heading">{t.phoneLabel}</h2>
          <p className="contact-text">
            {t.callWhatsApp}{' '}
            <a
              href={getWhatsAppContactUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-phone-link"
            >
              {t.phoneDisplay}
            </a>
          </p>
        </section>

        <section className="contact-section">
          <h2 className="contact-heading">{t.shopLocation}</h2>
          <p className="contact-address">{t.address}</p>
        </section>

        <section className="contact-section">
          <h2 className="contact-heading">{t.businessHours}</h2>
          <p className="contact-text">
            {t.daily} {t.hoursValue}
          </p>
        </section>

        <section className="contact-section">
          <p className="contact-text">{t.deliveryArea}</p>
        </section>

        <section className="contact-section contact-section-dbd">
          <h2 className="contact-heading">{t.dbdVerified}</h2>
          <div className="contact-dbd-wrap">
            <img
              src="https://dbdregistered.dbd.go.th/api/public/banner?param=867714DAF3E4ED6944FA5672C4E6D1C4A2114631CF57F4DB847153673BC31A6B"
              alt="DBD Verified badge (Thailand Department of Business Development)"
              className="contact-dbd-img"
              loading="lazy"
              decoding="async"
              width={76}
              height={76}
            />
          </div>
          <p className="contact-text">{t.dbdExplanation}</p>
          <a
            href="https://dbdregistered.dbd.go.th/api/public/shopinfo?param=867714DAF3E4ED6944FA5672C4E6D1C4A2114631CF57F4DB847153673BC31A6B"
            target="_blank"
            rel="noopener noreferrer"
            className="contact-dbd-link"
          >
            {t.dbdVerifyLink}
          </a>
        </section>

        <section id="location" className="contact-section contact-section-location">
          <h2 className="contact-heading">{tLocation.title}</h2>
          <p className="contact-text">{tLocation.intro}</p>
          <p className="contact-address">{tLocation.address}</p>
          <div className="contact-map-wrap">
            <iframe
              src={MAP_EMBED_SRC}
              width="600"
              height="450"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Map"
              className="contact-map"
            />
          </div>
        </section>
      </div>
      <style jsx>{`
        .contact-page {
          padding: 32px 0 48px;
        }
        .contact-title {
          font-family: var(--font-serif);
          font-size: 1.75rem;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 12px;
        }
        .contact-intro {
          font-size: 1rem;
          color: var(--text);
          margin: 0 0 28px;
          line-height: 1.6;
        }
        .contact-section {
          margin-bottom: 28px;
        }
        .contact-section-location {
          margin-top: 40px;
          padding-top: 28px;
          border-top: 1px solid var(--border);
        }
        .contact-heading {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 10px;
        }
        .contact-label,
        .contact-text {
          font-size: 1rem;
          color: var(--text);
          margin: 0 0 12px;
          line-height: 1.6;
        }
        .contact-address {
          font-size: 1rem;
          color: var(--text-muted);
          margin: 0 0 12px;
          line-height: 1.5;
        }
        .contact-channels {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 8px;
        }
        .contact-channel-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: var(--pastel-cream);
          border: 2px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 0.95rem;
          font-weight: 600;
          text-decoration: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .contact-channel-link:hover {
          border-color: var(--accent);
          background: var(--accent-soft);
        }
        .contact-phone-link {
          font-weight: 600;
          color: var(--accent);
          text-decoration: underline;
        }
        .contact-phone-link:hover {
          color: #967a4d;
        }
        .contact-section-dbd {
          padding-top: 8px;
        }
        .contact-dbd-wrap {
          display: inline-flex;
          background: #fff;
          border-radius: 8px;
          padding: 4px;
          box-shadow: var(--shadow);
          margin-bottom: 12px;
        }
        .contact-dbd-img {
          width: 76px;
          height: 76px;
          object-fit: contain;
          display: block;
        }
        @media (max-width: 639px) {
          .contact-dbd-img {
            width: 56px;
            height: 56px;
          }
        }
        .contact-dbd-link {
          display: inline-block;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--accent);
          text-decoration: underline;
          margin-top: 4px;
        }
        .contact-dbd-link:hover {
          color: #967a4d;
        }
        .contact-map-wrap {
          margin-top: 16px;
          width: 100%;
          max-width: 600px;
          aspect-ratio: 600 / 450;
          border-radius: var(--radius-sm);
          overflow: hidden;
          border: 1px solid var(--border);
        }
        .contact-map {
          width: 100%;
          height: 100%;
          display: block;
        }
      `}</style>
    </div>
  );
}
