import { defineType, defineArrayMember } from 'sanity';

const PRODUCT_KINDS = [
  { title: 'Legacy (S/M/L/XL tiers)', value: 'legacy' },
  { title: 'Single stem count (e.g. 9 / 19 roses)', value: 'single_stem_count' },
  { title: 'Fixed bouquet (Standard / Large / …)', value: 'fixed_bouquet' },
  { title: 'Customizable budget (from X THB)', value: 'customizable_bouquet' },
] as const;

export const bouquet = defineType({
  name: 'bouquet',
  title: 'Bouquet',
  type: 'document',
  fields: [
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'nameEn' }, validation: (r) => r.required() },
    { name: 'nameEn', title: 'Name (EN)', type: 'string', validation: (r) => r.required() },
    { name: 'nameTh', title: 'Name (TH)', type: 'string' },
    { name: 'descriptionEn', title: 'Description (EN)', type: 'text' },
    { name: 'descriptionTh', title: 'Description (TH)', type: 'text' },
    { name: 'compositionEn', title: 'Composition (EN)', type: 'string', description: 'e.g. Red roses, eucalyptus' },
    { name: 'compositionTh', title: 'Composition (TH)', type: 'string' },
    {
      name: 'productKind',
      title: 'Product model',
      type: 'string',
      options: { list: [...PRODUCT_KINDS] },
      initialValue: 'legacy',
      description:
        'Legacy: classic S/M/L/XL rows. Other kinds use structured options below. Storefront never shows S/M/L letters to customers.',
    },
    {
      name: 'singleStemOptions',
      title: 'Single stem options',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'singleStemOption',
          fields: [
            { name: 'stemCount', title: 'Stem count', type: 'number', validation: (r) => r.required().min(1) },
            { name: 'price', title: 'Price (THB)', type: 'number', validation: (r) => r.required().min(0) },
            { name: 'labelEn', title: 'Label override (EN)', type: 'string' },
            { name: 'labelTh', title: 'Label override (TH)', type: 'string' },
            { name: 'preparationTime', title: 'Preparation time (minutes)', type: 'number' },
            { name: 'availability', title: 'Available', type: 'boolean', initialValue: true },
          ],
        }),
      ],
      hidden: ({ parent }) => parent?.productKind !== 'single_stem_count',
    },
    {
      name: 'fixedVariants',
      title: 'Fixed bouquet variants',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'fixedVariant',
          fields: [
            { name: 'variantKey', title: 'Variant ID (slug)', type: 'string', validation: (r) => r.required() },
            { name: 'nameEn', title: 'Name (EN)', type: 'string', validation: (r) => r.required() },
            { name: 'nameTh', title: 'Name (TH)', type: 'string' },
            { name: 'price', title: 'Price (THB)', type: 'number', validation: (r) => r.required().min(0) },
            { name: 'stemMin', title: 'Approx. stems (min)', type: 'number' },
            { name: 'stemMax', title: 'Approx. stems (max)', type: 'number' },
            { name: 'preparationTime', title: 'Preparation time (minutes)', type: 'number' },
            { name: 'availability', title: 'Available', type: 'boolean', initialValue: true },
          ],
        }),
      ],
      hidden: ({ parent }) => parent?.productKind !== 'fixed_bouquet',
    },
    {
      name: 'customTiers',
      title: 'Custom budget tiers',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'customTier',
          fields: [
            { name: 'minPrice', title: 'From price (THB)', type: 'number', validation: (r) => r.required().min(0) },
            { name: 'labelEn', title: 'Label override (EN)', type: 'string' },
            { name: 'labelTh', title: 'Label override (TH)', type: 'string' },
            { name: 'preparationTime', title: 'Preparation time (minutes)', type: 'number' },
            { name: 'availability', title: 'Available', type: 'boolean', initialValue: true },
          ],
        }),
      ],
      hidden: ({ parent }) => parent?.productKind !== 'customizable_bouquet',
    },
    {
      name: 'deliveryOptions',
      title: 'Delivery speed',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Same day', value: 'same_day' },
          { title: 'Next day', value: 'next_day' },
        ],
      },
    },
    {
      name: 'presentationFormats',
      title: 'Product Format',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Bouquet', value: 'bouquet' },
          { title: 'Box', value: 'box' },
          { title: 'Vase', value: 'vase' },
          { title: 'Basket', value: 'basket' },
          { title: 'Arrangement', value: 'arrangement' },
          { title: 'Potted', value: 'potted' },
        ],
      },
    },
    {
      name: 'colors',
      title: 'Colors',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Red', value: 'red' },
          { title: 'Pink', value: 'pink' },
          { title: 'White', value: 'white' },
          { title: 'Yellow', value: 'yellow' },
          { title: 'Purple', value: 'purple' },
          { title: 'Orange', value: 'orange' },
          { title: 'Mixed', value: 'mixed' },
        ],
      },
    },
    {
      name: 'flowerTypes',
      title: 'Flower types',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Rose', value: 'rose' },
          { title: 'Tulip', value: 'tulip' },
          { title: 'Lily', value: 'lily' },
          { title: 'Orchid', value: 'orchid' },
          { title: 'Sunflower', value: 'sunflower' },
          { title: 'Gerbera', value: 'gerbera' },
          { title: 'Carnation', value: 'carnation' },
          { title: 'Mums', value: 'mums' },
          { title: 'Chrysanthemums', value: 'chrysanthemums' },
          { title: 'Lisianthus', value: 'lisianthus' },
          { title: 'Daisy', value: 'daisy' },
          { title: 'Mixed', value: 'mixed' },
        ],
      },
    },
    {
      name: 'occasion',
      title: 'Occasions',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Birthday', value: 'birthday' },
          { title: 'Anniversary', value: 'anniversary' },
          { title: 'Romantic', value: 'romantic' },
          { title: 'Sympathy', value: 'sympathy' },
          { title: 'Congratulations', value: 'congrats' },
          { title: 'Get well', value: 'get_well' },
        ],
      },
      description: 'One bouquet can belong to multiple occasions. Leave empty for any occasion.',
    },
    {
      name: 'partner',
      title: 'Partner',
      type: 'reference',
      to: [{ type: 'partner' }],
      description: 'Leave empty for Lanna Bloom own bouquets. Set for partner-uploaded bouquets.',
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Pending review', value: 'pending_review' },
          { title: 'Approved', value: 'approved' },
          { title: 'Rejected', value: 'rejected' },
        ],
      },
      initialValue: 'approved',
      description: 'Only approved bouquets appear on the public catalog. Partner uploads start as pending_review.',
    },
    {
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
    },
    {
      name: 'sizes',
      title: 'Legacy sizes & prices (S/M/L/XL)',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'bouquetSize',
          fields: [
            { name: 'key', title: 'Size', type: 'string', options: { list: ['s', 'm', 'l', 'xl'] } },
            { name: 'label', title: 'Label', type: 'string' },
            { name: 'price', title: 'Price (THB)', type: 'number' },
            { name: 'description', title: 'Description', type: 'string' },
            { name: 'preparationTime', title: 'Preparation time (minutes)', type: 'number' },
            { name: 'availability', title: 'Availability', type: 'boolean', initialValue: true },
          ],
        }),
      ],
      hidden: ({ parent }) => parent?.productKind !== 'legacy' && parent?.productKind != null,
    },
  ],
  preview: {
    select: { title: 'nameEn', status: 'status', partner: 'partner', kind: 'productKind' },
    prepare({ title, status, partner, kind }) {
      const sub = [partner ? 'Partner' : 'Lanna Bloom', kind ?? 'legacy', status].filter(Boolean).join(' · ');
      return { title: title || 'Bouquet', subtitle: sub };
    },
  },
});
