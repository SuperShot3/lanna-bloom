/**
 * Order ID generation. Shared by Supabase store (single source of truth).
 */

export function generateOrderId(): string {
  const year = new Date().getFullYear();
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LB-${year}-${ts}${rand}`;
}
