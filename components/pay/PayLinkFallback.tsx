import { PayLinkBrand } from '@/components/pay/PayLinkBrand';
import styles from '@/app/pay/[orderId]/pay-link.module.css';

export function PayLinkFallback({
  title,
  hint,
  href,
  actionLabel,
  error,
}: {
  title: string;
  hint?: string;
  href?: string;
  actionLabel?: string;
  error?: string;
}) {
  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <PayLinkBrand />
        <h1 className={styles.title}>{title}</h1>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {hint ? <p className={styles.hint}>{hint}</p> : null}
        {href && actionLabel ? (
          <a className={styles.pay} href={href}>
            {actionLabel}
          </a>
        ) : null}
      </main>
    </div>
  );
}
