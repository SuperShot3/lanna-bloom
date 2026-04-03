import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { aboutPageCopy } from '@/lib/aboutPageCopy';
import type { AboutRichParagraph, AboutSegment } from '@/lib/aboutPageCopy';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { AboutNewsletterSignup } from './AboutNewsletterSignup';

const linkClassName =
  'font-medium text-[#1A3C34] underline decoration-[#C5A059]/45 underline-offset-[4px] hover:decoration-[#C5A059] hover:text-[#14332c] transition-colors cursor-pointer';

/** Overrides globals `a { text-decoration: none }` so Website + Partner links show underlines */
const contactFooterLinkClass =
  'font-medium text-[#1A3C34] !underline decoration-[#C5A059]/60 decoration-2 underline-offset-[5px] hover:decoration-[#C5A059] hover:text-[#14332c] transition-colors cursor-pointer text-base sm:text-lg';

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return { title: 'About' };
  const lang = params.lang as Locale;
  const c = aboutPageCopy[lang];
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: {
      canonical: `/${lang}/about`,
      languages: { en: '/en/about', th: '/th/about' },
    },
  };
}

function RichParagraph({
  segments,
  locale,
  className = '',
}: {
  segments: AboutRichParagraph;
  locale: Locale;
  className?: string;
}) {
  return (
    <p
      className={`text-[17px] sm:text-lg leading-[1.75] text-[#2d2a26] antialiased ${className}`}
    >
      {segments.map((s: AboutSegment, i: number) => {
        if (s.type === 'text') {
          return <span key={i}>{s.text}</span>;
        }
        if (s.type === 'bold') {
          return (
            <strong key={i} className="font-semibold text-[#1A3C34]">
              {s.text}
            </strong>
          );
        }
        if (s.type === 'link') {
          const href = s.external ? s.href : `/${locale}${s.href}`;
          if (s.external) {
            return (
              <a
                key={i}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClassName}
              >
                {s.text}
              </a>
            );
          }
          return (
            <Link key={i} href={href} className={linkClassName}>
              {s.text}
            </Link>
          );
        }
        return null;
      })}
    </p>
  );
}

/** Readable long-form text — plain paragraph */
function Body({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={`text-[17px] sm:text-lg leading-[1.75] text-[#2d2a26] antialiased ${className}`}
    >
      {children}
    </p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-[family-name:var(--font-family-display)] text-2xl sm:text-[1.625rem] font-semibold text-[#1A3C34] tracking-tight mb-5">
      {children}
    </h2>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-3 pl-1 text-[17px] sm:text-lg leading-[1.7] text-[#2d2a26] list-none">
      {items.map((item) => (
        <li key={item} className="flex gap-3 pl-0">
          <span
            className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#C5A059]"
            aria-hidden
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function QuickLinksSection({
  title,
  links,
  locale,
}: {
  title: string;
  links: { label: string; href: string }[];
  locale: Locale;
}) {
  return (
    <aside
      className="rounded-2xl border border-[#ebe6e0] bg-white p-5 sm:p-6 shadow-[var(--shadow)]"
      aria-label={title}
    >
      <h2 className="font-[family-name:var(--font-family-display)] text-lg font-semibold text-[#1A3C34] mb-4">
        {title}
      </h2>
      <ul className="flex flex-col gap-2">
        {links.map((item) => (
          <li key={item.href + item.label}>
            <Link
              href={`/${locale}${item.href}`}
              className="group flex items-center gap-2 text-[17px] leading-snug text-[#2d2a26] rounded-lg px-2 py-2 -mx-2 hover:bg-[#f9f5f0] transition-colors cursor-pointer"
            >
              <span
                className="material-symbols-outlined text-[#C5A059] text-xl shrink-0 group-hover:translate-x-0.5 transition-transform"
                aria-hidden
              >
                arrow_forward
              </span>
              <span className="font-medium text-[#1A3C34] group-hover:underline decoration-[#C5A059]/50 underline-offset-2">
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default function AboutPage({ params }: { params: { lang: string } }) {
  const { lang } = params;
  if (!isValidLocale(lang)) notFound();
  const locale = lang as Locale;
  const c = aboutPageCopy[locale];

  return (
    <div className="min-h-[60vh] bg-[#fdfbf9]">
      <div className="container pb-12 sm:pb-16 md:pb-20 lg:pb-24">
        <article className="mx-auto max-w-[42rem] flow-root">
          <header className="mb-12 sm:mb-14 text-center sm:text-left mt-6 sm:mt-8 md:mt-10 lg:mt-14 xl:mt-16">
            <h1 className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl font-semibold text-[#1A3C34] tracking-tight leading-tight mb-4">
              {c.h1}
            </h1>
            <p className="text-lg sm:text-xl leading-relaxed text-stone-600 max-w-2xl mx-auto sm:mx-0">
              {c.tagline}
            </p>
          </header>

          <div className="space-y-12 sm:space-y-14">
            <section className="space-y-5">
              {c.intro.map((para, i) => (
                <RichParagraph key={`intro-${i}`} segments={para} locale={locale} />
              ))}
              <QuickLinksSection title={c.quickLinks.title} links={c.quickLinks.links} locale={locale} />
            </section>

            <section className="space-y-5 pt-2 border-t border-stone-200/90">
              <SectionTitle>{c.whatWeBelieve.title}</SectionTitle>
              <div className="space-y-5">
                {c.whatWeBelieve.paragraphs.map((p, i) => (
                  <Body key={`believe-${i}`}>{p}</Body>
                ))}
              </div>
              <BulletList items={c.whatWeBelieve.bullets} />
            </section>

            <section className="space-y-5 pt-2 border-t border-stone-200/90">
              <SectionTitle>{c.supportingSellers.title}</SectionTitle>
              <div className="space-y-5">
                {c.supportingSellers.paragraphs.map((p, i) => (
                  <Body key={`sellers-${i}`}>{p}</Body>
                ))}
              </div>
            </section>

            <section className="space-y-5 pt-2 border-t border-stone-200/90">
              <SectionTitle>{c.startupGrowing.title}</SectionTitle>
              <div className="space-y-5">
                {c.startupGrowing.paragraphs.map((p, i) => (
                  <Body key={`startup-${i}`}>{p}</Body>
                ))}
              </div>
            </section>

            <section className="space-y-5 pt-2 border-t border-stone-200/90">
              <SectionTitle>{c.whatWeAreBuilding.title}</SectionTitle>
              <Body>{c.whatWeAreBuilding.intro}</Body>
              <BulletList items={c.whatWeAreBuilding.bullets} />
              <div className="space-y-5 pt-2">
                {c.whatWeAreBuilding.closing.map((p, i) => (
                  <Body key={`building-${i}`}>{p}</Body>
                ))}
              </div>
            </section>

            <section className="space-y-5 pt-2 border-t border-stone-200/90">
              <SectionTitle>{c.whyItMatters.title}</SectionTitle>
              <div className="space-y-5">
                {c.whyItMatters.paragraphs.map((p, i) => (
                  <Body key={`matters-${i}`}>{p}</Body>
                ))}
              </div>
            </section>

            <section className="space-y-5 pt-2 border-t border-stone-200/90">
              <SectionTitle>{c.platformUpdates.title}</SectionTitle>
              <div className="rounded-2xl border border-[#ebe6e0] bg-white p-5 sm:p-7 shadow-[var(--shadow)] space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <p className="text-[17px] sm:text-lg leading-[1.75] text-[#2d2a26] flex-1 min-w-0">
                    {c.platformUpdates.snippetIntro}
                  </p>
                  <div className="shrink-0 rounded-xl bg-[#f9f5f0] border border-stone-200/80 px-4 py-2.5 text-sm text-stone-700 lg:text-right">
                    <span className="text-stone-500 font-medium">
                      {c.platformUpdates.lastUpdatedLabel}
                    </span>
                    <time
                      dateTime={c.platformUpdates.lastUpdatedIso}
                      className="block sm:inline sm:ml-2 font-semibold text-[#1A3C34] tabular-nums"
                    >
                      {c.platformUpdates.lastUpdatedDisplay}
                    </time>
                  </div>
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-family-display)] text-lg font-semibold text-[#1A3C34] mb-3">
                    {c.platformUpdates.highlightsTitle}
                  </h3>
                  <BulletList items={c.platformUpdates.highlights} />
                </div>
                <AboutNewsletterSignup
                  copy={{
                    newsletterTitle: c.platformUpdates.newsletterTitle,
                    newsletterHint: c.platformUpdates.newsletterHint,
                    emailPlaceholder: c.platformUpdates.emailPlaceholder,
                    joinButton: c.platformUpdates.joinButton,
                    newsletterSubscribing: c.platformUpdates.newsletterSubscribing,
                    newsletterSuccess: c.platformUpdates.newsletterSuccess,
                    newsletterAlreadySubscribed: c.platformUpdates.newsletterAlreadySubscribed,
                    newsletterError: c.platformUpdates.newsletterError,
                    newsletterInvalidEmail: c.platformUpdates.newsletterInvalidEmail,
                  }}
                />
              </div>
            </section>

            <section className="space-y-5 pt-2 border-t border-stone-200/90">
              <SectionTitle>{c.lookingAhead.title}</SectionTitle>
              <div className="space-y-5">
                {c.lookingAhead.paragraphs.map((p, i) => (
                  <Body key={`ahead-${i}`}>{p}</Body>
                ))}
              </div>
            </section>

            <section className="pt-2 border-t border-stone-200/90">
              <SectionTitle>{c.contact.title}</SectionTitle>
              <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-[var(--shadow)] border border-[#ebe6e0] space-y-5 mb-8 sm:mb-10">
                <RichParagraph segments={c.contact.intro} locale={locale} />
                <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                  {c.contact.moreLinksTitle}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {c.contact.moreLinks.map((item) => (
                    <li key={item.href + item.label}>
                      <Link
                        href={`/${locale}${item.href}`}
                        className="inline-flex items-center rounded-full border border-stone-200 bg-[#fdfbf9] px-3 py-1.5 text-sm font-medium text-[#1A3C34] hover:border-[#C5A059]/60 hover:bg-[#f9f5f0] transition-colors cursor-pointer"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="space-y-3 pt-3 border-t border-stone-100">
                  <p className="text-[17px] sm:text-lg leading-[1.75] text-[#2d2a26]">
                    <span className="font-semibold text-[#1A3C34]">{c.contact.websiteLabel}</span>{' '}
                    <a
                      href={c.contact.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={contactFooterLinkClass}
                    >
                      {c.contact.websiteDisplay}
                    </a>
                  </p>
                  <p className="text-[17px] sm:text-lg leading-[1.75] text-[#2d2a26]">
                    <span className="font-semibold text-[#1A3C34]">{c.contact.partnerPortalLabel}</span>{' '}
                    <Link
                      href={`/${locale}/partner/login`}
                      className={contactFooterLinkClass}
                    >
                      {c.contact.partnerPortalLinkText}
                    </Link>
                  </p>
                </div>
              </div>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}
