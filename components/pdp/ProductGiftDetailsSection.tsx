'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { translations, type Locale } from '@/lib/i18n';
import { PhoneCountrySelect } from '@/components/checkout/PhoneCountrySelect';
import { POPULAR_COUNTRY_CODES, ALL_COUNTRY_CODES } from '@/lib/checkout/phoneCountryDial';
import { GiftCardMessagesEditor } from '@/components/GiftCardMessagesEditor';
import { CHECKOUT_FIELD_LIMITS, clipCheckoutField } from '@/lib/checkout/checkoutFieldLimits';
import { nationalDigitsValidForCheckout } from '@/lib/phoneFieldHints';
import { useOrderGiftCardMessage } from '@/hooks/useOrderGiftCardMessage';
import { useOrderRecipientDetails } from '@/hooks/useOrderRecipientDetails';
import styles from './product-pdp.module.css';

export function ProductGiftDetailsSection({
  lang,
  sectionRef,
  itemLabel,
  disabled = false,
  onSkip,
  onSubmit,
}: {
  lang: Locale;
  sectionRef: RefObject<HTMLDivElement>;
  /** Product name — shown above the single card field. */
  itemLabel?: string;
  disabled?: boolean;
  /** "No thanks" — no validation gate. */
  onSkip: () => void;
  /** "Add & Continue" — called only after internal validation passes. */
  onSubmit: () => void;
}) {
  const t = translations[lang].product;
  const tCart = translations[lang].cart;

  const { giftCardMessages, setGiftCardMessageAt, addGiftCardMessage, removeGiftCardMessage } =
    useOrderGiftCardMessage();
  const {
    recipientName,
    setRecipientName,
    recipientCountryCode,
    setRecipientCountryCode,
    recipientPhoneNational,
    setRecipientPhoneNational,
  } = useOrderRecipientDetails();

  const cardMessage = giftCardMessages[0] ?? '';
  const nameRequired = cardMessage.trim().length > 0;

  const [nameErrorVisible, setNameErrorVisible] = useState(false);
  const [phoneErrorVisible, setPhoneErrorVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<'skip' | 'submit' | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!nameRequired && nameErrorVisible) setNameErrorVisible(false);
  }, [nameRequired, nameErrorVisible]);

  const handleSkip = () => {
    if (pendingAction) return;
    setPendingAction('skip');
    onSkip();
  };

  const handleAddAndContinue = () => {
    if (pendingAction) return;
    const nameInvalid = nameRequired && !recipientName.trim();
    const phoneInvalid =
      !recipientPhoneNational.trim() ||
      !nationalDigitsValidForCheckout(recipientCountryCode, recipientPhoneNational);

    if (nameInvalid || phoneInvalid) {
      setNameErrorVisible(nameInvalid);
      setPhoneErrorVisible(phoneInvalid);
      if (nameInvalid) nameInputRef.current?.focus();
      else phoneInputRef.current?.focus();
      return;
    }

    setPendingAction('submit');
    onSubmit();
  };

  return (
    <div ref={sectionRef} className={styles.giftDetailsSection}>
      <h3 className={styles.giftDetailsTitle}>{t.giftDetailsSectionTitle ?? 'Gift Details'}</h3>

      <div className={styles.giftDetailsField}>
        <label htmlFor="pdp-gift-details-recipient-name" className={styles.giftDetailsLabel}>
          {tCart.recipientName}
          {nameRequired ? <span className={styles.giftDetailsReq}> *</span> : null}
        </label>
        <input
          ref={nameInputRef}
          id="pdp-gift-details-recipient-name"
          className={styles.giftDetailsInput}
          value={recipientName}
          onChange={(e) => {
            setRecipientName(clipCheckoutField(e.target.value, 'recipientName'));
            if (nameErrorVisible) setNameErrorVisible(false);
          }}
          placeholder={tCart.recipientNamePlaceholder}
          autoComplete="name"
          maxLength={CHECKOUT_FIELD_LIMITS.recipientName}
          aria-invalid={nameErrorVisible}
          disabled={disabled}
        />
        {nameErrorVisible ? (
          <span className={styles.giftDetailsErrorHint}>{tCart.recipientNameRequired}</span>
        ) : null}
      </div>

      <GiftCardMessagesEditor
        lang={lang}
        messages={giftCardMessages.slice(0, 1)}
        onChangeAt={setGiftCardMessageAt}
        onAdd={addGiftCardMessage}
        onRemove={removeGiftCardMessage}
        allowAdditional={false}
        itemLabels={itemLabel?.trim() ? [itemLabel.trim()] : []}
        idPrefix="pdp-gift-details-card"
        textareaClassName={styles.giftDetailsTextarea}
      />

      <div className={styles.giftDetailsField}>
        <label htmlFor="pdp-gift-details-recipient-phone" className={styles.giftDetailsLabel}>
          {tCart.recipientPhone}
          <span className={styles.giftDetailsReq}> *</span>
        </label>
        <div className={styles.giftDetailsPhoneRow}>
          <PhoneCountrySelect
            id="pdp-gift-details-recipient-cc"
            className={styles.giftDetailsPhoneCc}
            value={recipientCountryCode}
            onChange={setRecipientCountryCode}
            popular={POPULAR_COUNTRY_CODES}
            all={ALL_COUNTRY_CODES}
            lang={lang}
            ariaLabel={tCart.countryCode}
          />
          <input
            ref={phoneInputRef}
            id="pdp-gift-details-recipient-phone"
            type="tel"
            inputMode="numeric"
            className={styles.giftDetailsInput}
            value={recipientPhoneNational}
            onChange={(e) => {
              setRecipientPhoneNational(
                e.target.value.replace(/\D/g, '').slice(0, CHECKOUT_FIELD_LIMITS.recipientPhoneNational)
              );
              if (phoneErrorVisible) setPhoneErrorVisible(false);
            }}
            placeholder={tCart.recipientPhonePlaceholder}
            autoComplete="tel-national"
            maxLength={CHECKOUT_FIELD_LIMITS.recipientPhoneNational}
            aria-invalid={phoneErrorVisible}
            disabled={disabled}
          />
        </div>
        {phoneErrorVisible ? (
          <span className={styles.giftDetailsErrorHint}>{tCart.recipientPhoneRequired}</span>
        ) : (
          <span className={styles.giftDetailsHint}>{t.giftDetailsPhoneHelper}</span>
        )}
      </div>

      <div className={styles.giftDetailsActions}>
        <button
          type="button"
          className={styles.giftDetailsSkip}
          onClick={handleSkip}
          disabled={disabled || pendingAction !== null}
          aria-busy={pendingAction === 'skip'}
        >
          {pendingAction === 'skip' ? <span className={styles.giftDetailsSpinner} aria-hidden /> : null}
          {t.giftDetailsSkip ?? 'No thanks'}
        </button>
        <button
          type="button"
          className={styles.giftDetailsSubmit}
          onClick={handleAddAndContinue}
          disabled={disabled || pendingAction !== null}
          aria-busy={pendingAction === 'submit'}
        >
          {pendingAction === 'submit' ? (
            <span className={styles.giftDetailsSpinner} aria-hidden />
          ) : null}
          {t.giftDetailsSubmit ?? 'Add & Continue'}
        </button>
      </div>
    </div>
  );
}
