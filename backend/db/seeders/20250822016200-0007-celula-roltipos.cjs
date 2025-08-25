// 0007 — CelulaRolTipo: tridente de Analistas + Miembro
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();

    const rows = [
      ['analista_diseno','Analista de Diseño','Responsable de diseño y piezas'],
      ['analista_cuentas','Analista de Cuentas','Punto de contacto con cliente / PM'],
      ['analista_audiovisual','Analista Audiovisual','Video/edición/animación'],
      ['miembro','Miembro','Participante de célula']
    ].map(([codigo,nombre,descripcion]) => ({ codigo, nombre, descripcion, created_at: now, updated_at: now }));

    await queryInterface.bulkInsert('CelulaRolTipo', rows, { ignoreDuplicates: true });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('CelulaRolTipo', { codigo: ['analista_diseno','analista_cuentas','analista_audiovisual','miembro'] }, {});
  }
};
