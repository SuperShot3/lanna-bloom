import { NextResponse } from 'next/server';

/**
 * Public review submissions are disabled.
 * Reviews are added by staff only via `POST /api/admin/reviews`.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Public review submissions are disabled' },
    { status: 410 }
  );
}
