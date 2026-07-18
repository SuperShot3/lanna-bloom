'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { consumeCatalogProductNavigation } from '@/lib/catalogReturnNavigation';

export function ProductMobileBackButton({
  catalogHref,
  label,
}: {
  catalogHref: string;
  label: string;
}) {
  const router = useRouter();
  const canReturnToCatalog = useRef(false);

  useEffect(() => {
    canReturnToCatalog.current = consumeCatalogProductNavigation();
  }, []);

  const handleClick = () => {
    if (canReturnToCatalog.current) {
      window.history.back();
      return;
    }

    router.push(catalogHref);
  };

  return (
    <button type="button" className="product-mobile-back" onClick={handleClick}>
      <ArrowLeftIcon width={18} height={18} aria-hidden />
      <span>{label}</span>
    </button>
  );
}
