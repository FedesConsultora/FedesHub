// backend/db/migrations/20250828...-0019-tarea-comentario-reply-to.cjs
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    // 1) Columna nullable
    await queryInterface.addColumn('TareaComentario', 'reply_to_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    // 2) FK opcional hacia el mismo comentario (ON DELETE SET NULL)
    await queryInterface.addConstraint('TareaComentario', {
      fields: ['reply_to_id'],
      type: 'foreign key',
      name: 'FK_TareaComentario_reply_to',
      references: { table: 'TareaComentario', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 3) Índice para acelerar búsquedas por reply_to_id
    await queryInterface.addIndex('TareaComentario', ['reply_to_id'], {
      name: 'IX_TareaComentario_reply_to'
    });
  },

  async down (queryInterface) {
    // Revertir en orden inverso
    await queryInterface.removeIndex('TareaComentario', 'IX_TareaComentario_reply_to').catch(()=>{});
    await queryInterface.removeConstraint('TareaComentario', 'FK_TareaComentario_reply_to').catch(()=>{});
    await queryInterface.removeColumn('TareaComentario', 'reply_to_id');
  }
};
