import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { locales, isValidLocale, type Locale } from '@/lib/i18n';

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();
  return (
    <>
      <Header lang={lang as Locale} />
      <main>{children}</main>
    </>
  );
}
