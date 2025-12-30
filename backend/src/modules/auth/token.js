// src/modules/auth/token.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { TOKEN } from './constants.js';
import { logger } from '../../core/logger.js';

const baseClaims = () => ({
  iss: TOKEN.ISSUER,
  aud: TOKEN.AUD,
});

export const newJti = () => crypto.randomUUID();

export const signAccess = ({ userId, email, jti }) => jwt.sign(
  { sub: String(userId), email, jti, ...baseClaims() },
  process.env.JWT_ACCESS_SECRET,
  { expiresIn: TOKEN.ACCESS_TTL }
);

export const signRefresh = ({ userId, jti }) => jwt.sign(
  { sub: String(userId), type: 'refresh', jti, ...baseClaims() },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: TOKEN.REFRESH_TTL }
);

export const verifyAccess = (token, { ignoreExpiration = false } = {}) => jwt.verify(
  token, process.env.JWT_ACCESS_SECRET, { audience: TOKEN.AUD, issuer: TOKEN.ISSUER, ignoreExpiration }
);

export const verifyRefresh = (token) => jwt.verify(
  token, process.env.JWT_REFRESH_SECRET, { audience: TOKEN.AUD, issuer: TOKEN.ISSUER }
);

// extra helper para leer exp (en segundos) sin verificar firma
export const decodeUnsafe = (token) => {
  try { return jwt.decode(token, { json: true }); } catch (e) { logger.warn({ e }, 'decodeUnsafe'); return null; }
};
