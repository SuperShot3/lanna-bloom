'use client';

import { useRef, useState } from 'react';
import styles from '@/app/pay/[orderId]/pay-link.module.css';

export function PayLinkPayNowForm({
  linkId,
  token,
}: {
  linkId: string;
  token: string;
}) {
  const submittingRef = useRef(false);
  const [pending, setPending] = useState(false);

  return (
    <form
      className={styles.form}
      action="/api/pay-links/checkout"
      method="POST"
      onSubmit={(event) => {
        if (submittingRef.current) {
          event.preventDefault();
          return;
        }
        submittingRef.current = true;
        setPending(true);
      }}
    >
      <input type="hidden" name="linkId" value={linkId} />
      <input type="hidden" name="token" value={token} />
      <button type="submit" className={styles.pay} aria-busy={pending} aria-live="polite">
        {pending ? (
          <>
            <span className={styles.paySpinner} aria-hidden />
            Opening Stripe…
          </>
        ) : (
          'Pay now'
        )}
      </button>
    </form>
  );
}
