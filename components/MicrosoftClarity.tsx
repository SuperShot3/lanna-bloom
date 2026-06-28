'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();
const SHOULD_LOAD_CLARITY =
  process.env.NODE_ENV === 'production' && Boolean(CLARITY_ID);

/**
 * Microsoft Clarity — session recordings and heatmaps.
 * Loads only in production under the notice-based cookie model.
 */
export function MicrosoftClarity() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) return null;
  if (!SHOULD_LOAD_CLARITY || !CLARITY_ID) return null;

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_ID}");
      `}
    </Script>
  );
}
