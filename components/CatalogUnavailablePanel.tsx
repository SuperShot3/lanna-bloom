import type { Locale } from '@/lib/i18n';
import type { PublicProvince } from '@/lib/provinces/types';
import { getProvinceStatusLabel } from '@/lib/provinces/statusColors';
import type { ProvinceStatus } from '@/lib/provinces/types';

/**
 * Shown when a market catalog route is reachable but province config
 * disables browsing (`catalog_enabled` / coming_soon / unavailable).
 */
export function CatalogUnavailablePanel({
  lang,
  marketName,
  province,
}: {
  lang: Locale;
  marketName: string;
  province: Pick<
    PublicProvince,
    | 'status'
    | 'customer_message_en'
    | 'customer_message_th'
    | 'delivery_limitations_en'
    | 'delivery_limitations_th'
  > | null;
}) {
  const isTh = lang === 'th';
  const statusLabel = province
    ? getProvinceStatusLabel(province.status as ProvinceStatus)
    : isTh
      ? 'เร็วๆ นี้'
      : 'Coming soon';
  const message =
    (isTh ? province?.customer_message_th : province?.customer_message_en)?.trim() ||
    (isTh
      ? `ขณะนี้ยังไม่สามารถสั่งซื้อไปยัง ${marketName} ได้ผ่านแคตตาล็อกออนไลน์`
      : `Online catalog ordering is not available for ${marketName} right now.`);
  const limitations = (
    isTh ? province?.delivery_limitations_th : province?.delivery_limitations_en
  )?.trim();

  return (
    <section
      className="catalog-unavailable-panel"
      role="status"
      aria-live="polite"
      style={{
        maxWidth: 560,
        margin: '2.5rem auto',
        padding: '1.75rem 1.5rem',
        textAlign: 'center',
        borderRadius: 16,
        border: '1px solid rgba(26, 60, 52, 0.14)',
        background: 'linear-gradient(180deg, #fffefb 0%, #f7f3ea 100%)',
      }}
    >
      <p
        style={{
          margin: '0 0 0.5rem',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#6b7280',
        }}
      >
        {statusLabel}
      </p>
      <h1
        style={{
          margin: '0 0 0.75rem',
          fontSize: '1.35rem',
          fontWeight: 800,
          color: '#1a3c34',
          lineHeight: 1.3,
        }}
      >
        {isTh ? `${marketName} — แคตตาล็อกยังไม่เปิด` : `${marketName} — catalog unavailable`}
      </h1>
      <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.55, color: '#3d4f48' }}>
        {message}
      </p>
      {limitations ? (
        <p
          style={{
            margin: '0.85rem 0 0',
            fontSize: '0.88rem',
            lineHeight: 1.5,
            color: '#5c655f',
          }}
        >
          {limitations}
        </p>
      ) : null}
      <p style={{ margin: '1.25rem 0 0' }}>
        <a
          href={`/${lang}/catalog`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 700,
            color: '#1a3c34',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          {isTh ? 'ดูแคตตาล็อกเชียงใหม่' : 'Browse Chiang Mai catalog'}
        </a>
      </p>
    </section>
  );
}
