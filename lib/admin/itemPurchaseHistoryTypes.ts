export type ItemPurchaseHistoryRow = {
  order_id: string;
  paid_at: string | null;
  cost: number;
  size: string | null;
  shop_id: string | null;
  shop_name: string | null;
  same_size: boolean;
  is_current_order: boolean;
  purchase_photo_url: string | null;
};

export type ItemPurchaseHistorySummary = {
  last_cost: number | null;
  last_shop_id: string | null;
  last_shop_name: string | null;
  average: number | null;
  min: number | null;
  max: number | null;
  count: number;
};

export type ItemPurchaseHistoryResponse = {
  summary: ItemPurchaseHistorySummary;
  rows: ItemPurchaseHistoryRow[];
};
