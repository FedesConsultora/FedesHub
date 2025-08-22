// src/modules/auth/constants.js
export const COOKIE = {
  ACCESS: 'fh_at',
  REFRESH: 'fh_rt',
  CSRF:   'fh_csrf'
};

export const TOKEN = {
  ISSUER:  process.env.JWT_ISSUER || 'fedeshub',
  AUD:     process.env.JWT_AUDIENCE || 'fedeshub-app',
  ACCESS_TTL:  process.env.ACCESS_TTL || '15m',
  REFRESH_TTL: process.env.REFRESH_TTL || '7d'
};

export const COOKIE_OPTS = {
  base: {
    httpOnly: true,
    sameSite: 'lax',
    secure: (process.env.COOKIE_SECURE || 'false') === 'true',
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/api',
  },
  csrf: {
    httpOnly: false,
    sameSite: 'lax',
    secure: (process.env.COOKIE_SECURE || 'false') === 'true',
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/api',
  }
};
