// /backend/src/modules/notificaciones/services/notificaciones.service.js

import {
  listCatalogos, listInbox, countByVentana, listChatCanalesForUser,
  getPreferences, setPreferences,
  createNotificacion, setSeen, setRead, setDismiss, setArchive, setPin
} from '../repositories/notificaciones.repo.js';

import { sendNotificationEmails } from './email.service.js';
import { sendNotificationPush } from './push.service.js';

import { initModels } from '../../../models/registry.js';
import { sequelize } from '../../../core/db.js';
import { log } from '../../../infra/logging/logger.js';

await initModels();

// ====== Catálogos / Buzón / Preferencias ======
export const svcCatalogos = () => listCatalogos();
export const svcVentanasCount = async (user) => countByVentana(user.id);
export const svcInbox = async (q, user) => listInbox(q, user);
export const svcChatCanales = (user) => listChatCanalesForUser(user.id);

export const svcPreferences = (user) => getPreferences(user.id);

export const svcSetPreferences = async (body, user) => {
  const t = await sequelize.transaction();
  try {
    log.info('notif:prefs:set:start', { user_id: user.id, items: body?.items?.length || 0 });
    const rows = await setPreferences(user.id, body.items, t);
    await t.commit();
    log.info('notif:prefs:set:ok', { user_id: user.id, updated: rows?.length || 0 });
    return rows;
  } catch (e) {
    await t.rollback();
    log.error('notif:prefs:set:err', { user_id: user.id, err: e?.message, stack: e?.stack });
    throw e;
  }
};

// ====== Crear notificación + disparos ======
export const svcCreate = async (body, user) => {
  const t = await sequelize.transaction();
  let notif;
  try {
    log.info('notif:create:start', {
      user_id: user?.id ?? null,
      tipo: body?.tipo_codigo,
      destinos: Array.isArray(body?.destinos) ? body.destinos.length : 0,
      tarea_id: body?.tarea_id || null,
      evento_id: body?.evento_id || null,
      chat_canal_id: body?.chat_canal_id || null,
      canales: body?.canales || null
    });

    notif = await createNotificacion(body, body.destinos, user.id, t);

    await t.commit();
    log.info('notif:create:ok', { notif_id: notif?.id, tipo: body?.tipo_codigo });

  } catch (e) {
    await t.rollback();
    log.error('notif:create:err', { err: e?.message, stack: e?.stack });
    throw e;
  }

  // Disparos fuera de la transacción
  (async () => {
    try {
      log.info('notif:email:dispatch', { notif_id: notif.id });
      await sendNotificationEmails(notif.id); // sin t
      log.info('notif:email:ok', { notif_id: notif.id });
    } catch (e) {
      log.error('notif:email:fail', { notif_id: notif.id, err: e?.message });
    }
  })();

  (async () => {
    try {
      log.info('notif:push:dispatch', { notif_id: notif.id });
      await sendNotificationPush(notif.id); // sin t
      log.info('notif:push:ok', { notif_id: notif.id });
    } catch (e) {
      log.error('notif:push:fail', { notif_id: notif.id, err: e?.message });
    }
  })();

  return notif;
};

/**
 * Helper para crear notificaciones desde procesos del sistema (sin un User activo).
 */
export const createNotificacionGlobal = async (body) => {
  // Simplemente llamamos a svcCreate con un user nulo
  return svcCreate(body, { id: null });
};

// ====== Acciones de estado ======
export const svcMarkSeen = (id, user) => setSeen(id, user.id);
export const svcMarkRead = (id, on, user) => setRead(id, user.id, on);
export const svcDismiss = (id, on, user) => setDismiss(id, user.id, on);
export const svcArchive = (id, on, user) => setArchive(id, user.id, on);
export const svcPin = (id, orden, user) => setPin(id, user.id, orden);

// ====== Admin: Limpiar notificaciones huérfanas ======
import { QueryTypes } from 'sequelize';

/**
 * Limpia notificaciones huérfanas para un usuario específico o todos.
 * Huérfanas = notificaciones que apuntan a tareas/canales/eventos que ya no existen.
 * @param {number|null} userId - Si se pasa, solo limpia para ese usuario. Si es null, limpia para todos.
 * @returns {Object} - Conteo de lo que se limpió
 */
export const svcCleanupOrphans = async (userId = null) => {
  const t = await sequelize.transaction();
  try {
    // 1. Marcar como leídas las notificaciones de tareas que ya no existen
    const tareasOrphans = await sequelize.query(`
      UPDATE "NotificacionDestino" nd
      SET read_at = NOW()
      FROM "Notificacion" n
      WHERE nd.notificacion_id = n.id
        AND n.tarea_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "Tarea" t WHERE t.id = n.tarea_id)
        AND nd.read_at IS NULL
        ${userId ? 'AND nd.user_id = :userId' : ''}
    `, {
      type: QueryTypes.UPDATE,
      replacements: userId ? { userId } : {},
      transaction: t
    });

    // 2. Marcar como leídas las notificaciones de canales de chat que ya no existen
    const chatOrphans = await sequelize.query(`
      UPDATE "NotificacionDestino" nd
      SET read_at = NOW()
      FROM "Notificacion" n
      WHERE nd.notificacion_id = n.id
        AND n.chat_canal_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "ChatCanal" c WHERE c.id = n.chat_canal_id)
        AND nd.read_at IS NULL
        ${userId ? 'AND nd.user_id = :userId' : ''}
    `, {
      type: QueryTypes.UPDATE,
      replacements: userId ? { userId } : {},
      transaction: t
    });

    // 3. Marcar como leídas las notificaciones de eventos que ya no existen
    const eventosOrphans = await sequelize.query(`
      UPDATE "NotificacionDestino" nd
      SET read_at = NOW()
      FROM "Notificacion" n
      WHERE nd.notificacion_id = n.id
        AND n.evento_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "Evento" e WHERE e.id = n.evento_id)
        AND nd.read_at IS NULL
        ${userId ? 'AND nd.user_id = :userId' : ''}
    `, {
      type: QueryTypes.UPDATE,
      replacements: userId ? { userId } : {},
      transaction: t
    });

    await t.commit();

    const result = {
      tareas_cleaned: tareasOrphans[1] || 0,
      chat_cleaned: chatOrphans[1] || 0,
      eventos_cleaned: eventosOrphans[1] || 0,
      user_id: userId || 'all'
    };

    log.info('notif:cleanup:ok', result);
    return result;

  } catch (e) {
    await t.rollback();
    log.error('notif:cleanup:err', { err: e?.message, stack: e?.stack });
    throw e;
  }
};

/**
 * Marca TODAS las notificaciones de un usuario como leídas.
 * Útil para limpiar completamente un buzón.
 * @param {number} userId
 * @param {string|null} buzon - 'chat', 'tareas', 'calendario' o null para todos
 */
export const svcMarkAllRead = async (userId, buzon = null) => {
  const t = await sequelize.transaction();
  try {
    let buzonCondition = '';
    const replacements = { userId };

    if (buzon) {
      const buzonRow = await sequelize.query(
        `SELECT id FROM "BuzonTipo" WHERE codigo = :buzon`,
        { type: QueryTypes.SELECT, replacements: { buzon }, transaction: t }
      );
      if (buzonRow.length) {
        replacements.buzonId = buzonRow[0].id;
        buzonCondition = 'AND n.buzon_id = :buzonId';
      }
    }

    const result = await sequelize.query(`
      UPDATE "NotificacionDestino" nd
      SET read_at = NOW()
      FROM "Notificacion" n
      WHERE nd.notificacion_id = n.id
        AND nd.user_id = :userId
        AND nd.read_at IS NULL
        ${buzonCondition}
    `, {
      type: QueryTypes.UPDATE,
      replacements,
      transaction: t
    });

    await t.commit();

    const count = result[1] || 0;
    log.info('notif:markAllRead:ok', { user_id: userId, buzon, count });
    return { marked_read: count, user_id: userId, buzon };

  } catch (e) {
    await t.rollback();
    log.error('notif:markAllRead:err', { err: e?.message });
    throw e;
  }
};
