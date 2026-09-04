/**
 * Order store - public API. Supabase is the single source of truth.
 */

export * from './types';
export {
  GIFT_CARD_MESSAGES_MAX_COUNT,
  applyAdminCardTextToOrderJson,
  clipGiftCardMessage,
  formatGiftCardEntry,
  getOrderGiftCardDisplayLines,
  getOrderGiftCardEntries,
  getOrderGiftCardMessages,
  giftCardEntriesAuditDisplay,
  giftCardEntriesEqual,
  giftCardMessageMaxLength,
  normalizeGiftCardMessagesForPersist,
  normalizeGiftCardMessagesForUi,
  pairGiftCardMessagesWithItemTitles,
  parseCardTextPatch,
  type ApplyAdminCardTextResult,
  type OrderGiftCardEntry,
} from './giftCardMessages';
export {
  generateOrderId,
  getOrderById,
  getOrderByIdWithPublicToken,
  getOrderByStripeSessionId,
  getOrderBySubmissionToken,
  getOrderPublicToken,
  createOrder,
  createPendingOrder,
  updateOrderPaymentStatus,
  deleteOrder,
  listOrders,
} from './router';
export { getBaseUrl, getOrderDetailsUrl, getPayLinkUrl, getPayLinkStripeSuccessUrl } from './publicUrls';
