// backend/src/modules/tareas/services/TareaService.js
// -----------------------------------------------------------------------------
// Servicio de Tareas: aplica reglas de negocio, permisos, cálculos y transacciones.
// - Cálculo de prioridad (ponderación cliente + impacto + urgencia)
// - Urgencia derivada de vencimiento
// - Scoping por roles/célula/responsable/colaborador
// - Aprobación (pendiente/aprobada/rechazada)
// -----------------------------------------------------------------------------

import { Op } from 'sequelize';

function hoursDiff(a, b) {
  return (a.getTime() - b.getTime()) / (1000 * 60 * 60);
}

export default class TareaService {
  /** @param {import('sequelize').Sequelize} sequelize @param {object} models @param {TareaRepository} repo */
  constructor(sequelize, models, repo) {
    this.sequelize = sequelize;
    this.m = models;
    this.repo = repo;
  }

  // -------- Contexto de usuario y scoping --------
  async _getUserContext(user_id) {
    const user = await this.m.User.findByPk(user_id, {
      include: [{ model: this.m.Rol, as: 'roles', attributes: ['nombre'] }]
    });
    const roles = new Set((user?.roles || []).map(r => r.nombre));
    const feder = await this.m.Feder.findOne({ where: { user_id }, attributes: ['id','celula_id'] });
    return { user, roles, feder_id: feder?.id || null, celula_id: feder?.celula_id || null };
  }

  _isAdmin(roles) { return roles.has('Admin'); }
  _isCLevel(roles) { return roles.has('CLevel'); }

  _baseScopeIncludeForCelula(celula_id) {
    // Limita por celula del feder (Cliente.celula_id)
    return [{
      model: this.m.Cliente, as: 'cliente', required: true,
      where: { celula_id }, attributes: []
    }];
  }

  async _scopeForUser(user_id) {
    const ctx = await this._getUserContext(user_id);
    if (this._isAdmin(ctx.roles)) return { where: {}, include: [] };
    if (this._isCLevel(ctx.roles)) return { where: {}, include: [] }; // read-all (controlado en permisos del endpoint si hace falta)

    // Regla por defecto:
    // - Tareas del cliente cuya celula_id = celula del feder
    // - O donde feder es Responsable o Colaborador
    const include = [
      ...this._baseScopeIncludeForCelula(ctx.celula_id),
      { model: this.m.Feder, as: 'Responsables', required: false, where: { id: ctx.feder_id } },
      { model: this.m.Feder, as: 'Colaboradores', required: false, where: { id: ctx.feder_id } }
    ];
    return { where: {}, include };
  }

  // -------- Cálculos --------
  _calcUrgenciaCodeByVencimiento(vencimiento) {
    if (!vencimiento) return 'gte_7d';
    const now = new Date();
    const diff = hoursDiff(vencimiento, now); // horas hacia el futuro
    if (diff < 0) return 'lt_24h';            // vencida → tratarla como máxima urgencia
    if (diff <= 24) return 'lt_24h';
    if (diff <= 72) return 'lt_72h';
    if (diff <= 24 * 7) return 'lt_7d';
    return 'gte_7d';
    // NOTA: si querés respetar el valor manual de urgencia, podés hacer que este cálculo sea opcional.
  }

  async _resolveUrgenciaId(codigo, t) {
    const row = await this.m.UrgenciaTipo.findOne({ where: { codigo }, transaction: t });
    return row?.id;
  }

  async _calcPrioridadNum({ cliente_ponderacion, impacto_id, urgencia_id }, t) {
    const [impacto, urgencia] = await Promise.all([
      this.m.ImpactoTipo.findByPk(impacto_id, { transaction: t }),
      this.m.UrgenciaTipo.findByPk(urgencia_id, { transaction: t })
    ]);
    const pImp = impacto?.puntos ?? 0;
    const pUrg = urgencia?.puntos ?? 0;
    // Regla simple: ponderación*100 + impacto + urgencia
    return (Number(cliente_ponderacion || 0) * 100) + pImp + pUrg;
  }

  async _withComputedFields(payload, t) {
    const cliente = await this.m.Cliente.findByPk(payload.cliente_id, { transaction: t });
    const cliente_ponderacion = cliente?.ponderacion ?? 3;

    let urgencia_id = payload.urgencia_id;
    if (!payload.urgencia_id) {
      const urgCode = this._calcUrgenciaCodeByVencimiento(payload.vencimiento ? new Date(payload.vencimiento) : null);
      urgencia_id = await this._resolveUrgenciaId(urgCode, t);
    }

    const toEval = {
      cliente_ponderacion,
      impacto_id: payload.impacto_id,
      urgencia_id
    };
    const prioridad_num = await this._calcPrioridadNum(toEval, t);

    return { ...payload, urgencia_id, cliente_ponderacion, prioridad_num };
  }

  // -------- CRUD --------
  async get(id, user_id) {
    const scope = await this._scopeForUser(user_id);
    const tarea = await this.repo.findById(id, { ...scope });
    if (!tarea) throw new Error('Tarea no encontrada o sin permisos');
    return tarea;
  }

  async list(params, user_id) {
    const scope = await this._scopeForUser(user_id);
    // fusionamos include del scope con filtros del repo
    return this.repo.list(params, { include: scope.include, where: scope.where });
  }

  async create(payload, user_id) {
    const t = await this.sequelize.transaction();
    try {
      // set creador y defaults
      const ctx = await this._getUserContext(user_id);
      const base = {
        ...payload,
        creado_por_feder_id: ctx.feder_id,
        aprobacion_estado_id: payload.requiere_aprobacion ? await this._aprobPendienteId(t) : await this._aprobNoAplicaId(t)
      };
      const ready = await this._withComputedFields(base, t);
      const tarea = await this.repo.create(ready, t);

      // Responsables opcionales
      if (payload.responsables?.length) {
        await this.repo.addResponsables(tarea.id, payload.responsables, t);
      }

      // Colaboradores opcionales
      if (payload.colaboradores?.length) {
        await this.repo.addColaboradores(tarea.id, payload.colaboradores, t);
      }

      await t.commit();
      return this.get(tarea.id, user_id);
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  async update(id, patch, user_id) {
    const t = await this.sequelize.transaction();
    try {
      const ready = await this._withComputedFields(patch, t);
      await this.repo.update(id, ready, t);
      await t.commit();
      return this.get(id, user_id);
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  async archive(id, user_id) {
    const t = await this.sequelize.transaction();
    try {
      await this.repo.archive(id, t);
      await t.commit();
      return this.get(id, user_id);
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  // -------- Estados / Aprobaciones --------
  async _aprobNoAplicaId(t) {
    const row = await this.m.TareaAprobacionEstado.findOne({ where: { codigo: 'no_aplica' }, transaction: t });
    return row.id;
  }
  async _aprobPendienteId(t) {
    const row = await this.m.TareaAprobacionEstado.findOne({ where: { codigo: 'pendiente' }, transaction: t });
    return row.id;
  }
  async _aprobAprobadaId(t) {
    const row = await this.m.TareaAprobacionEstado.findOne({ where: { codigo: 'aprobada' }, transaction: t });
    return row.id;
  }
  async _aprobRechazadaId(t) {
    const row = await this.m.TareaAprobacionEstado.findOne({ where: { codigo: 'rechazada' }, transaction: t });
    return row.id;
  }

  async setEstado(id, estado_codigo, user_id) {
    const t = await this.sequelize.transaction();
    try {
      const estado = await this.m.TareaEstado.findOne({ where: { codigo: estado_codigo }, transaction: t });
      if (!estado) throw new Error('Estado inválido');
      const tarea = await this.repo.setEstado(id, estado.id, t);

      // si finaliza, grabamos finalizada_at
      if (estado_codigo === 'finalizada') {
        await this.repo.update(id, { finalizada_at: new Date() }, t);
      }

      await t.commit();
      return this.get(id, user_id);
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  async aprobar(id, user_id) {
    const t = await this.sequelize.transaction();
    try {
      const aprobada = await this._aprobAprobadaId(t);
      await this.repo.update(id, { aprobacion_estado_id: aprobada, aprobado_por_user_id: user_id, aprobado_at: new Date(), rechazado_por_user_id: null, rechazado_at: null, rechazo_motivo: null }, t);
      await t.commit();
      return this.get(id, user_id);
    } catch (e) { await t.rollback(); throw e; }
  }

  async rechazar(id, user_id, motivo) {
    const t = await this.sequelize.transaction();
    try {
      const rech = await this._aprobRechazadaId(t);
      await this.repo.update(id, { aprobacion_estado_id: rech, rechazado_por_user_id: user_id, rechazado_at: new Date(), rechazo_motivo: motivo || null, aprobado_por_user_id: null, aprobado_at: null }, t);
      await t.commit();
      return this.get(id, user_id);
    } catch (e) { await t.rollback(); throw e; }
  }

  // -------- Responsables / Colaboradores --------
  async addResponsables(id, responsables, user_id) {
    const t = await this.sequelize.transaction();
    try {
      const tarea = await this.repo.addResponsables(id, responsables, t);
      await t.commit();
      return this.get(id, user_id);
    } catch (e) { await t.rollback(); throw e; }
  }

  async removeResponsable(id, feder_id, user_id) {
    const t = await this.sequelize.transaction();
    try {
      await this.repo.removeResponsable(id, feder_id, t);
      await t.commit();
      return this.get(id, user_id);
    } catch (e) { await t.rollback(); throw e; }
  }

  async addColaboradores(id, colaboradores, user_id) {
    const t = await this.sequelize.transaction();
    try {
      const tarea = await this.repo.addColaboradores(id, colaboradores, t);
      await t.commit();
      return this.get(id, user_id);
    } catch (e) { await t.rollback(); throw e; }
  }

  async removeColaborador(id, feder_id, user_id) {
    const t = await this.sequelize.transaction();
    try {
      await this.repo.removeColaborador(id, feder_id, t);
      await t.commit();
      return this.get(id, user_id);
    } catch (e) { await t.rollback(); throw e; }
  }

  // -------- Comentarios / Adjuntos --------
  async comentar(id, { feder_id, tipo_codigo, contenido, menciones, adjuntos }, user_id) {
    const t = await this.sequelize.transaction();
    try {
      const tipo = await this.m.ComentarioTipo.findOne({ where: { codigo: tipo_codigo }, transaction: t });
      if (!tipo) throw new Error('Tipo de comentario inválido');

      await this.repo.addComentario({ tarea_id: id, feder_id, tipo_id: tipo.id, contenido, menciones, adjuntos }, t);
      await t.commit();
      return this.get(id, user_id);
    } catch (e) { await t.rollback(); throw e; }
  }

  async listarComentarios(id, { limit, offset }) {
    return this.repo.listComentarios(id, limit, offset);
  }

  // -------- Etiquetas --------
  async setEtiquetas(id, etiqueta_ids, user_id) {
    const t = await this.sequelize.transaction();
    try {
      await this.repo.assignEtiquetas(id, etiqueta_ids, t);
      await t.commit();
      return this.get(id, user_id);
    } catch (e) { await t.rollback(); throw e; }
  }

  async quitarEtiqueta(id, etiqueta_id, user_id) {
    const t = await this.sequelize.transaction();
    try {
      await this.repo.unassignEtiqueta(id, etiqueta_id, t);
      await t.commit();
      return this.get(id, user_id);
    } catch (e) { await t.rollback(); throw e; }
  }

  // -------- Relaciones --------
  async relacionar(id, { relacionada_id, tipo_codigo }, user_id) {
    const t = await this.sequelize.transaction();
    try {
      const tipo = await this.m.TareaRelacionTipo.findOne({ where: { codigo: tipo_codigo }, transaction: t });
      if (!tipo) throw new Error('Tipo de relación inválido');
      await this.repo.addRelacion({ tarea_id: id, relacionada_id, tipo_id: tipo.id }, t);
      await t.commit();
      return this.get(id, user_id);
    } catch (e) { await t.rollback(); throw e; }
  }

  async desrelacionar(id, { relacionada_id, tipo_codigo }, user_id) {
    const t = await this.sequelize.transaction();
    try {
      const tipo = await this.m.TareaRelacionTipo.findOne({ where: { codigo: tipo_codigo }, transaction: t });
      if (!tipo) throw new Error('Tipo de relación inválido');
      await this.repo.removeRelacion({ tarea_id: id, relacionada_id, tipo_id: tipo.id }, t);
      await t.commit();
      return this.get(id, user_id);
    } catch (e) { await t.rollback(); throw e; }
  }

  // -------- Checklist --------
  async addChecklistItem(id, titulo, user_id) {
    const t = await this.sequelize.transaction();
    try {
      await this.repo.addChecklistItem(id, titulo, t);
      await this._recomputeProgressPct(id, t);  // ajusta progreso
      await t.commit();
      return this.get(id, user_id);
    } catch (e) { await t.rollback(); throw e; }
  }

  async toggleChecklistItem(item_id, is_done, user_id) {
    const t = await this.sequelize.transaction();
    try {
      const item = await this.repo.toggleChecklistItem(item_id, is_done, t);
      await this._recomputeProgressPct(item.tarea_id, t);
      await t.commit();
      return this.get(item.tarea_id, user_id);
    } catch (e) { await t.rollback(); throw e; }
  }

  async removeChecklistItem(item_id, user_id) {
    const t = await this.sequelize.transaction();
    try {
      // necesitamos saber tarea_id antes de borrar
      const item = await this.m.TareaChecklistItem.findByPk(item_id, { transaction: t });
      if (!item) throw new Error('Ítem de checklist inexistente');
      await this.repo.removeChecklistItem(item_id, t);
      await this._recomputeProgressPct(item.tarea_id, t);
      await t.commit();
      return this.get(item.tarea_id, user_id);
    } catch (e) { await t.rollback(); throw e; }
  }

  async reorderChecklist(id, orderedIds, user_id) {
    const t = await this.sequelize.transaction();
    try {
      await this.repo.reorderChecklist(id, orderedIds, t);
      await t.commit();
      return this.get(id, user_id);
    } catch (e) { await t.rollback(); throw e; }
  }

  // -------- Favoritos / Seguidores --------
  async toggleFavorito(id, user_id) {
    const t = await this.sequelize.transaction();
    try {
      const r = await this.repo.toggleFavorito(id, user_id, t);
      await t.commit();
      return r;
    } catch (e) { await t.rollback(); throw e; }
  }

  async toggleSeguidor(id, user_id) {
    const t = await this.sequelize.transaction();
    try {
      const r = await this.repo.toggleSeguidor(id, user_id, t);
      await t.commit();
      return r;
    } catch (e) { await t.rollback(); throw e; }
  }

  // -------- Kanban --------
  async reorderKanban(pairs) {
    const t = await this.sequelize.transaction();
    try {
      await this.repo.reorderKanban(pairs, t);
      await t.commit();
      return true;
    } catch (e) { await t.rollback(); throw e; }
  }

  // -------- Util: progreso por checklist --------
  async _recomputeProgressPct(tarea_id, t) {
    const total = await this.m.TareaChecklistItem.count({ where: { tarea_id }, transaction: t });
    const done = await this.m.TareaChecklistItem.count({ where: { tarea_id, is_done: true }, transaction: t });
    const pct = total ? Math.round((done / total) * 10000) / 100 : 0;
    await this.repo.update(tarea_id, { progreso_pct: pct }, t);
  }
}
