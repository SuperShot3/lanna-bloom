import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';
import { parseCardTextPatch } from '@/lib/orders/giftCardMessages';
import { updateOrderCardText } from '@/lib/orders/supabaseStore';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;
  const { session } = authResult;

  const { order_id } = await params;
  const orderId = order_id?.trim();
  if (!orderId) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseCardTextPatch(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await updateOrderCardText(orderId, parsed.giftCardMessages);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await logAudit(session.user.email ?? 'unknown', 'CARD_TEXT_UPDATE', orderId, {
    from: { card_text: result.fromDisplay },
    to: { card_text: result.toDisplay },
    changedFields: ['card_text'],
  });

  return NextResponse.json({
    ok: true,
    order: result.order,
    from: result.from,
    to: result.to,
    fromDisplay: result.fromDisplay,
    toDisplay: result.toDisplay,
  });
}
