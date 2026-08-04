/**
 * Shop catalog access helpers (Feature 4).
 * Run with: npx tsx lib/provinces/shopAccess.test.ts
 */

import {
  canEnterCatalog,
  categoryAllowed,
  normalizeShopCategoryKey,
} from './shopAccess';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

assert(normalizeShopCategoryKey(' Toys ') === 'plushy_toys', 'toys alias');
assert(normalizeShopCategoryKey('gifts') === 'gifts', 'gifts passthrough');

assert(canEnterCatalog(null) === true, 'missing province allows catalog');
assert(
  canEnterCatalog({ status: 'same_day', catalog_enabled: true }) === true,
  'same_day + catalog on'
);
assert(
  canEnterCatalog({ status: 'next_day', catalog_enabled: true }) === true,
  'next_day + catalog on'
);
assert(
  canEnterCatalog({ status: 'preorder_only', catalog_enabled: true }) === true,
  'preorder + catalog on'
);
assert(
  canEnterCatalog({ status: 'coming_soon', catalog_enabled: false }) === false,
  'coming_soon blocked'
);
assert(
  canEnterCatalog({ status: 'coming_soon', catalog_enabled: true }) === false,
  'coming_soon blocked even if flag wrongly on'
);
assert(
  canEnterCatalog({ status: 'temporarily_unavailable', catalog_enabled: true }) ===
    false,
  'temp unavailable blocked'
);
assert(
  canEnterCatalog({ status: 'same_day', catalog_enabled: false }) === false,
  'catalog_enabled false'
);

const expansion = { isExpansionDestination: true as const };
const chiangMai = { isExpansionDestination: false as const };

assert(
  categoryAllowed(null, 'flowers', expansion) === true,
  'expansion default flowers'
);
assert(
  categoryAllowed(null, 'gifts', expansion) === false,
  'expansion default no gifts'
);
assert(
  categoryAllowed(null, 'gifts', chiangMai) === true,
  'CM default all categories'
);
assert(
  categoryAllowed(null, 'plushy_toys', chiangMai) === true,
  'CM default toys'
);

const limited = {
  status: 'next_day' as const,
  catalog_enabled: true,
  available_categories: ['flowers', 'gifts'],
};
assert(categoryAllowed(limited, 'flowers', expansion) === true, 'listed flowers');
assert(categoryAllowed(limited, 'gifts', expansion) === true, 'listed gifts');
assert(categoryAllowed(limited, 'balloons', expansion) === false, 'unlisted balloons');
assert(
  categoryAllowed(
    { ...limited, available_categories: ['flowers', 'toys'] },
    'plushy_toys',
    expansion
  ) === true,
  'toys alias in list'
);

assert(
  categoryAllowed(
    { status: 'same_day', catalog_enabled: true, available_categories: [] },
    'gifts',
    expansion
  ) === false,
  'empty array falls back to flowers-only on expansion'
);

console.log('shopAccess.test.ts: ok');
