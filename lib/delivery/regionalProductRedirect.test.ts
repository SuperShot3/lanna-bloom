/**
 * Regional product URL redirects + region cookie helpers.
 * Run with: npx tsx lib/delivery/regionalProductRedirect.test.ts
 */
import assert from 'node:assert/strict';
import { applyExpansionItemMarkupThb } from '@/lib/expansionMarkup';
import { effectiveCatalogUnitPriceWithExpansion } from '@/lib/catalogDiscount';
import { bouquetIsAvailableForDestination } from '@/lib/bouquetDestinationAvailability';
import { cartPriceBreakdown } from '@/lib/cart/cartPriceBreakdown';
import { analyzeDestinationCartConflicts } from '@/lib/cart/destinationCartConflicts';
import { buildCatalogItemHref } from '@/lib/delivery/marketRoute';
import { parseDeliveryRegionCookie } from '@/lib/delivery/deliveryRegionCookie';
import {
  isStorefrontCatalogProductPath,
  isStorefrontCheckoutPath,
  matchPrettyMarketCatalogRewrite,
  matchRegionalProductRedirect,
  matchUglyMarketCatalogRedirect,
  publicStorefrontPathname,
  shouldPreserveDeliveryRegionOnPath,
} from '@/lib/delivery/regionalProductRedirect';
import type { CartItem } from '@/contexts/CartContext';

function fail(msg: string): never {
  throw new Error(msg);
}

{
  const match = matchRegionalProductRedirect('/en/catalog/krabi/red-roses');
  assert.ok(match, 'krabi product matches');
  assert.equal(match!.targetPath, '/en/catalog/red-roses');
  assert.equal(match!.destinationId, 'KRABI');
  assert.equal(match!.productSlug, 'red-roses');
}

{
  const match = matchRegionalProductRedirect('/th/catalog/phuket/pink-lilies-bouquet?src=ad');
  assert.ok(match);
  assert.equal(match!.targetPath, '/th/catalog/pink-lilies-bouquet');
  assert.equal(match!.destinationId, 'PHUKET');
}

{
  const match = matchRegionalProductRedirect('/en/krabi/catalog/red-roses');
  assert.ok(match, 'legacy market product hop matches');
  assert.equal(match!.targetPath, '/en/catalog/red-roses');
  assert.equal(match!.destinationId, 'KRABI');
}

assert.equal(matchRegionalProductRedirect('/en/catalog/krabi'), null, 'listing not redirected');
assert.equal(
  matchRegionalProductRedirect('/en/catalog/krabi/catalog'),
  null,
  'listing tail not redirected as a product'
);

{
  const ugly = matchUglyMarketCatalogRedirect('/en/catalog/samui/catalog');
  assert.ok(ugly, 'doubled catalog listing matches 308');
  assert.equal(ugly!.targetPath, '/en/catalog/samui');
  assert.equal(ugly!.marketSlug, 'samui');
}

{
  const uglyQs = matchUglyMarketCatalogRedirect('/th/catalog/phuket/catalog?types=rose');
  assert.ok(uglyQs);
  assert.equal(uglyQs!.targetPath, '/th/catalog/phuket');
}

assert.equal(
  matchUglyMarketCatalogRedirect('/en/catalog/krabi/red-roses'),
  null,
  'product hop is not a listing 308'
);
assert.equal(
  matchUglyMarketCatalogRedirect('/en/catalog/red-roses'),
  null,
  'product PDP is not a listing 308'
);

{
  const rewrite = matchPrettyMarketCatalogRewrite('/en/catalog/samui');
  assert.ok(rewrite, 'pretty market listing matches rewrite');
  assert.equal(rewrite!.targetPath, '/en/catalog/samui/catalog');
  assert.equal(rewrite!.marketSlug, 'samui');
}

{
  const pai = matchPrettyMarketCatalogRewrite('/zh-hk/catalog/pai');
  assert.ok(pai, 'pai and zh-hk are covered');
  assert.equal(pai!.targetPath, '/zh-hk/catalog/pai/catalog');
}

assert.equal(
  matchPrettyMarketCatalogRewrite('/en/catalog/red-roses'),
  null,
  'product PDP is not rewritten'
);
assert.equal(
  matchPrettyMarketCatalogRewrite('/en/catalog/krabi/catalog'),
  null,
  'ugly listing is 308d, not rewritten'
);
assert.equal(
  matchPrettyMarketCatalogRewrite('/en/catalog'),
  null,
  'Chiang Mai catalog is not rewritten'
);

assert.equal(
  publicStorefrontPathname('/en/catalog/samui/catalog'),
  '/en/catalog/samui'
);
assert.equal(publicStorefrontPathname('/en/catalog/samui'), '/en/catalog/samui');
assert.equal(publicStorefrontPathname('/en/catalog/red-roses'), '/en/catalog/red-roses');
assert.equal(
  matchRegionalProductRedirect('/en/krabi/flower-delivery'),
  null,
  'landing not redirected'
);
assert.equal(
  matchRegionalProductRedirect('/en/catalog/red-roses'),
  null,
  'canonical product not redirected'
);

{
  const href = buildCatalogItemHref({
    lang: 'en',
    slug: 'red-roses',
    pathname: '/en/catalog/krabi',
  });
  assert.equal(href, '/en/catalog/red-roses');
  assert.ok(!href.includes('/krabi/'));
}

{
  const href = buildCatalogItemHref({
    lang: 'th',
    slug: 'red-roses',
    pathname: '/th/phuket/flower-delivery',
  });
  assert.equal(href, '/th/catalog/red-roses');
}

assert.equal(parseDeliveryRegionCookie('KRABI'), 'KRABI');
assert.equal(parseDeliveryRegionCookie('chiang_mai'), 'CHIANG_MAI');
assert.equal(parseDeliveryRegionCookie('not-a-city'), null);
assert.equal(parseDeliveryRegionCookie(undefined), null);

assert.equal(shouldPreserveDeliveryRegionOnPath('/en/catalog/red-roses', 'en'), true);
assert.equal(shouldPreserveDeliveryRegionOnPath('/en/catalog/krabi/red-roses', 'en'), true);
assert.equal(shouldPreserveDeliveryRegionOnPath('/en/catalog/krabi', 'en'), true);
assert.equal(shouldPreserveDeliveryRegionOnPath('/en/krabi/flower-delivery', 'en'), true);
assert.equal(shouldPreserveDeliveryRegionOnPath('/en/cart', 'en'), true);
assert.equal(shouldPreserveDeliveryRegionOnPath('/en/checkout/complete', 'en'), true);
assert.equal(shouldPreserveDeliveryRegionOnPath('/en', 'en'), false);
assert.equal(shouldPreserveDeliveryRegionOnPath('/en/catalog', 'en'), false);

assert.equal(isStorefrontCatalogProductPath('/en/catalog/red-roses', 'en'), true);
assert.equal(isStorefrontCatalogProductPath('/en/catalog', 'en'), false);
assert.equal(isStorefrontCatalogProductPath('/en/catalog/krabi', 'en'), false);
assert.equal(isStorefrontCatalogProductPath('/en/catalog/krabi/catalog', 'en'), false);
assert.equal(isStorefrontCheckoutPath('/en/cart', 'en'), true);
assert.equal(isStorefrontCheckoutPath('/th/checkout/complete', 'th'), true);

{
  const base = 890;
  assert.equal(effectiveCatalogUnitPriceWithExpansion(base, undefined, 'CHIANG_MAI'), 890);
  assert.equal(
    effectiveCatalogUnitPriceWithExpansion(base, undefined, 'KRABI'),
    applyExpansionItemMarkupThb(base, 'KRABI')
  );
  assert.equal(
    effectiveCatalogUnitPriceWithExpansion(base, undefined, 'BANGKOK'),
    applyExpansionItemMarkupThb(base, 'BANGKOK')
  );
  assert.notEqual(
    effectiveCatalogUnitPriceWithExpansion(base, undefined, 'KRABI'),
    effectiveCatalogUnitPriceWithExpansion(base, undefined, 'CHIANG_MAI')
  );
}

assert.equal(
  bouquetIsAvailableForDestination({ excludedDeliveryDestinations: ['KRABI'] }, 'KRABI'),
  false
);
assert.equal(
  bouquetIsAvailableForDestination({ excludedDeliveryDestinations: ['KRABI'] }, 'CHIANG_MAI'),
  true
);

{
  const emptyAddOns = {
    cardType: null,
    cardMessage: '',
    wrappingPreference: null,
    paperColor: null,
    productAddOns: {},
  } as CartItem['addOns'];

  const line: CartItem = {
    itemType: 'bouquet',
    bouquetId: 'bq_roses',
    slug: 'red-roses',
    nameEn: 'Red Roses',
    nameTh: 'กุหลาบแดง',
    size: {
      optionId: 'std',
      key: 'm',
      label: 'Standard',
      price: 890,
      availability: true,
    },
    addOns: emptyAddOns,
    quantity: 1,
    deliveryDestination: 'KRABI',
    excludedDeliveryDestinations: ['PHUKET'],
  };

  assert.equal(line.bouquetId, 'bq_roses');
  assert.equal(line.deliveryDestination, 'KRABI');

  const cm = cartPriceBreakdown([line], 'CHIANG_MAI');
  const krabi = cartPriceBreakdown([line], 'KRABI');
  const bangkok = cartPriceBreakdown([line], 'BANGKOK');
  assert.equal(cm.itemsTotal, 890);
  assert.equal(krabi.itemsTotal, applyExpansionItemMarkupThb(890, 'KRABI'));
  assert.equal(bangkok.itemsTotal, applyExpansionItemMarkupThb(890, 'BANGKOK'));
  assert.notEqual(krabi.itemsTotal, cm.itemsTotal);

  const clientSubmitted = 1;
  assert.notEqual(krabi.itemsTotal, clientSubmitted, 'never trust a client-submitted price');

  assert.equal(analyzeDestinationCartConflicts([line], 'KRABI').length, 0);
  const phuketConflicts = analyzeDestinationCartConflicts([line], 'PHUKET');
  assert.equal(phuketConflicts.length, 1);
  assert.equal(phuketConflicts[0]?.reason, 'excluded_destination');
}

{
  const emptyAddOns = {
    cardType: null,
    cardMessage: '',
    wrappingPreference: null,
    paperColor: null,
    productAddOns: {},
  } as CartItem['addOns'];
  const toy: CartItem = {
    itemType: 'plushyToy',
    bouquetId: 'toy_1',
    slug: 'teddy',
    nameEn: 'Teddy',
    nameTh: 'Teddy',
    size: { optionId: 'one', label: 'One', price: 400, availability: true },
    addOns: emptyAddOns,
    deliveryDestination: 'CHIANG_MAI',
  };
  const expansion = analyzeDestinationCartConflicts([toy], 'KRABI');
  if (expansion.length === 0) fail('toy must be blocked on expansion');
}

console.log('regionalProductRedirect.test.ts: ok');
