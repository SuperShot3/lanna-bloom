import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBaseUrl } from '@/lib/orders';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { getInfoHubGuides } from './_data/articles';
import { InfoCard } from './InfoCard';
import { WeekdayClusterHub } from './WeekdayClusterHub';
import styles from './info.module.css';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const { lang } = params;
  if (!isValidLocale(lang)) return { title: 'Lanna Bloom' };
  const locale = lang as Locale;
  const title =
    locale === 'en'
      ? 'Guides & Info | Lanna Bloom'
      : 'คู่มือและข้อมูล | Lanna Bloom';
  const description =
    locale === 'en'
      ? 'Flower delivery guides, same-day delivery info, and tips for ordering bouquets in Chiang Mai.'
      : 'คู่มือการจัดส่งดอกไม้ ข้อมูลจัดส่งวันเดียว และเคล็ดลับการสั่งช่อดอกไม้ในเชียงใหม่';
  const base = getBaseUrl();
  return {
    title,
    description,
    alternates: {
      canonical: `${base}/${lang}/info`,
    },
  };
}

export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'th' }];
}

export default async function InfoHubPage({
  params,
}: {
  params: { lang: string };
}) {
  const { lang } = params;
  if (!isValidLocale(lang)) notFound();
  const locale = lang as Locale;
  const base = getBaseUrl();
  const basePath = `/${lang}/info`;
  const catalogHref = `/${lang}/catalog`;

  const t =
    locale === 'en'
      ? {
          h1: 'Guides & Info',
          intro:
            'Flower delivery guides, same-day delivery info, and tips for ordering bouquets in Chiang Mai.',
          browseBouquets: 'Browse bouquets',
          allGuides: 'All guides',
          weekdaySeries: 'Thai weekday flowers',
        }
      : {
          h1: 'คู่มือและข้อมูล',
          intro:
            'คู่มือการจัดส่งดอกไม้ ข้อมูลจัดส่งวันเดียว และเคล็ดลับการสั่งช่อดอกไม้ในเชียงใหม่',
          browseBouquets: 'เลือกช่อดอกไม้',
          allGuides: 'คู่มือทั้งหมด',
          weekdaySeries: 'ดอกไม้ตามวันเกิด',
        };

  const guides = getInfoHubGuides();

  return (
    <div className={styles.infoPage}>
      <div className="container">
        <section className={styles.infoHubHero} aria-labelledby="info-hub-title">
          <h1 id="info-hub-title" className={styles.infoHubTitle}>
            {t.h1}
          </h1>
          <p className={styles.infoHubIntro}>{t.intro}</p>
          <p className={styles.infoHubActions}>
            <Link href={catalogHref} className={styles.infoCta}>
              {t.browseBouquets}
            </Link>
          </p>
        </section>

        <section className={styles.infoWeekdaySection} aria-labelledby="info-weekday-series-title">
          <h2 id="info-weekday-series-title" className={styles.infoMoreTitle}>
            {t.weekdaySeries}
          </h2>
          <WeekdayClusterHub lang={lang} basePath={basePath} />
        </section>

        <section className={styles.infoMore} aria-labelledby="info-more-title">
          <h2 id="info-more-title" className={styles.infoMoreTitle}>
            {t.allGuides}
          </h2>
          <div className={styles.infoGrid}>
            {guides.map((article) => (
              <InfoCard
                key={article.slug}
                article={article}
                lang={lang}
                basePath={basePath}
                baseUrl={base}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
