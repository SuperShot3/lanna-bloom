import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';

export type LineIntegrationEventType =
  | 'draft_created'
  | 'draft_updated'
  | 'handoff_url_generated'
  | 'handoff_resolved'
  | 'handoff_rejected'
  | 'line_user_linked_to_order'
  /** Website queued a row for the agent; agent sends LINE push. */
  | 'payment_notify_queued_for_agent'
  /** Agent confirmed delivery after push (optional). */
  | 'line_notify_acknowledged_by_agent';

export async function logLineIntegrationEvent(
  eventType: LineIntegrationEventType,
  detail: {
    lineUserId?: string | null;
    orderId?: string | null;
    extra?: Record<string, unknown>;
  } = {}
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[line-integration]', eventType, detail);
    }
    return;
  }

  const { error } = await supabase.from('line_integration_events').insert({
    event_type: eventType,
    line_user_id: detail.lineUserId ?? null,
    order_id: detail.orderId ?? null,
    detail: detail.extra ?? null,
  });

  if (error) {
    console.error('[line-integration] log failed:', eventType, error.message);
  }
}
