import { NextRequest, NextResponse } from 'next/server';
import { getPayLinkUrl } from '@/lib/orders';
import { isPayLinkDraftId } from '@/lib/payLinks/payLinkCheckoutSession';
import { createCheckoutSessionForPayLinkDraft } from '@/lib/stripe/createCheckoutSessionForPayLinkDraft';
import { createCheckoutSessionForExistingOrder } from '@/lib/stripe/createCheckoutSessionForExistingOrder';
import { checkPayLinkCheckoutRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

async function readLinkAndToken(
  request: NextRequest
): Promise<{ linkId: string; token: string }> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return { linkId: '', token: '' };
    }
    const linkIdRaw = body.linkId ?? body.draftId ?? body.orderId;
    return {
      linkId: typeof linkIdRaw === 'string' ? linkIdRaw.trim() : '',
      token: typeof body.token === 'string' ? body.token.trim() : '',
    };
  }

  try {
    const form = await request.formData();
    const linkId = String(form.get('linkId') ?? form.get('draftId') ?? form.get('orderId') ?? '').trim();
    const token = String(form.get('token') ?? '').trim();
    return { linkId, token };
  } catch {
    return { linkId: '', token: '' };
  }
}

function payErrorRedirect(linkId: string, token: string): NextResponse {
  const url = getPayLinkUrl(linkId, { token });
  const join = url.includes('?') ? '&' : '?';
  return NextResponse.redirect(`${url}${join}pay_error=1`, 303);
}

export async function POST(request: NextRequest) {
  const { linkId, token } = await readLinkAndToken(request);
  if (!linkId || !token) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!checkPayLinkCheckoutRateLimit(clientIp(request), linkId)) {
    return payErrorRedirect(linkId, token);
  }

  const result = isPayLinkDraftId(linkId)
    ? await createCheckoutSessionForPayLinkDraft({
        draftId: linkId,
        publicToken: token,
        lang: 'en',
      })
    : await createCheckoutSessionForExistingOrder({
        orderId: linkId,
        publicToken: token,
        lang: 'en',
      });

  if (result.ok) {
    return NextResponse.redirect(result.url, 303);
  }

  if (result.status === 403 || result.status === 404) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if ('alreadyPaid' in result && result.alreadyPaid) {
    return NextResponse.redirect(getPayLinkUrl(linkId, { token }), 303);
  }

  if (result.status === 400 && result.error === 'Order is already paid') {
    return NextResponse.redirect(getPayLinkUrl(linkId, { token }), 303);
  }

  if (result.status === 410) {
    return NextResponse.redirect(getPayLinkUrl(linkId, { token }), 303);
  }

  return payErrorRedirect(linkId, token);
}
