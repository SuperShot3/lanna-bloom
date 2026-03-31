import { defineType } from 'sanity';

/**
 * Non-flower partner products: balloons, gifts, money_flowers, handmade_floral.
 * Category values must match lib/catalogCategories.ts PRODUCT_CATEGORIES.
 * moderationStatus: submitted (partner submit) → live (admin approve) | needs_changes
 */
export const product = defineType({
  name: 'product',
  title: 'Product (non-flower)',
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
    {
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Balloons', value: 'balloons' },
          { title: 'Gifts & Sets', value: 'gifts' },
          { title: 'Money Flowers', value: 'money_flowers' },
          { title: 'Handmade Floral', value: 'handmade_floral' },
          { title: 'Food & Sweets', value: 'food_sweets' },
          { title: 'Wellness', value: 'wellness' },
          { title: 'Toys & Plush', value: 'toys_plush' },
          { title: 'Home & Lifestyle', value: 'home_lifestyle' },
          { title: 'Stationery', value: 'stationery' },
          { title: 'Baby & Family', value: 'baby_family' },
          { title: 'Fashion & Accessories', value: 'fashion' },
          { title: 'Seasonal', value: 'seasonal' },
          { title: 'Other', value: 'other' },
        ],
      },
      validation: (r) => r.required(),
    },
    { name: 'price', title: 'Price (THB)', type: 'number', validation: (r) => r.required().min(0) },
    {
      name: 'cost',
      title: 'Cost (THB)',
      type: 'number',
      description: 'Partner cost (what you pay the partner). Used to compute selling price with commission.',
      validation: (r) => r.min(0),
    },
    {
      name: 'commissionPercent',
      title: 'Commission (%)',
      type: 'number',
      description: 'Set and edited in Admin Dashboard only. Platform commission per sale (0–500).',
      validation: (r) => r.min(0).max(500),
      readOnly: true,
    },
    {
      name: 'partner',
      title: 'Partner',
      type: 'reference',
      to: [{ type: 'partner' }],
      validation: (r) => r.required(),
    },
    {
      name: 'moderationStatus',
      title: 'Moderation',
      type: 'string',
      options: {
        list: [
          { title: 'Submitted', value: 'submitted' },
          { title: 'Live', value: 'live' },
          { title: 'Needs changes', value: 'needs_changes' },
        ],
      },
      initialValue: 'submitted',
      readOnly: ({ document }) => !!document?.moderationStatus,
    },
    { name: 'adminNote', title: 'Admin note (for needs_changes)', type: 'text', readOnly: true },
    {
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
    },
    {
      name: 'structuredAttributes',
      title: 'Structured attributes',
      type: 'object',
      fields: [
        { name: 'preparationTime', title: 'Prep time (min)', type: 'number' },
        { name: 'occasion', title: 'Occasion', type: 'string' },
      ],
    },
    {
      name: 'customAttributes',
      title: 'Custom attributes (key-value)',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'key', title: 'Key', type: 'string' },
            { name: 'value', title: 'Value', type: 'string' },
          ],
        },
      ],
    },
    {
      name: 'adminOverrides',
      title: 'Admin overrides (pre-approval edits)',
      type: 'object',
      description:
        'Optional edits made by admins during moderation (SEO/title/description polishing). These do not change the partner-submitted fields directly.',
      fields: [
        { name: 'nameEn', title: 'Name override (EN)', type: 'string' },
        { name: 'nameTh', title: 'Name override (TH)', type: 'string' },
        { name: 'descriptionEn', title: 'Description override (EN)', type: 'text' },
        { name: 'descriptionTh', title: 'Description override (TH)', type: 'text' },
      ],
    },
    {
      name: 'adminChangeSummary',
      title: 'Admin change summary (shown to partner)',
      type: 'text',
      description: 'Shown as a banner in the partner portal to explain what was changed and why.',
    },
    { name: 'adminLastEditedAt', title: 'Admin last edited at', type: 'datetime', readOnly: true },
    { name: 'adminLastEditedBy', title: 'Admin last edited by', type: 'string', readOnly: true },
  ],
  preview: {
    select: { title: 'nameEn', category: 'category', status: 'moderationStatus' },
    prepare({ title, category, status }) {
      return {
        title: title || 'Product',
        subtitle: [category, status].filter(Boolean).join(' · '),
      };
    },
  },
});
