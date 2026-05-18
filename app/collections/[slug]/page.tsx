import { notFound, redirect } from 'next/navigation';
import { defaultLocale } from '@/lib/i18n';
import {
  getCollectionLandingPages,
  getRoseColorFromLegacySlug,
  isRosesHubSlug,
  ROSES_HUB_PATH,
} from '@/lib/landingPages/collectionLandingPages';

export function generateStaticParams() {
  return getCollectionLandingPages().map((page) => ({ slug: page.slug }));
}

export default function RootCollectionRedirectPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { color?: string | string[] };
}) {
  const legacyColor = getRoseColorFromLegacySlug(params.slug);
  if (legacyColor) {
    const colorQuery = `?color=${legacyColor}`;
    redirect(`/${defaultLocale}${ROSES_HUB_PATH}${colorQuery}`);
  }

  if (!isRosesHubSlug(params.slug)) notFound();

  const color = searchParams.color;
  const colorQuery =
    color === undefined
      ? ''
      : `?color=${Array.isArray(color) ? color[0] : color}`;

  redirect(`/${defaultLocale}${ROSES_HUB_PATH}${colorQuery}`);
}
