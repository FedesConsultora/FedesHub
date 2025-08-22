// /backend/src/modules/celulas/repositories/celulas.repo.js

// celulas.repo.js — Acceso a datos y SQL de apoyo para Células
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../core/db.js';
import { initModels } from '../../../models/registry.js';

const m = await initModels();

const slugify = (s) =>
  s.normalize('NFKD')
   .replace(/[\u0300-\u036f]/g,'')
   .replace(/[^a-zA-Z0-9]+/g,'-')
   .replace(/^-+|-+$/g,'')
   .toLowerCase()
   .slice(0, 120);

export const getEstadoByCodigo = (codigo) =>
  m.CelulaEstado.findOne({ where: { codigo } });

export const getRolTipoByCodigo = (codigo) =>
  m.CelulaRolTipo.findOne({ where: { codigo } });

export const listEstados = () => m.CelulaEstado.findAll({ order: [['id','ASC']] });

export const listRolTipos = () => m.CelulaRolTipo.findAll({ order: [['nombre','ASC']] });

async function ensureCalendarioCelula(celula_id, tx) {
  if (!m.CalendarioLocal) return null;
  const [tipo] = await sequelize.query(
    `SELECT id FROM "CalendarioTipo" WHERE codigo='celula' LIMIT 1`,
    { type: QueryTypes.SELECT, transaction: tx }
  );
  if (!tipo) return null;
  const [vis] = await sequelize.query(
    `SELECT id FROM "VisibilidadTipo" WHERE codigo='equipo' LIMIT 1`,
    { type: QueryTypes.SELECT, transaction: tx }
  );
  const exists = await m.CalendarioLocal.findOne({ where: { celula_id }, transaction: tx });
  if (exists) return exists;
  return m.CalendarioLocal.create({
    tipo_id: tipo.id, nombre: `Calendario Célula ${celula_id}`,
    visibilidad_id: vis?.id ?? null, feder_id: null, celula_id, cliente_id: null,
    time_zone: 'America/Argentina/Buenos_Aires', color: '#1976d2', is_activo: true
  }, { transaction: tx });
}

async function uniqueSlugFrom(nombre, tx) {
  const base = slugify(nombre);
  let slug = base || `celula-${Date.now()}`;
  let i = 1;
  // @ts-ignore
  while (await m.Celula.findOne({ where: { slug }, transaction: tx })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}

export const createCelula = async ({ nombre, descripcion, perfil_md, avatar_url, cover_url, estado_codigo }) => {
  return sequelize.transaction(async (tx) => {
    const estado = await getEstadoByCodigo(estado_codigo || 'activa');
    if (!estado) throw Object.assign(new Error('Estado inválido'), { status: 400 });

    const slug = await uniqueSlugFrom(nombre, tx);
    const row = await m.Celula.create({
      nombre, descripcion: descripcion ?? null, perfil_md: perfil_md ?? null,
      avatar_url: avatar_url ?? null, cover_url: cover_url ?? null,
      slug, estado_id: estado.id
    }, { transaction: tx });

    await ensureCalendarioCelula(row.id, tx);
    return getCelulaById(row.id, { tx });
  });
};

export const updateCelula = async (id, patch) => {
  return sequelize.transaction(async (tx) => {
    const row = await m.Celula.findByPk(id, { transaction: tx });
    if (!row) throw Object.assign(new Error('Célula no encontrada'), { status: 404 });

    const next = { ...patch };
    if (patch.nombre) {
      // Si cambia el nombre, recalculamos slug si no hay slug manual
      const newSlug = await uniqueSlugFrom(patch.nombre, tx);
      next.slug = newSlug;
    }
    await row.update(next, { transaction: tx });
    return getCelulaById(id, { tx });
  });
};

export const changeCelulaState = async (id, estado_codigo) => {
  const est = await getEstadoByCodigo(estado_codigo);
  if (!est) throw Object.assign(new Error('Estado inválido'), { status: 400 });
  const row = await m.Celula.findByPk(id);
  if (!row) throw Object.assign(new Error('Célula no encontrada'), { status: 404 });
  await row.update({ estado_id: est.id });
  return getCelulaById(id);
};

export const getCelulaById = async (id, { tx = null } = {}) => {
  const sql = `
    SELECT c.*, ce.codigo AS estado_codigo, ce.nombre AS estado_nombre,
           COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
             'asig_id', cra.id,
             'feder_id', cra.feder_id,
             'rol_codigo', crt.codigo,
             'rol_nombre', crt.nombre,
             'desde', cra.desde,
             'hasta', cra.hasta,
             'es_principal', cra.es_principal
           )) FILTER (WHERE cra.id IS NOT NULL), '[]'::jsonb) AS asignaciones,
           (SELECT COUNT(*)::int FROM "Cliente" cli WHERE cli.celula_id = c.id) AS clientes_count
    FROM "Celula" c
    JOIN "CelulaEstado" ce ON ce.id = c.estado_id
    LEFT JOIN "CelulaRolAsignacion" cra ON cra.celula_id = c.id
    LEFT JOIN "CelulaRolTipo" crt ON crt.id = cra.rol_tipo_id
    WHERE c.id = :id
    GROUP BY c.id, ce.codigo, ce.nombre
  `;
  const rows = await sequelize.query(sql, { type: QueryTypes.SELECT, replacements: { id }, transaction: tx });
  return rows[0] || null;
};

export const listCelulas = async ({ q, estado_codigo, limit, offset }) => {
  const where = [];
  const repl = { limit, offset };
  if (q) { where.push('LOWER(c.nombre) LIKE :q'); repl.q = `%${q.toLowerCase()}%`; }
  if (estado_codigo) { where.push('ce.codigo = :ec'); repl.ec = estado_codigo; }
  const sql = `
    WITH roster AS (
      SELECT cra.celula_id,
        bool_or(crt.codigo='analista_diseno' AND (cra.hasta IS NULL OR cra.hasta >= CURRENT_DATE)) AS has_diseno,
        bool_or(crt.codigo='analista_cuentas' AND (cra.hasta IS NULL OR cra.hasta >= CURRENT_DATE)) AS has_cuentas,
        bool_or(crt.codigo='analista_audiovisual' AND (cra.hasta IS NULL OR cra.hasta >= CURRENT_DATE)) AS has_audiovisual
      FROM "CelulaRolAsignacion" cra
      JOIN "CelulaRolTipo" crt ON crt.id = cra.rol_tipo_id
      GROUP BY cra.celula_id
    )
    SELECT c.id, c.nombre, c.slug, c.avatar_url, c.cover_url, c.descripcion, c.perfil_md,
           ce.codigo AS estado_codigo,
           COALESCE(r.has_diseno,false) AS has_diseno,
           COALESCE(r.has_cuentas,false) AS has_cuentas,
           COALESCE(r.has_audiovisual,false) AS has_audiovisual,
           (SELECT COUNT(*)::int FROM "Cliente" cli WHERE cli.celula_id = c.id) AS clientes_count
    FROM "Celula" c
    JOIN "CelulaEstado" ce ON ce.id = c.estado_id
    LEFT JOIN roster r ON r.celula_id = c.id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY c.created_at DESC
    LIMIT :limit OFFSET :offset
  `;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

export const listAsignaciones = async (celula_id) => {
  const sql = `
    SELECT cra.*, crt.codigo AS rol_codigo, crt.nombre AS rol_nombre,
           f.nombre AS feder_nombre, f.apellido AS feder_apellido
    FROM "CelulaRolAsignacion" cra
    JOIN "CelulaRolTipo" crt ON crt.id = cra.rol_tipo_id
    JOIN "Feder" f ON f.id = cra.feder_id
    WHERE cra.celula_id = :cid
    ORDER BY cra.desde DESC, cra.id DESC
  `;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: { cid: celula_id } });
};

export const assignRol = async ({ celula_id, feder_id, rol_codigo, desde, es_principal, observacion }) => {
  return sequelize.transaction(async (tx) => {
    const cel = await m.Celula.findByPk(celula_id, { transaction: tx });
    if (!cel) throw Object.assign(new Error('Célula no encontrada'), { status: 404 });
    const f = await m.Feder.findByPk(feder_id, { transaction: tx });
    if (!f || !f.is_activo) throw Object.assign(new Error('Feder inválido o inactivo'), { status: 400 });

    const rol = await getRolTipoByCodigo(rol_codigo);
    if (!rol) throw Object.assign(new Error('rol_codigo inválido'), { status: 400 });

    // Un principal por rol y célula
    if (es_principal) {
      await m.CelulaRolAsignacion.update(
        { es_principal: false },
        { where: { celula_id, rol_tipo_id: rol.id, hasta: null, es_principal: true }, transaction: tx }
      );
    }

    const row = await m.CelulaRolAsignacion.create({
      celula_id, feder_id, rol_tipo_id: rol.id, desde,
      hasta: null, es_principal: !!es_principal, observacion: observacion ?? null
    }, { transaction: tx });

    return row.toJSON();
  });
};

export const closeAsignacion = async (asignacion_id, { hasta, observacion }) => {
  const row = await m.CelulaRolAsignacion.findByPk(asignacion_id);
  if (!row) throw Object.assign(new Error('Asignación no encontrada'), { status: 404 });
  await row.update({ hasta, observacion: observacion ?? row.observacion });
  return row.toJSON();
};

export const getClientesByCelula = async (celula_id) => {
  const sql = `
    SELECT cli.*, ct.codigo AS tipo_codigo, ce.codigo AS estado_codigo
    FROM "Cliente" cli
    JOIN "ClienteTipo" ct ON ct.id = cli.tipo_id
    JOIN "ClienteEstado" ce ON ce.id = cli.estado_id
    WHERE cli.celula_id = :cid
    ORDER BY cli.created_at DESC
  `;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: { cid: celula_id } });
};
