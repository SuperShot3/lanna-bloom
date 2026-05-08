import { NextResponse } from 'next/server';

export async function POST() {
  // Business rule (Lanna Bloom): do not create customer orders before payment.
  // Normal website orders must go through Stripe checkout draft + post-payment fulfillment,
  // where `fulfillPaidStripeCheckoutSession()` creates the real order only after Stripe confirms paid.
  //
  // This endpoint previously allowed public/anonymous creation of unpaid orders. Keep it disabled.
  return NextResponse.json(
    {
      error: 'This endpoint is no longer available. Create orders via Stripe checkout flow.',
    },
    { status: 410 }
  );
}
