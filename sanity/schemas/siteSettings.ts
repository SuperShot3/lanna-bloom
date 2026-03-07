import { defineType } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    {
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      options: { hotspot: true },
      description: 'Main hero image on the homepage. Falls back to default if empty.',
    },
  ],
  preview: {
    select: {},
    prepare() {
      return { title: 'Site Settings', subtitle: 'Homepage hero and global settings' };
    },
  },
});
