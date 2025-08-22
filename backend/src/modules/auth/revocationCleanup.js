// backend/src/modules/auth/revocationCleanup.js
import { purgeExpiredRevocations } from './repositories/jwtRevocation.repo.js';
import { logger } from '../../core/logger.js';

export const startRevocationCleanupJob = () => {
  // corre cada 6 horas
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const run = async () => {
    try { await purgeExpiredRevocations(); }
    catch (e) { logger.warn({ e }, 'purgeExpiredRevocations failed'); }
  };
  run();
  setInterval(run, SIX_HOURS);
};
