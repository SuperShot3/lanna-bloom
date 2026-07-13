/**
 * Maps catalog occasion filters to related info guides for cross-linking.
 */

export type CatalogOccasionGuide = {
  href: string;
  hintEn: string;
  hintTh: string;
  linkLabelEn: string;
  linkLabelTh: string;
};

export const CATALOG_OCCASION_GUIDES: Record<string, CatalogOccasionGuide> = {
  birthday: {
    href: '/info/birthday-flower-gift',
    hintEn: 'Unsure which bouquet fits?',
    hintTh: 'ยังไม่แน่ใจว่าช่อไหนเหมาะ?',
    linkLabelEn: 'Gift guide',
    linkLabelTh: 'คู่มือเลือกช่อ',
  },
};

export function getCatalogOccasionGuide(
  occasion: string | undefined
): CatalogOccasionGuide | undefined {
  if (!occasion) return undefined;
  return CATALOG_OCCASION_GUIDES[occasion];
}
