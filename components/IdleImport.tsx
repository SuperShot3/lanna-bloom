'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { scheduleIdle } from '@/lib/scheduleIdle';

/**
 * Download and mount a client component after idle so it does not compete
 * with hydration / LCP on the homepage.
 */
export function IdleImport<P extends object>({
  load,
  componentProps,
}: {
  load: () => Promise<ComponentType<P>>;
  componentProps: P;
}) {
  const [Comp, setComp] = useState<ComponentType<P> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cancelIdle = scheduleIdle(() => {
      void load().then((Loaded) => {
        if (!cancelled) setComp(() => Loaded);
      });
    });
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [load]);

  if (!Comp) return null;
  return <Comp {...componentProps} />;
}
