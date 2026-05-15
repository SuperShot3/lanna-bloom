import { defineField } from 'sanity';

/** Optional storefront sale — 1–90% off base price; empty = no discount. */
export const catalogDiscountFields = [
  defineField({
    name: 'discountPercent',
    title: 'Discount (%)',
    type: 'number',
    description:
      'Optional sale (1–90). Shows a discount badge on catalog cards and lowers the price at checkout. Leave empty for full price.',
    validation: (Rule) =>
      Rule.custom((value) => {
        if (value == null) return true;
        const n = Number(value);
        if (!Number.isFinite(n) || n < 1 || n > 90) {
          return 'Enter 1–90 or leave empty';
        }
        return true;
      }),
  }),
];
