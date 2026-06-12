'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const SECONDS = 5;

export function RedirectCountdown({
  lang,
  redirectMessage,
}: {
  lang: string;
  redirectMessage: string;
}) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(SECONDS);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.replace(`/${lang}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lang, router]);

  return (
    <p className="partner-success-redirect" style={{ marginTop: '1rem', opacity: 0.9, fontSize: '0.95rem' }}>
      {redirectMessage.replace('{count}', String(secondsLeft))}
    </p>
  );
}
