import Link from 'next/link';
import { PaymentBadges } from '@/components/PaymentBadges';
import type { Locale } from '@/lib/i18n';
import type { ArticleCtaLink } from '../_data/articles';
import styles from './article.module.css';

export function ArticleCta({
  links,
  lang,
  title,
  showPaymentBadges = false,
}: {
  links: ArticleCtaLink[];
  lang: string;
  title?: string;
  showPaymentBadges?: boolean;
}) {
  return (
    <section className={styles.infoArticleCta} aria-labelledby="info-article-cta-title">
      <h2 id="info-article-cta-title" className={styles.infoArticleCtaTitle}>
        {title ?? (lang === 'th' ? 'สั่งซื้อหรือเลือกช่อ' : 'Order or browse')}
      </h2>
      <div className={styles.infoArticleCtaLinks}>
        {links.map((link, i) => {
          const label = lang === 'th' ? link.labelTh : link.label;
          const href = `/${lang}${link.href}`;
          const isPrimary = i === 0;
          return (
            <Link
              key={link.href + link.label}
              href={href}
              className={`${styles.infoArticleCtaLink} ${!isPrimary ? styles.infoArticleCtaLinkSecondary : ''}`}
            >
              {label}
            </Link>
          );
        })}
      </div>
      {showPaymentBadges ? (
        <div className={styles.infoArticleCtaPay}>
          <p className={styles.infoArticleCtaPayNote}>
            {lang === 'th'
              ? 'ชำระบัตรปลอดภัยผ่าน Stripe ตอนเช็กเอาต์'
              : 'Pay securely by card through Stripe at checkout'}
          </p>
          <PaymentBadges lang={lang as Locale} compact />
        </div>
      ) : null}
    </section>
  );
}
