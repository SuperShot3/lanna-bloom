/**
 * Pre-order Only → contact to check stock (no self-serve Stripe).
 * Run with: npx tsx lib/delivery/preorderStockContact.test.ts
 */

import { computeDeliveryConstraint } from './deliveryConstraints';
import {
  deliveryConstraintRequiresStockContact,
  PREORDER_STOCK_CONTACT_CHECKOUT_MESSAGE,
  provinceStatusRequiresStockContact,
} from './preorderStockContact';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

assert(provinceStatusRequiresStockContact('preorder_only'), 'preorder_only status gates contact');
assert(!provinceStatusRequiresStockContact('same_day'), 'same_day does not gate');
assert(!provinceStatusRequiresStockContact('next_day'), 'next_day does not gate');
assert(!provinceStatusRequiresStockContact(null), 'null status does not gate');

const now = new Date('2026-07-08T03:00:00.000Z');

const preorder = computeDeliveryConstraint({
  province: {
    status: 'preorder_only',
    catalog_enabled: true,
    min_advance_notice_hours: null,
    same_day_cutoff_local: null,
  },
  now,
});
assert(preorder.reasonCode === 'preorder', 'constraint reason is preorder');
assert(deliveryConstraintRequiresStockContact(preorder), 'preorder constraint requires contact');
assert(preorder.orderingAllowed, 'catalog still browsable; Stripe is blocked separately');

const sameDayAdvance = computeDeliveryConstraint({
  province: {
    status: 'same_day',
    catalog_enabled: true,
    min_advance_notice_hours: 48,
    same_day_cutoff_local: null,
  },
  now,
});
assert(
  !deliveryConstraintRequiresStockContact(sameDayAdvance),
  '48h advance on same_day is not Pre-order Only'
);

const comingSoon = computeDeliveryConstraint({
  province: {
    status: 'coming_soon',
    catalog_enabled: true,
    min_advance_notice_hours: null,
    same_day_cutoff_local: null,
  },
  now,
});
assert(!deliveryConstraintRequiresStockContact(comingSoon), 'coming_soon is a different block');

assert(
  PREORDER_STOCK_CONTACT_CHECKOUT_MESSAGE.includes('LINE'),
  'server message mentions LINE'
);
assert(
  PREORDER_STOCK_CONTACT_CHECKOUT_MESSAGE.includes('WhatsApp'),
  'server message mentions WhatsApp'
);

console.log('preorderStockContact.test.ts: all assertions passed');
