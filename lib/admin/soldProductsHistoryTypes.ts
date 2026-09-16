import type { CatalogStoredImage } from '@/lib/catalog/types';

export type SoldProductEntityType = 'bouquet' | 'product';

export type SoldProductHistorySaleRow = {
  order_id: string;
  item_id: string;
  paid_at: string | null;
  price: number | null;
  cost: number | null;
  shop_id: string | null;
  shop_name: string | null;
  image_snapshot: string | null;
  recipient_name: string | null;
  purchase_photo_path: string | null;
  purchase_photo_url: string | null;
  delivery_photo_path: string | null;
  delivery_photo_url: string | null;
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
  last_cost: number | null;
  last_shop_name: string | null;
  sold_history_notes: string | null;
  sold_history_images: CatalogStoredImage[];
  history: SoldProductHistorySaleRow[];
};

export type SoldProductsHistoryResponse = {
  groups: SoldProductHistoryGroup[];
};
