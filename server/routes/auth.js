'use strict';

const express = require('express');
const { rateLimit } = require('express-rate-limit');
const {
  clearSessionCookie,
  createSession,
  db,
  hashPassword,
  newUserId,
  verifyPassword
} = require('../../auth-store');

const router = express.Router();
const authenticationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

router.get('/me', (req, res) => res.json({ user: req.user ?? null }));

router.post('/register', authenticationLimiter, async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password;

  if (name.length < 2 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || email.length > 254 || typeof password !== 'string' || password.length < 10 || password.length > 128) {
    return res.status(400).json({ error: 'Informe nome, e-mail válido e senha com pelo menos 10 caracteres.' });
  }

  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'Já existe uma conta com esse e-mail.' });
  }

  const { salt, hash } = await hashPassword(password);
  const userId = newUserId();
  db.prepare('INSERT INTO users (id, name, email, password_salt, password_hash) VALUES (?, ?, ?, ?, ?)')
    .run(userId, name, email, salt, hash);
  createSession(userId, res, req.sessionTokenHash);
  return res.status(201).json({ user: { id: userId, name, email } });
});

router.post('/login', authenticationLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password;
  const user = db.prepare('SELECT id, name, email, password_salt, password_hash FROM users WHERE email = ?')
    .get(email);

  if (!user || typeof password !== 'string'
    || !await verifyPassword(password, user.password_salt, user.password_hash)) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  createSession(user.id, res, req.sessionTokenHash);
  return res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

router.post('/logout', (req, res) => {
  if (req.sessionTokenHash) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(req.sessionTokenHash);
  }
  clearSessionCookie(res);
  return res.json({ ok: true });
});

module.exports = { authRouter: router };