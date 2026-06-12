const fs = require('fs');
const p = require('path').join(__dirname, '../app/[lang]/cart/CartPageClient.tsx');
let s = fs.readFileSync(p, 'utf8');
const startAlt2 = '        <div className="cart-mobile-view">';
const idx = s.indexOf(startAlt2);
if (idx < 0) {
  console.error('start not found');
  process.exit(1);
}
const promptIdx = s.indexOf('{mapsLinkPromptOpen', idx);
if (promptIdx < 0) {
  console.error('maps prompt not found');
  process.exit(1);
}
const endIdx = s.lastIndexOf('      </motion>', promptIdx);
const endIdx2 = s.lastIndexOf('      </div>', promptIdx);
const end = endIdx2 > endIdx ? endIdx2 : endIdx;
if (end < idx) {
  console.error('end before start', end, idx);
  process.exit(1);
}
const insert = `        <CartCheckoutView
          lang={lang}
          items={items}
          delivery={delivery}
          onDeliveryChange={setDelivery}
          deliveryNotes={deliveryNotes}
          onDeliveryNotesChange={setDeliveryNotes}
          checkoutDeliveryProfile={checkoutDeliveryProfile}
          recipientName={recipientName}
          onRecipientNameChange={setRecipientName}
          recipientCountryCode={recipientCountryCode}
          onRecipientCountryCodeChange={setRecipientCountryCode}
          recipientPhoneNational={recipientPhoneNational}
          onRecipientPhoneNationalChange={setRecipientPhoneNational}
          surpriseDelivery={surpriseDelivery}
          onSurpriseDeliveryChange={setSurpriseDelivery}
          cardMessage={cardMessageValue}
          onCardMessageChange={(v) => {
            if (primaryBouquetIdx < 0) return;
            const item = items[primaryBouquetIdx];
            updateItem(primaryBouquetIdx, { ...item, addOns: { ...item.addOns, cardMessage: v } });
          }}
          noCardMessage={noCardMessage}
          onNoCardMessageChange={setNoCardMessage}
          onToggleProductAddOn={(id, enabled) => {
            if (primaryBouquetIdx < 0) return;
            const item = items[primaryBouquetIdx];
            updateItem(primaryBouquetIdx, {
              ...item,
              addOns: {
                ...item.addOns,
                productAddOns: { ...(item.addOns.productAddOns ?? {}), [id]: enabled },
              },
            });
          }}
          productAddOnsSelected={productAddOnsSelected}
          senderFields={contactFormContent('')}
          countryCodeOptions={renderCountryCodeOptions(lang)}
          itemsTotal={itemsTotalVal}
          addOnsTotal={addOnsCartTotal}
          deliveryFee={stickyDeliveryFeeNet}
          deliveryFeeGross={stickyDeliveryFeeGross}
          discount={orderDiscountVal}
          discountLabel={
            isCampaignDiscount
              ? (t.mayFreeDeliveryDiscountLabel ?? 'May free delivery')
              : (t.referralDiscountLabel ?? 'Referral discount ({code})').replace(
                  '{code}',
                  resolvedDiscount?.code ?? ''
                )
          }
          grandTotal={grandTotalVal}
          mayCampaignProgressRemaining={mayCampaignProgressRemaining}
          appliedReferralCode={appliedReferralCode}
          onReferralChange={() => setReferralCleared((c) => c + 1)}
          mayCampaignEligible={mayCampaignEligible}
          highlightSection={highlightSection}
          sectionRefs={sectionRefs}
          onRemoveItem={removeItem}
          orderError={orderError}
          isPaymentUnlocked={isPaymentUnlocked}
          hasDeliveryZone={hasDeliveryZone}
          placing={placing}
          checkoutSubmissionToken={checkoutSubmissionToken}
          onBottomAction={handleCheckoutBottomAction}
          onPay={handlePlaceOrder}
        />
`;
s = s.slice(0, idx) + insert + s.slice(end);
fs.writeFileSync(p, s);
console.log('ok removed', end - idx, 'chars');
