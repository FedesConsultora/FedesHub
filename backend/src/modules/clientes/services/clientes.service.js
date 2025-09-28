// backend/src/modules/clientes/services/clientes.service.js
// ───────────────────────────────────────────────────────────────────────────────
// Capa de reglas: resuelve códigos → ids, defaults y orquesta repos.
import {
  getClienteTipoBy, getClienteEstadoBy, listClientes, countClientes, getClienteById,
  createCliente, updateCliente, softDeleteCliente, hardDeleteCliente,
  listContactos, createContacto, updateContacto, deleteContacto,
  resumenPorEstado, resumenPorPonderacion, resumenPorCelula, listClienteTipos, listClienteEstados, listCelulasLite
} from '../repositories/clientes.repo.js';

export const svcCatalog = async () => {
  const [tipos, estados, celulas] = await Promise.all([
    listClienteTipos(), listClienteEstados(), listCelulasLite()
  ]);
  return { tipos, estados, celulas, ponderaciones: [1,2,3,4,5] };
};

const resolveTipoId = async ({ tipo_id, tipo_codigo }) => {
  if (tipo_id) return tipo_id;
  if (tipo_codigo) {
    const t = await getClienteTipoBy({ codigo: tipo_codigo });
    if (!t) throw Object.assign(new Error('tipo_codigo inválido'), { status: 400 });
    return t.id;
  }
  // default: tomar el de ponderación mayor (A) si existe, sino cualquiera
  const fallback = await getClienteTipoBy({ codigo: 'A' }) || await getClienteTipoBy({ codigo: 'B' }) || await getClienteTipoBy({ codigo: 'C' });
  if (!fallback) throw Object.assign(new Error('No hay tipos de cliente configurados'), { status: 500 });
  return fallback.id;
};

const resolveEstadoId = async ({ estado_id, estado_codigo }) => {
  if (estado_id) return estado_id;
  if (estado_codigo) {
    const e = await getClienteEstadoBy({ codigo: estado_codigo });
    if (!e) throw Object.assign(new Error('estado_codigo inválido'), { status: 400 });
    return e.id;
  }
  const e = await getClienteEstadoBy({ codigo: 'activo' });
  if (!e) throw Object.assign(new Error('No hay estados de cliente configurados'), { status: 500 });
  return e.id;
};

// Listado / Detalle
export const svcList = async (q) => {
  const rows = await listClientes(q);
  const total = await countClientes(q);
  return { total, rows };
};
export const svcDetail = async (id) => {
  const c = await getClienteById(id);
  if (!c) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 });
  return c;
};

// Mutaciones
export const svcCreate = async (body) => {
  const tipoId = await resolveTipoId(body);
  const estadoId = await resolveEstadoId(body);
  return createCliente({ ...body, tipo_id: tipoId, estado_id: estadoId });
};
export const svcUpdate = async (id, body) => {
  const next = { ...body };
  if (body.tipo_id || body.tipo_codigo) next.tipo_id = await resolveTipoId(body);
  if (body.estado_id || body.estado_codigo) next.estado_id = await resolveEstadoId(body);
  delete next.tipo_codigo; delete next.estado_codigo;
  return updateCliente(id, next);
};
export const svcDelete = async (id, { force = false } = {}) => {
  return force ? hardDeleteCliente(id) : softDeleteCliente(id);
};
export const svcAssignCelula = async (id, celula_id) => updateCliente(id, { celula_id });

// Contactos
export const svcListContactos = (cliente_id, q) => listContactos(cliente_id, q);
export const svcCreateContacto = (cliente_id, body) => createContacto(cliente_id, body);
export const svcUpdateContacto = (cliente_id, id, body) => updateContacto(cliente_id, id, body);
export const svcDeleteContacto = (cliente_id, id) => deleteContacto(cliente_id, id);

// Resúmenes (para tableros/listas front estilo Odoo)
export const svcResumenEstado = () => resumenPorEstado();
export const svcResumenPonderacion = () => resumenPorPonderacion();
export const svcResumenCelula = () => resumenPorCelula();
