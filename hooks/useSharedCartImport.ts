'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import type { CartItem } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { translations, type Locale } from '@/lib/i18n';

/** Load cart items from `?share=` token once after cart hydration. */
export function useSharedCartImport(lang: Locale) {
  const router = useRouter();
  const { items, hydrated, replaceItems } = useCart();
  const { showToast } = useToast();
  const t = translations[lang].cart;
  const importedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || importedRef.current) return;
    if (typeof window === 'undefined') return;

    const token = new URLSearchParams(window.location.search).get('share')?.trim();
    if (!token) return;
    if (new URLSearchParams(window.location.search).get('recover')?.trim()) return;

    importedRef.current = true;

    (async () => {
      try {
        const res = await fetch(`/api/cart/share?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          showToast(t.sharedCartInvalid);
          router.replace(`/${lang}/cart`);
          return;
        }

        const data = (await res.json()) as { items?: CartItem[] };
        const newItems = Array.isArray(data.items) ? data.items : [];

        if (items.length > 0) {
          const ok = window.confirm(t.sharedCartReplaceConfirm);
          if (!ok) {
            router.replace(`/${lang}/cart`);
            return;
          }
        }

        replaceItems(newItems);
        showToast(t.sharedCartLoaded);
        router.replace(`/${lang}/cart`);
      } catch {
        showToast(t.sharedCartInvalid);
        router.replace(`/${lang}/cart`);
      }
    })();
  }, [hydrated, items.length, lang, replaceItems, router, showToast, t]);
}
