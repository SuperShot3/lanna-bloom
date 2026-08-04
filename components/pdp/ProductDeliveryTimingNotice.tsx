'use client';

import { useMemo } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import type { DeliveryConstraint } from '@/lib/delivery/deliveryConstraints';
import { formatPdpDeliveryTiming } from '@/lib/delivery/pdpDeliveryTiming';
import styles from './product-pdp.module.css';

export function ProductDeliveryTimingNotice({
  lang,
  constraint,
  loading,
}: {
  lang: Locale;
  constraint: DeliveryConstraint;
  loading: boolean;
}) {
  const tProduct = translations[lang].product as {
    earliestDelivery?: string;
    sameDayCutoffUntil?: string;
    orderingUnavailableInArea?: string;
  };

  const display = useMemo(
    () =>
      formatPdpDeliveryTiming(constraint, lang, {
        ...(tProduct.earliestDelivery
          ? { earliestDelivery: tProduct.earliestDelivery }
          : {}),
        ...(tProduct.sameDayCutoffUntil
          ? { sameDayCutoffUntil: tProduct.sameDayCutoffUntil }
          : {}),
        ...(tProduct.orderingUnavailableInArea
          ? { orderingUnavailable: tProduct.orderingUnavailableInArea }
          : {}),
      }),
    [
      constraint,
      lang,
      tProduct.earliestDelivery,
      tProduct.sameDayCutoffUntil,
      tProduct.orderingUnavailableInArea,
    ]
  );

  if (loading) return null;

  const lines = [display.timingLine, display.noticeLine, display.cutoffLine].filter(
    (line): line is string => Boolean(line)
  );
  if (lines.length === 0) return null;

  return (
    <div
      className={
        display.orderingAllowed
          ? styles.deliveryTimingNotice
          : `${styles.deliveryTimingNotice} ${styles.deliveryTimingNoticeBlocked}`
      }
      role={display.orderingAllowed ? 'status' : 'alert'}
    >
      {display.timingLine ? (
        <p className={styles.deliveryTimingPrimary}>{display.timingLine}</p>
      ) : null}
      {display.noticeLine ? (
        <p className={styles.deliveryTimingSecondary}>{display.noticeLine}</p>
      ) : null}
      {display.cutoffLine ? (
        <p className={styles.deliveryTimingSecondary}>{display.cutoffLine}</p>
      ) : null}
    </div>
  );
}
