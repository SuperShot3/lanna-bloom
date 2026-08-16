/** Server-facing message when a cart line requires contact before checkout. */
export const CONTACT_BEFORE_ORDER_CHECKOUT_MESSAGE =
  'This item requires you to contact us before ordering. Please message us on LINE, WhatsApp, or email.';

export function contactBeforeOrderBlocksCheckout(
  entity: { contactBeforeOrder?: boolean } | null | undefined
): boolean {
  return entity?.contactBeforeOrder === true;
}
