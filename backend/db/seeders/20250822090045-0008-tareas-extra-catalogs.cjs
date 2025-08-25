// backend/db/seeders/20250822090045-0008-tareas-extra-catalogs.cjs
'use strict';
/**
 * 0180 - Tareas: catálogos extra (idempotente)
 * Inserta sólo los códigos faltantes para evitar colisiones con 0100-core-catalogs.
 */

async function ensureCodes(queryInterface, table, rows, t) {
  const codes = rows.map(r => r.codigo);
  const [exists] = await queryInterface.sequelize.query(
    `SELECT codigo FROM "${table}" WHERE codigo IN (:codes)`,
    { transaction: t, replacements: { codes } }
  );
  const have = new Set(exists.map(e => e.codigo));
  const missing = rows.filter(r => !have.has(r.codigo));
  if (missing.length) {
    await queryInterface.bulkInsert(table, missing, { transaction: t });
  }
}

module.exports = {
  async up (queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const now = new Date();

      await ensureCodes(queryInterface, 'TareaEstado', [
        { codigo: 'pendiente',  nombre: 'Pendiente',  descripcion: null, created_at: now, updated_at: now },
        { codigo: 'en_curso',   nombre: 'En curso',   descripcion: null, created_at: now, updated_at: now },
        { codigo: 'finalizada', nombre: 'Finalizada', descripcion: null, created_at: now, updated_at: now },
        { codigo: 'cancelada',  nombre: 'Cancelada',  descripcion: null, created_at: now, updated_at: now }
      ], t);

      await ensureCodes(queryInterface, 'ImpactoTipo', [
        { codigo: 'alto',  nombre: 'Alto',  puntos: 30, descripcion: null, created_at: now, updated_at: now },
        { codigo: 'medio', nombre: 'Medio', puntos: 15, descripcion: null, created_at: now, updated_at: now },
        { codigo: 'bajo',  nombre: 'Bajo',  puntos: 0,  descripcion: null, created_at: now, updated_at: now }
      ], t);

      await ensureCodes(queryInterface, 'UrgenciaTipo', [
        { codigo: 'lt_24h', nombre: 'Menos de 24h',     puntos: 30, descripcion: null, created_at: now, updated_at: now },
        { codigo: 'lt_72h', nombre: 'Menos de 72h',     puntos: 20, descripcion: null, created_at: now, updated_at: now },
        { codigo: 'lt_7d',  nombre: 'Menos de 7 días',  puntos: 10, descripcion: null, created_at: now, updated_at: now },
        { codigo: 'gte_7d', nombre: '7 días o más',     puntos: 0,  descripcion: null, created_at: now, updated_at: now }
      ], t);

      await ensureCodes(queryInterface, 'ComentarioTipo', [
        { codigo: 'sugerencia', nombre: 'Sugerencia', descripcion: null, created_at: now, updated_at: now },
        { codigo: 'correccion', nombre: 'Corrección', descripcion: null, created_at: now, updated_at: now },
        { codigo: 'nota',       nombre: 'Nota',       descripcion: null, created_at: now, updated_at: now }
      ], t);

      // El default de Tarea.aprobacion_estado_id es 1 (no_aplica).
      // Este seeder no fuerza ID; sólo completa faltantes.
      await ensureCodes(queryInterface, 'TareaAprobacionEstado', [
        { codigo: 'no_aplica', nombre: 'No aplica', descripcion: null, created_at: now, updated_at: now },
        { codigo: 'pendiente', nombre: 'Pendiente', descripcion: null, created_at: now, updated_at: now },
        { codigo: 'aprobada',  nombre: 'Aprobada',  descripcion: null, created_at: now, updated_at: now },
        { codigo: 'rechazada', nombre: 'Rechazada', descripcion: null, created_at: now, updated_at: now }
      ], t);

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async down (queryInterface) {
    // Borrado “suave”: elimina solo los que este seeder podría haber agregado
    await queryInterface.bulkDelete('TareaAprobacionEstado',
      { codigo: ['no_aplica','pendiente','aprobada','rechazada'] }, {});
    await queryInterface.bulkDelete('ComentarioTipo',
      { codigo: ['sugerencia','correccion','nota'] }, {});
    await queryInterface.bulkDelete('UrgenciaTipo',
      { codigo: ['lt_24h','lt_72h','lt_7d','gte_7d'] }, {});
    await queryInterface.bulkDelete('ImpactoTipo',
      { codigo: ['alto','medio','bajo'] }, {});
    await queryInterface.bulkDelete('TareaEstado',
      { codigo: ['pendiente','en_curso','finalizada','cancelada'] }, {});
  }
};
