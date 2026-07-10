import type { Metadata } from 'next';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return { title: 'Lanna Bloom' };
  const locale = params.lang as Locale;
  const title =
    locale === 'th' ? 'รายการโปรด | Lanna Bloom' : 'Favorites | Lanna Bloom';
  return {
    title,
    robots: { index: false, follow: false },
  };
}

export default function FavoritesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
