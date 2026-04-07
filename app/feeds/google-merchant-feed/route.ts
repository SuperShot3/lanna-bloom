import { getBouquetsFromSanity, getPlushyToysFilteredFromSanity } from '@/lib/sanity';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://lannabloom.shop';
const BRAND = 'Lanna Bloom';
const SHIPPING = 'TH:TH-50:Standard:350.00 THB';

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
      'shipping',
    ];

    const rows: string[] = [TSV_HEADERS.join('\t')];

    // ── Bouquet rows (one per size option) ──────────────────────────────────
    for (const bouquet of bouquets) {
      const link = `${BASE_URL}/en/catalog/${bouquet.slug}`;
      const allImages = bouquet.images.map(publicImageUrl).filter(Boolean);
      const imageLink = allImages[0];
      if (!imageLink) continue; // Google rejects items without a valid image

      const additionalImages = allImages.slice(1).join(',');
      const baseDesc = sanitise(
        bouquet.descriptionEn || bouquet.compositionEn || `${bouquet.nameEn}. Price includes VAT.`
      );

      for (const option of bouquet.sizes) {
        const availability = option.availability !== false ? 'in_stock' : 'out_of_stock';
        rows.push(
          [
            sanitise(`${bouquet.id}_${option.optionId}`),
            sanitise(`${bouquet.nameEn} — ${option.label}`),
            baseDesc,
            link,
            imageLink,
            additionalImages,
            'new',
            availability,
            formatPrice(option.price),
            BRAND,
            'no',
            sanitise(bouquet.slug),
            'Home & Garden > Plants > Flowers',
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

      const additionalImages = allImages.slice(1).join(',');
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
          additionalImages,
          'new',
          'in_stock',
          formatPrice(toy.price),
          BRAND,
          'no',
          sanitise(toy.slug),
          'Toys & Games > Stuffed Animals',
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
