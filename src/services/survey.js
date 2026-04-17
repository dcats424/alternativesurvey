const crypto = require('crypto');
const db = require('../db');

function generateToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function getExpiry() {
  const ttl = Number(process.env.TOKEN_TTL_HOURS || 24);
  const d = new Date();
  d.setHours(d.getHours() + ttl);
  return d.toISOString();
}

async function createToken() {
  const token = generateToken();
  const expiresAt = getExpiry();
  
  await db.query(
    `INSERT INTO survey_tokens (token, expires_at) VALUES ($1, $2)`,
    [token, expiresAt]
  );
  
  return { token, expiresAt };
}

async function validateToken(token) {
  if (!token) return { error: 'token_required' };
  
  const result = await db.query(
    `SELECT * FROM survey_tokens WHERE token = $1`,
    [token]
  );
  
  if (!result.rows[0]) return { error: 'invalid_token' };
  
  const tokenData = result.rows[0];
  
  if (tokenData.used_at) {
    return { error: 'token_already_used' };
  }
  
  if (new Date(tokenData.expires_at) < new Date()) {
    return { error: 'token_expired' };
  }
  
  return { ok: true, tokenData };
}

async function markTokenUsed(token) {
  await db.query(
    `UPDATE survey_tokens SET used_at = NOW() WHERE token = $1`,
    [token]
  );
}

module.exports = { createToken, validateToken, markTokenUsed };
