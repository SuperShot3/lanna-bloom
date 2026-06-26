'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import type { CartItem } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { translations, type Locale } from '@/lib/i18n';
import type { RecoveredCartForm } from '@/lib/checkout/recoveredCartForm';

/** Load full cart + form from `?recover=` token once after cart hydration. */
export function useCheckoutRecoveryImport(
  lang: Locale,
  applyForm: (form: RecoveredCartForm) => void
) {
  const router = useRouter();
  const { items, hydrated, replaceItems } = useCart();
  const { showToast } = useToast();
  const t = translations[lang].cart;
  const importedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || importedRef.current) return;
    if (typeof window === 'undefined') return;

    const token = new URLSearchParams(window.location.search).get('recover')?.trim();
    if (!token) return;

    importedRef.current = true;

    (async () => {
      try {
        const res = await fetch(`/api/cart/recover?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          showToast(t.checkoutRecoveryInvalid);
          router.replace(`/${lang}/cart`);
          return;
        }

        const data = (await res.json()) as {
          items?: CartItem[];
          form?: RecoveredCartForm;
        };
        const newItems = Array.isArray(data.items) ? data.items : [];
        const form = data.form;

        if (newItems.length === 0 || !form) {
          showToast(t.checkoutRecoveryInvalid);
          router.replace(`/${lang}/cart`);
          return;
        }

        const hasExisting = items.length > 0;
        if (hasExisting) {
          const ok = window.confirm(t.checkoutRecoveryReplaceConfirm);
          if (!ok) {
            router.replace(`/${lang}/cart`);
            return;
          }
        }

        replaceItems(newItems);
        applyForm(form);
        showToast(t.checkoutRecoveryLoaded);
        router.replace(`/${lang}/cart`);
      } catch {
        showToast(t.checkoutRecoveryInvalid);
        router.replace(`/${lang}/cart`);
      }
    })();
  }, [applyForm, hydrated, items.length, lang, replaceItems, router, showToast, t]);
}
