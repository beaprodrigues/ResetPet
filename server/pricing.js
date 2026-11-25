'use strict';

const discountPercent = 5;
const discountMinimumSubtotalInCents = 29990;

function calculateDiscountInCents(subtotalInCents) {
  if (subtotalInCents < discountMinimumSubtotalInCents) return 0;
  return Math.round(subtotalInCents * discountPercent / 100);
}

module.exports = {
  calculateDiscountInCents,
  discountMinimumSubtotalInCents,
  discountPercent
};