import { permanentRedirect } from 'next/navigation';
import { defaultLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default function RootPage() {
  permanentRedirect(`/${defaultLocale}`);
}
