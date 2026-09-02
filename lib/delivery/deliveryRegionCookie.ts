/**
 * Persistent delivery-region cookie. Value is a DeliveryDestinationId.
 * Missing/invalid cookie → Chiang Mai (callers default).
 * Not HttpOnly — client pickers and PDP pricing must read it.
 */

import type { NextResponse } from 'next/server';
import { getCookie, setCookie } from '@/lib/cookies';
import {
  parseDeliveryDestinationId,
  type DeliveryDestinationId,
} from '@/lib/delivery/markets';

export const DELIVERY_REGION_COOKIE = 'lanna-bloom-delivery-region';
export const DELIVERY_REGION_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;
export const OPEN_DELIVERY_REGION_PICKER_EVENT = 'lanna-bloom-open-delivery-region-picker';

export function parseDeliveryRegionCookie(
  raw: string | null | undefined
): DeliveryDestinationId | null {
  return parseDeliveryDestinationId(raw) ?? null;
}

export function deliveryRegionCookieOptions(): {
  httpOnly: false;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
} {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DELIVERY_REGION_COOKIE_MAX_AGE_SEC,
  };
}

export function readDeliveryRegionCookieClient(): DeliveryDestinationId | null {
  return parseDeliveryRegionCookie(getCookie(DELIVERY_REGION_COOKIE));
}

export function writeDeliveryRegionCookieClient(destinationId: DeliveryDestinationId): void {
  setCookie(DELIVERY_REGION_COOKIE, destinationId, {
    path: '/',
    maxAgeDays: 365,
    sameSite: 'Lax',
  });
}

export function applyDeliveryRegionCookie(
  res: NextResponse,
  destinationId: DeliveryDestinationId
): void {
  res.cookies.set(DELIVERY_REGION_COOKIE, destinationId, deliveryRegionCookieOptions());
}

export function requestOpenDeliveryRegionPicker(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event(OPEN_DELIVERY_REGION_PICKER_EVENT));
  } catch {
    // ignore
  }
}
