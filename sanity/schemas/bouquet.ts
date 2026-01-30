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
          ],
        }),
      ],
    },
  ],
  preview: {
    select: { title: 'nameEn' },
    prepare({ title }) {
      return { title: title || 'Bouquet' };
    },
  },
});
