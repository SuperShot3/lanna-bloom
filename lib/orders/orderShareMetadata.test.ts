/**
 * Customer order-page Open Graph copy.
 * Run: npx tsx lib/orders/orderShareMetadata.test.ts
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { buildOrderShareMetadata, ORDER_OG_IMAGE_PATH } from './orderShareMetadata';

const jpeg = path.join(process.cwd(), 'public', 'og', 'order.jpg');
assert.ok(existsSync(jpeg), `Missing order OG JPEG: ${jpeg}`);

const withToken = buildOrderShareMetadata({
  orderId: 'LB-2026-JG6JRZPW',
  token: 'secret-token',
});
assert.equal(withToken.title, 'Your order | Lanna Bloom');
assert.match(String(withToken.description), /this is your lanna bloom order page/i);
assert.deepEqual(withToken.robots, { index: false, follow: false });
assert.match(String(withToken.openGraph?.url), /\/order\/LB-2026-JG6JRZPW/);
assert.match(String(withToken.openGraph?.url), /token=secret-token/);
assert.match(
  JSON.stringify(withToken.openGraph?.images),
  new RegExp(ORDER_OG_IMAGE_PATH.replace('/', '\\/'))
);
assert.doesNotMatch(JSON.stringify(withToken), /customerName|customerEmail|0812345678/i);
assert.doesNotMatch(String(withToken.title), /LB-2026-JG6JRZPW/);
assert.doesNotMatch(String(withToken.description), /LB-2026-JG6JRZPW/);

const noToken = buildOrderShareMetadata({
  orderId: 'LB-2026-JG6JRZPW',
  token: '',
});
assert.equal(noToken.title, 'Your order | Lanna Bloom');
assert.doesNotMatch(String(noToken.openGraph?.url), /token=/);

const layoutMeta = buildOrderShareMetadata({ orderId: '', token: '' });
assert.match(String(layoutMeta.openGraph?.url), /\/order$/);
assert.doesNotMatch(String(layoutMeta.openGraph?.url), /\/order\/order/);
assert.deepEqual(layoutMeta.robots, { index: false, follow: false });

console.log('orderShareMetadata.test.ts: ok');
