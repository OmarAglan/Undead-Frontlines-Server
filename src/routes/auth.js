// src/routes/auth.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { hashPassword, verifyPassword, generateAccessToken, generateVerifyToken, makeRefreshToken, verifyToken } = require('../services/auth');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: Number(process.env.SMTP_PORT || 587),
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'email already in use' });

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, password: hashed, displayName: username || null }
    });

    const verifyToken = generateVerifyToken(user.id, '1d');
    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${verifyToken}`;

    // send verification email (best-effort)
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Verify your account',
        text: `Click to verify: ${verifyUrl}`
      });
    } catch (err) {
      console.warn('Failed to send email (dev only):', err.message);
    }

    return res.status(201).json({ success: true, userId: user.id, message: 'Registered, verification email sent (if SMTP configured)' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal' });
  }
});

router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  const payload = verifyToken(token);
  if (!payload || payload.purpose !== 'verify') return res.status(400).json({ error: 'invalid or expired token' });
  try {
    await prisma.user.update({ where: { id: payload.sub }, data: { emailVerified: true } });
    return res.json({ verified: true });
  } catch (err) {
    return res.status(500).json({ error: 'internal' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'missing' });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'invalid' });
    if (!user.emailVerified) return res.status(403).json({ error: 'email not verified' });

    const ok = await verifyPassword(user.password, password);
    if (!ok) return res.status(401).json({ error: 'invalid' });

    const token = generateAccessToken({ userId: user.id, email: user.email }, '15m');
    const refresh = makeRefreshToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30 days

    await prisma.refreshToken.create({ data: { token: refresh, userId: user.id, expiresAt } });

    return res.json({ success: true, token, refreshToken: refresh, userId: user.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal' });
  }
});

router.post('/token/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'missing' });
  const rt = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!rt || rt.revoked || rt.expiresAt < new Date()) return res.status(401).json({ error: 'invalid' });
  const user = await prisma.user.findUnique({ where: { id: rt.userId } });
  if (!user) return res.status(401).json({ error: 'invalid' });

  const token = generateAccessToken({ userId: user.id, email: user.email }, '15m');
  return res.json({ token });
});

module.exports = router;
