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
      name: 'lineOrWhatsapp',
      title: 'LINE or WhatsApp',
      type: 'string',
      description: 'LINE ID or WhatsApp number',
    },
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
