'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import type { CartItem } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import type { RecoveredCartForm } from '@/lib/checkout/recoveredCartForm';
import { translations, type Locale } from '@/lib/i18n';

/** Load cart items + optional form from `?share=` token once after cart hydration. */
export function useSharedCartImport(
  lang: Locale,
  applyForm: (form: RecoveredCartForm) => void
) {
  const router = useRouter();
  const { items, hydrated, replaceItems, setOrderGiftCardMessages } = useCart();
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

        const data = (await res.json()) as {
          items?: CartItem[];
          form?: RecoveredCartForm | null;
          giftCardMessages?: string[] | null;
        };
        const newItems = Array.isArray(data.items) ? data.items : [];

        if (newItems.length === 0) {
          showToast(t.sharedCartInvalid);
          router.replace(`/${lang}/cart`);
          return;
        }

        if (items.length > 0) {
          const ok = window.confirm(t.sharedCartReplaceConfirm);
          if (!ok) {
            router.replace(`/${lang}/cart`);
            return;
          }
        }

        replaceItems(newItems);
        if (Array.isArray(data.giftCardMessages)) {
          setOrderGiftCardMessages(data.giftCardMessages);
        }
        if (data.form && typeof data.form === 'object' && data.form.delivery) {
          applyForm(data.form);
        }
        showToast(t.sharedCartLoaded);
        router.replace(`/${lang}/cart`);
      } catch {
        showToast(t.sharedCartInvalid);
        router.replace(`/${lang}/cart`);
      }
    })();
  }, [
    applyForm,
    hydrated,
    items.length,
    lang,
    replaceItems,
    setOrderGiftCardMessages,
    router,
    showToast,
    t,
  ]);
}
