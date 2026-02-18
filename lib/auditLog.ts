import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export type AuditAction =
  | 'COSTS_UPDATE'
  | 'STATUS_UPDATE'
  | 'DRIVER_ASSIGN'
  | 'PHOTO_UPLOAD'
  | 'NOTE_UPDATE'
  | 'MANUAL_MARK_PAID';

/**
 * Insert an audit log entry. Best-effort; never throws.
 */
export async function logAudit(
  adminEmail: string,
  action: AuditAction | string,
  targetOrderId?: string | null,
  diffJson?: Record<string, unknown> | null
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    await supabase.from('audit_logs').insert({
      admin_email: adminEmail,
      action,
      target_order_id: targetOrderId ?? null,
      diff_json: diffJson ?? null,
    });
  } catch (e) {
    console.error('[audit] logAudit failed:', e);
  }
}
