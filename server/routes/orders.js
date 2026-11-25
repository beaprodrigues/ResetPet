'use strict';

const express = require('express');
const { db, requireAuth } = require('../../auth-store');

const router = express.Router();

router.get('/orders', requireAuth, (req, res) => {
  const orders = db.prepare(`
    SELECT id, status, amount_subtotal, amount_total, currency, created_at, paid_at
    FROM orders
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id);
  const findItems = db.prepare(`
    SELECT product_id, product_name, quantity
    FROM order_items
    WHERE order_id = ?
    ORDER BY id
  `);

  return res.json({
    orders: orders.map((order) => ({ ...order, items: findItems.all(order.id) }))
  });
});

module.exports = { ordersRouter: router };