export {
  ORDER_CHAT_RETENTION_AFTER_DELIVERY_MS,
  ORDER_CHAT_MAX_BODY_LENGTH,
  ORDER_CHAT_POLL_INTERVAL_MS,
} from './constants';

/** Server-only feature gate. Default off until ORDER_CHAT_ENABLED=true. */
export function isOrderChatEnabled(): boolean {
  return process.env.ORDER_CHAT_ENABLED?.trim().toLowerCase() === 'true';
}
