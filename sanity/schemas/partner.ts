import { defineType } from 'sanity';

export const partner = defineType({
  name: 'partner',
  title: 'Partner',
  type: 'document',
  fields: [
    { name: 'shopName', title: 'Shop name', type: 'string', validation: (r) => r.required() },
    { name: 'contactName', title: 'Contact name', type: 'string', validation: (r) => r.required() },
    { name: 'phoneNumber', title: 'Phone number', type: 'string', validation: (r) => r.required() },
    {
      name: 'portrait',
      title: 'Portrait (optional)',
      type: 'image',
      options: { hotspot: true },
      description: 'Optional shop/studio profile photo used on product pages.',
    },
    {
      name: 'lineOrWhatsapp',
      title: 'LINE or WhatsApp',
      type: 'string',
      description: 'LINE ID or WhatsApp number',
    },
    { name: 'shopBioEn', title: 'Shop bio (EN)', type: 'text', description: 'Short story about your shop/studio (shown on product pages).' },
    { name: 'shopBioTh', title: 'Shop bio (TH)', type: 'text', description: 'เรื่องสั้นเกี่ยวกับร้าน/สตูดิโอของคุณ (แสดงในหน้าสินค้า)' },
    { name: 'shopAddress', title: 'Shop address', type: 'text' },
    {
      name: 'city',
      title: 'City',
      type: 'string',
      initialValue: 'Chiang Mai',
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Pending review', value: 'pending_review' },
          { title: 'Approved', value: 'approved' },
          { title: 'Disabled', value: 'disabled' },
        ],
      },
      initialValue: 'pending_review',
      validation: (r) => r.required(),
    },
    {
      name: 'supabaseUserId',
      title: 'Supabase User ID',
      type: 'string',
      description: 'Links to auth.users.id after admin approval. Used to resolve partner from session.',
      hidden: ({ document }) => !document?.supabaseUserId,
    },
  ],
  preview: {
    select: { title: 'shopName', subtitle: 'contactName' },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Partner',
        subtitle: subtitle || '',
      };
    },
  },
});
