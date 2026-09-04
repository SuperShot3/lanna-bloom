/**
 * Admin card-text persist helper.
 * Run with: npx tsx lib/orders/giftCardMessages.adminPatch.test.ts
 */

import {
  applyAdminCardTextToOrderJson,
  getOrderGiftCardEntries,
  parseCardTextPatch,
} from './giftCardMessages';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

{
  const parsed = parseCardTextPatch({ giftCardMessages: [{ text: 'Hello' }] });
  assert(parsed.ok && parsed.giftCardMessages.length === 1, 'parse accepts array');
}

{
  const parsed = parseCardTextPatch({ giftCardMessages: 'nope' });
  assert(!parsed.ok, 'parse rejects non-array giftCardMessages');
}

{
  const parsed = parseCardTextPatch({});
  assert(!parsed.ok, 'parse requires giftCardMessages');
}

{
  const applied = applyAdminCardTextToOrderJson({}, [{ text: 'Happy birthday' }]);
  assert(applied.ok, 'write onto empty json');
  if (!applied.ok) throw new Error('unreachable');
  assert(applied.changed, 'new message is a change');
  assert(applied.to.length === 1 && applied.to[0].text === 'Happy birthday', 'persisted text');
  const read = getOrderGiftCardEntries({
    giftCardMessages: applied.nextJson.giftCardMessages as never,
    items: applied.nextJson.items as never,
    customOrderDetails: applied.nextJson.customOrderDetails as never,
  });
  assert(read.length === 1 && read[0].text === 'Happy birthday', 'read uses giftCardMessages');
}

{
  const existing = {
    giftCardMessages: [{ text: 'Old note', itemTitle: 'Roses' }],
    items: [
      {
        bouquetTitle: 'Roses',
        addOns: { cardMessage: 'stale item message' },
      },
    ],
    customOrderDetails: { giftDescription: 'custom', greetingCard: 'Old greeting' },
  };
  const applied = applyAdminCardTextToOrderJson(existing, []);
  assert(applied.ok, 'clear all ok');
  if (!applied.ok) throw new Error('unreachable');
  assert(applied.changed, 'clear is a change');
  assert(applied.to.length === 0, 'no persisted messages');
  const items = applied.nextJson.items as Array<{ addOns?: { cardMessage?: string } }>;
  assert(items[0]?.addOns?.cardMessage === '', 'legacy item cardMessage wiped');
  const custom = applied.nextJson.customOrderDetails as { greetingCard?: string };
  assert(custom.greetingCard === '', 'greetingCard wiped');
  const read = getOrderGiftCardEntries({
    giftCardMessages: applied.nextJson.giftCardMessages as never,
    items: applied.nextJson.items as never,
    customOrderDetails: applied.nextJson.customOrderDetails as never,
  });
  assert(read.length === 0, 'cleared order does not resurrect legacy text');
}

{
  const existing = {
    giftCardMessages: [{ text: 'Hi', itemTitle: 'Tulips' }],
  };
  const applied = applyAdminCardTextToOrderJson(existing, [{ text: 'Hello there' }]);
  assert(applied.ok, 'edit keeping title ok');
  if (!applied.ok) throw new Error('unreachable');
  assert(applied.to[0]?.text === 'Hello there', 'text updated');
  assert(applied.to[0]?.itemTitle === 'Tulips', 'itemTitle preserved from existing slot');
}

{
  const existing = {
    giftCardMessages: [{ text: 'Same' }],
    items: [{ bouquetTitle: 'Roses', addOns: { cardMessage: '' } }],
  };
  const applied = applyAdminCardTextToOrderJson(existing, [{ text: 'Same' }]);
  assert(applied.ok, 'noop apply ok');
  if (!applied.ok) throw new Error('unreachable');
  assert(!applied.changed, 'identical canonical text is a no-op');
}

{
  const existing = {
    items: [
      {
        bouquetTitle: 'Peonies',
        addOns: { cardMessage: 'Only on the item' },
      },
    ],
  };
  const applied = applyAdminCardTextToOrderJson(existing, [{ text: 'Only on the item' }]);
  assert(applied.ok, 'promote item message ok');
  if (!applied.ok) throw new Error('unreachable');
  assert(applied.changed, 'wiping item fallback is a change even if display matches');
  const items = applied.nextJson.items as Array<{ addOns?: { cardMessage?: string } }>;
  assert(items[0]?.addOns?.cardMessage === '', 'item cardMessage cleared after promote');
  const read = getOrderGiftCardEntries({
    giftCardMessages: applied.nextJson.giftCardMessages as never,
    items: applied.nextJson.items as never,
  });
  assert(
    read.length === 1 && read[0].text === 'Only on the item',
    'message still readable from giftCardMessages after item wipe'
  );
}

{
  const existing = {
    customOrderDetails: { giftDescription: 'desc', greetingCard: 'Custom card' },
  };
  const applied = applyAdminCardTextToOrderJson(existing, [{ text: 'New custom' }]);
  assert(applied.ok, 'custom greeting update ok');
  if (!applied.ok) throw new Error('unreachable');
  const custom = applied.nextJson.customOrderDetails as { greetingCard?: string };
  assert(custom.greetingCard === 'New custom', 'greetingCard synced to first message');
  assert(
    deepEqual(applied.nextJson.giftCardMessages, [{ text: 'New custom' }]),
    'canonical giftCardMessages written'
  );
}

{
  const applied = applyAdminCardTextToOrderJson({}, 'not-an-array');
  assert(!applied.ok, 'non-array incoming rejected');
}

console.log('giftCardMessages.adminPatch.test.ts: all assertions passed');
