/**
 * Import homepage hero + carousel from Sanity siteSettings → catalog_site_settings.
 * Used by scripts/import-hero-from-sanity.ts and admin importHeroFromSanityAction.
 */
import { createClient, type SanityClient } from '@sanity/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import imageUrlBuilder from '@sanity/image-url';
import {
  buildCatalogImageRecord,
  type CatalogSupabaseClient,
  uploadBufferToCatalog,
} from '@/lib/catalog/storage';
import type { CatalogStoredImage } from '@/lib/catalog/types';

export const SITE_SETTINGS_QUERY = `*[_type == "siteSettings"][0] { heroImage, heroCarouselImages }`;

export type SanityHeroImage = {
  _key?: string;
  alt?: string;
  asset?: { _ref?: string };
  format?: string;
  isPrimary?: boolean;
};

export type ImportHeroFromSanityResult = {
  imported: boolean;
  heroCount: number;
  carouselCount: number;
  message: string;
};

function contentTypeForPath(storagePath: string): string {
  if (storagePath.endsWith('.webp')) return 'image/webp';
  if (storagePath.endsWith('.png')) return 'image/png';
  return 'image/jpeg';
}

async function downloadUrl(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function migrateSanityImages(
  supabase: CatalogSupabaseClient,
  projectId: string,
  dataset: string,
  entityFolder: string,
  entityId: string,
  images: SanityHeroImage[] | undefined,
  fallbackAlt: string,
  existing: CatalogStoredImage[] | undefined,
  dryRun: boolean
): Promise<CatalogStoredImage[]> {
  if (existing?.length && existing.every((i) => i.storage_path)) {
    return existing;
  }
  if (!images?.length) return [];

  const builder = imageUrlBuilder({ projectId, dataset });
  const out: CatalogStoredImage[] = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!img.asset?._ref) continue;
    const url = builder.image(img).width(1200).url();
    const ext = 'jpg';
    const storagePath = `${entityFolder}/${entityId}/${i}.${ext}`;
    const alt = img.alt?.trim() || fallbackAlt;

    if (!dryRun) {
      const buffer = await downloadUrl(url);
      await uploadBufferToCatalog(supabase, storagePath, buffer, contentTypeForPath(storagePath));
    }

    out.push(
      dryRun
        ? { storage_path: storagePath, alt, sort_order: i, is_primary: i === 0 }
        : buildCatalogImageRecord(supabase, storagePath, {
            alt,
            format: 'source',
            is_primary: img.isPrimary === true || i === 0,
            sort_order: i,
          })
    );
  }

  return out;
}

export function createSanityClientForHeroImport(): SanityClient {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || 'production';
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId) throw new Error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID');
  if (!token) throw new Error('Missing SANITY_API_WRITE_TOKEN');
  return createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false });
}

export async function importHeroFromSanity(
  supabase: SupabaseClient,
  options?: { dryRun?: boolean; sanity?: SanityClient }
): Promise<ImportHeroFromSanityResult> {
  const dryRun = options?.dryRun === true;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || 'production';
  if (!projectId) throw new Error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID');

  const sanity = options?.sanity ?? createSanityClientForHeroImport();
  const siteSettings = await sanity.fetch<{
    heroImage?: SanityHeroImage;
    heroCarouselImages?: SanityHeroImage[];
  } | null>(SITE_SETTINGS_QUERY);

  if (!siteSettings) {
    return {
      imported: false,
      heroCount: 0,
      carouselCount: 0,
      message: 'No siteSettings document found in Sanity.',
    };
  }

  const catalogSupabase = supabase as CatalogSupabaseClient;

  const { data: existingSettings } = await supabase
    .from('catalog_site_settings')
    .select('hero_image, hero_carousel_images')
    .eq('id', 'default')
    .maybeSingle();

  const existingHero = existingSettings?.hero_image as CatalogStoredImage | null;
  const existingCarousel = (existingSettings?.hero_carousel_images ?? []) as CatalogStoredImage[];

  const heroImages = siteSettings.heroImage
    ? await migrateSanityImages(
        catalogSupabase,
        projectId,
        dataset,
        'site-settings',
        'default',
        [siteSettings.heroImage],
        'Hero',
        existingHero?.storage_path ? [existingHero] : undefined,
        dryRun
      )
    : [];

  const carouselImages = await migrateSanityImages(
    catalogSupabase,
    projectId,
    dataset,
    'site-settings',
    'default-carousel',
    siteSettings.heroCarouselImages,
    'Hero carousel',
    existingCarousel.length ? existingCarousel : undefined,
    dryRun
  );

  if (!dryRun) {
    const { error } = await supabase.from('catalog_site_settings').upsert({
      id: 'default',
      hero_image: heroImages[0] ?? existingHero ?? null,
      hero_carousel_images: carouselImages.length ? carouselImages : existingCarousel,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Site settings: ${error.message}`);
  }

  const heroCount = heroImages.length || (existingHero?.storage_path ? 1 : 0);
  const carouselCount = carouselImages.length || existingCarousel.length;

  return {
    imported: true,
    heroCount,
    carouselCount,
    message: dryRun
      ? `Dry run: would import hero (${heroImages.length}) and carousel (${carouselImages.length}) images.`
      : `Imported hero (${heroImages.length || (existingHero ? 'kept existing' : 'none')}) and carousel (${carouselImages.length || existingCarousel.length}) images.`,
  };
}
