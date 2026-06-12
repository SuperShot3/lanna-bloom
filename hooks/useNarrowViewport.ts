'use client';

import { useEffect, useState } from 'react';

const NARROW_MAX_PX = 390;

export function useNarrowViewport(maxWidthPx = NARROW_MAX_PX): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [maxWidthPx]);

  return narrow;
}
