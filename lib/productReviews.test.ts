/**
 * Product review stats — run with: npx tsx lib/productReviews.test.ts
 */
import assert from 'node:assert/strict';
import { computeProductReviewStats, validateProductReviewInput } from './productReviewsLogic';

{
  assert.deepEqual(computeProductReviewStats([]), { average: 0, count: 0 });
  assert.deepEqual(computeProductReviewStats([5, 5, 4]), { average: 4.7, count: 3 });
  assert.deepEqual(computeProductReviewStats([5, 4, 4, 5, 5]), { average: 4.6, count: 5 });
  assert.deepEqual(computeProductReviewStats([0, 6, 3]), { average: 3, count: 1 });
}

{
  const bad = validateProductReviewInput({
    bouquetId: 'not-a-uuid',
    displayName: 'Alex',
    rating: 5,
    reviewText: 'Beautiful bouquet, arrived fresh.',
  });
  assert.equal(bad.ok, false);
}

{
  const ok = validateProductReviewInput({
    bouquetId: '11111111-1111-1111-1111-111111111111',
    displayName: 'Alex',
    rating: 5,
    reviewText: 'Beautiful bouquet, arrived fresh.',
    locale: 'en',
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.data.rating, 5);
    assert.equal(ok.data.locale, 'en');
  }
}

{
  const short = validateProductReviewInput({
    bouquetId: '11111111-1111-1111-1111-111111111111',
    displayName: 'Alex',
    rating: 4,
    reviewText: 'Nice',
  });
  assert.equal(short.ok, false);
}

console.log('productReviews.test.ts ok');
