/**
 * First-visit delivery destination prompt skip rules.
 * Run with: npx tsx lib/delivery/deliveryDestinationPrompt.test.ts
 */

import { catalogHrefForDestination } from './commitDeliveryDestination';
import {
  shouldShowDeliveryDestinationPrompt,
  shouldSkipDeliveryDestinationPromptPath,
} from './deliveryDestinationPrompt';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

assert(
  shouldSkipDeliveryDestinationPromptPath('/en/phuket/flower-delivery', 'en') === true,
  'market landing skips prompt'
);
assert(
  shouldSkipDeliveryDestinationPromptPath('/en/catalog/phuket/catalog', 'en') === true,
  'legacy doubled market catalog path skips prompt'
);
assert(
  shouldSkipDeliveryDestinationPromptPath('/en/catalog/phuket', 'en') === true,
  'pretty market catalog path skips prompt'
);
assert(
  shouldSkipDeliveryDestinationPromptPath('/en/catalog/pai', 'en') === true,
  'market catalog slug skips prompt'
);
assert(
  shouldSkipDeliveryDestinationPromptPath('/th/cart', 'th') === true,
  'cart skips prompt'
);
assert(
  shouldSkipDeliveryDestinationPromptPath('/en/checkout/complete', 'en') === true,
  'checkout skips prompt'
);
assert(
  shouldSkipDeliveryDestinationPromptPath('/en/track-order', 'en') === true,
  'track-order skips prompt'
);
assert(
  shouldSkipDeliveryDestinationPromptPath('/en/partner/apply', 'en') === true,
  'partner skips prompt'
);
assert(
  shouldSkipDeliveryDestinationPromptPath('/en', 'en') === false,
  'home does not skip'
);
assert(
  shouldSkipDeliveryDestinationPromptPath('/en/catalog', 'en') === false,
  'Chiang Mai catalog does not skip'
);
assert(
  shouldSkipDeliveryDestinationPromptPath('/en/catalog/red-roses', 'en') === false,
  'Chiang Mai product does not skip'
);

assert(
  shouldShowDeliveryDestinationPrompt({
    pathname: '/en',
    lang: 'en',
    dismissed: false,
    cookieAccepted: true,
  }) === true,
  'show on home after cookie accept'
);
assert(
  shouldShowDeliveryDestinationPrompt({
    pathname: '/en',
    lang: 'en',
    dismissed: true,
    cookieAccepted: true,
  }) === false,
  'hide when dismissed'
);
assert(
  shouldShowDeliveryDestinationPrompt({
    pathname: '/en',
    lang: 'en',
    dismissed: false,
    cookieAccepted: false,
  }) === false,
  'hide until cookie accept'
);
assert(
  shouldShowDeliveryDestinationPrompt({
    pathname: '/en/phuket/flower-delivery',
    lang: 'en',
    dismissed: false,
    cookieAccepted: true,
  }) === false,
  'hide on market URL'
);

assert(
  catalogHrefForDestination('en', 'CHIANG_MAI') === '/en/catalog',
  'CM catalog href'
);
assert(
  catalogHrefForDestination('en', 'PHUKET') === '/en/catalog/phuket',
  'Phuket catalog href'
);
assert(
  catalogHrefForDestination('th', 'BANGKOK') === '/th/catalog/bangkok',
  'Bangkok catalog href uses lang'
);

console.log('deliveryDestinationPrompt.test.ts: ok');
