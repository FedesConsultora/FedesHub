// src/modules/auth/repositories/jwtRevocation.repo.js
import { initModels } from '../../../models/registry.js';

import { Op } from 'sequelize';

const models = await initModels();
export const isRevoked = async (jti) => {
  if (!jti) return false;
  const row = await models.JwtRevocacion.findOne({ where: { jti } });
  return !!row;
};

export const revokeJti = async ({ jti, user_id = null, expires_at, motivo = null }) => {
  if (!jti) return;
  await models.JwtRevocacion.findOrCreate({
    where: { jti },
    defaults: { jti, user_id, expires_at, motivo, revoked_at: new Date() }
  });
};

// limpieza opcional (no crítico)
export const purgeExpiredRevocations = async () => {
  await models.JwtRevocacion.destroy({ where: { expires_at: { [Op.lt]: new Date() } } });
};
