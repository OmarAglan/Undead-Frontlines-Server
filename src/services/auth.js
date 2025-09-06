// src/services/auth.js
const jwt = require('jsonwebtoken');
const argon2 = require('argon2');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

function generateAccessToken(payload, expiresIn = '15m') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function generateVerifyToken(userId, expiresIn = '1d') {
  return jwt.sign({ sub: userId, purpose: 'verify' }, JWT_SECRET, { expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

async function hashPassword(password) {
  return await argon2.hash(password);
}

async function verifyPassword(hash, password) {
  return await argon2.verify(hash, password);
}

function makeRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  generateAccessToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  generateVerifyToken,
  makeRefreshToken
};
