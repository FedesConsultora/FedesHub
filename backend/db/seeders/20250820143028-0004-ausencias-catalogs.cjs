// backend/db/seeders/202508200150-0004-ausencias-catalogs.cjs
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const bulkInsertIfNotExists = async (table, data, key = 'codigo') => {
      const keys = data.map(d => d[key]);
      const existing = await queryInterface.sequelize.query(
        `SELECT ${key} FROM "${table}" WHERE ${key} IN (:keys)`,
        { replacements: { keys }, type: Sequelize.QueryTypes.SELECT }
      );
      const existingKeys = new Set(existing.map(e => e[key]));
      const toInsert = data.filter(d => !existingKeys.has(d[key]));
      if (toInsert.length > 0) {
        await queryInterface.bulkInsert(table, toInsert, {});
      }
    };

    // Unidad de medida para ausencias: día u hora
    await bulkInsertIfNotExists('AusenciaUnidadTipo', [
      { codigo: 'dia', nombre: 'Día' },
      { codigo: 'hora', nombre: 'Hora' },
    ]);

    // Estados de ausencia
    await bulkInsertIfNotExists('AusenciaEstado', [
      { codigo: 'pendiente', nombre: 'Pendiente', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'aprobada', nombre: 'Aprobada', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'denegada', nombre: 'Denegada', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'cancelada', nombre: 'Cancelada', descripcion: null, created_at: now, updated_at: now },
    ]);

    // Mitad de día
    const [existingHalf] = await queryInterface.sequelize.query(`SELECT id FROM "MitadDiaTipo"`);
    const halfIds = new Set(existingHalf.map(d => d.id));
    const halves = [
      { id: 1, codigo: 'am', nombre: 'Mañana' },
      { id: 2, codigo: 'pm', nombre: 'Tarde' },
    ].filter(d => !halfIds.has(d.id));
    if (halves.length > 0) await queryInterface.bulkInsert('MitadDiaTipo', halves, {});

    // Estados de la solicitud de asignación de cupos
    await bulkInsertIfNotExists('AsignacionSolicitudEstado', [
      { codigo: 'pendiente', nombre: 'Pendiente' },
      { codigo: 'aprobada', nombre: 'Aprobada' },
      { codigo: 'denegada', nombre: 'Denegada' },
      { codigo: 'cancelada', nombre: 'Cancelada' },
    ]);

    // Tipos de ausencia (ligados a unidad)
    const unitRowsDia = await queryInterface.sequelize.query(`SELECT id FROM "AusenciaUnidadTipo" WHERE codigo='dia' LIMIT 1`, { type: Sequelize.QueryTypes.SELECT });
    const unitRowsHora = await queryInterface.sequelize.query(`SELECT id FROM "AusenciaUnidadTipo" WHERE codigo='hora' LIMIT 1`, { type: Sequelize.QueryTypes.SELECT });
    const unidadDia = unitRowsDia[0];
    const unidadHora = unitRowsHora[0];

    await bulkInsertIfNotExists('AusenciaTipo', [
      { codigo: 'vacaciones', nombre: 'Vacaciones', descripcion: null, unidad_id: unidadDia.id, requiere_asignacion: true, created_at: now, updated_at: now },
      { codigo: 'tristeza', nombre: 'Días de Tristeza', descripcion: 'Beneficio interno', unidad_id: unidadDia.id, requiere_asignacion: true, created_at: now, updated_at: now },
      { codigo: 'examen', nombre: 'Examen', descripcion: 'Horas para examen', unidad_id: unidadHora.id, requiere_asignacion: true, created_at: now, updated_at: now },
      { codigo: 'personal', nombre: 'Asunto personal', descripcion: null, unidad_id: unidadHora.id, requiere_asignacion: false, created_at: now, updated_at: now },
      { codigo: 'no_pagado', nombre: 'No pagado', descripcion: 'Sin cupo, requiere aprobación', unidad_id: unidadDia.id, requiere_asignacion: false, created_at: now, updated_at: now },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('AusenciaTipo', null, {});
    await queryInterface.bulkDelete('AsignacionSolicitudEstado', null, {});
    await queryInterface.bulkDelete('MitadDiaTipo', null, {});
    await queryInterface.bulkDelete('AusenciaEstado', null, {});
    await queryInterface.bulkDelete('AusenciaUnidadTipo', null, {});
  }
};