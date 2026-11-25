'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'resetpet-account-tests-'));
process.env.DB_PATH = path.join(temporaryDirectory, 'test.sqlite');
process.env.APP_URL = 'http://localhost';
process.env.STRIPE_SECRET_KEY = '';
process.env.STRIPE_WEBHOOK_SECRET = '';

const { app } = require('../server/app');
const { db } = require('../auth-store');
let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  db.close();
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

async function request(endpoint, { method = 'GET', body, cookie } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;

  return fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
}

function readSessionCookie(response) {
  const cookieHeader = response.headers.get('set-cookie');
  assert.ok(cookieHeader);
  assert.match(cookieHeader, /HttpOnly/);
  assert.match(cookieHeader, /SameSite=Lax/);
  return cookieHeader.split(';')[0];
}

test('accounts authenticate and can only access their own orders', async () => {
  let response = await request('/api/account/orders');
  assert.equal(response.status, 401);

  response = await request('/api/create-checkout-session', {
    method: 'POST',
    body: { items: [{ productId: 'pet-calm', qty: 1 }] }
  });
  assert.equal(response.status, 401);

  const email = `customer-${Date.now()}@example.com`;
  response = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Cliente Teste', email, password: 'SenhaSegura123!' }
  });
  assert.equal(response.status, 201);
  let sessionCookie = readSessionCookie(response);
  const user = (await response.json()).user;

  response = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Cliente Teste', email, password: 'SenhaSegura123!' }
  });
  assert.equal(response.status, 409);

  response = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password: 'senha-incorreta' }
  });
  assert.equal(response.status, 401);

  response = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password: 'SenhaSegura123!' }
  });
  assert.equal(response.status, 200);
  sessionCookie = readSessionCookie(response);

  response = await request('/api/account/orders', { cookie: sessionCookie });
  assert.deepEqual((await response.json()).orders, []);

  const orderId = 'order-test-1';
  db.prepare(`
    INSERT INTO orders (id, user_id, status, amount_subtotal, amount_total, created_at)
    VALUES (?, ?, 'paid', 9990, 9990, ?)
  `).run(orderId, user.id, Date.now());
  db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_amount_cents)
    VALUES (?, 'pet-calm', 'Pet Calm', 1, 9990)
  `).run(orderId);

  response = await request('/api/account/orders', { cookie: sessionCookie });
  const customerOrders = (await response.json()).orders;
  assert.equal(customerOrders.length, 1);
  assert.equal(customerOrders[0].items[0].product_name, 'Pet Calm');

  const secondEmail = `second-${Date.now()}@example.com`;
  response = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Outra Conta', email: secondEmail, password: 'SenhaSegura123!' }
  });
  const secondSessionCookie = readSessionCookie(response);

  response = await request('/api/account/orders', { cookie: secondSessionCookie });
  assert.deepEqual((await response.json()).orders, []);

  response = await request('/api/auth/logout', { method: 'POST', cookie: sessionCookie, body: {} });
  assert.equal(response.status, 200);
  response = await request('/api/account/orders', { cookie: sessionCookie });
  assert.equal(response.status, 401);
});