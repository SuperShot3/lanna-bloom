import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getOrderById, getOrderByStripeSessionId, getOrderPublicToken } from '@/lib/orders';
import { getOrderIdFromStripeMetadata } from '@/lib/stripe/metadata';
import { resolveStripeCheckoutSessionIds } from '@/lib/stripe/metadata';
import { createStripeServerClient, getStripeServerConfig } from '@/lib/stripe/server';
import { fulfillPaidStripeCheckoutSession } from '@/lib/checkout/fulfillStripeCheckout';
import { checkStripeOrderStatusRateLimit } from '@/lib/rateLimit';
import type { AnalyticsItem } from '@/lib/analytics';
import {
  buildPurchaseAnalyticsItemsFromOrder,
  purchaseValueAndCurrencyFromOrder,
} from '@/lib/analytics/buildPurchaseItemsFromOrder';
import { phoneInternational } from '@/lib/admin/deliveryContactLinks';
export async function GET(request: NextRequest) {
  const stripeConfig = getStripeServerConfig();
  if (!stripeConfig) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  const sessionId = request.nextUrl.searchParams.get('session_id');
  if (!sessionId?.trim()) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';
  if (!checkStripeOrderStatusRateLimit(ip, sessionId)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    );
  }

  const submissionTokenFromHeader = request.headers.get('x-checkout-submission-token');
  const submissionTokenFromQuery = request.nextUrl.searchParams.get('submission_token');
  const submissionToken =
    (submissionTokenFromHeader ?? submissionTokenFromQuery ?? '').trim();

  const stripe = createStripeServerClient(stripeConfig.secretKey);
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId.trim(), {
      expand: ['payment_intent'],
    });

    const paymentIntent =
      typeof session.payment_intent === 'string' ? null : (session.payment_intent as Stripe.PaymentIntent | null);

    const paidInStripe =
      session.payment_status === 'paid' || paymentIntent?.status === 'succeeded';

    if (paidInStripe) {
      const fulfill = await fulfillPaidStripeCheckoutSession({
        stripe,
        session,
        trigger: 'order_status',
      });
      if (fulfill.kind === 'error') {
        console.error('[stripe/order-status] fulfill error:', fulfill.message, { sessionId: session.id });
      }
    }

    const { orderId: resolvedLbFromSession } = resolveStripeCheckoutSessionIds(session);
    let orderId =
      getOrderIdFromStripeMetadata(session.metadata) ??
      (session.client_reference_id?.trim().startsWith('LB-') ? session.client_reference_id.trim() : null) ??
      getOrderIdFromStripeMetadata(paymentIntent?.metadata) ??
      null;

    if (!orderId && resolvedLbFromSession?.startsWith('LB-')) {
      orderId = resolvedLbFromSession;
    }

    const foundByStripe = paidInStripe ? await getOrderByStripeSessionId(session.id) : null;

    if (!orderId && foundByStripe) {
      orderId = foundByStripe.orderId;
    }

    if (!orderId) {
      return NextResponse.json({
        status: paidInStripe ? 'processing' : 'pending',
        orderId: null,
        stripePaymentStatus: session.payment_status,
        paymentIntentStatus: paymentIntent?.status ?? null,
      });
    }

    console.log('[stripe/order-status] session checked', {
      sessionId: session.id,
      orderId,
      paymentStatus: session.payment_status,
      paymentIntentStatus: paymentIntent?.status ?? null,
      mode: stripeConfig.mode,
    });

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({
        status: paidInStripe ? 'processing' : 'pending',
        orderId: null,
        stripePaymentStatus: session.payment_status,
        paymentIntentStatus: paymentIntent?.status ?? null,
      });
    }

    // Proof-of-knowledge requirement:
    // Do not reveal orderId/public_token unless the caller also proves they initiated this checkout.
    // The only accepted proof for cart checkout is the checkout submission token, which is also stored in Stripe metadata.
    const expectedSubmissionToken = String(session.metadata?.submission_token ?? '').trim();
    const hasProof =
      Boolean(submissionToken) &&
      submissionToken.length >= 8 &&
      submissionToken.length <= 128 &&
      /^[0-9a-fA-F-]+$/.test(submissionToken) &&
      Boolean(expectedSubmissionToken) &&
      submissionToken === expectedSubmissionToken;

    const publicToken = hasProof ? await getOrderPublicToken(orderId) : null;
    const status = order.status ?? 'processing';
    console.log('[stripe/order-status] backend order state', {
      sessionId: session.id,
      orderId,
      backendStatus: order.status ?? null,
      stripePaymentStatus: session.payment_status,
      paymentIntentStatus: paymentIntent?.status ?? null,
      paidAt: order.paidAt ?? null,
    });

    if (status === 'paid' || status === 'payment_failed') {
      const payload: {
        status: string;
        orderId: string | null;
        token: string | null;
        purchase?: {
          transaction_id: string;
          value: number;
          currency: string;
          items: AnalyticsItem[];
          user_data?: {
            email_address?: string;
            phone_number?: string;
          };
        };
      } = {
        status,
        orderId: hasProof ? orderId : null,
        token: hasProof ? publicToken : null,
      };
      if (status === 'paid' && hasProof) {
        const { value, currency } = purchaseValueAndCurrencyFromOrder(order);
        const items = buildPurchaseAnalyticsItemsFromOrder(order, orderId);
        const userData: { email_address?: string; phone_number?: string } = {};
        const email = order.customerEmail?.trim();
        if (email) userData.email_address = email;
        const phone = phoneInternational(order.phone, order.phoneCountryCode);
        if (phone) userData.phone_number = phone;
        payload.purchase = {
          transaction_id: orderId,
          value,
          currency,
          items,
          ...(userData.email_address || userData.phone_number ? { user_data: userData } : {}),
        };
      }
      return NextResponse.json(payload);
    }

    if (session.payment_status === 'paid' || paymentIntent?.status === 'succeeded') {
      console.warn('[stripe/order-status] Stripe says paid but backend is not marked paid yet', {
        sessionId: session.id,
        orderId,
        backendStatus: order.status ?? null,
        stripePaymentStatus: session.payment_status,
        paymentIntentStatus: paymentIntent?.status ?? null,
      });
    }

    return NextResponse.json({
      status: 'processing',
      orderId: hasProof ? orderId : null,
      token: hasProof ? publicToken : null,
      stripePaymentStatus: session.payment_status,
      paymentIntentStatus: paymentIntent?.status ?? null,
    });
  } catch (e) {
    console.error('[stripe/order-status] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get order status' },
      { status: 500 }
    );
  }
}
