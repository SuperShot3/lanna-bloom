'use client';

import { EmailIcon, LineIcon, WhatsAppIcon } from '@/components/icons';
import { trackMessengerClick } from '@/lib/analytics';
import { translations, type Locale } from '@/lib/i18n';
import { getLineContactUrl, getWhatsAppOrderUrl } from '@/lib/messenger';
import { SUPPORT_EMAIL } from '@/lib/siteContact';
import styles from './product-pdp.module.css';

function fillTemplate(
  template: string,
  values: { name: string; size: string; destination: string }
): string {
  return template
    .replaceAll('{name}', values.name)
    .replaceAll('{size}', values.size)
    .replaceAll('{destination}', values.destination);
}

export function ProductContactBeforeOrderNotice({
  lang,
  productName,
  sizeLabel,
  variant = 'item',
  destinationLabel,
  whatsappMessage,
  pageLocation = 'product',
  hideHeading = false,
}: {
  lang: Locale;
  productName: string;
  sizeLabel?: string;
  variant?: 'item' | 'preorder';
  destinationLabel?: string;
  whatsappMessage?: string;
  pageLocation?: 'product' | 'cart';
  hideHeading?: boolean;
}) {
  const tProduct = translations[lang].product as Record<string, string | undefined>;
  const tContact = translations[lang].contact as Record<string, string | undefined>;
  const size = sizeLabel?.trim() || '—';
  const destination = destinationLabel?.trim() || '—';
  const values = { name: productName, size, destination };
  const isPreorder = variant === 'preorder';
  const message =
    whatsappMessage?.trim() ||
    fillTemplate(
      isPreorder
        ? tProduct.preorderStockContactMessage ??
          'Hello! I want to order {name}, size {size}, for delivery to {destination}. Please check stock before payment.'
        : tProduct.messageTemplate ?? 'Hello! I want to order {name}, size {size}',
      values
    );
  const lineHref = getLineContactUrl();
  const whatsappHref = getWhatsAppOrderUrl(message);
  const emailSubject = fillTemplate(
    isPreorder
      ? tProduct.preorderStockContactEmailSubject ?? 'Stock check: {name} for {destination}'
      : tProduct.contactBeforeOrderEmailSubject ?? 'Order enquiry: {name}',
    values
  );
  const emailHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(message)}`;
  const title = isPreorder
    ? tProduct.preorderStockContactTitle ?? 'Please contact us to check stock'
    : tProduct.contactBeforeOrderTitle ?? 'Please contact us before ordering';
  const body = isPreorder
    ? (
        tProduct.preorderStockContactBody ??
        '{destination} is on pre-order only. Message us on LINE, WhatsApp, or email so we can check stock before you pay.'
      ).replaceAll('{destination}', destination)
    : tProduct.contactBeforeOrderBody ??
      'This item needs a quick confirmation. Contact us on LINE, WhatsApp, or email and we will help you place the order.';

  return (
    <div className={styles.contactBeforeOrder} role="alert">
      {hideHeading ? null : <p className={styles.contactBeforeOrderTitle}>{title}</p>}
      <p className={styles.contactBeforeOrderBody}>{body}</p>
      <div className={styles.contactBeforeOrderGrid}>
        <a
          href={lineHref}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.contactBeforeOrderBtn}
          onClick={() =>
            trackMessengerClick({
              channel: 'line',
              page_location: pageLocation,
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
              page_location: pageLocation,
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
