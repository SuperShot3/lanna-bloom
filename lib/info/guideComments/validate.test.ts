/**
 * Security-focused validation tests for guide comments.
 * Run with: npx tsx lib/info/guideComments/validate.test.ts
 */

import { isCommentableGuideSlug, BESPOKE_GUIDE_SLUGS } from './allowlist';
import { hashVisitorToken } from './hash';
import { normalizeVisitorToken, validateCommentInput } from './validate';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

assert(isCommentableGuideSlug('rose-bouquets-chiang-mai'), 'registered slug');
for (const slug of BESPOKE_GUIDE_SLUGS) {
  assert(isCommentableGuideSlug(slug), `bespoke slug ${slug}`);
}
assert(!isCommentableGuideSlug('not-a-real-guide'), 'unknown slug');
assert(!isCommentableGuideSlug("rose-bouquets' OR 1=1--"), 'SQLi slug');
assert(isCommentableGuideSlug('Rose-Bouquets-Chiang-Mai'), 'mixed case normalized');

const hash = (t: string) => hashVisitorToken(t);
const token = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const valid = validateCommentInput({
  guideSlug: 'birthday-flower-gift',
  authorName: 'Jane',
  body: 'Great guide!',
  locale: 'en',
  visitorToken: token,
  visitorTokenHash: hash,
});
assert(valid.ok === true, 'valid comment');

const emptyBody = validateCommentInput({
  guideSlug: 'birthday-flower-gift',
  authorName: 'Jane',
  body: '   ',
  visitorToken: 'abcdefghij',
  visitorTokenHash: hash,
});
assert(emptyBody.ok === false, 'empty body rejected');

const xss = '<script>alert(1)</script>';
const xssResult = validateCommentInput({
  guideSlug: 'flowers-chiang-mai',
  authorName: xss,
  body: xss,
  visitorToken: 'abcdefghij',
  visitorTokenHash: hash,
});
assert(xssResult.ok === true, 'xss stored as text');
if (xssResult.ok) {
  assert(xssResult.data.authorName === xss, 'xss name preserved as text');
  assert(xssResult.data.body === xss, 'xss body preserved as text');
}

assert(normalizeVisitorToken('a1b2c3d4-e5f6-7890-abcd-ef1234567890') !== null, 'uuid token');
assert(normalizeVisitorToken('abc') === null, 'short token rejected');

console.log('guideComments validate tests passed');
