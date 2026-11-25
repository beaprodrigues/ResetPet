'use strict';

require('dotenv').config();

const path = require('node:path');
const express = require('express');
const { loadSession } = require('../auth-store');
const { authRouter } = require('./routes/auth');
const { checkoutRouter } = require('./routes/checkout');
const { ordersRouter } = require('./routes/orders');
const { stripeWebhookRouter } = require('./routes/stripe-webhook');

const app = express();
const projectRoot = path.join(__dirname, '..');

app.disable('x-powered-by');
app.use('/api', stripeWebhookRouter);
app.use(express.json({ limit: '16kb' }));
app.use(loadSession);
app.use('/api/auth', authRouter);
app.use('/api/account', ordersRouter);
app.use('/api', checkoutRouter);

app.get('/', (req, res) => res.sendFile(path.join(projectRoot, 'index.html')));
app.get('/style.css', (req, res) => res.sendFile(path.join(projectRoot, 'style.css')));
app.use('/js', express.static(path.join(projectRoot, 'js'), { dotfiles: 'deny' }));
app.use('/img', express.static(path.join(projectRoot, 'img'), { dotfiles: 'deny' }));

module.exports = { app };