// backend/db/seeders/202508200150-0004-ausencias-catalogs.cjs
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();

    // Unidad de medida para ausencias: día u hora
    await queryInterface.bulkInsert('AusenciaUnidadTipo', [
      { codigo: 'dia',  nombre: 'Día' },
      { codigo: 'hora', nombre: 'Hora' },
    ], {});

    // Estados de ausencia
    await queryInterface.bulkInsert('AusenciaEstado', [
      { codigo: 'pendiente', nombre: 'Pendiente', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'aprobada',  nombre: 'Aprobada',  descripcion: null, created_at: now, updated_at: now },
      { codigo: 'denegada',  nombre: 'Denegada',  descripcion: null, created_at: now, updated_at: now },
      { codigo: 'cancelada', nombre: 'Cancelada', descripcion: null, created_at: now, updated_at: now },
    ], {});

    // Mitad de día
    await queryInterface.bulkInsert('MitadDiaTipo', [
      { id: 1, codigo: 'am', nombre: 'Mañana' },
      { id: 2, codigo: 'pm', nombre: 'Tarde' },
    ], {});

    // Estados de la solicitud de asignación de cupos (cuando el usuario pide más)
    await queryInterface.bulkInsert('AsignacionSolicitudEstado', [
      { codigo: 'pendiente', nombre: 'Pendiente'},
      { codigo: 'aprobada',  nombre: 'Aprobada' },
      { codigo: 'denegada',  nombre: 'Denegada' },
      { codigo: 'cancelada', nombre: 'Cancelada' },
    ], {});

    // Tipos de ausencia (ligados a unidad)
    const [[unidadDia],[unidadHora]] = await Promise.all([
      queryInterface.sequelize.query(`SELECT id FROM "AusenciaUnidadTipo" WHERE codigo='dia' LIMIT 1`),
      queryInterface.sequelize.query(`SELECT id FROM "AusenciaUnidadTipo" WHERE codigo='hora' LIMIT 1`),
    ]);

    await queryInterface.bulkInsert('AusenciaTipo', [
      { codigo: 'vacaciones', nombre: 'Vacaciones', descripcion: null, unidad_id: unidadDia[0].id, created_at: now, updated_at: now },
      { codigo: 'tristeza',   nombre: 'Días de Tristeza', descripcion: 'Beneficio interno', unidad_id: unidadDia[0].id, created_at: now, updated_at: now },
      { codigo: 'examen',     nombre: 'Examen',   descripcion: 'Horas para examen', unidad_id: unidadHora[0].id, created_at: now, updated_at: now },
      { codigo: 'personal',   nombre: 'Asunto personal', descripcion: null, unidad_id: unidadHora[0].id, created_at: now, updated_at: now },
      { codigo: 'no_pagado',  nombre: 'No pagado',descripcion: 'Sin cupo, requiere aprobación', unidad_id: unidadDia[0].id, created_at: now, updated_at: now },
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('AusenciaTipo', null, {});
    await queryInterface.bulkDelete('AsignacionSolicitudEstado', null, {});
    await queryInterface.bulkDelete('MitadDiaTipo', null, {});
    await queryInterface.bulkDelete('AusenciaEstado', null, {});
    await queryInterface.bulkDelete('AusenciaUnidadTipo', null, {});
  }
};