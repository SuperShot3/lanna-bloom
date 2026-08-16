'use client';

import { EmailIcon, LineIcon, WhatsAppIcon } from '@/components/icons';
import { trackMessengerClick } from '@/lib/analytics';
import { translations, type Locale } from '@/lib/i18n';
import { getLineContactUrl, getWhatsAppOrderUrl } from '@/lib/messenger';
import { SUPPORT_EMAIL } from '@/lib/siteContact';
import styles from './product-pdp.module.css';

function fillTemplate(template: string, name: string, size: string): string {
  return template.replace('{name}', name).replace('{size}', size);
}

export function ProductContactBeforeOrderNotice({
  lang,
  productName,
  sizeLabel,
}: {
  lang: Locale;
  productName: string;
  sizeLabel?: string;
}) {
  const tProduct = translations[lang].product as Record<string, string | undefined>;
  const tContact = translations[lang].contact as Record<string, string | undefined>;
  const size = sizeLabel?.trim() || '—';
  const message = fillTemplate(
    tProduct.messageTemplate ?? 'Hello! I want to order {name}, size {size}',
    productName,
    size
  );
  const lineHref = getLineContactUrl();
  const whatsappHref = getWhatsAppOrderUrl(message);
  const emailSubject = fillTemplate(
    tProduct.contactBeforeOrderEmailSubject ?? 'Order enquiry: {name}',
    productName,
    size
  );
  const emailHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(message)}`;

  return (
    <div className={styles.contactBeforeOrder} role="alert">
      <p className={styles.contactBeforeOrderTitle}>
        {tProduct.contactBeforeOrderTitle ?? 'Please contact us before ordering'}
      </p>
      <p className={styles.contactBeforeOrderBody}>
        {tProduct.contactBeforeOrderBody ??
          'This item needs a quick confirmation. Contact us on LINE, WhatsApp, or email and we will help you place the order.'}
      </p>
      <div className={styles.contactBeforeOrderGrid}>
        <a
          href={lineHref}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.contactBeforeOrderBtn}
          onClick={() =>
            trackMessengerClick({
              channel: 'line',
              page_location: 'product',
              link_url: lineHref,
            })
          }
        >
          <span className={styles.contactBeforeOrderIcon} style={{ color: '#00B900' }}>
            <LineIcon size={22} />
          </span>
          {tProduct.orderLine ?? 'LINE'}
        </a>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.contactBeforeOrderBtn}
          onClick={() =>
            trackMessengerClick({
              channel: 'whatsapp',
              page_location: 'product',
              link_url: whatsappHref,
            })
          }
        >
          <span className={styles.contactBeforeOrderIcon} style={{ color: '#25D366' }}>
            <WhatsAppIcon size={22} />
          </span>
          {tProduct.orderWhatsApp ?? 'WhatsApp'}
        </a>
        <a href={emailHref} className={styles.contactBeforeOrderBtn}>
          <span className={styles.contactBeforeOrderIcon}>
            <EmailIcon size={22} />
          </span>
          {tProduct.orderEmail ?? tContact.contactEmail ?? 'Email'}
        </a>
      </div>
    </div>
  );
}
