'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { Metric } from 'web-vitals';
import { pushToDataLayer } from '@/lib/analytics/gtag';
import { scheduleIdle } from '@/lib/scheduleIdle';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim();
const SHOULD_REPORT =
  process.env.NODE_ENV === 'production' && Boolean(GTM_ID);

function asAttrRecord(metric: Metric): Record<string, unknown> | undefined {
  if (!('attribution' in metric)) return undefined;
  const attr = (metric as Metric & { attribution?: unknown }).attribution;
  if (!attr || typeof attr !== 'object') return undefined;
  return attr as Record<string, unknown>;
}

function readString(attr: Record<string, unknown>, key: string): string | undefined {
  const v = attr[key];
  return typeof v === 'string' && v ? v : undefined;
}

/**
 * Field Core Web Vitals (INP, LCP, CLS + FCP/TTFB) → GTM dataLayer.
 * Production only; skips /admin. GTM forwards `web_vitals` to GA4.
 * web-vitals is loaded after idle so attribution JS does not race hydration.
 */
export function WebVitalsReporter() {
  const pathname = usePathname();
  const isAdmin = Boolean(pathname?.startsWith('/admin'));

  useEffect(() => {
    if (!SHOULD_REPORT || isAdmin) return;

    let cancelled = false;

    const cancelIdle = scheduleIdle(() => {
      void import('web-vitals/attribution').then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
        if (cancelled) return;

        const report = (metric: Metric) => {
          const roundedValue =
            metric.name === 'CLS'
              ? Math.round(metric.value * 1000)
              : Math.round(metric.value);

          const params: Record<string, unknown> = {
            metric_name: metric.name,
            value: roundedValue,
            metric_id: metric.id,
            metric_value: metric.value,
            metric_delta: metric.delta,
            metric_rating: metric.rating,
            metric_navigation_type: metric.navigationType,
          };

          const attr = asAttrRecord(metric);
          if (attr) {
            const debugTarget =
              readString(attr, 'interactionTarget') ??
              readString(attr, 'target') ??
              readString(attr, 'largestShiftTarget');
            if (debugTarget) params.debug_target = debugTarget;

            const interactionType = readString(attr, 'interactionType');
            if (interactionType) params.debug_interaction_type = interactionType;
          }

          pushToDataLayer('web_vitals', params);
        };

        onINP(report);
        onLCP(report);
        onCLS(report);
        onFCP(report);
        onTTFB(report);
      });
    });

    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [isAdmin]);

  return null;
}
