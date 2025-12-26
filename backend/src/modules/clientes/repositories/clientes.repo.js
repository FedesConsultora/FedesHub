// ───────────────────────────────────────────────────────────────────────────────
// Repos de bajo nivel (Sequelize + SQL) para clientes, contactos y resúmenes.
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../core/db.js';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

// === Helpers de catálogos ===
export const getClienteTipoBy = async ({ id, codigo }) => {
  if (id) return models.ClienteTipo.findByPk(id);
  if (codigo) return models.ClienteTipo.findOne({ where: { codigo } });
  return null;
};
export const getClienteEstadoBy = async ({ id, codigo }) => {
  if (id) return models.ClienteEstado.findByPk(id);
  if (codigo) return models.ClienteEstado.findOne({ where: { codigo } });
  return null;
};
export const ensureCelulaExists = async (celula_id) => {
  const c = await models.Celula.findByPk(celula_id, { attributes: ['id'] });
  if (!c) throw Object.assign(new Error('Célula no encontrada'), { status: 404 });
  return c;
};

// === Consultas enriquecidas ===
const baseSelect = `
  SELECT
    c.id, c.nombre, c.alias, c.email, c.telefono, c.sitio_web, c.descripcion, c.color,
    c.celula_id, ce.nombre AS celula_nombre,
    c.tipo_id, ct.codigo AS tipo_codigo, ct.nombre AS tipo_nombre,
    c.estado_id, es.codigo AS estado_codigo, es.nombre AS estado_nombre,
    c.ponderacion, c.created_at, c.updated_at
  FROM "Cliente" c
  JOIN "ClienteTipo" ct ON ct.id = c.tipo_id
  JOIN "ClienteEstado" es ON es.id = c.estado_id
  LEFT JOIN "Celula" ce ON ce.id = c.celula_id
`;

const metricsCTE = `
  WITH mx AS (
    SELECT
      t.cliente_id,
      COUNT(*)::int AS total_tareas,
      SUM(
        CASE
          WHEN te.codigo IN ('finalizada','cancelada')
               OR t.is_archivada = true
            THEN 0
          ELSE 1
        END
      )::int AS tareas_abiertas
    FROM "Tarea" t
    JOIN "TareaEstado" te ON te.id = t.estado_id
    GROUP BY t.cliente_id
  )
`;

export const listClienteTipos = async () =>
  models.ClienteTipo.findAll({
    attributes: ['id', 'codigo', 'nombre', 'ponderacion'],
    order: [['ponderacion', 'DESC'], ['nombre', 'ASC']]
  });

export const listClienteEstados = async () =>
  models.ClienteEstado.findAll({
    attributes: ['id', 'codigo', 'nombre'],
    order: [['nombre', 'ASC']]
  });

export const listCelulasLite = async () =>
  models.Celula.findAll({
    attributes: ['id', 'nombre', 'slug'],
    order: [['nombre', 'ASC']]
  });

// Listado con filtros + métricas opcionales
export const listClientes = async (q) => {
  const {
    q: search, celula_id, tipo_id, tipo_codigo, estado_id, estado_codigo,
    ponderacion_min, ponderacion_max, limit = 50, offset = 0, order_by, order, with_metrics
  } = q;

  const repl = { limit, offset };
  let sql = baseSelect;
  const where = [];
  if (celula_id) { where.push('c.celula_id = :celula_id'); repl.celula_id = celula_id; }
  if (tipo_id) { where.push('c.tipo_id = :tipo_id'); repl.tipo_id = tipo_id; }
  if (estado_id === 'all') {
    // No agregamos filtro, muestra todo
  } else if (estado_id) {
    where.push('c.estado_id = :estado_id');
    repl.estado_id = estado_id;
  }
  if (ponderacion_min) { where.push('c.ponderacion >= :pmin'); repl.pmin = ponderacion_min; }
  if (ponderacion_max) { where.push('c.ponderacion <= :pmax'); repl.pmax = ponderacion_max; }
  if (search) {
    where.push(`(LOWER(c.nombre) LIKE :search OR LOWER(COALESCE(c.alias,'')) LIKE :search OR LOWER(COALESCE(c.email,'')) LIKE :search)`);
    repl.search = `%${search.toLowerCase()}%`;
  }

  // Resolver por códigos si vienen
  if (tipo_codigo) { where.push('ct.codigo = :tipo_codigo'); repl.tipo_codigo = tipo_codigo; }
  if (estado_codigo) {
    where.push('es.codigo = :estado_codigo');
    repl.estado_codigo = estado_codigo;
  } else if (estado_id === 'all') {
    // Ya lo manejamos arriba
  } else if (!estado_id) {
    // Default: mostrar solo Activos (excluye pausados y baja)
    where.push("es.codigo = 'activo'");
  }

  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;

  // Orden
  const allowed = { nombre: 'c.nombre', created_at: 'c.created_at', ponderacion: 'c.ponderacion' };
  sql += ` ORDER BY ${allowed[order_by] ?? 'c.nombre'} ${order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
  sql += ` LIMIT :limit OFFSET :offset`;

  // Métricas (inyectamos columnas desde el CTE envolviendo la query)
  if (with_metrics) {
    const wrapped = `
      ${metricsCTE}
      SELECT q.*,
             COALESCE(mx.total_tareas,0)::int    AS total_tareas,
             COALESCE(mx.tareas_abiertas,0)::int AS tareas_abiertas
      FROM ( ${sql} ) q
      LEFT JOIN mx ON mx.cliente_id = q.id
    `;
    return sequelize.query(wrapped, { type: QueryTypes.SELECT, replacements: repl });
  }

  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

export const countClientes = async (q) => {
  const { q: search, celula_id, tipo_id, tipo_codigo, estado_id, estado_codigo, ponderacion_min, ponderacion_max } = q;
  const repl = {};
  let sql = `
    SELECT COUNT(*)::int AS cnt
    FROM "Cliente" c
    JOIN "ClienteTipo" ct ON ct.id = c.tipo_id
    JOIN "ClienteEstado" es ON es.id = c.estado_id
  `;
  const where = [];
  if (celula_id) { where.push('c.celula_id = :celula_id'); repl.celula_id = celula_id; }
  if (tipo_id) { where.push('c.tipo_id = :tipo_id'); repl.tipo_id = tipo_id; }
  if (estado_id === 'all') {
    // No filter
  } else if (estado_id) {
    where.push('c.estado_id = :estado_id');
    repl.estado_id = estado_id;
  }
  if (ponderacion_min) { where.push('c.ponderacion >= :pmin'); repl.pmin = ponderacion_min; }
  if (ponderacion_max) { where.push('c.ponderacion <= :pmax'); repl.pmax = ponderacion_max; }
  if (search) { where.push(`(LOWER(c.nombre) LIKE :search OR LOWER(COALESCE(c.alias,'')) LIKE :search OR LOWER(COALESCE(c.email,'')) LIKE :search)`); repl.search = `%${search.toLowerCase()}%`; }
  if (tipo_codigo) { where.push('ct.codigo = :tipo_codigo'); repl.tipo_codigo = tipo_codigo; }
  if (estado_codigo) {
    where.push('es.codigo = :estado_codigo');
    repl.estado_codigo = estado_codigo;
  } else if (estado_id === 'all') {
    // No filter
  } else if (!estado_id) {
    where.push("es.codigo = 'activo'");
  }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  const rows = await sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
  return rows[0]?.cnt ?? 0;
};

// Detalle con contactos + métricas + “gerentes” (roles activos de la célula)
export const getClienteById = async (id) => {
  const rows = await sequelize.query(`
    ${metricsCTE}
    SELECT c.*, ct.codigo AS tipo_codigo, ct.nombre AS tipo_nombre,
           es.codigo AS estado_codigo, es.nombre AS estado_nombre,
           ce.nombre AS celula_nombre,
           COALESCE(mx.total_tareas,0)::int    AS total_tareas,
           COALESCE(mx.tareas_abiertas,0)::int AS tareas_abiertas
    FROM "Cliente" c
    JOIN "ClienteTipo" ct ON ct.id = c.tipo_id
    JOIN "ClienteEstado" es ON es.id = c.estado_id
    LEFT JOIN "Celula" ce ON ce.id = c.celula_id
    LEFT JOIN mx ON mx.cliente_id = c.id
    WHERE c.id = :id
  `, { type: QueryTypes.SELECT, replacements: { id } });

  const cliente = rows?.[0];
  if (!cliente) return null;

  const contactos = await models.ClienteContacto.findAll({
    where: { cliente_id: id }, order: [['es_principal', 'DESC'], ['nombre', 'ASC']]
  });

  // Gerentes de la célula: asignaciones activas (hasta null o >= hoy) + su asistencia actual
  const mgrs = await sequelize.query(`
    SELECT a.id, a.feder_id, a.rol_tipo_id, a.es_principal,
           f.nombre, f.apellido, f.avatar_url,
           crt.codigo AS rol_codigo, crt.nombre AS rol_nombre,
           mtt.codigo AS modalidad_codigo
    FROM "CelulaRolAsignacion" a
    JOIN "Feder" f ON f.id = a.feder_id
    JOIN "CelulaRolTipo" crt ON crt.id = a.rol_tipo_id
    LEFT JOIN "AsistenciaRegistro" ar ON ar.feder_id = f.id AND ar.check_out_at IS NULL
    LEFT JOIN "ModalidadTrabajoTipo" mtt ON mtt.id = ar.modalidad_id
    WHERE a.celula_id = :celula_id
      AND a.desde <= CURRENT_DATE
      AND (a.hasta IS NULL OR a.hasta >= CURRENT_DATE)
    ORDER BY a.es_principal DESC, crt.nombre ASC, f.apellido ASC, f.nombre ASC
  `, { type: QueryTypes.SELECT, replacements: { celula_id: cliente.celula_id } });

  return { ...cliente, contactos, gerentes: mgrs };
};

// === Mutaciones ===
export const createCliente = async (payload) => {
  const { nombre, celula_id } = payload;
  await ensureCelulaExists(celula_id);
  const exists = await models.Cliente.findOne({ where: { nombre } });
  if (exists) throw Object.assign(new Error('Ya existe un cliente con ese nombre'), { status: 409 });
  const row = await models.Cliente.create(payload);
  return getClienteById(row.id);
};
export const updateCliente = async (id, patch) => {
  const row = await models.Cliente.findByPk(id);
  if (!row) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 });
  if (patch.nombre && patch.nombre !== row.nombre) {
    const clash = await models.Cliente.findOne({ where: { nombre: patch.nombre } });
    if (clash) throw Object.assign(new Error('Ya existe un cliente con ese nombre'), { status: 409 });
  }
  if (patch.celula_id) await ensureCelulaExists(patch.celula_id);
  await row.update(patch);
  return getClienteById(row.id);
};
export const softDeleteCliente = async (id) => {
  const row = await models.Cliente.findByPk(id);
  if (!row) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 });

  const estadoBaja = await models.ClienteEstado.findOne({ where: { codigo: 'baja' } });
  if (!estadoBaja) throw Object.assign(new Error('Estado "baja" no configurado'), { status: 500 });

  await row.update({ estado_id: estadoBaja.id });
  return { ok: true };
};
export const hardDeleteCliente = async (id) => {
  // Evitar FK: contactos y tareas
  await models.ClienteContacto.destroy({ where: { cliente_id: id } });
  const tareas = await models.Tarea.count({ where: { cliente_id: id } });
  if (tareas > 0) {
    const err = new Error('No se puede eliminar permanentemente: el cliente tiene tareas asociadas. Te recomendamos usar la baja lógica (cambiar estado a Baja).');
    err.status = 409;
    throw err;
  }
  await models.Cliente.destroy({ where: { id } });
  return { ok: true };
};

// Contactos
export const listContactos = async (cliente_id, q = {}) => {
  const where = { cliente_id };
  if (typeof q.principal === 'boolean') Object.assign(where, { es_principal: q.principal });
  return models.ClienteContacto.findAll({ where, order: [['es_principal', 'DESC'], ['nombre', 'ASC']] });
};
export const createContacto = async (cliente_id, body) => {
  await getClienteById(cliente_id).then(c => { if (!c) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 }); });
  const row = await models.ClienteContacto.create({ ...body, cliente_id });
  return row.toJSON();
};
export const updateContacto = async (cliente_id, id, patch) => {
  const row = await models.ClienteContacto.findOne({ where: { id, cliente_id } });
  if (!row) throw Object.assign(new Error('Contacto no encontrado'), { status: 404 });
  await row.update(patch);
  return row.toJSON();
};
export const deleteContacto = async (cliente_id, id) => {
  const n = await models.ClienteContacto.destroy({ where: { id, cliente_id } });
  if (!n) throw Object.assign(new Error('Contacto no encontrado'), { status: 404 });
  return { ok: true };
};

// Resúmenes simples para “tableros”
export const resumenPorEstado = async () => sequelize.query(`
  SELECT es.codigo AS estado_codigo, es.nombre AS estado_nombre, COUNT(*)::int AS cantidad
  FROM "Cliente" c JOIN "ClienteEstado" es ON es.id = c.estado_id
  GROUP BY es.codigo, es.nombre ORDER BY es.nombre ASC
`, { type: QueryTypes.SELECT });

export const resumenPorPonderacion = async () => sequelize.query(`
  SELECT c.ponderacion, COUNT(*)::int AS cantidad
  FROM "Cliente" c GROUP BY c.ponderacion ORDER BY c.ponderacion DESC
`, { type: QueryTypes.SELECT });

export const resumenPorCelula = async () => sequelize.query(`
  SELECT ce.id AS celula_id, ce.nombre AS celula_nombre, COUNT(*)::int AS cantidad
  FROM "Cliente" c JOIN "Celula" ce ON ce.id = c.celula_id
  GROUP BY ce.id, ce.nombre ORDER BY ce.nombre ASC
`, { type: QueryTypes.SELECT });