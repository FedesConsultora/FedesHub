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
export const svcCatalogos     = () => listCatalogos();
export const svcVentanasCount = async (user) => countByVentana(user.id);
export const svcInbox         = async (q, user) => listInbox(q, user);
export const svcChatCanales   = (user) => listChatCanalesForUser(user.id);

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

// ====== Acciones de estado ======
export const svcMarkSeen = (id, user)        => setSeen(id, user.id);
export const svcMarkRead = (id, on, user)    => setRead(id, user.id, on);
export const svcDismiss  = (id, on, user)    => setDismiss(id, user.id, on);
export const svcArchive  = (id, on, user)    => setArchive(id, user.id, on);
export const svcPin      = (id, orden, user) => setPin(id, user.id, orden);
