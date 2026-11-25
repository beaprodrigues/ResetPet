'use strict';

const Stripe = require('stripe');

const configuration = Object.freeze({
  port: Number(process.env.PORT) || 3000,
  appUrl: process.env.APP_URL?.replace(/\/$/, ''),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET
});

const stripeClient = configuration.stripeSecretKey
  ? new Stripe(configuration.stripeSecretKey)
  : null;

module.exports = { configuration, stripeClient };