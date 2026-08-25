import { translations, type Locale } from '@/lib/i18n';

export function flowerTypeLabel(type: string, catalog: Record<string, string>): string {
  const key = `type${type.charAt(0).toUpperCase() + type.slice(1)}`;
  return catalog[key] ?? type;
}

/** Catalog H1 when a single flower type filter is active, e.g. "Rose Bouquets". */
export function flowerTypeCatalogTitle(type: string, lang: Locale): string {
  const tHome = translations[lang].home;
  const tCatalog = translations[lang].catalog as Record<string, string>;
  return tHome.flowerTypeSectionTitle.replace('{type}', flowerTypeLabel(type, tCatalog));
}
