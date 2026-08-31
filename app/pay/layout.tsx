import type { Metadata } from 'next';
import { buildPayLinkShareMetadata } from '@/lib/payLinks/payLinkShareMetadata';

export const dynamic = 'force-dynamic';

/** Generic pay-link card so /pay never inherits the homepage flower OG image. */
export const metadata: Metadata = buildPayLinkShareMetadata({
  linkId: '',
  token: '',
  details: null,
});

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
