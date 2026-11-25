'use strict';

const express = require('express');
const { db } = require('../../auth-store');
const { configuration, stripeClient } = require('../config');

const router = express.Router();

router.post('/stripe-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripeClient || !configuration.stripeWebhookSecret) {
    return res.status(503).json({ error: 'Webhook Stripe não configurado.' });
  }

  let event;
  try {
    event = stripeClient.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      configuration.stripeWebhookSecret
    );
  } catch (error) {
    console.warn('Assinatura de webhook Stripe inválida:', error.message);
    return res.status(400).send('Assinatura inválida.');
  }

  const checkoutSession = event.data.object;
  const orderId = checkoutSession.metadata?.orderId;
  const successfulPaymentEvents = [
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded'
  ];

  if (orderId && successfulPaymentEvents.includes(event.type)
    && checkoutSession.payment_status === 'paid') {
    db.prepare(`
      UPDATE orders
      SET status = 'paid', stripe_session_id = ?, amount_subtotal = ?, amount_total = ?, paid_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      checkoutSession.id,
      checkoutSession.amount_subtotal,
      checkoutSession.amount_total,
      Date.now(),
      orderId,
      checkoutSession.client_reference_id
    );
  } else if (orderId && event.type === 'checkout.session.expired') {
    db.prepare("UPDATE orders SET status = 'expired' WHERE id = ? AND status = 'pending'").run(orderId);
  }

  return res.json({ received: true });
});

module.exports = { stripeWebhookRouter: router };