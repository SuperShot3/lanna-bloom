import type { AdminCatalogIndexItem } from '@/lib/catalog/types';
import { catalogShelfItemKey } from './CatalogShelfDirtyContext';

export type CatalogShelfSyncDotState = {
  className: 'is-unsaved' | 'is-draft' | 'is-synced';
  title: string;
};

export function getCatalogShelfSyncDot(
  item: AdminCatalogIndexItem,
  dirtyKeys: ReadonlySet<string>
): CatalogShelfSyncDotState {
  const key = catalogShelfItemKey(item.entityType, item.id);
  if (dirtyKeys.has(key)) {
    return {
      className: 'is-unsaved',
      title: 'Unsaved changes — save draft',
    };
  }
  if (item.hasDraft) {
    return {
      className: 'is-draft',
      title: 'Draft saved — not on website yet',
    };
  }
  return {
    className: 'is-synced',
    title: 'Saved',
  };
}
