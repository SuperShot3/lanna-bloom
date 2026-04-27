import { notFound, redirect } from 'next/navigation';
import { defaultLocale } from '@/lib/i18n';
import {
  getCollectionLandingPage,
  getCollectionLandingPages,
} from '@/lib/landingPages/collectionLandingPages';

export function generateStaticParams() {
  return getCollectionLandingPages().map((page) => ({ slug: page.slug }));
}

export default function RootCollectionRedirectPage({
  params,
}: {
  params: { slug: string };
}) {
  const page = getCollectionLandingPage(params.slug);
  if (!page) notFound();

  redirect(`/${defaultLocale}${page.canonicalPath}`);
}
