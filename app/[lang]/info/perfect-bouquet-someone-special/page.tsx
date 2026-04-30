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
    slug: 'red-rose-romance',
    fallbackNameEn: 'Red Rose Romance',
    heading: {
      en: 'For Romantic Moments That Need a Clear Message',
      th: 'สำหรับช่วงเวลาโรแมนติกที่ต้องการสื่อความหมายชัดเจน',
    },
    paragraphs: {
      en: [
        'When your bouquet should say love and admiration right away, classic red tones are the easiest choice.',
        'This style works for anniversaries, meaningful dates, and heartfelt surprises.',
      ],
      th: [
        'หากคุณต้องการให้ช่อดอกไม้สื่อถึงความรักและความชื่นชมอย่างชัดเจน โทนแดงคลาสสิกคือคำตอบที่ง่ายและตรงใจ',
        'เหมาะกับวันครบรอบ วันพิเศษ และเซอร์ไพรส์ที่อยากให้คนรับรู้สึกพิเศษทันที',
      ],
    },
    whyItFits: {
      en: 'A confident romantic signal that feels timeless, not complicated.',
      th: 'สื่อความโรแมนติกได้ชัดเจน ดูคลาสสิก และไม่ซับซ้อน',
    },
    sectionMatch: {
      en: 'Best for partners, anniversaries, and heartfelt occasions.',
      th: 'เหมาะสำหรับคนรัก วันครบรอบ และโอกาสที่ต้องการความอบอุ่นทางใจ',
    },
  },
  {
    slug: 'pastel-dream-bouquet',
    fallbackNameEn: 'Pastel Dream Bouquet',
    heading: {
      en: 'For Gentle, Sweet, and Thoughtful Gifting',
      th: 'สำหรับของขวัญที่อ่อนโยน หวานละมุน และใส่ใจ',
    },
    paragraphs: {
      en: [
        'Pastel bouquets are a strong pick when you want a soft and friendly feeling.',
        'They suit birthdays, thank-you gifts, and moments when you want your gesture to feel light and elegant.',
      ],
      th: [
        'ช่อดอกไม้โทนพาสเทลเหมาะมากเมื่อคุณอยากให้บรรยากาศดูนุ่มนวลและเป็นมิตร',
        'เหมาะกับวันเกิด ของขอบคุณ และโอกาสที่อยากให้ของขวัญดูสุภาพแต่มีความหมาย',
      ],
    },
    whyItFits: {
      en: 'Soft tones make your gift feel warm and personal without being too intense.',
      th: 'โทนสีอ่อนช่วยให้ของขวัญดูอบอุ่นและเป็นส่วนตัว โดยไม่ดูแรงเกินไป',
    },
    sectionMatch: {
      en: 'Best for close friends, family, and sweet celebrations.',
      th: 'เหมาะสำหรับเพื่อนสนิท คนในครอบครัว และงานฉลองบรรยากาศอบอุ่น',
    },
  },
  {
    slug: 'sunflower-bouquet',
    fallbackNameEn: 'Sunflower Bouquet',
    heading: {
      en: 'For Bright Energy and Cheerful Personalities',
      th: 'สำหรับพลังสดใสและคนที่มีบุคลิกสนุกสนาน',
    },
    paragraphs: {
      en: [
        'If they love sunny colors and upbeat vibes, choose a bouquet that feels joyful from the first glance.',
        'Sunflowers are ideal for congratulations, new beginnings, and uplifting support.',
      ],
      th: [
        'ถ้าคนรับชอบสีสดและพลังบวก ช่อดอกไม้ที่ดูร่าเริงตั้งแต่แรกเห็นจะเหมาะที่สุด',
        'ดอกทานตะวันเหมาะกับการแสดงความยินดี การเริ่มต้นใหม่ และการส่งกำลังใจ',
      ],
    },
    whyItFits: {
      en: 'A bright bouquet that instantly creates a positive mood.',
      th: 'เป็นช่อดอกไม้ที่ช่วยสร้างความรู้สึกสดใสและพลังบวกได้ทันที',
    },
    sectionMatch: {
      en: 'Best for birthdays, congratulations, and cheerful surprises.',
      th: 'เหมาะกับวันเกิด การแสดงความยินดี และเซอร์ไพรส์ที่อยากให้ยิ้มได้',
    },
  },
] as const;

const FAQ = {
  en: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'How do I choose if I do not know their favorite flower?',
        a: 'Start with the occasion and mood. A soft pastel bouquet is usually a safe and thoughtful option.',
      },
      {
        q: 'Should I pick by flower type or by color?',
        a: 'Color is often the faster decision tool. It helps you match the emotion you want to send.',
      },
      {
        q: 'Is a romantic bouquet only for anniversaries?',
        a: 'Not at all. Romantic bouquets can also work for meaningful birthdays and heartfelt surprises.',
      },
      {
        q: 'Can I shop directly from this guide?',
        a: 'Yes. Each section has a recommended product link, and many sections also show a live bouquet card.',
      },
    ],
  },
  th: {
    title: 'คำถามที่พบบ่อย',
    items: [
      {
        q: 'ถ้าไม่รู้ว่าคนรับชอบดอกไม้อะไร ควรเลือกอย่างไร?',
        a: 'เริ่มจากโอกาสและอารมณ์ที่อยากสื่อก่อน ช่อโทนพาสเทลมักเป็นตัวเลือกที่ปลอดภัยและดูใส่ใจ',
      },
      {
        q: 'ควรเลือกจากชนิดดอกไม้หรือสีเป็นหลัก?',
        a: 'การเลือกจากสีมักตัดสินใจได้เร็วกว่า เพราะช่วยกำหนดความรู้สึกที่ต้องการสื่อได้ชัดเจน',
      },
      {
        q: 'ช่อโรแมนติกเหมาะแค่วันครบรอบเท่านั้นไหม?',
        a: 'ไม่จำเป็น ช่อโรแมนติกใช้ได้กับวันเกิดพิเศษหรือโอกาสที่ต้องการสื่อความรู้สึกจากใจ',
      },
      {
        q: 'สามารถสั่งซื้อจากหน้านี้ได้เลยไหม?',
        a: 'ได้เลย แต่ละส่วนมีลิงก์สินค้าแนะนำ และหลายส่วนจะแสดงการ์ดสินค้าให้เลือกต่อได้ทันที',
      },
    ],
  },
} as const;

const COPY = {
  en: {
    title: 'How to Choose the Perfect Bouquet for Someone Special',
    eyebrow: 'Flower guide · Thoughtful gifting',
    description:
      'Learn how to choose the perfect bouquet for someone special with practical tips, bouquet comparisons, and direct links to shop.',
    ogTitle: 'A Simple Guide to the Perfect Bouquet',
    ogDescription:
      'Compare bouquet styles by mood, recipient, and occasion to pick a meaningful gift in minutes.',
    intro:
      'The best bouquet is not always the biggest one. It is the one that matches the person, the occasion, and the feeling you want to send.',
    sectionMoodTitle: 'Start With Personality and Occasion',
    sectionMoodP1:
      'Before choosing flowers, think about who they are. Do they prefer elegant classics, soft romantic tones, or bright playful energy?',
    sectionMoodP2:
      'When bouquet style matches personality, your gift feels intentional and memorable.',
    meetTitle: 'Bouquet Picks by Mood',
    meetIntro:
      'Each recommendation includes a quick reason so you can choose faster with confidence.',
    compareTitle: 'Quick Comparison: Which Bouquet Fits Best?',
    compareIntro:
      'Use this snapshot when you need to decide quickly.',
    highlights: [
      {
        label: 'Most romantic',
        slug: 'red-rose-romance',
        text: 'Red Rose Romance',
      },
      {
        label: 'Most gentle',
        slug: 'pastel-dream-bouquet',
        text: 'Pastel Dream Bouquet',
      },
      {
        label: 'Most cheerful',
        slug: 'sunflower-bouquet',
        text: 'Sunflower Bouquet',
      },
    ],
    exploreText: 'Still exploring? Browse our',
    exploreCatalog: 'full bouquet catalog',
    finalTitle: 'Ready to Send a Meaningful Bouquet?',
    finalBody:
      'Now you know how to choose the perfect bouquet for someone special by matching style, mood, and occasion. Pick the bouquet that feels most like them, then order in a few taps.',
    browseLabel: 'Browse all bouquets',
    recommended: 'Recommended:',
    whyItFits: 'Why it fits:',
    sectionMatchLabel: 'Why this product matches this section:',
  },
  th: {
    title: 'วิธีเลือกช่อดอกไม้ที่ใช่สำหรับคนพิเศษ',
    eyebrow: 'คู่มือดอกไม้ · เลือกของขวัญอย่างใส่ใจ',
    description:
      'เรียนรู้วิธีเลือกช่อดอกไม้ที่ใช่สำหรับคนพิเศษ ด้วยแนวทางเลือกตามบุคลิก โอกาส และความรู้สึกที่อยากส่งต่อ',
    ogTitle: 'คู่มือเลือกช่อดอกไม้ให้คนพิเศษแบบง่ายๆ',
    ogDescription:
      'เปรียบเทียบช่อดอกไม้ตามอารมณ์ บุคลิก และโอกาส เพื่อเลือกของขวัญที่มีความหมายได้เร็วขึ้น',
    intro:
      'ช่อดอกไม้ที่ดีที่สุดไม่จำเป็นต้องใหญ่ที่สุด แต่ต้องตรงกับคนรับ โอกาส และความรู้สึกที่คุณอยากสื่อ',
    sectionMoodTitle: 'เริ่มจากบุคลิกคนรับและโอกาส',
    sectionMoodP1:
      'ก่อนเลือกดอกไม้ ลองนึกถึงบุคลิกของคนพิเศษก่อนว่าเขาชอบความคลาสสิก ความหวานละมุน หรือความสดใสมีพลัง',
    sectionMoodP2:
      'เมื่อสไตล์ช่อดอกไม้ตรงกับตัวตนของคนรับ ของขวัญจะดูตั้งใจและน่าจดจำมากขึ้น',
    meetTitle: 'ช่อดอกไม้แนะนำตามอารมณ์',
    meetIntro:
      'แต่ละตัวเลือกมีเหตุผลสั้นๆ เพื่อช่วยให้คุณตัดสินใจได้เร็วและมั่นใจขึ้น',
    compareTitle: 'สรุปเร็ว: ช่อไหนเหมาะกับใคร?',
    compareIntro:
      'ใช้สรุปนี้เมื่อคุณต้องตัดสินใจในเวลาจำกัด',
    highlights: [
      {
        label: 'โรแมนติกที่สุด',
        slug: 'red-rose-romance',
        text: 'Red Rose Romance',
      },
      {
        label: 'ละมุนที่สุด',
        slug: 'pastel-dream-bouquet',
        text: 'Pastel Dream Bouquet',
      },
      {
        label: 'สดใสที่สุด',
        slug: 'sunflower-bouquet',
        text: 'Sunflower Bouquet',
      },
    ],
    exploreText: 'หากยังเลือกอยู่ สามารถดู',
    exploreCatalog: 'แคตตาล็อกช่อดอกไม้ทั้งหมด',
    finalTitle: 'พร้อมส่งช่อดอกไม้ที่มีความหมายแล้วหรือยัง?',
    finalBody:
      'ตอนนี้คุณสามารถเลือกช่อดอกไม้ที่ใช่สำหรับคนพิเศษได้ง่ายขึ้น เพียงจับคู่สไตล์ อารมณ์ และโอกาสให้เหมาะ แล้วสั่งซื้อได้ทันที',
    browseLabel: 'ดูช่อดอกไม้ทั้งหมด',
    recommended: 'แนะนำ:',
    whyItFits: 'เหตุผลที่เหมาะ:',
    sectionMatchLabel: 'เหตุผลที่ช่อนี้เหมาะกับส่วนนี้:',
  },
} as const;

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const { lang } = params;
  if (!isValidLocale(lang)) return { title: 'Lanna Bloom' };
  const locale = lang as Locale;
  const t = COPY[locale];
  const base = getBaseUrl();
  const canonical = `${base}/${lang}/info/perfect-bouquet-someone-special`;

  return {
    title: `${t.title} | Lanna Bloom`,
    description: t.description,
    alternates: { canonical },
    openGraph: {
      title: t.ogTitle,
      description: t.ogDescription,
      url: canonical,
      type: 'article',
      images: [
        {
          url: `${base}/images_other/roses_colors_landingpage/red_roses.webp`,
          alt: t.title,
        },
      ],
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

export default async function PerfectBouquetGuidePage({
  params,
}: {
  params: { lang: string };
}) {
  const { lang } = params;
  if (!isValidLocale(lang)) notFound();
  const locale = lang as Locale;
  const t = COPY[locale];
  const faq = FAQ[locale];
  const catalogHref = `/${lang}/catalog`;

  const bouquets = await Promise.all(
    BOUQUET_SECTIONS.map((s) => getBouquetBySlugFromSanity(s.slug))
  );

  return (
    <div className="guide-page">
      <div className="container guide-content-max">
        <section className="guide-hero" aria-labelledby="perfect-bouquet-h1">
          <p className="guide-eyebrow">{t.eyebrow}</p>
          <h1 id="perfect-bouquet-h1" className="guide-h1">
            {t.title}
          </h1>
        </section>

        <section className="guide-section guide-intro-band" aria-labelledby="perfect-bouquet-intro">
          <h2 id="perfect-bouquet-intro" className="sr-only">
            Introduction
          </h2>
          <p className="guide-section-lede">{t.intro}</p>
        </section>

        <section className="guide-section" aria-labelledby="perfect-bouquet-mood-title">
          <h2 id="perfect-bouquet-mood-title" className="popular-title">
            {t.sectionMoodTitle}
          </h2>
          <p className="guide-body-text">{t.sectionMoodP1}</p>
          <p className="guide-body-text">{t.sectionMoodP2}</p>
        </section>

        <section className="guide-section" aria-labelledby="perfect-bouquet-meet-title">
          <h2 id="perfect-bouquet-meet-title" className="popular-title">
            {t.meetTitle}
          </h2>
          <p className="guide-body-text">{t.meetIntro}</p>

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
                      {section.heading[locale]}
                    </h3>
                    {section.paragraphs[locale].map((text, idx) => (
                      <p key={`${section.slug}-p-${idx}`} className="guide-body-text">
                        {text}
                      </p>
                    ))}

                    <blockquote className="guide-inline-callout guide-inline-callout--in-detail-copy">
                      <p>
                        <strong>{t.recommended}</strong>{' '}
                        <Link href={catalogPath} className="guide-browse-link">
                          {displayName}
                        </Link>
                      </p>
                      <p className="guide-inline-callout-why">
                        {t.whyItFits} {section.whyItFits[locale]}
                      </p>
                    </blockquote>
                  </div>

                  {bouquet ? (
                    <aside
                      className="guide-bouquet-detail-aside"
                      aria-label={
                        locale === 'th'
                          ? `ช่อดอกไม้ ${displayName}`
                          : `Bouquet: ${displayName}`
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
                  <strong>{t.sectionMatchLabel}</strong> {section.sectionMatch[locale]}
                </p>
              </div>
            );
          })}
        </section>

        <section className="guide-section" aria-labelledby="perfect-bouquet-compare-title">
          <h2 id="perfect-bouquet-compare-title" className="popular-title">
            {t.compareTitle}
          </h2>
          <p className="guide-body-text">{t.compareIntro}</p>
          <ul className="guide-highlights">
            {t.highlights.map((item) => (
              <li key={item.slug}>
                <strong>{item.label}:</strong>{' '}
                <Link href={`/${locale}/catalog/${item.slug}`} className="guide-browse-link">
                  {item.text}
                </Link>
              </li>
            ))}
          </ul>
          <p className="guide-body-text">
            {t.exploreText}{' '}
            <Link href={catalogHref} className="guide-browse-link">
              {t.exploreCatalog}
            </Link>
            .
          </p>
        </section>

        <GuideFaq faq={faq.items} title={faq.title} />

        <section className="guide-section guide-final-cta" aria-labelledby="perfect-bouquet-final-cta">
          <h2 id="perfect-bouquet-final-cta" className="popular-title">
            {t.finalTitle}
          </h2>
          <p className="guide-final-cta-copy">{t.finalBody}</p>
          <p className="guide-browse">
            <Link href={catalogHref} className="guide-browse-link">
              {t.browseLabel}
            </Link>
          </p>
          <div className="guide-final-order-via">
            <MessengerOrderButtons lang={locale} contactOnly pageLocation="guide" />
          </div>
        </section>
      </div>
    </div>
  );
}
