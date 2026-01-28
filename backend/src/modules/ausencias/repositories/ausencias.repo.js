// /backend/src/modules/ausencias/repositories/ausencias.repo.js
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../core/db.js';
import { initModels } from '../../../models/registry.js';

const m = await initModels();

export const getUnidadBy = async ({ id, codigo }) => {
  if (id) return m.AusenciaUnidadTipo.findByPk(id);
  if (codigo) return m.AusenciaUnidadTipo.findOne({ where: { codigo } });
  return null;
};

export const getTipoBy = async ({ id, codigo }) => {
  if (id) return m.AusenciaTipo.findByPk(id);
  if (codigo) return m.AusenciaTipo.findOne({ where: { codigo } });
  return null;
};

export const isUserRRHH = async (userId) => {
  const rows = await sequelize.query(`
    SELECT r.nombre
    FROM "UserRol" ur
    JOIN "Rol" r ON r.id = ur.rol_id
    WHERE ur.user_id = :uid AND r.nombre = 'RRHH'
  `, { type: QueryTypes.SELECT, replacements: { uid: userId } });
  return rows.length > 0;
};

export const getEstadoByCodigo = (codigo) =>
  m.AusenciaEstado.findOne({ where: { codigo } });

export const getFederByUser = async (user_id) =>
  m.Feder.findOne({ where: { user_id, is_activo: true }, attributes: ['id', 'user_id', 'is_activo'] });

export const getUserById = async (id) => m.User.findByPk(id);

export const ensureFeder = async (feder_id) => {
  const f = await m.Feder.findByPk(feder_id, { attributes: ['id', 'is_activo'] });
  if (!f) throw Object.assign(new Error('Feder no encontrado'), { status: 404 });
  if (!f.is_activo) throw Object.assign(new Error('Feder inactivo'), { status: 400 });
  return f;
};

// ====== Catálogos ======
export const listUnidades = () => m.AusenciaUnidadTipo.findAll({ order: [['id', 'ASC']] });
export const listEstados = () => m.AusenciaEstado.findAll({ order: [['id', 'ASC']] });
export const listMitadDia = () => m.MitadDiaTipo.findAll({ order: [['id', 'ASC']] });

export const listTipos = async ({ q }) => {
  const where = q ? `WHERE LOWER(t.nombre) LIKE :q OR LOWER(t.codigo) LIKE :q` : '';
  return sequelize.query(`
    SELECT t.*, u.codigo AS unidad_codigo, u.nombre AS unidad_nombre
    FROM "AusenciaTipo" t
    JOIN "AusenciaUnidadTipo" u ON u.id = t.unidad_id
    ${where}
    ORDER BY t.nombre ASC
  `, { type: QueryTypes.SELECT, replacements: q ? { q: `%${q.toLowerCase()}%` } : {} });
};

export const createTipo = async ({ codigo, nombre, descripcion, unidad_id, unidad_codigo, requiere_asignacion, permite_medio_dia }) => {
  const unidad = await getUnidadBy({ id: unidad_id, codigo: unidad_codigo });
  if (!unidad) throw Object.assign(new Error('Unidad inválida'), { status: 400 });
  return m.AusenciaTipo.create({
    codigo, nombre, descripcion, unidad_id: unidad.id,
    requiere_asignacion, permite_medio_dia
  });
};

export const updateTipo = async (id, patch) => {
  const row = await m.AusenciaTipo.findByPk(id);
  if (!row) throw Object.assign(new Error('Tipo no encontrado'), { status: 404 });

  const next = { ...patch };
  if (patch.unidad_id || patch.unidad_codigo) {
    const u = await getUnidadBy({ id: patch.unidad_id, codigo: patch.unidad_codigo });
    if (!u) throw Object.assign(new Error('Unidad inválida'), { status: 400 });
    next.unidad_id = u.id;
    delete next.unidad_codigo;
  }
  await row.update(next);
  return row;
};

// ====== Cuotas y saldos ======
export const assignCuota = async ({ feder_id, tipo_id, unidad_id, cantidad_total, vigencia_desde, vigencia_hasta, comentario, asignado_por_user_id }) => {
  await ensureFeder(feder_id);
  const tipo = await m.AusenciaTipo.findByPk(tipo_id);
  if (!tipo) throw Object.assign(new Error('tipo_id inválido'), { status: 400 });

  if (unidad_id !== tipo.unidad_id) {
    throw Object.assign(new Error('La unidad de la cuota debe coincidir con la unidad del tipo'), { status: 400 });
  }

  return m.AusenciaCuota.create({
    feder_id, tipo_id, unidad_id, cantidad_total,
    vigencia_desde, vigencia_hasta, comentario,
    asignado_por_user_id, is_activo: true
  });
};

export const listCuotas = async ({ feder_id, tipo_id, vigentes }) => {
  const repl = {};
  const where = ['c.is_activo = true'];
  if (feder_id) { where.push('c.feder_id = :feder_id'); repl.feder_id = feder_id; }
  if (tipo_id) { where.push('c.tipo_id = :tipo_id'); repl.tipo_id = tipo_id; }
  if (typeof vigentes === 'boolean') {
    where.push(vigentes
      ? 'CURRENT_DATE BETWEEN c.vigencia_desde AND c.vigencia_hasta'
      : 'NOT (CURRENT_DATE BETWEEN c.vigencia_desde AND c.vigencia_hasta)'
    );
  }
  const sql = `
    SELECT c.*, t.nombre AS tipo_nombre, t.icon AS tipo_icon, t.color AS tipo_color, u.codigo AS unidad_codigo,
      COALESCE(c.cantidad_total - SUM(cc.cantidad_consumida), c.cantidad_total) AS saldo,
      f_admin.nombre AS admin_nombre, f_admin.apellido AS admin_apellido
    FROM "AusenciaCuota" c
    JOIN "AusenciaTipo" t ON t.id = c.tipo_id
    JOIN "AusenciaUnidadTipo" u ON u.id = c.unidad_id
    LEFT JOIN "AusenciaCuotaConsumo" cc ON cc.cuota_id = c.id
    LEFT JOIN "Feder" f_admin ON f_admin.user_id = c.asignado_por_user_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    GROUP BY c.id, t.nombre, t.icon, t.color, u.codigo, f_admin.nombre, f_admin.apellido
    ORDER BY c.vigencia_desde ASC, c.id ASC
  `;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

export const deleteCuota = async (id) => {
  const row = await m.AusenciaCuota.findByPk(id);
  if (!row) throw Object.assign(new Error('Cuota no encontrada'), { status: 404 });
  const consumptionCount = await m.AusenciaCuotaConsumo.count({ where: { cuota_id: id } });
  if (consumptionCount > 0) {
    throw Object.assign(new Error('No se puede eliminar una cuota que ya tiene consumos.'), { status: 400 });
  }
  await row.destroy();
  return { ok: true };
};

export const saldoPorTipo = async ({ feder_id, fecha = null }) => {
  const repl = { feder_id };
  const filtroVig = fecha ? `:fecha BETWEEN c.vigencia_desde AND c.vigencia_hasta` : `CURRENT_DATE BETWEEN c.vigencia_desde AND c.vigencia_hasta`;
  if (fecha) repl.fecha = fecha;

  const sql = `
    SELECT
      t.id AS tipo_id, t.codigo AS tipo_codigo, t.nombre AS tipo_nombre, t.icon AS tipo_icon, t.color AS tipo_color, u.codigo AS unidad_codigo,
      COALESCE(SUM(c.cantidad_total), 0) AS asignado,
      COALESCE(SUM(cc.consumido), 0) AS consumido,
      COALESCE(p.planificado, 0) AS planificado,
      COALESCE(SUM(c.cantidad_total), 0) - COALESCE(SUM(cc.consumido), 0) - COALESCE(p.planificado, 0) AS disponible
    FROM "AusenciaTipo" t
    JOIN "AusenciaUnidadTipo" u ON u.id = t.unidad_id
    LEFT JOIN "AusenciaCuota" c
      ON c.tipo_id = t.id AND c.feder_id = :feder_id AND c.is_activo = true
      AND ${filtroVig}
    LEFT JOIN (
      SELECT cuota_id, SUM(cantidad_consumida) AS consumido
      FROM "AusenciaCuotaConsumo"
      GROUP BY cuota_id
    ) cc ON cc.cuota_id = c.id
    LEFT JOIN (
      SELECT feder_id, tipo_id,
        SUM(CASE
          WHEN u2.codigo = 'dia' THEN
            CASE 
              WHEN a.es_medio_dia THEN 0.5 
              ELSE (
                SELECT count(*) 
                FROM generate_series(a.fecha_desde::date, a.fecha_hasta::date, '1 day'::interval) d 
                WHERE extract(dow from d) NOT IN (0, 6)
              )
            END
          ELSE
            COALESCE(a.duracion_horas, 0)
        END) AS planificado
      FROM "Ausencia" a
      JOIN "AusenciaTipo" t2 ON t2.id = a.tipo_id
      JOIN "AusenciaUnidadTipo" u2 ON u2.id = t2.unidad_id
      JOIN "AusenciaEstado" e ON e.id = a.estado_id
      WHERE e.codigo = 'pendiente' AND a.feder_id = :feder_id
      GROUP BY feder_id, tipo_id
    ) p ON p.tipo_id = t.id
    GROUP BY t.id, t.codigo, t.nombre, t.icon, t.color, u.codigo, p.planificado
    ORDER BY t.nombre ASC
  `;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

// ====== Ausencias (solicitudes) ======
export const listAusencias = async ({ feder_id, estado_codigo, desde, hasta, limit, offset }) => {
  const repl = { limit, offset };
  const where = [];
  if (feder_id) { where.push('a.feder_id = :feder_id'); repl.feder_id = feder_id; }
  if (estado_codigo) { where.push('e.codigo = :estado'); repl.estado = estado_codigo; }
  if (desde) { where.push('a.fecha_desde >= :desde'); repl.desde = desde; }
  if (hasta) { where.push('a.fecha_hasta <= :hasta'); repl.hasta = hasta; }

  const sql = `
    SELECT a.*, t.nombre AS tipo_nombre, t.codigo AS tipo_codigo, t.icon AS tipo_icon, t.color AS tipo_color, u.codigo AS unidad_codigo, e.codigo AS estado_codigo, 
           f.nombre AS solicitante_nombre, f.apellido AS solicitante_apellido, f.avatar_url AS solicitante_avatar_url, f.user_id AS user_id,
           u_user.email AS solicitante_email
    FROM "Ausencia" a
    JOIN "AusenciaTipo" t ON t.id = a.tipo_id
    JOIN "AusenciaUnidadTipo" u ON u.id = t.unidad_id
    JOIN "AusenciaEstado" e ON e.id = a.estado_id
    JOIN "Feder" f          ON f.id = a.feder_id
    JOIN "User" u_user      ON u_user.id = f.user_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY a.fecha_desde DESC, a.id DESC
    LIMIT :limit OFFSET :offset
  `;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

export const getAusenciaById = async (id) => {
  const rows = await sequelize.query(`
    SELECT a.*, t.nombre AS tipo_nombre, t.codigo AS tipo_codigo, t.icon AS tipo_icon, t.color AS tipo_color, u.codigo AS unidad_codigo, e.codigo AS estado_codigo, 
           f.nombre AS solicitante_nombre, f.apellido AS solicitante_apellido, f.avatar_url AS solicitante_avatar_url, f.user_id AS user_id,
           u_user.email AS solicitante_email
    FROM "Ausencia" a
    JOIN "AusenciaTipo" t ON t.id = a.tipo_id
    JOIN "AusenciaUnidadTipo" u ON u.id = t.unidad_id
    JOIN "AusenciaEstado" e ON e.id = a.estado_id
    JOIN "Feder" f          ON f.id = a.feder_id
    JOIN "User" u_user       ON u_user.id = f.user_id
    WHERE a.id = :id
  `, { type: QueryTypes.SELECT, replacements: { id } });
  return rows[0] || null;
};

export const createAusencia = async (payload) => {
  return m.Ausencia.create(payload);
};

export const updateAusencia = async (id, patch) => {
  const row = await m.Ausencia.findByPk(id);
  if (!row) throw Object.assign(new Error('Ausencia no encontrada'), { status: 404 });
  await row.update(patch);
  return getAusenciaById(id);
};

// ====== Aprobación / Consumo de cuotas ======
async function cuotasConSaldo({ feder_id, tipo_id, atDesde, atHasta }) {
  // Trae cuotas vigentes para *todo el rango* (si solapa, vale)
  const rows = await sequelize.query(`
    SELECT c.*,
      COALESCE(c.cantidad_total - SUM(cc.cantidad_consumida), c.cantidad_total) AS saldo_disponible
    FROM "AusenciaCuota" c
    LEFT JOIN "AusenciaCuotaConsumo" cc ON cc.cuota_id = c.id
    WHERE c.feder_id = :feder_id
      AND c.tipo_id = :tipo_id
      AND c.is_activo = true
      AND c.vigencia_hasta >= :desde
      AND c.vigencia_desde <= :hasta
    GROUP BY c.id
    HAVING COALESCE(c.cantidad_total - SUM(cc.cantidad_consumida), c.cantidad_total) > 0
    ORDER BY c.vigencia_desde ASC, c.id ASC
  `, { type: QueryTypes.SELECT, replacements: { feder_id, tipo_id, desde: atDesde, hasta: atHasta } });
  return rows;
}

export const aprobarAusenciaConConsumo = async ({ ausencia_id, aprobado_por_user_id, requerido, unidad_codigo }) => {
  return sequelize.transaction(async (tx) => {
    const row = await m.Ausencia.findByPk(ausencia_id, { transaction: tx, lock: tx.LOCK.UPDATE });
    if (!row) throw Object.assign(new Error('Ausencia no encontrada'), { status: 404 });
    const tipo = await m.AusenciaTipo.findByPk(row.tipo_id);
    const estadoAprob = await getEstadoByCodigo('aprobada');
    const estadoPend = await getEstadoByCodigo('pendiente');

    if (row.estado_id !== estadoPend.id) throw Object.assign(new Error('Sólo ausencias pendientes pueden aprobarse'), { status: 409 });

    if (tipo.requiere_asignacion) {
      // Consumir de cuotas FIFO
      let restante = requerido;
      const bolsas = await cuotasConSaldo({
        feder_id: row.feder_id,
        tipo_id: row.tipo_id,
        atDesde: row.fecha_desde,
        atHasta: row.fecha_hasta
      });

      for (const c of bolsas) {
        if (restante <= 0) break;
        const take = Math.min(Number(c.saldo_disponible), Number(restante));
        await m.AusenciaCuotaConsumo.create({
          cuota_id: c.id,
          ausencia_id: row.id,
          cantidad_consumida: take
        }, { transaction: tx });
        restante = Number((restante - take).toFixed(2));
      }
      if (restante > 0) {
        throw Object.assign(new Error('Saldo insuficiente para aprobar'), { status: 400 });
      }
    }

    await row.update({
      estado_id: estadoAprob.id,
      aprobado_por_user_id,
      aprobado_at: new Date()
    }, { transaction: tx });

    // Crear evento en calendario personal (best-effort)
    try {
      const [cal] = await sequelize.query(`
        SELECT cl.id FROM "CalendarioLocal" cl
        JOIN "CalendarioTipo" ct ON ct.id = cl.tipo_id
        WHERE cl.feder_id = :fid AND ct.codigo = 'personal' AND cl.is_activo = true
        LIMIT 1
      `, { type: QueryTypes.SELECT, replacements: { fid: row.feder_id }, transaction: tx });

      const [tipoBloq] = await sequelize.query(`
        SELECT id FROM "EventoTipo" WHERE codigo='bloqueo' LIMIT 1
      `, { type: QueryTypes.SELECT, transaction: tx });

      if (cal?.id && tipoBloq?.id && m.Evento) {
        // Para unidad 'hora' intentamos usar duracion_horas como bloque del primer día
        const start = new Date(`${row.fecha_desde}T09:00:00.000Z`);
        let end = new Date(start);
        if (unidad_codigo === 'hora' && row.duracion_horas) {
          end = new Date(start.getTime() + Number(row.duracion_horas) * 3600 * 1000);
        } else {
          // días completos
          end = new Date(new Date(`${row.fecha_hasta}T23:59:59.000Z`).getTime());
        }
        await m.Evento.create({
          calendario_local_id: cal.id,
          tipo_id: tipoBloq.id,
          visibilidad_id: null,
          titulo: `Ausencia: ${tipo.nombre}`,
          descripcion: row.motivo ?? null,
          start_at: start,
          end_at: end,
          ausencia_id: row.id
        }, { transaction: tx });
      }
    } catch {
      // ignorar silenciosamente
    }

    return getAusenciaById(row.id);
  });
};

export const resetAusenciaRepo = async (id) => {
  return sequelize.transaction(async (tx) => {
    const row = await m.Ausencia.findByPk(id, { transaction: tx, lock: tx.LOCK.UPDATE });
    if (!row) throw Object.assign(new Error('Ausencia no encontrada'), { status: 404 });

    const pend = await m.AusenciaEstado.findOne({ where: { codigo: 'pendiente' }, transaction: tx });

    // 1. Revertir consumos
    await m.AusenciaCuotaConsumo.destroy({ where: { ausencia_id: id }, transaction: tx });

    // 2. Eliminar eventos de calendario
    if (m.Evento) {
      await m.Evento.destroy({ where: { ausencia_id: id }, transaction: tx });
    }

    // 3. Resetear estado
    await row.update({
      estado_id: pend.id,
      aprobado_por_user_id: null,
      aprobado_at: null,
      denegado_motivo: null,
      comentario_admin: null
    }, { transaction: tx });

    return true;
  });
};
