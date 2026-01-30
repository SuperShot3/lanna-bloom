import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ProductGallery } from '@/components/ProductGallery';
import { ProductOrderBlock } from '@/components/ProductOrderBlock';
import { getBouquetBySlugFromSanity, getBouquetsFromSanity } from '@/lib/sanity';
import { isValidLocale, locales, type Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

// Revalidate product pages every 60 seconds so Sanity updates appear without rebuild
export const revalidate = 60;

export async function generateStaticParams() {
  const bouquets = await getBouquetsFromSanity();
  return locales.flatMap((lang) =>
    bouquets.map((b) => ({ lang, slug: b.slug }))
  );
}

export const dynamicParams = true;

export default async function ProductPage({
  params,
}: {
  params: { lang: string; slug: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();
  const bouquet = await getBouquetBySlugFromSanity(params.slug);
  if (!bouquet) notFound();

  const name = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
  const description = lang === 'th' ? bouquet.descriptionTh : bouquet.descriptionEn;
  const composition = lang === 'th' ? bouquet.compositionTh : bouquet.compositionEn;
  const t = translations[lang as Locale].product;
  const nav = translations[lang as Locale].nav;
  const catalogHref = `/${lang}/catalog`;

  return (
    <div className="product-page">
      <div className="container product-layout">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href={`/${lang}`}>{nav.home}</Link>
          <span className="sep">/</span>
          <Link href={catalogHref}>{nav.catalog}</Link>
          <span className="sep">/</span>
          <span aria-current="page">{name}</span>
        </nav>
        <div className="product-grid">
          <div className="product-gallery-wrap">
            <ProductGallery images={bouquet.images} name={name} />
          </div>
          <div className="product-info">
            <h1 className="product-title">{name}</h1>
            <p className="product-desc">{description}</p>
            <div className="product-composition">
              <h2 className="composition-heading">{t.composition}</h2>
              <p className="composition-text">{composition}</p>
            </div>
            <ProductOrderBlock bouquet={bouquet} lang={lang as Locale} />
          </div>
        </div>
      </div>
    </div>
  );
}
