/**
 * Product add-ons (Gift Chocolates, Gift Vase, Teddy Bear) with prices.
 * Used by AddOnsSection, CartContext, and Stripe/order payload.
 */

export interface ProductAddOn {
  id: 'chocolates' | 'vase' | 'teddy';
  nameEn: string;
  nameTh: string;
  price: number;
}

export const ADDONS: ProductAddOn[] = [
  { id: 'chocolates', nameEn: 'Gift Chocolates', nameTh: 'ช็อคโกแลตของขวัญ', price: 350 },
  { id: 'vase', nameEn: 'Gift Vase', nameTh: 'แจกันของขวัญ', price: 450 },
  { id: 'teddy', nameEn: 'Teddy Bear', nameTh: 'ตุ๊กตาหมี', price: 290 },
];

export function getAddOnById(id: ProductAddOn['id']): ProductAddOn | undefined {
  return ADDONS.find((a) => a.id === id);
}

export function getAddOnsTotal(selected: ProductAddOnsSelected): number {
  return ADDONS.reduce((sum, a) => sum + (selected[a.id] ? a.price : 0), 0);
}

export type ProductAddOnsSelected = {
  chocolates?: boolean;
  vase?: boolean;
  teddy?: boolean;
};
