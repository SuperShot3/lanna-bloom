/**
 * Product add-ons (Chocolates, Vase, Teddy Bear) with prices.
 * Used by AddOnsSection, CartContext, and Stripe/order payload.
 */

export interface ProductAddOn {
  id: 'chocolates' | 'vase' | 'teddy';
  nameEn: string;
  nameTh: string;
  price: number;
}

export const ADDONS: ProductAddOn[] = [
  { id: 'chocolates', nameEn: 'Chocolates', nameTh: 'ช็อคโกแลต', price: 350 },
  { id: 'vase', nameEn: 'Classic Vase', nameTh: 'แจกันคลาสสิก', price: 450 },
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
