import { defineType } from 'sanity';

export const bouquetSize = defineType({
  name: 'bouquetSize',
  title: 'Bouquet size',
  type: 'object',
  fields: [
    { name: 'key', title: 'Size key', type: 'string', options: { list: ['s', 'm', 'l', 'xl'] } },
    { name: 'label', title: 'Label (e.g. S, M)', type: 'string' },
    { name: 'price', title: 'Price (THB)', type: 'number' },
    { name: 'description', title: 'Description', type: 'string', description: 'e.g. 7 stems' },
  ],
});
