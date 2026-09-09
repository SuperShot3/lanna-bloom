/**
 * Product review stats — run with: npx tsx lib/productReviews.test.ts
 */
import assert from 'node:assert/strict';
import {
  computeProductReviewStats,
  hashProductReviewToken,
  isDeliveredPaidOrderForReview,
  isProductReviewVerifyToken,
  toProductJsonLdReviews,
  validateProductReviewInput,
} from './productReviewsLogic';

{
  assert.deepEqual(computeProductReviewStats([]), { average: 0, count: 0 });
  assert.deepEqual(computeProductReviewStats([5, 5, 4]), { average: 4.7, count: 3 });
  assert.deepEqual(computeProductReviewStats([4, 4, 5, 5, 5]), { average: 4.6, count: 5 });
  assert.deepEqual(computeProductReviewStats([0, 6, 3]), { average: 3, count: 1 });
}

{
  const bad = validateProductReviewInput({
    bouquetId: 'not-a-uuid',
    displayName: 'Alex',
    authorEmail: 'alex@example.com',
    rating: 5,
    reviewText: 'Beautiful bouquet, arrived fresh.',
  });
  assert.equal(bad.ok, false);
}

{
  const missingEmail = validateProductReviewInput({
    bouquetId: '11111111-1111-1111-1111-111111111111',
    displayName: 'Alex',
    rating: 5,
    reviewText: 'Beautiful bouquet, arrived fresh.',
  });
  assert.equal(missingEmail.ok, false);
  if (!missingEmail.ok) assert.equal(missingEmail.message, 'Email is required');
}

{
  const invalidEmail = validateProductReviewInput({
    bouquetId: '11111111-1111-1111-1111-111111111111',
    displayName: 'Alex',
    authorEmail: 'not-an-email',
    rating: 5,
    reviewText: 'Beautiful bouquet, arrived fresh.',
  });
  assert.equal(invalidEmail.ok, false);
}

{
  const ok = validateProductReviewInput({
    bouquetId: '11111111-1111-1111-1111-111111111111',
    displayName: 'Alex',
    authorEmail: 'Alex@Example.COM',
    rating: 5,
    reviewText: 'Beautiful bouquet, arrived fresh.',
    locale: 'en',
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.data.rating, 5);
    assert.equal(ok.data.locale, 'en');
    assert.equal(ok.data.authorEmail, 'alex@example.com');
  }
}

{
  const short = validateProductReviewInput({
    bouquetId: '11111111-1111-1111-1111-111111111111',
    displayName: 'Alex',
    authorEmail: 'alex@example.com',
    rating: 4,
    reviewText: 'Nice',
  });
  assert.equal(short.ok, false);
}

{
  const a = hashProductReviewToken('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  const b = hashProductReviewToken('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  const c = hashProductReviewToken('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.equal(a.length, 64);
}

{
  assert.equal(isProductReviewVerifyToken('a'.repeat(64)), true);
  assert.equal(isProductReviewVerifyToken('g'.repeat(64)), false);
  assert.equal(isProductReviewVerifyToken('short'), false);
}

{
  const bouquetId = '11111111-1111-1111-1111-111111111111';
  const base = {
    paymentStatus: 'PAID',
    orderStatus: 'DELIVERED',
    fulfillmentStatus: 'delivered',
    customerEmail: 'Alex@Shop.com',
    itemBouquetId: bouquetId,
    reviewEmail: 'alex@shop.com',
    reviewBouquetId: bouquetId,
  };
  assert.equal(isDeliveredPaidOrderForReview(base), true);
  assert.equal(isDeliveredPaidOrderForReview({ ...base, paymentStatus: 'NOT_PAID' }), false);
  assert.equal(
    isDeliveredPaidOrderForReview({
      ...base,
      orderStatus: 'OUT_FOR_DELIVERY',
      fulfillmentStatus: 'out_for_delivery',
    }),
    false
  );
  assert.equal(
    isDeliveredPaidOrderForReview({
      ...base,
      orderStatus: 'OUT_FOR_DELIVERY',
      fulfillmentStatus: 'delivered',
    }),
    true
  );
  assert.equal(
    isDeliveredPaidOrderForReview({ ...base, customerEmail: 'other@shop.com' }),
    false
  );
  assert.equal(
    isDeliveredPaidOrderForReview({
      ...base,
      itemBouquetId: '22222222-2222-2222-2222-222222222222',
    }),
    false
  );
}

{
  const mapped = toProductJsonLdReviews(
    [
      {
        displayName: 'Alex',
        rating: 5,
        reviewText: 'Beautiful bouquet, arrived fresh.',
        createdAt: '2026-09-01T10:00:00.000Z',
      },
    ],
    50
  );
  assert.equal(mapped.length, 1);
  assert.equal(mapped[0].authorName, 'Alex');
  assert.equal(mapped[0].rating, 5);
}

console.log('productReviews.test.ts ok');
