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
    {
      name: 'heroCarouselImages',
      title: 'Hero Carousel Images',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      description: 'Images shown in the Tinder-style swipe carousel on the homepage. Add, remove or reorder images here.',
    },
  ],
  preview: {
    select: {},
    prepare() {
      return { title: 'Site Settings', subtitle: 'Homepage hero, carousel and global settings' };
    },
  },
});

