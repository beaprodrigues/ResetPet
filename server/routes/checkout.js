'use strict';

const express = require('express');
const { randomUUID } = require('node:crypto');
const { db, requireAuth } = require('../../auth-store');
const { configuration, stripeClient } = require('../config');
const { productCatalog } = require('../catalog');
const { calculateDiscountInCents, discountPercent } = require('../pricing');

const router = express.Router();

function validateCart(cartItems) {
  if (!Array.isArray(cartItems) || cartItems.length === 0 || cartItems.length > 10) return null;

  const validItems = [];
  const seenProductIds = new Set();
  for (const cartItem of cartItems) {
    const product = productCatalog[cartItem?.productId];
    const quantity = cartItem?.qty;
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 99
      || seenProductIds.has(cartItem.productId)) {
      return null;
    }

    seenProductIds.add(cartItem.productId);
    validItems.push({ productId: cartItem.productId, product, quantity });
  }

  return validItems;
}

function savePendingOrder(orderId, userId, subtotalInCents, totalInCents, items) {
  const createOrder = db.transaction(() => {
    db.prepare(`
      INSERT INTO orders (id, user_id, status, amount_subtotal, amount_total, created_at)
      VALUES (?, ?, 'pending', ?, ?, ?)
    `).run(orderId, userId, subtotalInCents, totalInCents, Date.now());

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_amount_cents)
      VALUES (?, ?, ?, ?, ?)
    `);
    items.forEach(({ productId, product, quantity }) => {
      insertItem.run(orderId, productId, product.name, quantity, product.priceInCents);
    });
  });

  createOrder();
}

router.post('/create-checkout-session', requireAuth, async (req, res) => {
  if (!stripeClient || !configuration.appUrl) {
    return res.status(503).json({
      error: 'Checkout indisponível: configure STRIPE_SECRET_KEY e APP_URL no servidor.'
    });
  }

  const validItems = validateCart(req.body?.items);
  if (!validItems) return res.status(400).json({ error: 'Carrinho inválido.' });

  const subtotalInCents = validItems.reduce(
    (subtotal, item) => subtotal + item.product.priceInCents * item.quantity,
    0
  );
  const discountInCents = calculateDiscountInCents(subtotalInCents);
  const totalInCents = subtotalInCents - discountInCents;
  const orderId = randomUUID();
  const stripeLineItems = validItems.map(({ product, quantity }) => ({
    quantity,
    price_data: {
      currency: 'brl',
      unit_amount: product.priceInCents,
      product_data: { name: product.name }
    }
  }));

  savePendingOrder(orderId, req.user.id, subtotalInCents, totalInCents, validItems);

  let stripeCouponId;
  try {
    const discounts = [];
    if (discountInCents > 0) {
      const coupon = await stripeClient.coupons.create({
        amount_off: discountInCents,
        currency: 'brl',
        duration: 'once',
        max_redemptions: 1,
        name: `Desconto ResetPet ${discountPercent}%`
      });
      stripeCouponId = coupon.id;
      discounts.push({ coupon: coupon.id });
    }

    const checkoutSession = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      line_items: stripeLineItems,
      ...(discounts.length ? { discounts } : {}),
      customer_email: req.user.email,
      client_reference_id: req.user.id,
      metadata: { orderId },
      success_url: `${configuration.appUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${configuration.appUrl}/?checkout=cancelled#produtos`
    });

    db.prepare('UPDATE orders SET stripe_session_id = ? WHERE id = ?').run(checkoutSession.id, orderId);
    return res.json({ url: checkoutSession.url });
  } catch (error) {
    db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
    if (stripeCouponId) {
      try {
        await stripeClient.coupons.del(stripeCouponId);
      } catch (cleanupError) {
        console.warn('Não foi possível remover o cupom temporário:', cleanupError.message);
      }
    }
    console.error('Falha ao criar sessão Stripe:', error.message);
    return res.status(502).json({ error: 'Não foi possível iniciar o pagamento. Tente novamente.' });
  }
});

router.get('/checkout-session', requireAuth, async (req, res) => {
  if (!stripeClient) {
    return res.status(503).json({ error: 'Verificação de pagamento indisponível.' });
  }

  const sessionId = req.query.session_id;
  if (typeof sessionId !== 'string' || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return res.status(400).json({ error: 'Sessão de pagamento inválida.' });
  }

  try {
    const checkoutSession = await stripeClient.checkout.sessions.retrieve(sessionId);
    if (checkoutSession.client_reference_id !== req.user.id || !checkoutSession.metadata?.orderId) {
      return res.status(403).json({ error: 'Essa compra não pertence à sua conta.' });
    }

    const order = db.prepare('SELECT id FROM orders WHERE id = ? AND user_id = ?')
      .get(checkoutSession.metadata.orderId, req.user.id);
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });

    const isPaid = checkoutSession.payment_status === 'paid';
    if (isPaid) {
      db.prepare(`
        UPDATE orders
        SET status = 'paid', stripe_session_id = ?, amount_subtotal = ?, amount_total = ?, paid_at = ?
        WHERE id = ? AND user_id = ?
      `).run(
        checkoutSession.id,
        checkoutSession.amount_subtotal,
        checkoutSession.amount_total,
        Date.now(),
        order.id,
        req.user.id
      );
    }

    return res.json({ paid: isPaid });
  } catch (error) {
    console.error('Falha ao verificar sessão Stripe:', error.message);
    return res.status(502).json({ error: 'Não foi possível verificar o pagamento.' });
  }
});

module.exports = { checkoutRouter: router, validateCart };