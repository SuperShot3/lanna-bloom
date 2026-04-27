import { defineType } from 'sanity';

export const balloon = defineType({
  name: 'balloon',
  title: 'Balloons',
  type: 'document',
  fields: [
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'nameEn' },
      validation: (r) => r.required(),
    },
    { name: 'nameEn', title: 'Name (EN)', type: 'string', validation: (r) => r.required() },
    { name: 'nameTh', title: 'Name (TH)', type: 'string' },
    { name: 'descriptionEn', title: 'Description (EN)', type: 'text' },
    { name: 'descriptionTh', title: 'Description (TH)', type: 'text' },
    { name: 'price', title: 'Price (THB)', type: 'number', validation: (r) => r.required().min(0) },
    {
      name: 'sizeLabel',
      title: 'Size (e.g. 18 inch, bouquet set)',
      type: 'string',
      validation: (r) => r.required(),
    },
    {
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      validation: (r) => r.min(1),
    },
  ],
  preview: {
    select: { title: 'nameEn', sizeLabel: 'sizeLabel', price: 'price' },
    prepare({ title, sizeLabel, price }) {
      const bits = [
        sizeLabel ? `Size: ${sizeLabel}` : null,
        typeof price === 'number' ? `฿${price.toLocaleString()}` : null,
      ].filter(Boolean);
      return {
        title: title || 'Balloon',
        subtitle: bits.join(' · '),
      };
    },
  },
});
