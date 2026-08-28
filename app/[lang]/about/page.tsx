import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TrustBadges } from '@/components/TrustBadges';
import { aboutPageCopy, DBD_BANNER_URL, DBD_VERIFY_URL } from '@/lib/aboutPageCopy';
import type { AboutRichParagraph, AboutSegment } from '@/lib/aboutPageCopy';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { buildAlternates } from '@/lib/seo/alternates';
import {
  openGraphLocale,
  websiteOpenGraph,
  websiteTwitter,
} from '@/lib/seo/shareMetadata';
import { getBaseUrl } from '@/lib/siteUrl';
import { BRAND_LOGO_SRC } from '@/lib/brandLogo';
import { AboutNewsletterSignup } from './AboutNewsletterSignup';

const linkClassName =
  'font-medium text-[#1A3C34] underline decoration-[#C5A059]/60 underline-offset-4 transition-colors hover:text-[#A47D2B] hover:decoration-[#C5A059] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:ring-offset-2';

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return { title: 'About' };

  const lang = params.lang as Locale;
  const copy = aboutPageCopy[lang];

  const alternates = buildAlternates({ lang, pathSuffix: '/about' });
  const canonical =
    typeof alternates.canonical === 'string'
      ? alternates.canonical
      : `${getBaseUrl()}/${lang}/about`;

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates,
    openGraph: websiteOpenGraph({
      title: copy.metaTitle,
      description: copy.metaDescription,
      url: canonical,
      locale: openGraphLocale(lang),
    }),
    twitter: websiteTwitter({
      title: copy.metaTitle,
      description: copy.metaDescription,
    }),
  };
}

function RichParagraph({
  segments,
  locale,
}: {
  segments: AboutRichParagraph;
  locale: Locale;
}) {
  return (
    <p className="text-[17px] leading-[1.8] text-stone-700 sm:text-lg">
      {segments.map((segment: AboutSegment, index: number) => {
        if (segment.type === 'text') return <span key={index}>{segment.text}</span>;

        if (segment.type === 'bold') {
          return (
            <strong key={index} className="font-semibold text-[#1A3C34]">
              {segment.text}
            </strong>
          );
        }

        const href = segment.external ? segment.href : `/${locale}${segment.href}`;
        return segment.external ? (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
          >
            {segment.text}
          </a>
        ) : (
          <Link key={index} href={href} className={linkClassName}>
            {segment.text}
          </Link>
        );
      })}
    </p>
  );
}

function ArticleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-stone-200 pt-10 sm:pt-12">
      <h2 className="text-balance font-[family-name:var(--font-family-display)] text-2xl font-semibold leading-tight tracking-tight text-[#1A3C34] sm:text-3xl">
        {title}
      </h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function ArticleList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 pl-6 text-[17px] leading-[1.75] text-stone-700 marker:text-[#C5A059] sm:text-lg">
      {items.map((item) => (
        <li key={item} className="pl-1">
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function AboutPage({ params }: { params: { lang: string } }) {
  if (!isValidLocale(params.lang)) notFound();

  const locale = params.lang as Locale;
  const copy = aboutPageCopy[locale];
  const isThai = locale === 'th';

  return (
    <main className="bg-[var(--bg)]">
      <article className="container mx-auto max-w-[50rem] pb-24 pt-12 sm:pb-28 sm:pt-16 lg:pb-32 lg:pt-20">
        <header>
          <Image
            src={BRAND_LOGO_SRC}
            alt="Lanna Bloom"
            width={512}
            height={512}
            priority
            className="mb-7 h-28 w-28 object-contain sm:h-32 sm:w-32"
          />

          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-[#1A3C34] sm:text-5xl">
            {copy.h1}
          </h1>
          <p className="mt-5 text-pretty text-xl leading-relaxed text-stone-600 sm:text-2xl">
            {copy.tagline}
          </p>

          <div className="mt-8 space-y-5">
            {copy.intro.map((paragraph, index) => (
              <RichParagraph key={index} segments={paragraph} locale={locale} />
            ))}
          </div>

          <div className="mt-7">
            <TrustBadges lang={locale} />
          </div>
        </header>

        <div className="mt-12 space-y-10 sm:mt-16 sm:space-y-12">
          <ArticleSection title={copy.whatWeBelieve.title}>
            {copy.whatWeBelieve.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-[17px] leading-[1.8] text-stone-700 sm:text-lg">
                {paragraph}
              </p>
            ))}
            <ArticleList items={copy.whatWeBelieve.bullets} />
          </ArticleSection>

          <ArticleSection title={copy.supportingSellers.title}>
            {copy.supportingSellers.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-[17px] leading-[1.8] text-stone-700 sm:text-lg">
                {paragraph}
              </p>
            ))}
            <p>
              <Link href={`/${locale}/partner/apply`} className={linkClassName}>
                {isThai ? 'สมัครเป็นพาร์ทเนอร์กับ Lanna Bloom' : 'Apply to become a Lanna Bloom partner'}
              </Link>
            </p>
          </ArticleSection>

          <ArticleSection title={copy.startupGrowing.title}>
            {copy.startupGrowing.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-[17px] leading-[1.8] text-stone-700 sm:text-lg">
                {paragraph}
              </p>
            ))}
          </ArticleSection>

          <ArticleSection title={copy.whatWeAreBuilding.title}>
            <p className="text-[17px] leading-[1.8] text-stone-700 sm:text-lg">
              {copy.whatWeAreBuilding.intro}
            </p>
            <ArticleList items={copy.whatWeAreBuilding.bullets} />
            {copy.whatWeAreBuilding.closing.map((paragraph) => (
              <p key={paragraph} className="text-[17px] leading-[1.8] text-stone-700 sm:text-lg">
                {paragraph}
              </p>
            ))}
          </ArticleSection>

          <ArticleSection title={copy.platformUpdates.title}>
            <p className="text-sm font-medium text-stone-500">
              {copy.platformUpdates.lastUpdatedLabel}:{' '}
              <time dateTime={copy.platformUpdates.lastUpdatedIso} className="tabular-nums text-[#1A3C34]">
                {copy.platformUpdates.lastUpdatedDisplay}
              </time>
            </p>
            <p className="text-[17px] leading-[1.8] text-stone-700 sm:text-lg">
              {copy.platformUpdates.snippetIntro}
            </p>
            <h3 className="pt-2 font-[family-name:var(--font-family-display)] text-xl font-semibold text-[#1A3C34] sm:text-2xl">
              {copy.platformUpdates.highlightsTitle}
            </h3>
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              <table className="w-full border-collapse text-left">
                <thead className="bg-[var(--muted)]">
                  <tr>
                    <th
                      scope="col"
                      className="w-16 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500 sm:w-20 sm:px-5"
                    >
                      {isThai ? 'ลำดับ' : 'No.'}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500 sm:px-5"
                    >
                      {isThai ? 'การปรับปรุง' : 'Improvement'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {copy.platformUpdates.highlights.map((highlight, index) => (
                    <tr key={highlight}>
                      <td className="px-4 py-4 align-top font-mono text-sm tabular-nums text-[#A47D2B] sm:px-5">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-4 text-[15px] leading-relaxed text-stone-700 sm:px-5 sm:text-base">
                        {highlight}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="pt-2">
              <Link
                href={`/${locale}/delivery-areas-thailand`}
                className="btn-premium inline-flex items-center gap-2"
              >
                {isThai
                  ? 'ดูพื้นที่และค่าจัดส่งในเชียงใหม่'
                  : 'View Chiang Mai delivery areas and fees'}
                <span aria-hidden>→</span>
              </Link>
            </p>

            <div className="pt-3">
              <AboutNewsletterSignup
                copy={{
                  newsletterTitle: copy.platformUpdates.newsletterTitle,
                  newsletterHint: copy.platformUpdates.newsletterHint,
                  emailPlaceholder: copy.platformUpdates.emailPlaceholder,
                  joinButton: copy.platformUpdates.joinButton,
                  newsletterSubscribing: copy.platformUpdates.newsletterSubscribing,
                  newsletterSuccess: copy.platformUpdates.newsletterSuccess,
                  newsletterAlreadySubscribed: copy.platformUpdates.newsletterAlreadySubscribed,
                  newsletterError: copy.platformUpdates.newsletterError,
                  newsletterInvalidEmail: copy.platformUpdates.newsletterInvalidEmail,
                }}
              />
            </div>
          </ArticleSection>

          <ArticleSection title={copy.lookingAhead.title}>
            {copy.lookingAhead.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-[17px] leading-[1.8] text-stone-700 sm:text-lg">
                {paragraph}
              </p>
            ))}
          </ArticleSection>

          <ArticleSection title={copy.dbdVerification.title}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <img
                src={DBD_BANNER_URL}
                alt={
                  isThai
                    ? 'ตรารับรอง DBD กรมพัฒนาธุรกิจการค้า'
                    : 'DBD Verified badge, Thailand Department of Business Development'
                }
                className="h-16 w-16 shrink-0 object-contain"
                loading="lazy"
                decoding="async"
                width={64}
                height={64}
              />
              <div className="space-y-4">
                <p className="text-[17px] leading-[1.8] text-stone-700 sm:text-lg">
                  {copy.dbdVerification.explanation}
                </p>
                <p>
                  <a
                    href={DBD_VERIFY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClassName}
                  >
                    {copy.dbdVerification.verifyLinkText}
                  </a>
                </p>
              </div>
            </div>
          </ArticleSection>

          <nav
            className="mb-16 border-t border-stone-200 pt-10 sm:mb-20 lg:mb-24"
            aria-label={copy.quickLinks.title}
          >
            <h2 className="font-[family-name:var(--font-family-display)] text-xl font-semibold text-[#1A3C34]">
              {copy.quickLinks.title}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
              {copy.quickLinks.links.map((item) => (
                <li key={item.href + item.label}>
                  <Link href={`/${locale}${item.href}`} className={linkClassName}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </article>
    </main>
  );
}
