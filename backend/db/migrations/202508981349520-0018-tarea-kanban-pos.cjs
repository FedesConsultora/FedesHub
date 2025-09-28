// backend/db/migrations/20250828-0018-tarea-kanban-pos.cjs
'use strict';
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = Sequelize.fn('now');
    await queryInterface.createTable('TareaKanbanPos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tarea_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Tarea', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'User', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      stage_code: { // inbox | today | week | month | later
        type: Sequelize.STRING(20), allowNull: false
      },
      pos: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
    });
    await queryInterface.addConstraint('TareaKanbanPos', {
      fields: ['user_id','tarea_id'],
      type: 'unique',
      name: 'UQ_TareaKanbanPos_user_tarea'
    });
    await queryInterface.addIndex('TareaKanbanPos', ['user_id','stage_code','pos'], { name: 'IX_TareaKanbanPos_user_stage_pos' });
    // (opcional) CHECK de valores válidos:
    // await queryInterface.sequelize.query(`ALTER TABLE "TareaKanbanPos"
    //   ADD CONSTRAINT "CK_TareaKanbanPos_stage" CHECK (stage_code IN ('inbox','today','week','month','later'));`);
  },
  async down (queryInterface) {
    await queryInterface.dropTable('TareaKanbanPos');
  }
};
