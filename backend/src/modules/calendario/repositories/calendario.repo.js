// /backend/src/modules/calendario/repositories/calendario.repo.js
import { Op } from 'sequelize';
import { initModels } from '../../../models/registry.js';
const m = await initModels();

async function idByCodigo(model, codigo, t) {
  const row = await model.findOne({ where: { codigo }, transaction: t });
  return row?.id ?? null;
}

async function _federIdByUser(user_id, t) {
  const row = await m.Feder.findOne({ where: { user_id }, transaction: t });
  return row?.id ?? null;
}

function _visibilityWhere(userFederId) {
  return {
    [Op.or]: [
      { '$visibilidad.codigo$': { [Op.in]: ['equipo', 'organizacion'] } },
      {
        [Op.and]: [
          { '$visibilidad.codigo$': 'privado' },
          { feder_id: userFederId ?? -1 }
        ]
      }
    ]
  };
}

export async function listCalendarsForQuery(q, user, t) {
  const where = {};
  const include = [
    { model: m.VisibilidadTipo, as: 'visibilidad', attributes: ['codigo'] }
  ];

  if (!q.include_inactive) where.is_activo = true;

  const myFederId = await _federIdByUser(user.id, t);
  const visWhere = _visibilityWhere(myFederId);

  switch (q.scope) {
    case 'mine':
      where.feder_id = myFederId ?? -1;
      break;
    case 'feder':
      where.feder_id = q.feder_id;
      break;
    case 'cliente':
      where.cliente_id = q.cliente_id;
      break;
    case 'global':
      where.tipo_id = await idByCodigo(m.CalendarioTipo, 'global', t);
      break;
    case 'all':
      // sin filtro extra → devuelve todos los visibles según visibilidad
      break;
  }

  return m.CalendarioLocal.findAll({
    where: { ...where, ...visWhere },
    include,
    order: [['tipo_id', 'ASC'], ['nombre', 'ASC']],
    transaction: t
  });
}

export async function upsertCalendar(payload, user, t) {
  const tipo_id = await idByCodigo(m.CalendarioTipo, payload.tipo_codigo, t);
  const visibilidad_id = await idByCodigo(m.VisibilidadTipo, payload.visibilidad_codigo, t);
  if (!tipo_id || !visibilidad_id) throw Object.assign(new Error('tipo/visibilidad inválidos'), { status: 400 });

  let feder_id = payload.feder_id ?? null;
  if (payload.tipo_codigo === 'personal') feder_id = await _federIdByUser(user.id, t);

  const values = {
    tipo_id, nombre: payload.nombre, visibilidad_id,
    feder_id, cliente_id: payload.cliente_id ?? null,
    time_zone: payload.time_zone ?? 'UTC', color: payload.color ?? null,
    is_activo: payload.is_activo ?? true
  };

  if (payload.id) {
    const row = await m.CalendarioLocal.findByPk(payload.id, { transaction: t });
    if (!row) throw Object.assign(new Error('Calendario no encontrado'), { status: 404 });
    await row.update(values, { transaction: t });
    return row;
  } else {
    return m.CalendarioLocal.create(values, { transaction: t });
  }
}
