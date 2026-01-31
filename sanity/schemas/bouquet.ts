import { defineType, defineArrayMember } from 'sanity';

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
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Roses', value: 'roses' },
          { title: 'Mixed bouquets', value: 'mixed' },
          { title: 'Mono bouquets', value: 'mono' },
          { title: 'Flowers in a box', value: 'inBox' },
          { title: 'Romantic', value: 'romantic' },
          { title: 'Birthday', value: 'birthday' },
          { title: 'Sympathy', value: 'sympathy' },
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
          { title: 'Mixed', value: 'mixed' },
        ],
      },
    },
    {
      name: 'occasion',
      title: 'Occasion',
      type: 'string',
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
      description: 'Leave empty for any occasion.',
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
      title: 'Sizes & prices',
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
    },
  ],
  preview: {
    select: { title: 'nameEn', status: 'status', partner: 'partner' },
    prepare({ title, status, partner }) {
      const sub = [partner ? 'Partner' : 'Lanna Bloom', status].filter(Boolean).join(' · ');
      return { title: title || 'Bouquet', subtitle: sub };
    },
  },
});
