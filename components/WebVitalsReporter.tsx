'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals/attribution';
import type { Metric } from 'web-vitals';
import { pushToDataLayer } from '@/lib/analytics/gtag';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim();
const SHOULD_REPORT =
  process.env.NODE_ENV === 'production' && Boolean(GTM_ID);

type MetricWithOptionalAttribution = Metric & {
  attribution?: {
    interactionTarget?: string;
    interactionType?: string;
    element?: string;
    largestShiftTarget?: string;
  };
};

/**
 * Field Core Web Vitals (INP, LCP, CLS + FCP/TTFB) → GTM dataLayer.
 * Production only; skips /admin. GTM forwards `web_vitals` to GA4.
 */
export function WebVitalsReporter() {
  const pathname = usePathname();
  const isAdmin = Boolean(pathname?.startsWith('/admin'));

  useEffect(() => {
    if (!SHOULD_REPORT || isAdmin) return;

    const report = (metric: MetricWithOptionalAttribution) => {
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

      const attr = metric.attribution;
      if (attr) {
        if (attr.interactionTarget) {
          params.debug_target = attr.interactionTarget;
        } else if (attr.element) {
          params.debug_target = attr.element;
        } else if (attr.largestShiftTarget) {
          params.debug_target = attr.largestShiftTarget;
        }
        if (attr.interactionType) {
          params.debug_interaction_type = attr.interactionType;
        }
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
