// backend/src/modules/cargos/services/cargos.service.js
import {
  listAmbitos, listCargos, countCargos, getCargoById,
  createCargo, updateCargo, setCargoActive, deleteCargo, hasFederCargoUsage
} from '../repositories/cargo.repo.js';

import {
  listFederCargos, createAssignment, updateAssignment, deleteAssignment
} from '../repositories/federCargo.repo.js';

import { listCargosWithPeople } from '../repositories/cargo.repo.js';

// ========== Catálogos ==========
export const svcListAmbitos = () => listAmbitos();

// ========== Cargos ==========
export const svcListCargos = async (q) => {
  const rows = await listCargos(q);
  const total = await countCargos(q);
  return { total, rows };
};

export const svcListCargosWithPeople = () => listCargosWithPeople();

export const svcGetCargo = async (id) => {
  const c = await getCargoById(id);
  if (!c) throw Object.assign(new Error('Cargo no encontrado'), { status: 404 });
  return c;
};

export const svcCreateCargo = async (body) => {
  const c = await createCargo(body);
  return svcGetCargo(c.id);
};

export const svcUpdateCargo = (id, body) => updateCargo(id, body);
export const svcSetCargoActive = (id, is_activo) => setCargoActive(id, is_activo);

export const svcDeleteCargo = async (id) => {
  if (await hasFederCargoUsage(id)) {
    throw Object.assign(new Error('No se puede eliminar: el cargo tiene historial asignado'), { status: 400 });
  }
  return deleteCargo(id);
};

// ========== Asignaciones a Feders ==========
export const svcListFederCargos = (federId) => listFederCargos(federId);
export const svcCreateAssignment = (federId, body) => createAssignment({ feder_id: federId, ...body });
export const svcUpdateAssignment = (federId, id, body) => updateAssignment(id, body);
export const svcDeleteAssignment = (federId, id) => deleteAssignment(id);
