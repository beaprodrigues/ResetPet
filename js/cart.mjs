import {
  $,
  $$,
  calcDiscountCents,
  DISCOUNT_MIN_CENTS,
  DISCOUNT_PERCENT,
  formatBRL
} from './shared.mjs';
import { showToast } from './toast.mjs';

const drawer = $('#cart-drawer');
const overlay = $('#cart-overlay');
const closeBtn = $('#cart-close');
const itemsEl = $('#cart-items');
const footerEl = $('#cart-footer');
const subtotalEl = $('#cart-subtotal');
const discountEl = $('#cart-discount');
const totalEl = $('#cart-total');
const badgeEl = $('#cart-count');
const checkoutBtn = $('#checkout-button');
const statusEl = $('#checkout-status');

const STORAGE_KEY = 'resetpet-cart';
const RESUME_KEY = 'resetpet-checkout-after-login';
const UNIT_PRICE_CENTS = 9990;

let cart = [];
let catalog = new Map();

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Ignore storage quota errors
  }
}

function loadCatalog() {
  catalog = new Map($$('.btn-add[data-product-id]').map((btn) => {
    const card = btn.closest('.linha-card');
    const id = btn.dataset.productId;
    const name = $('.linha-card-name', card)?.textContent.trim() ?? '';
    const priceEl = $('.linha-card-price', card);

    if (priceEl) {
      const current = document.createElement('span');
      current.className = 'linha-card-price-current';
      current.textContent = formatBRL(UNIT_PRICE_CENTS / 100);

      const promo = document.createElement('span');
      promo.className = 'linha-card-price-promo';
      promo.textContent = `${DISCOUNT_PERCENT}% OFF acima de ${formatBRL(DISCOUNT_MIN_CENTS / 100)}`;
      priceEl.replaceChildren(current, promo);
    }

    return [id, { id, name, priceInCents: UNIT_PRICE_CENTS }];
  }));
}

function restoreCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    cart = Array.isArray(saved)
      ? saved.filter((item) => (
        catalog.has(item.productId)
        && Number.isInteger(item.qty)
        && item.qty > 0
        && item.qty <= 99
      ))
      : [];
  } catch {
    cart = [];
  }
}

function openCart() {
  drawer?.classList.add('open');
  overlay?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  drawer?.classList.remove('open');
  overlay?.classList.remove('open');
  document.body.style.overflow = '';
}

function updateBadge() {
  if (!badgeEl) return;

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  badgeEl.textContent = totalQty;
  badgeEl.classList.toggle('visible', totalQty > 0);
  badgeEl.style.animation = 'none';
  requestAnimationFrame(() => {
    badgeEl.style.animation = 'badgePop .3s var(--ease-bounce)';
  });
}

function createQtyBtn(product, delta) {
  const btn = document.createElement('button');
  btn.className = 'qty-btn';
  btn.type = 'button';
  btn.dataset.productId = product.id;
  btn.dataset.delta = delta;
  btn.setAttribute('aria-label', `${delta < 0 ? 'Remover' : 'Adicionar'} ${product.name}`);
  btn.textContent = delta < 0 ? '−' : '+';
  return btn;
}

function renderCart() {
  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = '<p class="cart-empty">Seu carrinho está vazio.</p>';
    footerEl.style.display = 'none';
    subtotalEl.textContent = formatBRL(0);
    discountEl.textContent = `− ${formatBRL(0)}`;
    totalEl.textContent = formatBRL(0);
    return;
  }

  footerEl.style.display = 'flex';
  const rows = cart.map((item) => {
    const product = catalog.get(item.productId);
    const row = document.createElement('div');
    row.className = 'cart-item';

    const info = document.createElement('div');
    info.className = 'cart-item-info';

    const name = document.createElement('p');
    name.className = 'cart-item-name';
    name.textContent = product.name;

    const price = document.createElement('p');
    price.className = 'cart-item-price';
    price.textContent = formatBRL(product.priceInCents / 100);
    info.append(name, price);

    const qtyBox = document.createElement('div');
    qtyBox.className = 'cart-item-qty';
    const qty = document.createElement('span');
    qty.textContent = item.qty;
    qtyBox.append(createQtyBtn(product, -1), qty, createQtyBtn(product, 1));

    row.append(info, qtyBox);
    return row;
  });

  itemsEl.replaceChildren(...rows);

  const subtotalCents = cart.reduce(
    (sum, item) => sum + catalog.get(item.productId).priceInCents * item.qty,
    0
  );
  const discountCents = calcDiscountCents(subtotalCents);
  subtotalEl.textContent = formatBRL(subtotalCents / 100);
  discountEl.textContent = `− ${formatBRL(discountCents / 100)}`;
  totalEl.textContent = formatBRL((subtotalCents - discountCents) / 100);
}

function addItem(productId) {
  const product = catalog.get(productId);
  if (!product) return;

  const existing = cart.find((item) => item.productId === productId);
  if (existing) {
    existing.qty = Math.min(99, existing.qty + 1);
  } else {
    cart.push({ productId, qty: 1 });
  }

  saveCart();
  renderCart();
  updateBadge();
  showToast(`${product.name} adicionado ao carrinho`);
}

function changeQty(productId, delta) {
  const item = cart.find((entry) => entry.productId === productId);
  if (!item) return;

  item.qty = Math.min(99, item.qty + delta);
  if (item.qty <= 0) {
    cart = cart.filter((entry) => entry.productId !== productId);
  }

  saveCart();
  renderCart();
  updateBadge();
}

async function startCheckout() {
  if (cart.length === 0 || !checkoutBtn) return;

  checkoutBtn.disabled = true;
  checkoutBtn.textContent = 'Conectando ao pagamento...';
  if (statusEl) statusEl.textContent = '';

  try {
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart })
    });
    const data = await res.json();

    if (res.status === 401) {
      sessionStorage.setItem(RESUME_KEY, '1');
      document.dispatchEvent(new Event('account:open'));
    }
    if (!res.ok) throw new Error(data.error || 'Não foi possível iniciar o pagamento.');
    if (!data.url) throw new Error('Endereço de pagamento não retornado.');

    window.location.assign(data.url);
  } catch (err) {
    if (statusEl) statusEl.textContent = err.message;
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = 'Finalizar compra';
  }
}

async function handleCheckoutReturn() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('checkout');
  if (!status) return;

  if (status === 'success') {
    const sessionId = params.get('session_id');
    if (!sessionId) {
      showToast('Não foi possível confirmar o pagamento. Seu carrinho foi mantido.');
      return;
    }

    try {
      const res = await fetch(`/api/checkout-session?session_id=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (!res.ok || !data.paid) throw new Error();
    } catch {
      showToast('Não foi possível confirmar o pagamento. Seu carrinho foi mantido.');
      return;
    }

    cart = [];
    saveCart();
    renderCart();
    updateBadge();
    showToast('Pagamento confirmado. Obrigado pela compra!');
  } else if (status === 'cancelled') {
    showToast('Pagamento cancelado. Seu carrinho continua salvo.');
  }

  params.delete('checkout');
  params.delete('session_id');
  const query = params.toString();
  window.history.replaceState(
    {},
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
  );
}

export function initCart() {
  loadCatalog();
  restoreCart();

  $('.cart-btn')?.addEventListener('click', openCart);
  closeBtn?.addEventListener('click', closeCart);
  overlay?.addEventListener('click', closeCart);

  itemsEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('.qty-btn');
    if (btn) changeQty(btn.dataset.productId, Number.parseInt(btn.dataset.delta, 10));
  });

  $$('.btn-add').forEach((btn) => {
    btn.addEventListener('click', () => addItem(btn.dataset.productId));
  });

  checkoutBtn?.addEventListener('click', startCheckout);
  document.addEventListener('checkout:resume', startCheckout);

  renderCart();
  updateBadge();
  handleCheckoutReturn();
}
