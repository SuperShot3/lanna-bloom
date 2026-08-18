/**
 * Catalog table primary keys are uuid. Order line items may store synthetic
 * ids (`custom-order-request`, `pay-link`) or legacy Sanity ids — querying
 * those against a uuid column raises Postgres 22P02 and used to 500 order pages.
 */
export const CATALOG_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCatalogUuid(value: string | null | undefined): boolean {
  const id = value?.trim() ?? '';
  return id.length > 0 && CATALOG_UUID_RE.test(id);
}

export function isInvalidUuidQueryError(
  error: { code?: string | null; message?: string | null } | null | undefined
): boolean {
  if (!error) return false;
  if (error.code === '22P02') return true;
  return /invalid input syntax for type uuid/i.test(error.message ?? '');
}
