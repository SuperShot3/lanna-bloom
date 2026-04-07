import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ProductPageClient } from './ProductPageClient';
import { ProductDetailClient } from './ProductDetailClient';
import {
  getBouquetBySlugFromSanity,
  getBouquetsFromSanity,
  getPlushyToyBySlugFromSanity,
  getPopularBouquetsFromSanity,
  getProductBySlugFromSanity,
  getProductsFilteredFromSanity,
} from '@/lib/sanity';
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
  if (bouquet) {
    const gifts = await getProductsFilteredFromSanity({ categoryKey: 'gifts' });
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
            <ProductPageClient
              bouquet={bouquet}
              lang={lang as Locale}
              name={name}
              description={description}
              compositionHeading={t.composition}
              compositionText={composition}
              gifts={gifts}
            />
          </div>
        </div>
      </div>
    );
  }

  const plushyToy = await getPlushyToyBySlugFromSanity(params.slug);
  if (plushyToy) {
    const name = lang === 'th' && plushyToy.nameTh ? plushyToy.nameTh : plushyToy.nameEn;
    const description = (lang === 'th' ? plushyToy.descriptionTh : plushyToy.descriptionEn) || '';
    const nav = translations[lang as Locale].nav;
    const catalogHref = `/${lang}/catalog`;
    const suggestedBouquets = await getPopularBouquetsFromSanity(8);

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
            <ProductDetailClient
              product={plushyToy}
              lang={lang as Locale}
              name={name}
              description={description}
              gifts={[]}
              suggestedBouquets={suggestedBouquets}
            />
          </div>
        </div>
      </div>
    );
  }

  const product = await getProductBySlugFromSanity(params.slug);
  if (product) {
    const gifts = await getProductsFilteredFromSanity({ categoryKey: 'gifts' });
    const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
    const description = (lang === 'th' ? product.descriptionTh : product.descriptionEn) || '';
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
            <ProductDetailClient
              product={product}
              lang={lang as Locale}
              name={name}
              description={description}
              gifts={gifts}
            />
          </div>
        </div>
      </div>
    );
  }

  notFound();
}
