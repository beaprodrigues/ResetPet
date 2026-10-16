'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomBytes, randomUUID, scrypt: scryptCallback, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const Database = require('better-sqlite3');

const scrypt = promisify(scryptCallback);
const sessionCookieName = 'resetpet.sid';
const sessionLifetimeMs = 14 * 24 * 60 * 60 * 1000;
const databasePath = process.env.DB_PATH || path.join(__dirname, 'data', 'resetpet.sqlite');

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_session_id TEXT,
    status TEXT NOT NULL,
    amount_subtotal INTEGER NOT NULL,
    amount_total INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'brl',
    created_at INTEGER NOT NULL,
    paid_at INTEGER
  );

  CREATE INDEX IF NOT EXISTS orders_user_date_idx ON orders(user_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_amount_cents INTEGER NOT NULL
  );
`);

const orderColumns = db.prepare('PRAGMA table_info(orders)').all().map((column) => column.name);
if (!orderColumns.includes('stripe_session_id')) {
  db.exec('ALTER TABLE orders ADD COLUMN stripe_session_id TEXT');
}
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_session_idx
  ON orders(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL
`);

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function readCookie(req, name) {
  const cookies = req.headers.cookie?.split(';') ?? [];
  const cookie = cookies.map((entry) => entry.trim()).find((entry) => entry.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const maxAge = Math.floor(sessionLifetimeMs / 1000);
  res.setHeader('Set-Cookie', `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`);
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

function createSession(userId, res, previousTokenHash) {
  if (previousTokenHash) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(previousTokenHash);
  }

  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(tokenHash, userId, Date.now() + sessionLifetimeMs);
  setSessionCookie(res, token);
}

function loadSession(req, res, next) {
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);

  const token = readCookie(req, sessionCookieName);
  if (token && token.length <= 128) {
    const tokenHash = hashToken(token);
    const session = db.prepare(`
      SELECT sessions.token_hash, users.id, users.name, users.email
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    `).get(tokenHash, now);

    if (session) {
      req.sessionTokenHash = session.token_hash;
      req.user = { id: session.id, name: session.name, email: session.email };
    }
  }

  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Entre na sua conta para continuar.' });
  return next();
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const passwordHash = await scrypt(password, salt, 64);
  return { salt: salt.toString('hex'), hash: passwordHash.toString('hex') };
}

async function verifyPassword(password, salt, storedHash) {
  const passwordHash = await scrypt(password, Buffer.from(salt, 'hex'), 64);
  const expectedHash = Buffer.from(storedHash, 'hex');
  return expectedHash.length === passwordHash.length && timingSafeEqual(passwordHash, expectedHash);
}

module.exports = {
  clearSessionCookie,
  createSession,
  db,
  hashPassword,
  loadSession,
  newUserId: randomUUID,
  requireAuth,
  verifyPassword
};