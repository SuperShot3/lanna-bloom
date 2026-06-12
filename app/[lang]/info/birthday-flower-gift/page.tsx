import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Bouquet } from '@/lib/bouquets';
import { getBaseUrl } from '@/lib/orders';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { getBouquetBySlugFromSanity } from '@/lib/sanity';
import { BouquetCard } from '@/components/BouquetCard';
import { MessengerOrderButtons } from '@/components/MessengerOrderButtons';
import { GuideFaq } from '../_components/GuideFaq';

const BOUQUET_SECTIONS = [
  {
    slug: 'sunset-velvet-grand-bouquet',
    fallbackNameEn: 'Sunset Velvet Grand Bouquet',
    heading: 'When the Birthday Deserves a Bold Statement',
    paragraphs: [
      'Milestone years and surprise parties call for a gift that matches big energy.',
      'Choose a bouquet that reads confident and celebratory from the first glance.',
    ],
    whyItFits:
      'Warm, rich presence makes the day feel like a main event-not an afterthought.',
    sectionMatch:
      'Bold milestone birthdays and evening celebrations.',
  },
  {
    slug: 'crimson-and-clementine-luxury-bouquet',
    fallbackNameEn: 'Crimson & Clementine Luxury Bouquet',
    heading: 'Luxury Birthday Flowers for Vibrant, Modern Celebrations',
    paragraphs: [
      'Some birthdays call for citrus-bright confidence-not whisper-soft pastels.',
      'If your recipient loves fashion-forward color, steer toward a bouquet that feels alive.',
    ],
    whyItFits:
      'Great for recipients who light up a room and love energetic, modern luxury.',
    sectionMatch:
      'Bright personalities and lively birthday gatherings.',
  },
  {
    slug: 'premium-red-rose-and-white-lily-bouquet',
    fallbackNameEn: 'Premium Red Rose and White Lily Bouquet',
    heading: 'Timeless Birthday Flower Gift Style You Can Trust',
    paragraphs: [
      'When you need a safe-yet-stunning choice, lean on pairing that never goes out of style.',
      'You still feel thoughtful-just without taking a big creative risk.',
    ],
    subheading: 'Parents, mentors, and polished dinner parties',
    subParagraphs: [
      'These recipients often appreciate restraint and elegance over spectacle.',
    ],
    whyItFits:
      'A graceful balance of romance and refinement when you want to impress without guessing.',
    sectionMatch:
      'Parents, colleagues, or anyone who prefers timeless style.',
  },
  {
    slug: 'ruby-romance-mixed-rose-and-celosia-bouquet',
    fallbackNameEn: 'Ruby Romance Mixed Rose & Celosia Bouquet',
    heading: 'Romantic Birthday Bouquets for Partners You Cherish',
    paragraphs: [
      'Romantic gifting is less about size and more about intimacy.',
      'Texture and depth signal that you notice the little things-not only the big day.',
    ],
    whyItFits:
      'Depth and texture read as thoughtful-perfect when the birthday is also an emotional milestone.',
    sectionMatch:
      'Partners and close loved ones sharing a romantic moment.',
  },
] as const;

const faqItems = [
  {
    q: 'How do I pick a birthday flower gift if I barely know their taste?',
    a: 'Choose the Premium Red Rose and White Lily Bouquet. Classic pairings feel intentional and work across many ages and settings.',
  },
  {
    q: 'Which bouquet feels the most celebratory and bold?',
    a: 'Sunset Velvet Grand Bouquet leans into drama and presence-ideal when you want the gift to feel like the centerpiece of the day.',
  },
  {
    q: 'What if they love color but not traditional romance?',
    a: 'Crimson & Clementine Luxury Bouquet reads joyful and confident without leaning too soft or fussy.',
  },
  {
    q: 'Can I shop straight from this guide?',
    a: 'Yes. Where the bouquet is published, you get our normal catalog tile beside the story. Otherwise use the Recommended link to open the product page.',
  },
  {
    q: 'Which pick is best for a partner’s birthday?',
    a: 'Ruby Romance Mixed Rose & Celosia Bouquet is the most romantic choice in this lineup when you want warmth and intimacy.',
  },
] as const;

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const { lang } = params;
  if (!isValidLocale(lang)) return { title: 'Lanna Bloom' };
  const base = getBaseUrl();
  const title =
    'Birthday Flower Gift Guide: 4 Luxury Bouquets | Lanna Bloom';
  const description =
    'Find a memorable birthday flower gift: compare four luxury bouquets-bold sunset, vivid citrus, timeless roses & lilies, romantic ruby-then shop online.';

  return {
    title,
    description,
    alternates: {
      canonical: `${base}/${lang}/info/birthday-flower-gift`,
    },
    openGraph: {
      title: 'New Birthday Flower Gifts Worth Sending This Year',
      description:
        'Four luxury birthday bouquets with personality-tap through and order in minutes.',
      url: `${base}/${lang}/info/birthday-flower-gift`,
      type: 'article',
    },
  };
}

export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'th' }];
}

function bouquetDisplayName(
  bouquet: Bouquet | null,
  locale: Locale,
  fallbackEn: string
): string {
  if (!bouquet) return fallbackEn;
  const th = bouquet.nameTh?.trim();
  return locale === 'th' && th ? th : bouquet.nameEn;
}

export default async function BirthdayFlowerGiftGuidePage({
  params,
}: {
  params: { lang: string };
}) {
  const { lang } = params;
  if (!isValidLocale(lang)) notFound();
  const locale = lang as Locale;

  const catalogBirthdayHref = `/${lang}/catalog?occasion=birthday`;
  const catalogHref = `/${lang}/catalog`;

  const bouquets = await Promise.all(
    BOUQUET_SECTIONS.map((s) => getBouquetBySlugFromSanity(s.slug))
  );

  return (
    <div className="guide-page">
      <div className="container guide-content-max">
        <section className="guide-hero" aria-labelledby="birthday-guide-h1">
          <p className="guide-eyebrow">New arrivals · Birthday gifting</p>
          <h1 id="birthday-guide-h1" className="guide-h1">
            Birthday Flower Gift Ideas: Four Luxury Bouquets to Send Now
          </h1>
        </section>

        <section className="guide-section guide-intro-band" aria-labelledby="birthday-intro-title">
          <h2 id="birthday-intro-title" className="sr-only">
            Introduction
          </h2>
          <p className="guide-section-lede">
            The best birthday flower gift speaks to who they are-not only what is trending.
            Choose by mood, then scroll-each bouquet sits beside its story so you can compare while
            you read.
          </p>
        </section>

        <section className="guide-section" aria-labelledby="birthday-h2-mood">
          <h2 id="birthday-h2-mood" className="popular-title">
            Start With Mood Before You Pick a Birthday Bouquet
          </h2>
          <p className="guide-body-text">
            Ask yourself one question: do they love being surprised by drama, or soothed by
            classics? That single answer narrows your list faster than scrolling every arrangement.
          </p>
          <p className="guide-body-text">
            When you align mood with bouquet personality, your{' '}
            <strong className="guide-emphasis">birthday flower gift</strong> feels deliberate.
            That is the difference between nice and unforgettable.
          </p>
        </section>

        <section className="guide-section" aria-labelledby="birthday-details-heading">
          <h2 id="birthday-details-heading" className="popular-title">
            Meet Each Birthday Bouquet
          </h2>
          <p className="guide-body-text">
            When a bouquet is live in our catalog, you see the same shop tile as everywhere else on
            the site-only our standard card is used here. If you do not see a tile yet, follow the
            Recommended link below that section.
          </p>

          {BOUQUET_SECTIONS.map((section, i) => {
            const bouquet = bouquets[i];
            const displayName = bouquetDisplayName(
              bouquet,
              locale,
              section.fallbackNameEn
            );
            const catalogPath = `/${locale}/catalog/${section.slug}`;

            return (
              <div key={section.slug} className="guide-bouquet-detail-block">
                <div
                  className={`guide-bouquet-detail-layout${bouquet ? '' : ' guide-bouquet-detail-layout--text-only'}`}
                >
                  <div className="guide-bouquet-detail-copy">
                    <h3 id={`bouquet-section-${section.slug}`} className="guide-detail-title">
                      {section.heading}
                    </h3>
                    {section.paragraphs.map((text, idx) => (
                      <p key={`${section.slug}-p-${idx}`} className="guide-body-text">
                        {text}
                      </p>
                    ))}
                    {'subheading' in section && section.subheading ? (
                      <>
                        <h4 className="guide-subheading">{section.subheading}</h4>
                        {section.subParagraphs?.map((text, idx) => (
                          <p key={`${section.slug}-sub-${idx}`} className="guide-body-text">
                            {text}
                          </p>
                        ))}
                      </>
                    ) : null}

                    <blockquote className="guide-inline-callout guide-inline-callout--in-detail-copy">
                      <p>
                        <strong>Recommended:</strong>{' '}
                        <Link href={catalogPath} className="guide-browse-link">
                          {displayName}
                        </Link>
                      </p>
                      <p className="guide-inline-callout-why">
                        Why it fits: {section.whyItFits}
                      </p>
                    </blockquote>
                  </div>

                  {bouquet ? (
                    <aside
                      className="guide-bouquet-detail-aside"
                      aria-label={
                        locale === 'th'
                          ? `ช่อดอกไม้ สำหรับ ${section.fallbackNameEn}`
                          : `Bouquet: ${section.fallbackNameEn}`
                      }
                    >
                      <div className="guide-bouquet-slot">
                        <BouquetCard
                          bouquet={bouquet}
                          lang={locale}
                          showHoverPanel={false}
                        />
                      </div>
                    </aside>
                  ) : null}
                </div>

                <p className="guide-body-text guide-match-note">
                  <strong>Why this product matches this section:</strong>{' '}
                  {section.sectionMatch}
                </p>
              </div>
            );
          })}
        </section>

        <section className="guide-section" aria-labelledby="birthday-h2-compare">
          <h2 id="birthday-h2-compare" className="popular-title">
            Birthday Flower Gift at a Glance: Which One Fits?
          </h2>
          <p className="guide-body-text">
            Use this snapshot if you are deciding in under a minute-each line connects mood to
            bouquet.
          </p>
          <ul className="guide-highlights">
            <li>
              <strong>Most dramatic:</strong>{' '}
              <Link
                href={`/${locale}/catalog/${BOUQUET_SECTIONS[0].slug}`}
                className="guide-browse-link"
              >
                Sunset Velvet Grand Bouquet
              </Link>
            </li>
            <li>
              <strong>Most vivid:</strong>{' '}
              <Link
                href={`/${locale}/catalog/${BOUQUET_SECTIONS[1].slug}`}
                className="guide-browse-link"
              >
                Crimson &amp; Clementine Luxury Bouquet
              </Link>
            </li>
            <li>
              <strong>Most timeless:</strong>{' '}
              <Link
                href={`/${locale}/catalog/${BOUQUET_SECTIONS[2].slug}`}
                className="guide-browse-link"
              >
                Premium Red Rose and White Lily Bouquet
              </Link>
            </li>
            <li>
              <strong>Most romantic:</strong>{' '}
              <Link
                href={`/${locale}/catalog/${BOUQUET_SECTIONS[3].slug}`}
                className="guide-browse-link"
              >
                Ruby Romance Mixed Rose &amp; Celosia Bouquet
              </Link>
            </li>
          </ul>
          <p className="guide-body-text">
            Still exploring? Visit our{' '}
            <Link href={catalogBirthdayHref} className="guide-browse-link">
              birthday flower selection
            </Link>{' '}
            or open the{' '}
            <Link href={catalogHref} className="guide-browse-link">
              full catalog
            </Link>{' '}
            for more inspiration.
          </p>
        </section>

        <GuideFaq faq={faqItems} title="Frequently asked questions" />

        <section className="guide-section guide-final-cta" aria-labelledby="birthday-final-cta-heading">
          <h2 id="birthday-final-cta-heading" className="popular-title">
            Ready to Send the Perfect Birthday Flower Gift?
          </h2>
          <p className="guide-final-cta-copy">
            You already know the mood and the recipient-pick the bouquet that matches, then
            checkout from the product page. Your thoughtful birthday flower gift is only a few taps
            away.
          </p>
          <p className="guide-browse">
            <Link href={catalogBirthdayHref} className="guide-browse-link">
              Browse birthday flowers
            </Link>
          </p>
          <div className="guide-final-order-via">
            <MessengerOrderButtons
              lang={locale}
              contactOnly
              pageLocation="guide"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
