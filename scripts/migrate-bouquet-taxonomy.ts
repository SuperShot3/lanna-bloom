import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-03-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

async function run() {
  console.log('Fetching all bouquet documents...');
  const bouquets = await client.fetch<any[]>(`*[_type == "bouquet"]`);
  console.log(`Found ${bouquets.length} bouquets.`);

  const patches = [];

  for (const b of bouquets) {
    if (!b.category) {
      continue; // No category to migrate
    }

    const updates: any = {};

    let hasChanges = false;
    let oldCategory = b.category;
    let currentFlowerTypes = b.flowerTypes || [];
    let currentOccasions = b.occasion || [];
    let currentFormats = b.presentationFormats || [];

    // Migrate values based on category
    if (oldCategory === 'roses') {
      if (!currentFlowerTypes.includes('rose')) {
        currentFlowerTypes.push('rose');
        hasChanges = true;
      }
    } else if (oldCategory === 'mixed') {
      if (!currentFlowerTypes.includes('mixed')) {
        currentFlowerTypes.push('mixed');
        hasChanges = true;
      }
    } else if (oldCategory === 'mono') {
      // there is no explicit 'mono' in flowerTypes options currently ("Rose, Tulip, etc"), but wait let's check schema.
      // schema: { title: 'Mono bouquets', value: 'mono' } vs flowerTypes: {title: 'Mixed', value: 'mixed'} 
      // If there is no mono, we just leave it. If mono is in flowerTypes, we'd add it. I'll add 'mono' just in case.
      // wait, `flowerTypes` list: rose, tulip, lily, orchid, sunflower, gerbera, carnation, mums, chrysanthemums, lisianthus, daisy, mixed.
      // It has no 'mono'. So let's skip adding mono to flowerTypes.
    } else if (oldCategory === 'inBox') {
      if (!currentFormats.includes('box')) {
        currentFormats.push('box');
        hasChanges = true;
      }
    } else if (oldCategory === 'romantic') {
      if (!currentOccasions.includes('romantic')) {
        currentOccasions.push('romantic');
        hasChanges = true;
      }
    } else if (oldCategory === 'birthday') {
      if (!currentOccasions.includes('birthday')) {
        currentOccasions.push('birthday');
        hasChanges = true;
      }
    } else if (oldCategory === 'sympathy') {
      if (!currentOccasions.includes('sympathy')) {
        currentOccasions.push('sympathy');
        hasChanges = true;
      }
    }

    if (hasChanges) {
      // Need to push updates
      const patchObj: any = { _id: b._id };
      const setObj: any = {};
      
      if (currentFlowerTypes.length !== (b.flowerTypes || []).length) {
        setObj.flowerTypes = currentFlowerTypes;
      }
      if (currentOccasions.length !== (b.occasion || []).length) {
        setObj.occasion = currentOccasions;
      }
      if (currentFormats.length !== (b.presentationFormats || []).length) {
        setObj.presentationFormats = currentFormats;
      }

      patchObj.set = setObj;
      patchObj.unset = ['category']; // Finally safely remove category
      
      patches.push(patchObj);
      console.log(`Migrating bouquet "${b.nameEn}" (${oldCategory}): updates ->`, setObj);
    } else {
      // If no new arrays to add, just unset category to clean up
      patches.push({
        _id: b._id,
        unset: ['category']
      });
      console.log(`Unsetting legacy category for bouquet "${b.nameEn}"`);
    }
  }

  console.log(`Prepared ${patches.length} patches.`);

  if (patches.length > 0) {
    console.log('Sending transaction...');
    const tx = client.transaction();
    for (const p of patches) {
      if (p.set && Object.keys(p.set).length > 0) {
        tx.patch(p._id, { set: p.set });
      }
      if (p.unset && p.unset.length > 0) {
        tx.patch(p._id, { unset: p.unset });
      }
    }
    await tx.commit();
    console.log('Migration committed successfully!');
  } else {
    console.log('Nothing to migrate.');
  }

}

run().catch(console.error);
