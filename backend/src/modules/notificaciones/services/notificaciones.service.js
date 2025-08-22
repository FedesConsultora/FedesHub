// /backend/src/modules/notificaciones/services/notificaciones.service.js

// Servicio de negocio para Notificaciones (ventanas, creación, marcas, preferencias, emails)
import { initModels } from '../../../models/registry.js';
import {
  listCatalogos, listInbox, countByVentana, listChatCanalesForUser,
  getPreferences, setPreferences,
  createNotificacion, setSeen, setRead, setDismiss, setArchive, setPin
} from '../repositories/notificaciones.repo.js';
import { sendNotificationEmails } from './email.service.js';
import { sendNotificationPush } from './push.service.js'

const mReg = await initModels();
const sequelize = mReg.sequelize;

export const svcCatalogos = () => listCatalogos();

export const svcVentanasCount = async (user) => countByVentana(user.id);

export const svcInbox = async (q, user) => listInbox(q, user);

export const svcChatCanales = (user) => listChatCanalesForUser(user.id);

export const svcPreferences = (user) => getPreferences(user.id);

export const svcSetPreferences = async (body, user) => {
  const t = await sequelize.transaction();
  try {
    const rows = await setPreferences(user.id, body.items, t);
    await t.commit();
    return rows;
  } catch (e) { await t.rollback(); throw e; }
};


export const svcCreate = async (body, user) => {
  const t = await sequelize.transaction();
  let notif;
  try {
    notif = await createNotificacion(body, body.destinos, user.id, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // Disparos fuera de la tx
  try { await sendNotificationEmails(notif.id); } catch (e) { console.error('email fail', e); }
  try { await sendNotificationPush(notif.id); } catch (e) { console.error('push fail', e); }

  return notif;
};


export const svcMarkSeen = (id, user) => setSeen(id, user.id);
export const svcMarkRead = (id, on, user) => setRead(id, user.id, on);
export const svcDismiss  = (id, on, user) => setDismiss(id, user.id, on);
export const svcArchive  = (id, on, user) => setArchive(id, user.id, on);
export const svcPin      = (id, orden, user) => setPin(id, user.id, orden);
