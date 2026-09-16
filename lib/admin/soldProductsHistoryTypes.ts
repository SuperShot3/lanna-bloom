import type { CatalogStoredImage } from '@/lib/catalog/types';

export type SoldProductEntityType = 'bouquet' | 'product';

export type SoldProductHistorySaleRow = {
  order_id: string;
  paid_at: string | null;
  price: number | null;
  shop_id: string | null;
  shop_name: string | null;
  image_snapshot: string | null;
};

export type SoldProductHistoryGroup = {
  entity_type: SoldProductEntityType;
  product_id: string;
  is_orphaned: boolean;
  name: string;
  thumbnail_url: string | null;
  times_sold: number;
  last_sold_at: string | null;
  last_sold_price: number | null;
  sold_history_notes: string | null;
  sold_history_images: CatalogStoredImage[];
  history: SoldProductHistorySaleRow[];
};

export type SoldProductsHistoryResponse = {
  groups: SoldProductHistoryGroup[];
};
