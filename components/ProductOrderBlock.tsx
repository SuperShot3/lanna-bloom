'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Bouquet, BouquetSize } from '@/lib/bouquets';
import { SizeSelector } from './SizeSelector';
import {
  AddOnsSection,
  getDefaultAddOns,
  type AddOnsValues,
} from './AddOnsSection';
import { useCart } from '@/contexts/CartContext';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { trackAddToCart } from '@/lib/analytics';
import { TrustBadges } from '@/components/TrustBadges';
import { FloristCard } from '@/components/FloristCard';
import { getAddOnsTotal } from '@/lib/addonsConfig';
import { DELIVERY_TIME_SLOTS } from '@/components/DeliveryForm';
import type { CatalogProduct } from '@/lib/sanity';
import { getPreferredBouquetSize } from '@/lib/favorites';

export function ProductOrderBlock({
  bouquet,
  lang,
  selectedImageUrl,
  gifts = [],
}: {
  bouquet: Bouquet;
  lang: Locale;
  selectedImageUrl?: string | null;
  gifts?: CatalogProduct[];
}) {
  const [selectedSize, setSelectedSize] = useState<BouquetSize>(() => {
    const preferredKey = getPreferredBouquetSize(bouquet.id);
    if (preferredKey) {
      const found = bouquet.sizes.find((s) => s.key === preferredKey);
      if (found) return found;
    }
    return bouquet.sizes[0];
  });
  const [addOns, setAddOns] = useState<AddOnsValues>(getDefaultAddOns);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [showDeliveryValidation, setShowDeliveryValidation] = useState(false);
  const { addItem } = useCart();
  const t = translations[lang].cart;
  const tBuyNow = translations[lang].buyNow;

  const addOnsTotal = getAddOnsTotal(addOns.productAddOns ?? {});
  const totalPrice = (selectedSize.price + addOnsTotal) * Math.max(1, Math.floor(quantity));

  const handleAddToCart = () => {
    const hasDate = !!deliveryDate?.trim();
    const hasTime = !!deliveryTimeSlot?.trim();
    if (!hasDate || !hasTime) {
      setShowDeliveryValidation(true);
      const scrollTarget = !hasDate ? dateWrapRef.current : timeSelectRef.current;
      setTimeout(() => {
        scrollTarget?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }
    setShowDeliveryValidation(false);
    const itemName = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
    const price = selectedSize.price + addOnsTotal;
    const qty = Math.max(1, Math.floor(quantity));
    addItem(
      {
        itemType: 'bouquet',
        bouquetId: bouquet.id,
        slug: bouquet.slug,
        nameEn: bouquet.nameEn,
        nameTh: bouquet.nameTh,
        imageUrl: selectedImageUrl ?? bouquet.images?.[0],
        size: selectedSize,
        addOns: { ...addOns },
      },
      qty
    );
    trackAddToCart({
      currency: 'THB',
      value: totalPrice,
      items: [
        {
          item_id: bouquet.id,
          item_name: itemName,
          price,
          quantity: qty,
          index: 0,
          item_category: bouquet.category,
          item_variant: selectedSize.label,
        },
      ],
    });
    setJustAdded(true);
  };

  const PREFERRED_DELIVERY_KEY = 'lanna-bloom-preferred-delivery-date';
  const PREFERRED_TIME_KEY = 'lanna-bloom-preferred-delivery-time';
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const minDate = todayStr;
  const dateInputRef = useRef<HTMLInputElement>(null);
  const dateWrapRef = useRef<HTMLDivElement>(null);
  const timeSelectRef = useRef<HTMLSelectElement>(null);

  const formatDateDisplay = useCallback((dateStr: string): string => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
    const d = new Date(dateStr + 'T12:00:00');
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en', { month: 'long' });
    return `${day} ${month}`;
  }, [lang]);

  const [deliveryDate, setDeliveryDate] = useState<string>(() => '');

  const saveDeliveryDate = useCallback((v: string) => {
    setDeliveryDate(v);
    setShowDeliveryValidation((prev) => (prev ? false : prev));
    if (typeof window !== 'undefined' && v) {
      sessionStorage.setItem(PREFERRED_DELIVERY_KEY, v);
    }
  }, []);

  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState<string>(() => '');

  const saveDeliveryTimeSlot = useCallback((v: string) => {
    setDeliveryTimeSlot(v);
    setShowDeliveryValidation((prev) => (prev ? false : prev));
    if (typeof window !== 'undefined' && v) {
      sessionStorage.setItem(PREFERRED_TIME_KEY, v);
    }
  }, []);

  return (
    <div className="order-block">
      <SizeSelector
        sizes={bouquet.sizes}
        selected={selectedSize}
        onSelect={setSelectedSize}
        lang={lang}
      />
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
          {tBuyNow.deliveryDateLabel ?? 'Delivery Date'}
        </label>
        <div
          ref={dateWrapRef}
          className={`order-date-display-wrap${showDeliveryValidation && !deliveryDate?.trim() ? ' order-field-invalid' : ''}`}
          onClick={() => dateInputRef.current?.showPicker?.()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              dateInputRef.current?.showPicker?.();
            }
          }}
          aria-label={tBuyNow.specifyDeliveryDate ?? 'Specify delivery date'}
        >
          <input
            ref={dateInputRef}
            type="date"
            className="order-date-input"
            min={minDate}
            value={deliveryDate}
            onChange={(e) => saveDeliveryDate(e.target.value)}
            aria-label={tBuyNow.specifyDeliveryDate ?? 'Specify delivery date'}
          />
          <span className="order-date-display">
            {deliveryDate ? formatDateDisplay(deliveryDate) : (lang === 'th' ? 'เลือกวันที่' : 'Select date')}
          </span>
        </div>
        <div className="order-date-quick-btns">
          <button
            type="button"
            className="order-date-quick-btn"
            onClick={() => saveDeliveryDate(todayStr)}
            aria-label={tBuyNow.todayLabel}
          >
            {tBuyNow.todayLabel}
          </button>
          <button
            type="button"
            className="order-date-quick-btn"
            onClick={() => saveDeliveryDate(tomorrowStr)}
            aria-label={tBuyNow.tomorrowLabel}
          >
            {tBuyNow.tomorrowLabel}
          </button>
        </div>
        <p className="text-[11px] text-stone-400 italic mt-1 flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">info</span>
          {tBuyNow.sameDayHint ?? 'Same-day delivery available for orders before 2 PM.'}
        </p>
        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
            {tBuyNow.preferredTime ?? 'Preferred time'}
          </label>
          <select
            ref={timeSelectRef}
            value={deliveryTimeSlot}
            onChange={(e) => saveDeliveryTimeSlot(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border bg-white text-stone-800 text-sm ${showDeliveryValidation && !deliveryTimeSlot?.trim() ? 'order-field-invalid border-red-400' : 'border-stone-200'}`}
            aria-label={tBuyNow.selectTimeSlot ?? 'Select time slot'}
            aria-invalid={showDeliveryValidation && !deliveryTimeSlot?.trim()}
          >
            <option value="">
              {lang === 'th' ? 'เลือกช่วงเวลา' : 'Select time'}
            </option>
            {DELIVERY_TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>
        {showDeliveryValidation && (!deliveryDate?.trim() || !deliveryTimeSlot?.trim()) && (
          <p className="order-validation-msg" role="alert">
            {tBuyNow.deliveryDateAndTimeRequired ?? 'Please select delivery date and time to continue.'}
          </p>
        )}
      </div>
      <AddOnsSection lang={lang} value={addOns} onChange={setAddOns} gifts={gifts} />
      {justAdded ? (
        <div className="order-added-confirm" role="status">
          <p className="order-added-text">{t.addedToCart}</p>
          <div className="order-added-links">
            <Link href={`/${lang}/catalog`} className="order-added-link">
              {t.continueShopping}
            </Link>
            <Link href={`/${lang}/cart`} className="order-added-link order-added-link-primary">
              {t.goToCart}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="order-qty-row">
            <span className="order-qty-label">{tBuyNow.quantity ?? 'Quantity'}</span>
            <div className="order-qty-control">
              <button
                type="button"
                className="order-qty-btn"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="order-qty-value">{quantity}</span>
              <button
                type="button"
                className="order-qty-btn"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <span className="order-qty-price">
              ฿{(selectedSize.price * quantity).toLocaleString()}
            </span>
          </div>
          {(bouquet.partnerName || bouquet.partnerId) && (
            <div className="mb-6">
              <FloristCard
                lang={lang}
                partnerName={bouquet.partnerName}
                partnerImage={bouquet.partnerPortraitUrl ?? null}
                studioName={bouquet.partnerCity || 'Chiang Mai'}
                quote={
                  (lang === 'th' ? bouquet.partnerShopBioTh : bouquet.partnerShopBioEn) ||
                  "We source our flowers daily from local markets to ensure maximum freshness and fragrance in every arrangement."
                }
              />
            </div>
          )}
          <TrustBadges lang={lang} />
          <button
            type="button"
            className="order-add-to-cart-btn"
            onClick={handleAddToCart}
          >
            {t.addToCart} — ฿{totalPrice.toLocaleString()}
          </button>
        </>
      )}
      <style jsx>{`
        @media (max-width: 480px) {
          .order-add-to-cart-btn {
            font-size: 0.95rem;
            padding: 12px 16px;
          }
          .order-added-links {
            flex-direction: column;
          }
          .order-added-links :global(a.order-added-link) {
            width: 100%;
          }
        }
        @media (max-width: 360px) {
          .order-add-to-cart-btn {
            font-size: 0.9rem;
            padding: 10px 14px;
          }
        }
        @media (max-width: 350px) {
          .order-add-to-cart-btn {
            font-size: 0.85rem;
            padding: 10px 12px;
          }
          .order-added-confirm {
            padding: 12px;
          }
          .order-added-text {
            font-size: 0.9rem;
          }
          .order-added-links :global(a.order-added-link) {
            font-size: 0.9rem;
            padding: 12px 16px;
          }
        }
        .order-qty-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        .order-qty-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .order-qty-control {
          display: flex;
          align-items: center;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }
        .order-qty-btn {
          width: 40px;
          height: 40px;
          padding: 0;
          border: none;
          background: var(--surface);
          color: var(--text);
          font-size: 1.2rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .order-qty-btn:hover {
          background: var(--pastel-cream);
        }
        .order-qty-value {
          width: 44px;
          text-align: center;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .order-qty-price {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--accent);
        }
        .order-add-to-cart-btn {
          margin-top: 16px;
          width: 100%;
          padding: 14px 20px;
          background: var(--accent);
          border: none;
          border-radius: var(--radius-sm);
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .order-add-to-cart-btn:hover {
          background: #b39868;
          transform: translateY(-1px);
        }
        .order-add-to-cart-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .order-date-display-wrap {
          position: relative;
          display: block;
          cursor: pointer;
          text-align: left;
        }
        .order-date-input {
          position: absolute;
          inset: 0;
          opacity: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
        .order-date-display {
          display: block;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 0.95rem;
          font-family: inherit;
          background: var(--surface);
          color: var(--text);
          min-height: 42px;
          line-height: 1.4;
          text-align: center;
        }
        .order-date-display-wrap:focus-within .order-date-display,
        .order-date-display-wrap:hover .order-date-display {
          border-color: var(--accent);
        }
        .order-date-display-wrap.order-field-invalid .order-date-display {
          border-color: #e87171;
        }
        .order-validation-msg {
          margin-top: 8px;
          font-size: 0.875rem;
          color: #b91c1c;
        }
        .order-date-quick-btns {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
        .order-date-quick-btn {
          padding: 6px 12px;
          font-size: 0.85rem;
          font-family: inherit;
          color: var(--text-muted);
          background: transparent;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .order-date-quick-btn:hover {
          border-color: var(--accent);
          color: var(--text);
        }
        .order-added-confirm {
          margin-top: 20px;
          padding: 16px;
          background: var(--pastel-cream, #fdf8f3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
        }
        .order-added-text {
          margin: 0 0 12px;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text);
        }
        .order-added-links {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .order-added-links :global(a.order-added-link) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 14px 20px;
          border-radius: var(--radius-sm);
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          background: var(--accent);
          border: none;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .order-added-links :global(a.order-added-link:hover) {
          background: #b39868;
          color: #fff;
          transform: translateY(-1px);
        }
        .order-added-links :global(a.order-added-link:focus-visible) {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .order-added-links :global(a.order-added-link:not(.order-added-link-primary)) {
          background: var(--pastel-cream, #e8e2da);
          color: var(--text);
          border: 2px solid var(--border);
        }
        .order-added-links :global(a.order-added-link:not(.order-added-link-primary):hover) {
          background: #ddd6cc;
          border-color: var(--text-muted);
          color: var(--text);
        }
        .order-added-links :global(a.order-added-link-primary) {
          background: var(--accent);
          color: #fff;
          border: none;
        }
        .order-added-links :global(a.order-added-link-primary:hover) {
          background: #b39868;
          color: #fff;
        }
      `}</style>
    </div>
  );
}
