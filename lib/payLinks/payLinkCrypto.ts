import { timingSafeEqual } from 'crypto';

export function payLinkTokensEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  const aa = (a ?? '').trim();
  const bb = (b ?? '').trim();
  if (!aa || !bb) return false;
  const aBuf = Buffer.from(aa, 'utf8');
  const bBuf = Buffer.from(bb, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
