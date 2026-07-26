'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals/attribution';
import type { Metric } from 'web-vitals';
import { pushToDataLayer } from '@/lib/analytics/gtag';

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
 */
export function WebVitalsReporter() {
  const pathname = usePathname();
  const isAdmin = Boolean(pathname?.startsWith('/admin'));

  useEffect(() => {
    if (!SHOULD_REPORT || isAdmin) return;

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
        // web-vitals v6: INP → interactionTarget, LCP → target, CLS → largestShiftTarget
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
  }, [isAdmin]);

  return null;
}
