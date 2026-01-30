import { Hero } from '@/components/Hero';
import { CategoryGrid } from '@/components/CategoryGrid';
import { isValidLocale, type Locale } from '@/lib/i18n';

export default function HomePage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = isValidLocale(params.lang) ? params.lang : 'en';
  return (
    <>
      <Hero lang={lang as Locale} />
      <CategoryGrid lang={lang as Locale} />
    </>
  );
}
