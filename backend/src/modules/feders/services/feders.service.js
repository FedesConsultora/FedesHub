import fs from 'fs/promises';
import path from 'path';
import { Op } from 'sequelize';
import {
  listEstados, listModalidadesTrabajo, listDiasSemana,
  listFeders, countFeders, getFederById, createFeder, updateFeder, setFederActive, deleteFeder,
  hasFederUsage,
  listFederModalidad, upsertFederModalidad, bulkSetFederModalidad, removeFederModalidad, repoOverview,
  listFedersWithTaskCounts,
  getFirmaPerfil, upsertFirmaPerfil,
  listBancos, createBanco, updateBanco, deleteBanco,
  listEmergencias, createEmergencia, updateEmergencia, deleteEmergencia, getFederByUserId as repoGetFederByUserId
} from '../repositories/feders.repo.js';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

const stringifyIfObj = (v) => (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
export const svcListEstados = () => listEstados();
export const svcListModalidadesTrabajo = () => listModalidadesTrabajo();
export const svcListDiasSemana = () => listDiasSemana();

export const svcGetFederByUserId = async (userId) => {
  const f = await repoGetFederByUserId(userId);
  if (!f) throw Object.assign(new Error('Feder no encontrado'), { status: 404 });
  return f;
};

export const svcListFeders = async (q) => {
  const rows = await listFeders(q);
  const total = await countFeders(q);
  return { total, rows };
};

export const svcGetFeder = async (id) => {
  const f = await getFederById(id);
  if (!f) throw Object.assign(new Error('Feder no encontrado'), { status: 404 });
  return f;
};

export const svcCreateFeder = async (body) => {
  const row = await createFeder(body);
  return svcGetFeder(row.id);
};

export const svcUpdateFeder = (id, body) => updateFeder(id, body);
export const svcSetFederActive = (id, is_activo) => setFederActive(id, is_activo);

export const svcDeleteFeder = async (id) => {
  if (await hasFederUsage(id)) {
    throw Object.assign(new Error('No se puede eliminar: el Feder tiene uso histórico. Inactivalo en su lugar.'), { status: 400 });
  }
  return deleteFeder(id);
};

// Modalidad por día
export const svcListFederModalidad = (federId) => listFederModalidad(federId);
export const svcUpsertFederModalidad = (federId, body) => upsertFederModalidad(federId, body);
export const svcBulkSetFederModalidad = (federId, items) => bulkSetFederModalidad(federId, items);
export const svcRemoveFederModalidad = (federId, diaId) => removeFederModalidad(federId, diaId);
export const svcOverview = (opts = {}) => repoOverview(opts);
export const svcListFedersWithTaskCounts = () => listFedersWithTaskCounts();

// ---- Firma de perfil
export const svcGetFirmaPerfil = (federId) => getFirmaPerfil(federId);
export const svcUpsertFirmaPerfil = (federId, body) => {
  const payload = { ...body };
  if (payload.dni_numero_enc !== undefined) payload.dni_numero_enc = stringifyIfObj(payload.dni_numero_enc);
  return upsertFirmaPerfil(federId, payload);
};

// ---- Bancos
export const svcListBancos = (federId) => listBancos(federId);

export const svcCreateBanco = (federId, body) => createBanco(federId, body);
export const svcUpdateBanco = (federId, bankId, body) => updateBanco(federId, bankId, body);

export const svcDeleteBanco = (federId, bankId) => deleteBanco(federId, bankId);

// ---- Contactos de emergencia
export const svcListEmergencias = (federId) => listEmergencias(federId);
export const svcCreateEmergencia = (federId, body) => createEmergencia(federId, body);
export const svcUpdateEmergencia = (federId, contactoId, body) => updateEmergencia(federId, contactoId, body);
export const svcDeleteEmergencia = (federId, contactoId) => deleteEmergencia(federId, contactoId);

function slugify(s = '') {
  return s.normalize('NFD').replace(/\p{Diacritic}+/gu, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 80) || 'feder'
}

export const svcUploadAvatar = async (federId, file) => {
  const f = await getFederById(federId)
  if (!f) throw Object.assign(new Error('Feder no encontrado'), { status: 404 })

  // 1) Determinar nombres
  const base = `${f.apellido || ''} ${f.nombre || ''}`.trim() || 'feder'
  const slug = slugify(base)
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
  const filename = `${slug}_${federId}${ext}`

  // 2) Ruta absoluta en el servidor
  const publicDir = path.resolve('public/avatars')
  const fullPath = path.join(publicDir, filename)

  // 3) Eliminar avatar anterior si existe y es distinto (para no dejar huérfanos)
  if (f.avatar_url && f.avatar_url.startsWith('/avatars/')) {
    const oldRelative = f.avatar_url.replace(/^\//, '') // quita / inicial
    const oldPath = path.join(path.resolve('public'), oldRelative)
    if (oldPath !== fullPath) {
      try { await fs.unlink(oldPath) } catch (e) { /* ignore */ }
    }
  }

  // 4) Asegurar directorio y guardar buffer de Multer
  await fs.mkdir(publicDir, { recursive: true })
  await fs.writeFile(fullPath, file.buffer)

  // 5) Actualizar DB con la ruta relativa pública
  const avatarUrl = `/avatars/${filename}`
  await models.Feder.update({ avatar_url: avatarUrl }, { where: { id: federId } })

  // 6) Devolvemos el feder refrescado
  return getFederById(federId)
}