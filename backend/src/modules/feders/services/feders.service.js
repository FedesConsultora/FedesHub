// backend/src/modules/feders/services/feders.service.js
import {
  listEstados, listModalidadesTrabajo, listDiasSemana,
  listFeders, countFeders, getFederById, createFeder, updateFeder, setFederActive, deleteFeder,
  hasFederUsage,
  listFederModalidad, upsertFederModalidad, bulkSetFederModalidad, removeFederModalidad
} from '../repositories/feders.repo.js';

export const svcListEstados = () => listEstados();
export const svcListModalidadesTrabajo = () => listModalidadesTrabajo();
export const svcListDiasSemana = () => listDiasSemana();

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
