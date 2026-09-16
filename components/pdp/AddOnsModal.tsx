'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { CatalogProduct } from '@/lib/catalog/types';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { computeFinalPrice } from '@/lib/partnerPricing';
import { catalogImageUnoptimized } from '@/lib/catalog/catalogImage';
import { useGiftCartToggle } from '@/hooks/useGiftCartToggle';

export interface AddOnsModalProps {
  lang: Locale;
  gifts: CatalogProduct[];
  isOpen: boolean;
  onClose: () => void;
  /** Ref of the element that opened the modal (for return focus) */
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function AddOnsModal({ lang, gifts, isOpen, onClose, triggerRef }: AddOnsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const { isInCart, toggleGift } = useGiftCartToggle(lang);
  const t = translations[lang].product as {
    makeItExtraSpecial?: string;
    addOnsModalTitle?: string;
    addOnsModalBack?: string;
  };
  const tCart = translations[lang].cart as { addToCart?: string; addedToCart?: string };

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        triggerRef?.current?.focus();
      }
      if (e.key === 'Tab') {
        const el = modalRef.current;
        if (!el) return;
        const focusable = el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      triggerRef?.current?.focus();
    };
  }, [isOpen, onClose, triggerRef]);

  useEffect(() => {
    if (!isOpen) setSelected(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const close = () => {
    onClose();
  };

  return (
    <div
      className="addons-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="addons-modal-title"
      ref={modalRef}
    >
      <div
        className="addons-modal-backdrop"
        onClick={close}
        onKeyDown={(e) => e.key === 'Enter' && close()}
        role="button"
        tabIndex={0}
        aria-label="Close"
      />
      <div className="addons-modal-card">
        <div className="addons-modal-header">
          {selected ? (
            <button
              type="button"
              className="addons-modal-back"
              onClick={() => setSelected(null)}
            >
              <span aria-hidden>←</span> {t.addOnsModalBack ?? 'Back'}
            </button>
          ) : (
            <h2 id="addons-modal-title" className="addons-modal-title">
              {t.addOnsModalTitle ?? t.makeItExtraSpecial ?? 'Add-ons'}
            </h2>
          )}
          <button
            type="button"
            className="addons-modal-close"
            onClick={close}
            ref={closeButtonRef}
            aria-label="Close"
          >
            <span aria-hidden>×</span>
          </button>
        </div>

        <div className="addons-modal-body">
          {selected ? (
            <AddOnDetail
              product={selected}
              lang={lang}
              inCart={isInCart(selected)}
              onToggle={() => toggleGift(selected)}
              addToCartLabel={tCart.addToCart ?? 'Add to cart'}
              addedLabel={tCart.addedToCart ?? 'Added to cart.'}
            />
          ) : (
            <div className="addons-modal-grid">
              {gifts.map((product) => {
                const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
                const imgSrc = product.images?.[0] ?? '';
                const finalPrice = computeFinalPrice(
                  product.cost ?? product.price,
                  product.commissionPercent
                );
                const inCart = isInCart(product);

                return (
                  <button
                    type="button"
                    key={product.id}
                    className="addons-modal-tile"
                    onClick={() => setSelected(product)}
                  >
                    <span className="addons-modal-tile-image">
                      {imgSrc ? (
                        <Image
                          src={imgSrc}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 45vw, 180px"
                          style={{ objectFit: 'cover' }}
                          unoptimized={catalogImageUnoptimized(imgSrc)}
                        />
                      ) : null}
                      {inCart ? (
                        <span className="addons-modal-tile-check" aria-hidden>
                          ✓
                        </span>
                      ) : null}
                    </span>
                    <span className="addons-modal-tile-name">{name}</span>
                    <span className="addons-modal-tile-price">
                      ฿{finalPrice.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .addons-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .addons-modal-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(45, 42, 38, 0.4);
          cursor: pointer;
        }
        .addons-modal-card {
          position: relative;
          display: flex;
          flex-direction: column;
          background: var(--surface);
          border-radius: var(--radius);
          box-shadow: var(--shadow-hover);
          width: min(92vw, 640px);
          max-height: min(90vh, 720px);
          max-height: min(90dvh, 720px);
          padding: 24px;
          overflow: hidden;
        }
        .addons-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }
        .addons-modal-title {
          font-family: var(--font-serif);
          font-size: 1.35rem;
          font-weight: 600;
          margin: 0;
          color: var(--text);
        }
        .addons-modal-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          padding: 8px 4px;
          margin: -8px 0 -8px -4px;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--accent);
          cursor: pointer;
        }
        .addons-modal-close {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .addons-modal-close:hover,
        .addons-modal-close:focus-visible {
          background: var(--pastel-cream);
          color: var(--text);
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .addons-modal-body {
          overflow-y: auto;
        }
        .addons-modal-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        @media (min-width: 480px) {
          .addons-modal-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        .addons-modal-tile {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          text-align: left;
        }
        .addons-modal-tile-image {
          position: relative;
          display: block;
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: var(--pastel-cream);
        }
        .addons-modal-tile-check {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent);
          color: #fff;
          border-radius: 50%;
          font-size: 0.75rem;
        }
        .addons-modal-tile-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text);
          line-height: 1.3;
        }
        .addons-modal-tile-price {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--accent);
        }
      `}</style>
    </div>
  );
}

function AddOnDetail({
  product,
  lang,
  inCart,
  onToggle,
  addToCartLabel,
  addedLabel,
}: {
  product: CatalogProduct;
  lang: Locale;
  inCart: boolean;
  onToggle: () => void;
  addToCartLabel: string;
  addedLabel: string;
}) {
  const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
  const description =
    (lang === 'th' ? product.descriptionTh : product.descriptionEn) ||
    product.descriptionEn ||
    '';
  const imgSrc = product.images?.[0] ?? '';
  const finalPrice = computeFinalPrice(product.cost ?? product.price, product.commissionPercent);

  return (
    <div className="addon-detail">
      <div className="addon-detail-image">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt=""
            fill
            sizes="(max-width: 640px) 92vw, 400px"
            style={{ objectFit: 'cover' }}
            unoptimized={catalogImageUnoptimized(imgSrc)}
          />
        ) : null}
      </div>
      <h3 className="addon-detail-name">{name}</h3>
      {product.sizeLabel ? <p className="addon-detail-size">{product.sizeLabel}</p> : null}
      {description ? <p className="addon-detail-description">{description}</p> : null}
      <div className="addon-detail-footer">
        <span className="addon-detail-price">฿{finalPrice.toLocaleString()}</span>
        <button type="button" className="addon-detail-cta" onClick={onToggle}>
          {inCart ? addedLabel : addToCartLabel}
        </button>
      </div>
      <style jsx>{`
        .addon-detail {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .addon-detail-image {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: var(--pastel-cream);
        }
        .addon-detail-name {
          font-family: var(--font-serif);
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text);
          margin: 0;
        }
        .addon-detail-size {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: -8px 0 0;
        }
        .addon-detail-description {
          font-size: 0.95rem;
          line-height: 1.5;
          color: var(--text);
          margin: 0;
        }
        .addon-detail-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 8px;
        }
        .addon-detail-price {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--accent);
        }
        .addon-detail-cta {
          padding: 12px 24px;
          border-radius: 999px;
          border: none;
          background: var(--accent);
          color: #fff;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          min-height: 44px;
        }
      `}</style>
    </div>
  );
}
