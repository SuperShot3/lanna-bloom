import { PAY_LINK_TTL_MINUTES } from '@/lib/payLinks/adminPayLink';
import styles from '@/app/pay/[orderId]/pay-link.module.css';

function formatThb(amount: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function PayLinkPayNowCard({
  linkId,
  token,
  amount,
  description,
  cancelled,
  error,
}: {
  linkId: string;
  token: string;
  amount: number;
  description: string;
  cancelled?: boolean;
  error?: string;
}) {
  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <p className={styles.brand}>Lanna Bloom</p>
        <h1 className={styles.title}>{cancelled ? 'Payment cancelled' : 'Pay Lanna Bloom'}</h1>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <p className={styles.desc}>{description}</p>
        <p className={styles.amount}>{formatThb(amount)}</p>
        <p className={styles.hint}>
          {cancelled
            ? `You can continue to Stripe. This link expires ${PAY_LINK_TTL_MINUTES} minutes after it was created.`
            : `This link expires ${PAY_LINK_TTL_MINUTES} minutes after it was created.`}
        </p>
        <form className={styles.form} action="/api/pay-links/checkout" method="POST">
          <input type="hidden" name="linkId" value={linkId} />
          <input type="hidden" name="token" value={token} />
          <button type="submit" className={styles.pay}>
            Pay now
          </button>
        </form>
      </main>
    </div>
  );
}
