'use client';

import { useEffect, useState } from 'react';
import { ShareButton } from '@/components/ShareButton';
import { translations, type Locale } from '@/lib/i18n';

export function ProductShareLink({ lang, productTitle }: { lang: Locale; productTitle: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    setUrl(typeof window !== 'undefined' ? window.location.href : '');
  }, []);
  const p = translations[lang].product;
  const compactButtonText = lang === 'th' ? 'แชร์' : 'Share';

  return (
    <ShareButton
      url={url}
      title={productTitle}
      text={productTitle}
      ariaLabel={p.shareLink}
      buttonText={compactButtonText}
      copySuccessMessage={p.shareLinkCopied}
      copyErrorMessage={p.shareLinkCopyFailed}
      variant="compact"
      className="product-share-link"
    />
  );
}
