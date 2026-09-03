'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { scheduleIdle } from '@/lib/scheduleIdle';

/**
 * Vercel Speed Insights after idle so the snippet does not compete with hydration.
 */
export function DeferredSpeedInsights() {
  const [Comp, setComp] = useState<ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cancelIdle = scheduleIdle(() => {
      void import('@vercel/speed-insights/next').then((m) => {
        if (!cancelled) setComp(() => m.SpeedInsights);
      });
    });
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, []);

  if (!Comp) return null;
  return <Comp />;
}
