// backend/src/modules/feders/repositories/feders.repo.js
import { QueryTypes, Op } from 'sequelize';
import { sequelize } from '../../../core/db.js';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

// --------- Catálogos
export const listEstados = () =>
  models.FederEstadoTipo.findAll({ attributes: ['id', 'codigo', 'nombre', 'descripcion'], order: [['codigo', 'ASC']] });

export const listModalidadesTrabajo = () =>
  models.ModalidadTrabajoTipo.findAll({ attributes: ['id', 'codigo', 'nombre', 'descripcion'], order: [['codigo', 'ASC']] });

export const listDiasSemana = () =>
  models.DiaSemana.findAll({ attributes: ['id', 'codigo', 'nombre'], order: [['id', 'ASC']] });

// --------- Helpers de existencia
export const ensureFederExists = async (feder_id) => {
  if (feder_id == null) {
    throw Object.assign(new Error('feder_id requerido'), { status: 400 });
  }
  const f = await models.Feder.findByPk(feder_id, { attributes: ['id'] });
  if (!f) throw Object.assign(new Error('Feder no encontrado'), { status: 404 });
};
export const ensureUserExists = async (user_id) => {
  if (!user_id) return;
  const u = await models.User.findByPk(user_id, { attributes: ['id'] });
  if (!u) throw Object.assign(new Error('User no encontrado'), { status: 404 });
};
/* ensureCelulaExists removed */
export const ensureEstadoExists = async (estado_id) => {
  const e = await models.FederEstadoTipo.findByPk(estado_id, { attributes: ['id'] });
  if (!e) throw Object.assign(new Error('Estado no encontrado'), { status: 404 });
};

// --------- Listado / conteo
export const listFeders = async ({ limit = 50, offset = 0, q, estado_id, is_activo } = {}) => {
  const repl = { limit, offset };
  const where = ["f.nombre NOT ILIKE 'Admin%'", "u.email NOT IN ('sistemas@fedesconsultora.com', 'admin@fedesconsultora.com')"];

  // coerción robusta para is_activo
  const toBool = (v) => (v === true || v === 'true' || v === 1 || v === '1') ? true
    : (v === false || v === 'false' || v === 0 || v === '0') ? false
      : undefined;

  let is_activo_bool = toBool(is_activo);

  let sql = `
    SELECT
      f.id, f.nombre, f.apellido, f.telefono, f.avatar_url,
      f.fecha_ingreso, f.fecha_egreso, f.is_activo,
      f.dni_numero_enc AS dni_numero, f.cuil_cuit_enc AS cuil_cuit,
      u.id AS user_id, u.email AS user_email,
      est.id AS estado_id, est.codigo AS estado_codigo, est.nombre AS estado_nombre,

      -- cargo principal como en overview (con ámbito)
      c.cargo_id, c.cargo_nombre, c.ambito_codigo, c.ambito_nombre,

      -- roles del usuario (para chips y orden)
      (
        SELECT array_agg(r2.nombre ORDER BY r2.nombre)
        FROM "UserRol" ur2 JOIN "Rol" r2 ON r2.id = ur2.rol_id
        WHERE ur2.user_id = u.id
      ) AS roles,

      -- bandera C-level para ordenar
      CASE WHEN EXISTS (
        SELECT 1 FROM "UserRol" urx
        JOIN "Rol" rx ON rx.id = urx.rol_id
        WHERE urx.user_id = u.id AND rx.nombre = 'NivelA'
      ) THEN 1 ELSE 0 END AS is_clevel
    FROM "Feder" f
    JOIN "FederEstadoTipo" est ON est.id = f.estado_id
    LEFT JOIN "User" u ON u.id = f.user_id
    LEFT JOIN LATERAL (
      SELECT
        c2.id      AS cargo_id,
        c2.nombre  AS cargo_nombre,
        ca.codigo  AS ambito_codigo,
        ca.nombre  AS ambito_nombre
      FROM "FederCargo" fc2
      JOIN "Cargo"       c2 ON c2.id = fc2.cargo_id
      JOIN "CargoAmbito" ca ON ca.id = c2.ambito_id
      WHERE fc2.feder_id = f.id
        AND fc2.es_principal = true
        AND (fc2.hasta IS NULL OR fc2.hasta > CURRENT_DATE)
      ORDER BY fc2.desde DESC, fc2.id DESC
      LIMIT 1
    ) AS c ON TRUE
  `;

  if (estado_id) { where.push(`f.estado_id = :estado_id`); repl.estado_id = estado_id; }

  if (is_activo_bool !== undefined) {
    where.push(`f.is_activo = :is_activo`);
    repl.is_activo = is_activo_bool;
  } else {
    // Por defecto solo activos
    where.push(`f.is_activo = true`);
  }

  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;

  // C-level primero, luego apellido/nombre
  sql += ` ORDER BY is_clevel DESC, f.apellido ASC, f.nombre ASC LIMIT :limit OFFSET :offset`;

  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

export const countFeders = async ({ q, estado_id, is_activo } = {}) => {
  const repl = {};
  const where = ["f.nombre NOT ILIKE 'Admin%'", "u.email NOT IN ('sistemas@fedesconsultora.com', 'admin@fedesconsultora.com')"];
  const toBool = (v) => (v === true || v === 'true' || v === 1 || v === '1') ? true
    : (v === false || v === 'false' || v === 0 || v === '0') ? false
      : undefined;
  const is_activo_bool = toBool(is_activo);

  let sql = `
    SELECT COUNT(*)::int AS cnt
    FROM "Feder" f
    LEFT JOIN "User" u ON u.id = f.user_id
  `;
  if (estado_id) { where.push(`f.estado_id = :estado_id`); repl.estado_id = estado_id; }

  if (is_activo_bool !== undefined) {
    where.push(`f.is_activo = :is_activo`);
    repl.is_activo = is_activo_bool;
  } else {
    // Por defecto solo activos
    where.push(`f.is_activo = true`);
  }

  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  const rows = await sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
  return rows[0]?.cnt ?? 0;
};
// --------- Detalle / CRUD básico
export const getFederById = async (id) => {
  const rows = await sequelize.query(`
    SELECT
      f.*,
      f.dni_numero_enc AS dni_numero,
      f.cuil_cuit_enc AS cuil_cuit,
      u.email AS user_email,
      est.codigo AS estado_codigo, est.nombre AS estado_nombre,
      (
        SELECT c.nombre
        FROM "FederCargo" fc
        JOIN "Cargo" c ON c.id = fc.cargo_id
        WHERE fc.feder_id = f.id
          AND fc.es_principal = true
          AND (fc.hasta IS NULL OR fc.hasta > CURRENT_DATE)
        ORDER BY fc.desde DESC, fc.id DESC
        LIMIT 1
      ) AS cargo_principal
    FROM "Feder" f
    JOIN "FederEstadoTipo" est ON est.id = f.estado_id
    LEFT JOIN "User" u ON u.id = f.user_id
    WHERE f.id = :id
    LIMIT 1
  `, { type: QueryTypes.SELECT, replacements: { id } });
  return rows[0] || null;
};

export const createFeder = async (payload) => {
  await ensureEstadoExists(payload.estado_id);
  await ensureUserExists(payload.user_id);
  await ensureUserExists(payload.user_id);

  // Limpiar/asegurar booleano
  if (payload.is_clevel !== undefined) payload.is_clevel = !!payload.is_clevel;

  const data = { ...payload };
  if (data.dni_numero !== undefined) {
    data.dni_numero_enc = data.dni_numero;
    delete data.dni_numero;
  }
  if (data.cuil_cuit !== undefined) {
    data.cuil_cuit_enc = data.cuil_cuit;
    delete data.cuil_cuit;
  }

  const row = await models.Feder.create(data);
  return row;
};

export const updateFeder = async (id, payload) => {
  if (payload.estado_id) await ensureEstadoExists(payload.estado_id);
  if (payload.user_id !== undefined) await ensureUserExists(payload.user_id);
  if (payload.user_id !== undefined) await ensureUserExists(payload.user_id);

  // Limpiar/asegurar booleano
  if (payload.is_clevel !== undefined) payload.is_clevel = !!payload.is_clevel;

  const data = { ...payload };
  if (data.dni_numero !== undefined) {
    data.dni_numero_enc = data.dni_numero;
    delete data.dni_numero;
  }
  if (data.cuil_cuit !== undefined) {
    data.cuil_cuit_enc = data.cuil_cuit;
    delete data.cuil_cuit;
  }

  await models.Feder.update(data, { where: { id } });
  return getFederById(id);
};

export const setFederActive = async (id, is_activo) => {
  await models.Feder.update({ is_activo }, { where: { id } });
  return getFederById(id);
};

// --------- Uso (para evitar deletes peligrosos)
export const hasFederUsage = async (feder_id) => {
  const counts = await Promise.all([
    models.FederCargo.count({ where: { feder_id } }),
    models.FederModalidadDia.count({ where: { feder_id } }),
    models.AsistenciaRegistro?.count ? models.AsistenciaRegistro.count({ where: { feder_id } }) : 0,
    models.Ausencia?.count ? models.Ausencia.count({ where: { feder_id } }) : 0,
    models.Tarea?.count ? models.Tarea.count({ where: { creado_por_feder_id: feder_id } }) : 0,
    models.TareaResponsable?.count ? models.TareaResponsable.count({ where: { feder_id } }) : 0,
    models.TareaColaborador?.count ? models.TareaColaborador.count({ where: { feder_id } }) : 0,
    models.CalendarioLocal?.count ? models.CalendarioLocal.count({ where: { feder_id } }) : 0,
  ]);
  return counts.some(c => (c || 0) > 0);
};

export const deleteFeder = async (id) => {
  await models.Feder.destroy({ where: { id } });
  return { ok: true };
};

// --------- Modalidad por día
export const listFederModalidad = async (feder_id) => {
  return sequelize.query(`
    SELECT fmd.id, fmd.feder_id, fmd.dia_semana_id, ds.codigo AS dia_codigo, ds.nombre AS dia_nombre,
           fmd.modalidad_id, mt.codigo AS modalidad_codigo, mt.nombre AS modalidad_nombre,
           fmd.comentario, fmd.is_activo, fmd.created_at, fmd.updated_at
    FROM "FederModalidadDia" fmd
    JOIN "DiaSemana" ds ON ds.id = fmd.dia_semana_id
    JOIN "ModalidadTrabajoTipo" mt ON mt.id = fmd.modalidad_id
    WHERE fmd.feder_id = :fid
    ORDER BY fmd.dia_semana_id ASC
  `, { type: QueryTypes.SELECT, replacements: { fid: feder_id } });
};

export const upsertFederModalidad = async (feder_id, { dia_semana_id, modalidad_id, comentario = null, is_activo = true }) => {
  // validar FK simples
  const d = await models.DiaSemana.findByPk(dia_semana_id);
  if (!d) throw Object.assign(new Error('Día inválido'), { status: 400 });
  const m = await models.ModalidadTrabajoTipo.findByPk(modalidad_id);
  if (!m) throw Object.assign(new Error('Modalidad inválida'), { status: 400 });

  const [row] = await models.FederModalidadDia.findOrCreate({
    where: { feder_id, dia_semana_id },
    defaults: { feder_id, dia_semana_id, modalidad_id, comentario, is_activo }
  });
  if (!row.isNewRecord) {
    row.modalidad_id = modalidad_id;
    row.comentario = comentario;
    row.is_activo = is_activo;
    await row.save();
  }
  return row;
};

export const bulkSetFederModalidad = async (feder_id, items = []) => {
  return sequelize.transaction(async (t) => {
    for (const it of items) {
      await upsertFederModalidad(feder_id, it);
    }
    return listFederModalidad(feder_id);
  });
};

export const removeFederModalidad = async (feder_id, dia_semana_id) => {
  await models.FederModalidadDia.destroy({ where: { feder_id, dia_semana_id } });
  return listFederModalidad(feder_id);
};

// ———— /feders/overview ————
export const repoOverview = async ({
  prioAmbitos = ['c_level', 'direccion']
} = {}) => {
  // 1) C-LEVEL por flag is_clevel + cargo principal vigente
  const cLevel = await sequelize.query(`
    SELECT
      f.id     AS feder_id,
      f.nombre, f.apellido, f.avatar_url,
      u.email  AS user_email,
      c.cargo_id,
      c.cargo_nombre,
      c.ambito_codigo,
      c.ambito_nombre
    FROM "Feder" f
    LEFT JOIN "User" u ON u.id = f.user_id
    LEFT JOIN LATERAL (
      SELECT
        c2.id      AS cargo_id,
        c2.nombre  AS cargo_nombre,
        ca.codigo  AS ambito_codigo,
        NULLIF(ca.nombre, 'Orgánico') AS ambito_nombre
      FROM "FederCargo" fc2
      JOIN "Cargo"       c2 ON c2.id = fc2.cargo_id
      JOIN "CargoAmbito" ca ON ca.id = c2.ambito_id
      WHERE fc2.feder_id = f.id
        AND fc2.es_principal = true
        AND (fc2.hasta IS NULL OR fc2.hasta > CURRENT_DATE)
      ORDER BY fc2.desde DESC, fc2.id DESC
      LIMIT 1
    ) AS c ON TRUE
    WHERE f.is_clevel = true
      AND f.is_activo = true
      AND f.nombre NOT ILIKE 'Admin%'
      AND u.email NOT IN ('sistemas@fedesconsultora.com', 'admin@fedesconsultora.com')
    ORDER BY f.apellido ASC, f.nombre ASC
  `, { type: QueryTypes.SELECT });

  // 2) DEPARTAMENTOS / ÁREAS por Ámbito de Cargo
  const areaRows = await sequelize.query(`
    SELECT
      c.area_nombre,
      c.area_codigo,
      f.id      AS feder_id,
      f.nombre, f.apellido, f.avatar_url,
      u.email   AS user_email,
      c.cargo_nombre,
      (
        SELECT array_agg(r2.nombre ORDER BY r2.nombre)
        FROM "UserRol" ur2 JOIN "Rol" r2 ON r2.id = ur2.rol_id
        WHERE ur2.user_id = u.id
      ) AS roles,
      (
        SELECT EXISTS (
          SELECT 1 FROM "UserRol" ur3
          JOIN "Rol" r3 ON r3.id = ur3.rol_id
          WHERE ur3.user_id = u.id 
            AND r3.nombre IN ('NivelB', 'RRHH')
        )
      ) AS is_leader
    FROM "Feder" f
    LEFT JOIN "User" u ON u.id = f.user_id
    JOIN LATERAL (
      SELECT
        ca2.nombre AS area_nombre,
        ca2.codigo AS area_codigo,
        c2.nombre  AS cargo_nombre
      FROM "FederCargo" fc2
      JOIN "Cargo"       c2 ON c2.id = fc2.cargo_id
      JOIN "CargoAmbito" ca2 ON ca2.id = c2.ambito_id
      WHERE fc2.feder_id = f.id
        AND fc2.es_principal = true
        AND (fc2.hasta IS NULL OR fc2.hasta >= CURRENT_DATE)
      ORDER BY fc2.desde DESC, fc2.id DESC
      LIMIT 1
    ) AS c ON TRUE
    WHERE c.area_codigo NOT IN ('cliente', 'organico')
      AND f.is_activo = true
      AND f.nombre NOT ILIKE 'Admin%'
      AND u.email NOT IN ('sistemas@fedesconsultora.com', 'admin@fedesconsultora.com')
      AND f.is_clevel = false
    ORDER BY 
      CASE 
        WHEN c.area_codigo = 'fedes-cloud' THEN 1
        WHEN c.area_codigo = 'comercial'      THEN 2
        WHEN c.area_codigo = 'creativo'    THEN 3
        WHEN c.area_codigo = 'operaciones' THEN 4
        ELSE 99
      END,
      is_leader DESC, f.apellido, f.nombre
  `, { type: QueryTypes.SELECT });

  const areas = {};
  for (const row of areaRows) {
    if (!areas[row.area_codigo]) {
      areas[row.area_codigo] = {
        nombre: row.area_nombre,
        codigo: row.area_codigo,
        people: []
      };
    }
    areas[row.area_codigo].people.push({
      feder_id: row.feder_id,
      nombre: row.nombre,
      apellido: row.apellido,
      avatar_url: row.avatar_url,
      user_email: row.user_email,
      cargo_nombre: row.cargo_nombre,
      roles: row.roles || [],
      is_leader: !!row.is_leader
    });
  }

  // Convertimos a array para el front preservando el orden del SQL
  const areasArray = Object.values(areas).sort((a, b) => {
    const weights = { 'fedes-cloud': 1, 'comercial': 2, 'creativo': 3, 'operaciones': 4 };
    return (weights[a.codigo] || 99) - (weights[b.codigo] || 99);
  });

  // Para compatibilidad con el frontend que espera áreas dinámicas,
  // pero el front actual (TriGlobalPanel) usa Object.values(areas) si es un objeto.
  // Si lo mandamos como array, el front debe ser actualizado o manejar ambos.
  // TriGlobalPanel.jsx línea 27: const areaList = Object.values(areas)
  // Si areas es un array, Object.values(areas) sigue funcionando (devuelve el mismo array).

  return { c_level: cLevel, areas: areasArray, celulas: [] };
};

// ========== Firma de perfil ==========
export const getFirmaPerfil = async (feder_id) => {
  await ensureFederExists(feder_id);
  const row = await models.FirmaPerfil.findOne({ where: { feder_id } });
  // respuesta consistente
  return row || { feder_id, firma_textual: null, dni_tipo: null, dni_numero_enc: null, firma_iniciales_svg: null, firma_iniciales_png_url: null, pin_hash: null, is_activa: null, created_at: null, updated_at: null };
};

export const upsertFirmaPerfil = async (feder_id, payload) => {
  await ensureFederExists(feder_id);
  const [row, created] = await models.FirmaPerfil.findOrCreate({
    where: { feder_id },
    defaults: { feder_id, ...payload }
  });
  if (!created) { Object.assign(row, payload); await row.save(); }
  return row;
};

// ========== Bancos ==========
export const listBancos = async (feder_id) => {
  await ensureFederExists(feder_id);
  // Aliaseamos para que el front no vea el "_enc"
  const rows = await sequelize.query(`
    SELECT 
      id, feder_id, banco_nombre, titular_nombre, es_principal, created_at, updated_at,
      cbu_enc AS cbu,
      alias_enc AS alias
    FROM "FederBanco"
    WHERE feder_id = :feder_id
    ORDER BY es_principal DESC, id ASC
  `, { type: QueryTypes.SELECT, replacements: { feder_id } });
  return rows;
};

export const createBanco = async (feder_id, payload) => {
  await ensureFederExists(feder_id);
  const data = { ...payload };
  if (data.cbu !== undefined) { data.cbu_enc = data.cbu; delete data.cbu; }
  if (data.alias !== undefined) { data.alias_enc = data.alias; delete data.alias; }

  return sequelize.transaction(async (t) => {
    // si viene es_principal=true => apago los demás
    if (data.es_principal) {
      await models.FederBanco.update(
        { es_principal: false },
        { where: { feder_id }, transaction: t }
      );
    }
    const row = await models.FederBanco.create({ feder_id, ...data }, { transaction: t });
    return row;
  });
};

export const updateBanco = async (feder_id, bank_id, payload) => {
  await ensureFederExists(feder_id);
  const row = await models.FederBanco.findOne({ where: { id: bank_id, feder_id } });
  if (!row) throw Object.assign(new Error('Banco no encontrado'), { status: 404 });

  const data = { ...payload };
  if (data.cbu !== undefined) { data.cbu_enc = data.cbu; delete data.cbu; }
  if (data.alias !== undefined) { data.alias_enc = data.alias; delete data.alias; }

  return sequelize.transaction(async (t) => {
    if (data.es_principal) {
      await models.FederBanco.update({ es_principal: false }, { where: { feder_id, id: { [Op.ne]: bank_id } }, transaction: t });
    }
    await models.FederBanco.update(data, { where: { id: bank_id }, transaction: t });
    return models.FederBanco.findByPk(bank_id, { transaction: t });
  });
};

export const deleteBanco = async (feder_id, bank_id) => {
  await ensureFederExists(feder_id);
  const n = await models.FederBanco.destroy({ where: { feder_id, id: bank_id } });
  if (!n) throw Object.assign(new Error('Banco no encontrado'), { status: 404 });
  return { ok: true };
};

// ========== Contactos de emergencia ==========
export const listEmergencias = async (feder_id) => {
  await ensureFederExists(feder_id);
  return models.FederEmergencia.findAll({ where: { feder_id }, order: [['id', 'ASC']] });
};

export const createEmergencia = async (feder_id, payload) => {
  await ensureFederExists(feder_id);
  return models.FederEmergencia.create({ feder_id, ...payload });
};

export const updateEmergencia = async (feder_id, contacto_id, payload) => {
  await ensureFederExists(feder_id);
  const row = await models.FederEmergencia.findOne({ where: { id: contacto_id, feder_id } });
  if (!row) throw Object.assign(new Error('Contacto no encontrado'), { status: 404 });
  Object.assign(row, payload);
  await row.save();
  return row;
};

export const deleteEmergencia = async (feder_id, contacto_id) => {
  await ensureFederExists(feder_id);
  const n = await models.FederEmergencia.destroy({ where: { feder_id, id: contacto_id } });
  if (!n) throw Object.assign(new Error('Contacto no encontrado'), { status: 404 });
  return { ok: true };
};


export const getFederByUserId = async (user_id) => {
  const row = await sequelize.query(
    `SELECT id FROM "Feder" WHERE user_id = :uid LIMIT 1`,
    { type: QueryTypes.SELECT, replacements: { uid: user_id } }
  );
  if (!row[0]?.id) return null;
  return getFederById(row[0].id); // reuse del SELECT detallado
};