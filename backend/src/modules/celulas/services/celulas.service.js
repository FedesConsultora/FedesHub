// /backend/src/modules/celulas/services/celulas.service.js

// celulas.service.js — Reglas de negocio y conveniencias
import {
  listEstados, listRolTipos, getEstadoByCodigo,
  createCelula, updateCelula, changeCelulaState,
  getCelulaById, listCelulas, listAsignaciones,
  assignRol, closeAsignacion, getClientesByCelula
} from '../repositories/celulas.repo.js';

export const catEstados = () => listEstados();
export const catRoles = () => listRolTipos();

export const svcCreate = (body) => createCelula(body);
export const svcUpdate = (id, patch) => updateCelula(id, patch);
export const svcChangeState = (id, estado_codigo) => changeCelulaState(id, estado_codigo);

export const svcDetail = (id) => getCelulaById(id);
export const svcList = (q) => listCelulas(q);

export const svcListAsignaciones = (celula_id) => listAsignaciones(celula_id);
export const svcAssignRol = (celula_id, body) => assignRol({ celula_id, ...body });
export const svcCloseAsignacion = (asignacion_id, body) => closeAsignacion(asignacion_id, body);

export const svcListClientes = (celula_id) => getClientesByCelula(celula_id);


export const svcCoverage = async (celula_id) => {
  const c = await getCelulaById(celula_id);
  if (!c) throw Object.assign(new Error('Célula no encontrada'), { status: 404 });
  const active = (c.asignaciones || []).filter(a => !a.hasta);
  const has = (code) => active.some(a => a.rol_codigo === code);
  return {
    celula_id,
    has_diseno: has('analista_diseno'),
    has_cuentas: has('analista_cuentas'),
    has_audiovisual: has('analista_audiovisual'),
    complete: ['analista_diseno','analista_cuentas','analista_audiovisual'].every(has)
  };
};
