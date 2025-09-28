// backend/src/modules/feders/services/feders.service.js
import {
  listEstados, listModalidadesTrabajo, listDiasSemana,
  listFeders, countFeders, getFederById, createFeder, updateFeder, setFederActive, deleteFeder,
  hasFederUsage,
  listFederModalidad, upsertFederModalidad, bulkSetFederModalidad, removeFederModalidad, repoOverview,

  getFirmaPerfil, upsertFirmaPerfil,
  listBancos, createBanco, updateBanco, deleteBanco,
  listEmergencias, createEmergencia, updateEmergencia, deleteEmergencia, getFederByUserId as repoGetFederByUserId
} from '../repositories/feders.repo.js';
import { saveUploadedFiles } from '../../../infra/storage/index.js'
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

// ---- Firma de perfil
export const svcGetFirmaPerfil   = (federId) => getFirmaPerfil(federId);
export const svcUpsertFirmaPerfil = (federId, body) => {
  const payload = { ...body };
  if (payload.dni_numero_enc !== undefined) payload.dni_numero_enc = stringifyIfObj(payload.dni_numero_enc);
  return upsertFirmaPerfil(federId, payload);
};

// ---- Bancos
export const svcListBancos  = (federId) => listBancos(federId);

export const svcCreateBanco = async (federId, body) => {
  const payload = { ...body };
  if (payload.cbu_enc   !== undefined) payload.cbu_enc   = stringifyIfObj(payload.cbu_enc);
  if (payload.alias_enc !== undefined) payload.alias_enc = stringifyIfObj(payload.alias_enc);

  return models.sequelize.transaction(async (t) => {
    if (payload.es_principal) {
      await models.FederBanco.update(
        { es_principal: false },
        { where: { feder_id: federId }, transaction: t } // <-- no bank_id acá
      );
    }
    const row = await models.FederBanco.create({ feder_id: federId, ...payload }, { transaction: t });
    return row;
  });
};

export const svcUpdateBanco = async (federId, bankId, body) => {
  const payload = { ...body };
  if (payload.cbu_enc   !== undefined) payload.cbu_enc   = stringifyIfObj(payload.cbu_enc);
  if (payload.alias_enc !== undefined) payload.alias_enc = stringifyIfObj(payload.alias_enc);

  const row = await models.FederBanco.findOne({ where: { id: bankId, feder_id: federId } });
  if (!row) throw Object.assign(new Error('Banco no encontrado'), { status: 404 });

  return models.sequelize.transaction(async (t) => {
    if (payload.es_principal) {
      await models.FederBanco.update(
        { es_principal: false },
        { where: { feder_id: federId, id: { [Op.ne]: bankId } }, transaction: t } // <-- usar Op.ne
      );
    }
    Object.assign(row, payload);
    await row.save({ transaction: t });
    return row;
  });
};

export const svcDeleteBanco = (federId, bankId) => deleteBanco(federId, bankId);

// ---- Contactos de emergencia
export const svcListEmergencias  = (federId) => listEmergencias(federId);
export const svcCreateEmergencia = (federId, body) => createEmergencia(federId, body);
export const svcUpdateEmergencia = (federId, contactoId, body) => updateEmergencia(federId, contactoId, body);
export const svcDeleteEmergencia = (federId, contactoId) => deleteEmergencia(federId, contactoId);

function slugify(s=''){
  return s.normalize('NFD').replace(/\p{Diacritic}+/gu,'')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'').slice(0,80) || 'feder'
}

export const svcUploadAvatar = async (federId, file) => {
  const f = await getFederById(federId)
  if (!f) throw Object.assign(new Error('Feder no encontrado'), { status:404 })

  const base = `${f.apellido||''} ${f.nombre||''}`.trim()
  const federSlug = `${slugify(base)}-${federId}`

  // guardamos en local: Personas/{slug}/avatar/{randomName}
  const [saved] = await saveUploadedFiles([file], ['Personas', federSlug, 'avatar'], 'default')

  // actualizamos URL (pública) en la tabla
  await models.Feder.update({ avatar_url: saved.webViewLink }, { where: { id: federId } })
  // devolvemos el feder refrescado
  return getFederById(federId)
}