import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';
import { RefundReplacementClient } from './RefundReplacementClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isValidLocale(lang)) return { title: 'Lanna Bloom' };
  const t = translations[lang as Locale].refundPolicy;
  return { title: `${t.title} | Lanna Bloom` };
}

export default async function RefundReplacementPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();
  return <RefundReplacementClient lang={lang as Locale} />;
}
