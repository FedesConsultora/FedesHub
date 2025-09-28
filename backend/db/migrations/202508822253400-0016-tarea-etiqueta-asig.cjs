// backend/db/migrations/20250828-0016-tarea-etiqueta-asig.cjs
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const now = Sequelize.fn('now');
    const idPK = { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true };
    await queryInterface.createTable('TareaEtiqueta', {
      id: idPK,
      codigo: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(120), allowNull: false },
      color_hex: Sequelize.STRING(7),
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
    });
  },
  async down (queryInterface) {
    await queryInterface.dropTable('TareaEtiqueta');
  }
};
