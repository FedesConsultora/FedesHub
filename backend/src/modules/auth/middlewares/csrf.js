// src/modules/auth/middlewares/csrf.js
import crypto from 'crypto';
import { COOKIE, COOKIE_OPTS } from '../constants.js';

export const issueCsrf = (_req, res) => {
  const csrf = crypto.randomBytes(24).toString('base64url');
  res.cookie(COOKIE.CSRF, csrf, { ...COOKIE_OPTS.csrf });
  res.json({ csrf });
};
