export const DISCOUNT_PERCENT = 5;
export const DISCOUNT_MIN_CENTS = 29990;

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function calcDiscountCents(subtotalCents) {
  if (subtotalCents < DISCOUNT_MIN_CENTS) return 0;
  return Math.round((subtotalCents * DISCOUNT_PERCENT) / 100);
}
