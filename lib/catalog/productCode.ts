/** Public catalog product code: LB-001, LB-002, … (LB-1000 after 999). */
export const CATALOG_PRODUCT_CODE_RE = /^LB-[0-9]{3,}$/;

export function formatCatalogProductCode(n: number): string {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error('product code sequence must be a positive integer');
  }
  const body = n < 10 ? `00${n}` : n < 100 ? `0${n}` : String(n);
  return `LB-${body}`;
}

export function isCatalogProductCode(value: string | null | undefined): boolean {
  return CATALOG_PRODUCT_CODE_RE.test(value?.trim() ?? '');
}

/** JSON-LD sku / feed mpn: prefer the public code, fall back to catalog id. */
export function catalogProductCodeOrId(product: {
  productCode?: string | null;
  id: string;
}): string {
  const code = product.productCode?.trim();
  return code || product.id;
}

export function feedMpn(productCode?: string | null): string {
  return productCode?.trim() ?? '';
}

export function feedIdentifierExists(mpn: string): 'yes' | 'no' {
  return mpn ? 'yes' : 'no';
}
