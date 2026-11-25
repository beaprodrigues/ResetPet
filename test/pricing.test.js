'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateDiscountInCents,
  discountMinimumSubtotalInCents
} = require('../server/pricing');

test('does not apply a discount below the minimum subtotal', () => {
  assert.equal(calculateDiscountInCents(discountMinimumSubtotalInCents - 1), 0);
});

test('applies a rounded five percent discount at the minimum subtotal', () => {
  assert.equal(calculateDiscountInCents(discountMinimumSubtotalInCents), 1500);
});

test('calculates five percent for larger subtotals in cents', () => {
  assert.equal(calculateDiscountInCents(100000), 5000);
});