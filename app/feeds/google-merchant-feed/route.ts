import { getBouquetsFromSanity, getPlushyToysFilteredFromSanity } from '@/lib/sanity';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://lannabloom.shop';
const BRAND = 'Lanna Bloom';
// Region must be empty for Thailand — Google only supports ISO 3166-2 region
// codes for US, Australia, and Japan. TH-50 (Chiang Mai) was invalid.
const SHIPPING = 'TH::Standard:350.00 THB';

/** Sanitise a single TSV field: strip tabs and collapse newlines to a space. */
function sanitise(value: string): string {
  return value.replace(/\t/g, ' ').replace(/[\r\n]+/g, ' ').trim();
}

function formatPrice(amount: number): string {
  return `${amount.toFixed(2)} THB`;
}

/** Returns empty string for data-URI placeholders so we can skip the row. */
function publicImageUrl(url: string): string {
  return url.startsWith('data:') ? '' : url;
}

/**
 * Map internal color values to title-cased Google-friendly color names.
 * Multiple colors are joined with "/" per Google's multi-value convention.
 */
function formatColors(colors: string[] | undefined): string {
  if (!colors?.length) return '';
  return colors
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
    .join('/');
}

export async function GET() {
  try {
    const [bouquets, toys] = await Promise.all([
      getBouquetsFromSanity(),
      getPlushyToysFilteredFromSanity({ sort: 'newest' }),
    ]);

    const TSV_HEADERS = [
      'id',
      'title',
      'description',
      'link',
      'image_link',
      'additional_image_link',
      'condition',
      'availability',
      'price',
      'brand',
      'identifier_exists',
      'item_group_id',
      'google_product_category',
      'color',
      'size',
      'custom_label_0',
      'shipping',
    ];

    const rows: string[] = [TSV_HEADERS.join('\t')];

    // ── Bouquet rows (one per size option) ──────────────────────────────────
    for (const bouquet of bouquets) {
      const link = `${BASE_URL}/en/catalog/${bouquet.slug}`;
      const allImages = bouquet.images.map(publicImageUrl).filter(Boolean);
      const imageLink = allImages[0];
      if (!imageLink) continue; // Google rejects items without a valid image

      // Google accepts exactly one URL per additional_image_link field.
      const additionalImage = allImages[1] ?? '';
      const baseDesc = sanitise(
        bouquet.descriptionEn || bouquet.compositionEn || `${bouquet.nameEn}. Price includes VAT.`
      );
      const color = formatColors(bouquet.colors);
      const occasionLabel = bouquet.occasion?.length
        ? sanitise(bouquet.occasion[0])
        : '';

      for (const option of bouquet.sizes) {
        const availability = option.availability !== false ? 'in_stock' : 'out_of_stock';
        rows.push(
          [
            sanitise(`${bouquet.id}_${option.optionId}`),
            sanitise(`${bouquet.nameEn} — ${option.label}`),
            baseDesc,
            link,
            imageLink,
            additionalImage,
            'new',
            availability,
            formatPrice(option.price),
            BRAND,
            'no',
            sanitise(bouquet.slug),
            'Arts & Entertainment > Party & Celebration > Gift Giving > Fresh Cut Flowers',
            color,
            sanitise(option.label),
            occasionLabel,
            SHIPPING,
          ].join('\t')
        );
      }
    }

    // ── Plushy toy rows (one per toy) ────────────────────────────────────────
    for (const toy of toys) {
      const link = `${BASE_URL}/en/catalog/${toy.slug}`;
      const allImages = toy.images.map(publicImageUrl).filter(Boolean);
      const imageLink = allImages[0];
      if (!imageLink) continue; // skip toys without a real product photo

      // Google accepts exactly one URL per additional_image_link field.
      const additionalImage = allImages[1] ?? '';
      const title = toy.sizeLabel
        ? sanitise(`${toy.nameEn} — ${toy.sizeLabel}`)
        : sanitise(toy.nameEn);
      const description = sanitise(
        toy.descriptionEn ||
          `${toy.nameEn}. A soft and cuddly plushy toy, perfect as a gift. Price includes VAT.`
      );

      rows.push(
        [
          sanitise(toy.id),
          title,
          description,
          link,
          imageLink,
          additionalImage,
          'new',
          'in_stock',
          formatPrice(toy.price),
          BRAND,
          'no',
          '',        // no item_group_id — each toy is a single-variant item
          'Toys & Games > Toys > Dolls, Playsets & Toy Figures > Stuffed Animals',
          '',        // color not applicable
          sanitise(toy.sizeLabel ?? ''),
          '',        // no occasion label
          SHIPPING,
        ].join('\t')
      );
    }

    const body = rows.join('\n');

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/tab-separated-values; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    console.error('[Feed] google-merchant-feed generation failed:', err);
    return new Response('Feed generation failed', { status: 500 });
  }
}
