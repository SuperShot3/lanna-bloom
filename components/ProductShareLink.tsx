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

  return (
    <ShareButton
      url={url}
      title={productTitle}
      text={productTitle}
      ariaLabel={p.shareLink}
      buttonText={p.shareLink}
      copySuccessMessage={p.shareLinkCopied}
      copyErrorMessage={p.shareLinkCopyFailed}
      variant="compact"
      className="product-share-link"
    />
  );
}
