import { strict as assert } from 'node:assert';
import {
  convertFromThb,
  formatCurrency,
  isDisplayCurrency,
  type CurrencyRates,
} from './currencyDisplay';

const rates: CurrencyRates = { THB: 1, USD: 0.0275, GBP: 0.0215, AUD: 0.042, SGD: 0.0368 };

assert.equal(convertFromThb(1000, 'THB', rates), 1000);
assert.equal(convertFromThb(1000, 'USD', rates), 27.5);
assert.equal(convertFromThb(1000, 'USD', { THB: 1 }), null);
assert.equal(convertFromThb(Number.NaN, 'USD', rates), null);
assert.equal(isDisplayCurrency('SGD'), true);
assert.equal(isDisplayCurrency('EUR'), false);
assert.match(formatCurrency(27.5, 'USD', 'en'), /27\.50/);
