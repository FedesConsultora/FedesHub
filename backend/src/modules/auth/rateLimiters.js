// backend/src/modules/auth/rateLimiters.js
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

export const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

export const loginSlowdown = slowDown({
  windowMs: 10 * 60 * 1000,
  delayAfter: 5,
  delayMs: () => 500,   
});


// nuevo: limitar /refresh
export const refreshLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
