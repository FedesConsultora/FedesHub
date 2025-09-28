
// 202508881313410-0016b-tarea-etiqueta-asig-table.cjs
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('TareaEtiquetaAsig', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tarea_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Tarea', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      etiqueta_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'TareaEtiqueta', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      }
    });

    await queryInterface.addConstraint('TareaEtiquetaAsig', {
      fields: ['tarea_id', 'etiqueta_id'],
      type: 'unique',
      name: 'UQ_TareaEtiquetaAsig_tarea_etiqueta'
    });

    await queryInterface.addIndex('TareaEtiquetaAsig', ['tarea_id'], { name: 'IX_TareaEtiquetaAsig_tarea' });
  },

  async down (queryInterface) {
    await queryInterface.dropTable('TareaEtiquetaAsig');
  }
};
